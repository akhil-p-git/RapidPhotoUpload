package com.rapidphoto.features.upload;

import com.rapidphoto.application.command.photo.StartPhotoUploadCommand;
import com.rapidphoto.application.command.photo.StartPhotoUploadCommandHandler;
import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserRepository;
import com.rapidphoto.features.photo.ImageMetadataExtractor;
import com.rapidphoto.features.photo.ThumbnailService;
import com.rapidphoto.features.upload.progress.ProgressTracker;
import com.rapidphoto.infrastructure.storage.StorageService;
import com.rapidphoto.infrastructure.storage.StoredObject;
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
    private final UserRepository userRepository;

    @Value("${upload.chunk-size:5242880}")
    private long chunkSize;

    /**
     * Lifetime of a presigned upload URL. Minutes, not hours: the URL is a
     * bearer credential to write at a specific key, and it is handed out one
     * request before it is used. An hour of validity is an hour in which a
     * leaked URL -- from a log, a proxy, a shared screen -- remains usable.
     */
    @Value("${upload.presigned.ttl-minutes:10}")
    private long presignedTtlMinutes;

    @Value("${upload.max-file-size-bytes:104857600}")
    private long maxFileSizeBytes;

    public UploadService(StartPhotoUploadCommandHandler uploadCommandHandler,
                        N8nWebhookService webhookService,
                        StorageService storageService,
                        ProgressTracker progressTracker,
                        PhotoRepository photoRepository,
                        ThumbnailService thumbnailService,
                        ImageMetadataExtractor metadataExtractor,
                        UserRepository userRepository) {
        this.uploadCommandHandler = uploadCommandHandler;
        this.webhookService = webhookService;
        this.storageService = storageService;
        this.progressTracker = progressTracker;
        this.photoRepository = photoRepository;
        this.thumbnailService = thumbnailService;
        this.metadataExtractor = metadataExtractor;
        this.userRepository = userRepository;
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

    public UploadPhotoResponse initializeUpload(UUID userId, UploadPhotoRequest request) {
        // For chunked uploads - initialize upload session
        String fileName = UUID.randomUUID().toString() + "_" + request.getOriginalFileName();
        
        StartPhotoUploadCommand command = new StartPhotoUploadCommand(
            userId,
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
            userId,
            request.getFileSizeBytes(),
            totalChunks
        );

        logger.info("Upload initialized: photoId={}, userId={}, totalChunks={}", 
            photoId, userId, totalChunks);

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
        // Everything below runs BEFORE a URL exists. Once one is issued the
        // server has no further say over what the client does with it until
        // /complete, so any check that can be made here must be made here.
        long declaredSize = request.getFileSizeBytes();

        if (declaredSize <= 0) {
            throw new IllegalArgumentException("File size must be positive");
        }
        if (declaredSize > maxFileSizeBytes) {
            throw new IllegalArgumentException(
                "File too large: " + declaredSize + " bytes exceeds the " + maxFileSizeBytes + " byte limit");
        }
        if (!UploadValidation.isAllowedMimeType(request.getMimeType())) {
            throw new IllegalArgumentException(
                "Unsupported content type: " + request.getMimeType()
                    + ". Allowed: " + UploadValidation.allowedTypesSorted());
        }

        // Quota is charged against the declared size before the upload starts.
        // Checking only at /complete would let a client fill the bucket first
        // and be told afterwards, which is the wrong order for a limit.
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        if (!user.getStorageQuota().hasSpaceFor(declaredSize)) {
            throw new IllegalStateException("Storage quota exceeded: "
                + declaredSize + " bytes requested, "
                + user.getStorageQuota().getAvailableBytes() + " available");
        }

        // Create photo record in database
        String fileName = UUID.randomUUID().toString() + "_" + request.getOriginalFileName();
        String storagePath = userId.toString() + "/" + fileName;

        StartPhotoUploadCommand command = new StartPhotoUploadCommand(
            userId,
            fileName,
            request.getOriginalFileName(),
            declaredSize,
            request.getMimeType()
        );

        UUID photoId = uploadCommandHandler.handle(command);

        // The URL is bound to this exact byte count and content type, so a
        // client that PUTs anything else fails the store's signature check.
        String presignedUrl = storageService.generatePresignedUploadUrl(
            storagePath,
            Duration.ofMinutes(presignedTtlMinutes),
            declaredSize,
            request.getMimeType()
        );

        logger.info("Generated presigned URL: photoId={}, userId={}, path={}, size={}, ttl={}m",
            photoId, userId, storagePath, declaredSize, presignedTtlMinutes);

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

        String storagePath = photo.getStorageInfo().getStoragePath();
        long declaredSize = photo.getFileSizeBytes();

        // This is the first and only point at which the server sees what was
        // actually written. Everything on the Photo record until now came from
        // the client, so nothing downstream should trust it before these checks.
        StoredObject stored = storageService.head(storagePath)
            .orElseThrow(() -> {
                rejectUpload(photo, userId, declaredSize, false);
                return new IllegalArgumentException(
                    "No object was uploaded for photo " + photoId);
            });

        if (stored.contentLength() != declaredSize) {
            logger.warn("Size mismatch on direct upload: photoId={}, declared={}, actual={}",
                photoId, declaredSize, stored.contentLength());
            rejectUpload(photo, userId, declaredSize, true);
            throw new IllegalArgumentException(
                "Uploaded size " + stored.contentLength()
                    + " does not match the declared size " + declaredSize);
        }

        byte[] prefix = storageService.readPrefix(storagePath, UploadValidation.SNIFF_BYTES);
        String sniffed = UploadValidation.sniffImageType(prefix).orElse(null);

        if (sniffed == null || !UploadValidation.matchesDeclaredType(photo.getMimeType(), sniffed)) {
            logger.warn("Content type mismatch on direct upload: photoId={}, declared={}, sniffed={}",
                photoId, photo.getMimeType(), sniffed == null ? "unrecognised" : sniffed);
            rejectUpload(photo, userId, declaredSize, true);
            throw new IllegalArgumentException(
                "Uploaded content is " + (sniffed == null ? "not a supported image format" : sniffed)
                    + ", which does not match the declared type " + photo.getMimeType());
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
        logger.info("Completed direct upload: photoId={}, userId={}, verified {} bytes as {}",
            photoId, userId, stored.contentLength(), sniffed);

        return new UploadPhotoResponse(
            photoId,
            storagePath,
            "COMPLETED",
            "Photo uploaded and processed successfully"
        );
    }

    /**
     * Discard an upload that failed verification.
     *
     * Three things have to happen together, and all three matter:
     * the object is removed so a rejected payload is not left sitting in the
     * bucket; the photo is marked FAILED so it never appears in a gallery; and
     * the quota charged optimistically at presign time is refunded, since
     * charging for bytes that were rejected would let repeated bad uploads
     * exhaust a user's allowance.
     */
    private void rejectUpload(Photo photo, UUID userId, long declaredSize, boolean deleteObject) {
        if (deleteObject) {
            try {
                storageService.delete(photo.getStorageInfo().getStoragePath());
            } catch (Exception e) {
                logger.warn("Could not delete rejected object for photo {}: {}",
                    photo.getId().getValue(), e.getMessage());
            }
        }

        try {
            photo.markAsFailed();
            photoRepository.save(photo);
        } catch (Exception e) {
            logger.warn("Could not mark photo {} failed: {}", photo.getId().getValue(), e.getMessage());
        }

        try {
            userRepository.findById(userId).ifPresent(user -> {
                user.removeStorageUsage(declaredSize);
                userRepository.save(user);
            });
        } catch (Exception e) {
            logger.warn("Could not refund quota for user {}: {}", userId, e.getMessage());
        }
    }
}

