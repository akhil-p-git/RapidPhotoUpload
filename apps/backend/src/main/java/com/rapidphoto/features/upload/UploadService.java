package com.rapidphoto.features.upload;

import com.rapidphoto.application.command.photo.StartPhotoUploadCommand;
import com.rapidphoto.application.command.photo.StartPhotoUploadCommandHandler;
import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.features.photo.ImageMetadataExtractor;
import com.rapidphoto.features.photo.ThumbnailService;
import com.rapidphoto.features.upload.progress.ProgressTracker;
import com.rapidphoto.infrastructure.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

@Service
public class UploadService {

    private static final Logger logger = LoggerFactory.getLogger(UploadService.class);

    private final StartPhotoUploadCommandHandler uploadCommandHandler;
    private final N8nWebhookService webhookService;
    private final StorageService storageService;
    private final ProgressTracker progressTracker;
    private final PhotoRepository photoRepository;
    private final ThumbnailService thumbnailService;
    private final ImageMetadataExtractor metadataExtractor;

    @Value("${upload.chunk-size:5242880}")
    private long chunkSize;

    public UploadService(StartPhotoUploadCommandHandler uploadCommandHandler,
                        N8nWebhookService webhookService,
                        StorageService storageService,
                        ProgressTracker progressTracker,
                        PhotoRepository photoRepository,
                        ThumbnailService thumbnailService,
                        ImageMetadataExtractor metadataExtractor) {
        this.uploadCommandHandler = uploadCommandHandler;
        this.webhookService = webhookService;
        this.storageService = storageService;
        this.progressTracker = progressTracker;
        this.photoRepository = photoRepository;
        this.thumbnailService = thumbnailService;
        this.metadataExtractor = metadataExtractor;
    }

    private int calculateTotalChunks(long fileSizeBytes) {
        return (int) Math.ceil((double) fileSizeBytes / chunkSize);
    }

    public UploadPhotoResponse uploadPhoto(UUID userId, MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new IllegalArgumentException("File is empty");
            }

            String originalFileName = file.getOriginalFilename();
            String fileName = UUID.randomUUID().toString() + "_" + originalFileName;
            String storagePath = userId.toString() + "/" + fileName;
            
            // Create command
            StartPhotoUploadCommand command = new StartPhotoUploadCommand(
                userId,
                fileName,
                originalFileName,
                file.getSize(),
                file.getContentType()
            );

            // Execute command (saves to DB, updates user storage)
            UUID photoId = uploadCommandHandler.handle(command);

            // Store file using storage abstraction (local or S3)
            String storageUrl = storageService.store(
                storagePath,
                file.getInputStream(),
                file.getContentType(),
                file.getSize()
            );

            logger.info("Photo uploaded successfully: photoId={}, userId={}, storage={}, type={}", 
                photoId, userId, storageUrl, storageService.getStorageType());

            // Get photo from repository for processing
            Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new RuntimeException("Photo not found after upload: " + photoId));

            // Mark as processing
            photo.markAsProcessing();
            photoRepository.save(photo);

            // Extract metadata synchronously (dimensions, EXIF data)
            try {
                metadataExtractor.extractMetadata(photo);
                logger.info("Extracted metadata for photo: {}", photoId);
            } catch (Exception e) {
                logger.warn("Failed to extract metadata for photo: {} - {}", photoId, e.getMessage());
                // Continue without metadata
            }

            // Generate thumbnails asynchronously
            thumbnailService.generateThumbnails(photo);

            // Mark as completed (bypass n8n for basic functionality)
            photo.markAsCompleted();
            photoRepository.save(photo);
            logger.info("Marked photo as completed: {}", photoId);

            // Trigger n8n webhook - notify photo uploaded (optional)
            try {
                String relativePath = storagePath; // userId/fileName format
                webhookService.triggerPhotoUploadedWebhook(
                    photoId, 
                    userId, 
                    fileName, 
                    file.getSize(),
                    relativePath
                );
            } catch (Exception e) {
                logger.warn("Failed to notify n8n: {} - {}", photoId, e.getMessage());
                // Continue without n8n
            }

            return new UploadPhotoResponse(
                photoId,
                storageUrl,
                "SUCCESS",
                "Photo uploaded successfully to " + storageService.getStorageType()
            );

        } catch (IOException e) {
            logger.error("File upload failed for user: {}", userId, e);
            throw new RuntimeException("File upload failed: " + e.getMessage(), e);
        }
    }

    public UploadPhotoResponse initializeUpload(UploadPhotoRequest request) {
        // For chunked uploads - initialize upload session
        String fileName = UUID.randomUUID().toString() + "_" + request.getOriginalFileName();
        
        StartPhotoUploadCommand command = new StartPhotoUploadCommand(
            request.getUserId(),
            fileName,
            request.getOriginalFileName(),
            request.getFileSizeBytes(),
            request.getMimeType()
        );

        UUID photoId = uploadCommandHandler.handle(command);

        // Initialize progress tracking
        int totalChunks = calculateTotalChunks(request.getFileSizeBytes());
        progressTracker.initializeProgress(
            photoId,
            request.getUserId(),
            request.getFileSizeBytes(),
            totalChunks
        );

        logger.info("Upload initialized: photoId={}, userId={}, totalChunks={}", 
            photoId, request.getUserId(), totalChunks);

        return new UploadPhotoResponse(
            photoId,
            "/api/upload/" + photoId + "/chunk",
            "INITIALIZED",
            "Upload session created. Ready to receive chunks."
        );
    }

    /**
     * Generate presigned URL for direct R2/S3 upload
     * Client will upload directly to R2, bypassing backend
     */
    public PresignedUploadResponse generatePresignedUploadUrl(UUID userId, PresignedUploadRequest request) {
        // Create photo record in database
        String fileName = UUID.randomUUID().toString() + "_" + request.getOriginalFileName();
        String storagePath = userId.toString() + "/" + fileName;
        
        StartPhotoUploadCommand command = new StartPhotoUploadCommand(
            userId,
            fileName,
            request.getOriginalFileName(),
            request.getFileSizeBytes(),
            request.getMimeType()
        );

        UUID photoId = uploadCommandHandler.handle(command);

        // Generate presigned URL (valid for 1 hour)
        String presignedUrl = storageService.generatePresignedUploadUrl(
            storagePath,
            Duration.ofHours(1)
        );

        logger.info("Generated presigned URL: photoId={}, userId={}, path={}", 
            photoId, userId, storagePath);

        return new PresignedUploadResponse(
            photoId,
            presignedUrl,
            storagePath,
            "Presigned URL generated. Upload directly to R2."
        );
    }

    /**
     * Complete upload after client has uploaded directly to R2
     * This processes the photo (metadata extraction, thumbnails, etc.)
     */
    public UploadPhotoResponse completeDirectUpload(UUID userId, UUID photoId) {
        Photo photo = photoRepository.findById(photoId)
            .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));

        // Verify ownership
        if (!photo.getUserId().getValue().equals(userId)) {
            throw new IllegalArgumentException("Photo does not belong to user: " + userId);
        }

        // Mark as processing
        photo.markAsProcessing();
        photoRepository.save(photo);

        // Extract metadata synchronously
        try {
            metadataExtractor.extractMetadata(photo);
            logger.info("Extracted metadata for photo: {}", photoId);
        } catch (Exception e) {
            logger.warn("Failed to extract metadata for photo: {} - {}", photoId, e.getMessage());
        }

        // Generate thumbnails asynchronously
        thumbnailService.generateThumbnails(photo);

        // Mark as completed
        photo.markAsCompleted();
        photoRepository.save(photo);
        logger.info("Completed direct upload: photoId={}, userId={}", photoId, userId);

        return new UploadPhotoResponse(
            photoId,
            photo.getStorageInfo().getStoragePath(),
            "COMPLETED",
            "Photo uploaded and processed successfully"
        );
    }
}

