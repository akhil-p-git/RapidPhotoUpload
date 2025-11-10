package com.rapidphoto.features.upload.chunk;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.photo.UploadChunk;
import com.rapidphoto.domain.photo.UploadChunkRepository;
import com.rapidphoto.features.photo.ThumbnailService;
import com.rapidphoto.features.photo.ImageMetadataExtractor;
import com.rapidphoto.features.upload.N8nWebhookService;
import com.rapidphoto.infrastructure.retry.ExponentialBackoffRetryService;
import com.rapidphoto.infrastructure.retry.RetryPolicy;
import com.rapidphoto.infrastructure.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@Service
public class ChunkAssemblyService {

    private static final Logger logger = LoggerFactory.getLogger(ChunkAssemblyService.class);

    private final UploadChunkRepository chunkRepository;
    private final PhotoRepository photoRepository;
    private final StorageService storageService;
    private final N8nWebhookService webhookService;
    private final ThumbnailService thumbnailService;
    private final ImageMetadataExtractor metadataExtractor;
    private final ExponentialBackoffRetryService retryService;

    public ChunkAssemblyService(UploadChunkRepository chunkRepository,
                               PhotoRepository photoRepository,
                               StorageService storageService,
                               N8nWebhookService webhookService,
                               ThumbnailService thumbnailService,
                               ImageMetadataExtractor metadataExtractor,
                               ExponentialBackoffRetryService retryService) {
        this.chunkRepository = chunkRepository;
        this.photoRepository = photoRepository;
        this.storageService = storageService;
        this.webhookService = webhookService;
        this.thumbnailService = thumbnailService;
        this.metadataExtractor = metadataExtractor;
        this.retryService = retryService;
    }

    @Async("uploadExecutor")
    @Transactional
    public void assembleChunks(UUID photoId, Integer totalChunks) {
        try {
            retryService.executeWithRetry(
                "Assemble-Chunks-" + photoId,
                () -> {
                    logger.info("Starting chunk assembly for photo: {}", photoId);

                    Photo photo = photoRepository.findById(photoId)
                        .orElseThrow(() -> new IllegalStateException("Photo not found: " + photoId));

                    // Get all chunks in order
                    List<UploadChunk> chunks = chunkRepository.findByPhotoIdOrderByChunkNumberAsc(photoId);
                    
                    if (chunks.size() != totalChunks) {
                        throw new IllegalStateException(
                            String.format("Missing chunks: expected %d, found %d", totalChunks, chunks.size())
                        );
                    }

                    // Create temporary file for assembly
                    Path tempFile = Files.createTempFile("assembly_" + photoId, ".tmp");
                    
                    try (FileOutputStream fos = new FileOutputStream(tempFile.toFile())) {
                        for (UploadChunk chunk : chunks) {
                            String chunkPath = String.format("%s/chunks/chunk_%d", photoId, chunk.getChunkNumber());
                            
                            try (InputStream chunkStream = storageService.retrieve(chunkPath)) {
                                byte[] buffer = new byte[8192];
                                int bytesRead;
                                while ((bytesRead = chunkStream.read(buffer)) != -1) {
                                    fos.write(buffer, 0, bytesRead);
                                }
                            }
                            
                            logger.debug("Assembled chunk {}/{} for photo: {}", 
                                chunk.getChunkNumber() + 1, totalChunks, photoId);
                        }
                    }

                    // Store assembled file
                    String finalPath = photo.getUserId().getValue() + "/" + photoId;
                    try (FileInputStream fis = new FileInputStream(tempFile.toFile())) {
                        storageService.store(
                            finalPath,
                            fis,
                            "application/octet-stream",
                            Files.size(tempFile)
                        );
                    }

                    // Clean up chunks
                    for (UploadChunk chunk : chunks) {
                        String chunkPath = String.format("%s/chunks/chunk_%d", photoId, chunk.getChunkNumber());
                        storageService.delete(chunkPath);
                    }

                    // Delete temp file
                    Files.deleteIfExists(tempFile);

                    // Mark photo as processing (metadata extraction and thumbnails will be generated)
                    photo.markAsProcessing();
                    photoRepository.save(photo);

                    logger.info("Successfully assembled {} chunks for photo: {}", totalChunks, photoId);

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
                        webhookService.notifyPhotoUploaded(photo);
                    } catch (Exception e) {
                        logger.warn("Failed to notify n8n: {} - {}", photoId, e.getMessage());
                        // Continue without n8n
                    }

                    return null;
                },
                RetryPolicy.aggressivePolicy()
            );
        } catch (Exception e) {
            logger.error("Failed to assemble chunks for photo: {} after all retries", photoId, e);
            
            // If retry fails, mark photo as failed and notify n8n
            try {
                Photo photo = photoRepository.findById(photoId).orElse(null);
                if (photo != null && photo.getStatus().name().equals("PROCESSING")) {
                    photo.markAsFailed();
                    photoRepository.save(photo);
                    logger.error("Failed to assemble chunks for photo: {} after all retries", photoId);
                    
                    // Notify n8n of upload failure
                    webhookService.notifyUploadFailed(photo, "Failed to assemble chunks after all retries: " + e.getMessage());
                }
            } catch (Exception ex) {
                logger.error("Failed to mark photo as failed: {}", photoId, ex);
            }
        }
    }
}

