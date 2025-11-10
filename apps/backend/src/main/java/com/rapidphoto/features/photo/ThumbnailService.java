package com.rapidphoto.features.photo;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.infrastructure.storage.StorageService;
import net.coobird.thumbnailator.Thumbnails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class ThumbnailService {

    private static final Logger logger = LoggerFactory.getLogger(ThumbnailService.class);

    private final StorageService storageService;
    private final PhotoRepository photoRepository;

    // Thumbnail sizes (as per requirements)
    private static final int THUMBNAIL_SIZE = 200;
    private static final int MEDIUM_SIZE = 800;
    private static final int LARGE_SIZE = 1600;

    public ThumbnailService(StorageService storageService, PhotoRepository photoRepository) {
        this.storageService = storageService;
        this.photoRepository = photoRepository;
    }

    /**
     * Generate thumbnails for a photo (thumbnail: 200x200, medium: 800x800, large: 1600x1600)
     * Stores thumbnails in /uploads/thumbnails/{photoId}/ directory
     * Updates photo metadata with thumbnail paths
     */
    @Async("processingExecutor")
    public void generateThumbnails(Photo photo) {
        UUID photoId = photo.getId().getValue();
        UUID userId = photo.getUserId().getValue();
        
        logger.info("Generating thumbnails for photo: {}", photoId);

        try {
            // Get original image from storage
            String storagePath = photo.getStorageInfo().getStoragePath();
            InputStream originalStream = storageService.retrieve(storagePath);

            // Read original image into byte array
            byte[] originalBytes = originalStream.readAllBytes();
            originalStream.close();

            Map<String, String> thumbnailPaths = new HashMap<>();

            // Generate thumbnail (200x200)
            String thumbnailPath = generateThumbnail(
                photoId, 
                userId, 
                originalBytes, 
                THUMBNAIL_SIZE, 
                "thumbnail"
            );
            thumbnailPaths.put("thumbnail", thumbnailPath);

            // Generate medium thumbnail (800x800)
            String mediumPath = generateThumbnail(
                photoId, 
                userId, 
                originalBytes, 
                MEDIUM_SIZE, 
                "medium"
            );
            thumbnailPaths.put("medium", mediumPath);

            // Generate large thumbnail (1600x1600)
            String largePath = generateThumbnail(
                photoId, 
                userId, 
                originalBytes, 
                LARGE_SIZE, 
                "large"
            );
            thumbnailPaths.put("large", largePath);

            // Update photo metadata with thumbnail paths
            com.rapidphoto.domain.photo.PhotoMetadata photoMetadata = photo.getPhotoMetadata();
            Map<String, Object> metadata = photoMetadata != null ? photoMetadata.getMetadata() : new HashMap<>();
            if (metadata == null) {
                metadata = new HashMap<>();
            }
            metadata.put("thumbnails", thumbnailPaths);
            
            // Update photo metadata
            Map<String, Object> exifData = photoMetadata != null ? photoMetadata.getExifData() : null;
            Map<String, Object> aiTags = photoMetadata != null ? photoMetadata.getAiTags() : null;
            Double locationLat = photoMetadata != null ? photoMetadata.getLocationLat() : null;
            Double locationLon = photoMetadata != null ? photoMetadata.getLocationLon() : null;
            java.time.LocalDateTime takenAt = photoMetadata != null ? photoMetadata.getTakenAt() : null;
            
            com.rapidphoto.domain.photo.PhotoMetadata updatedMetadata = new com.rapidphoto.domain.photo.PhotoMetadata(
                metadata, exifData, aiTags, locationLat, locationLon, takenAt
            );
            photo.setPhotoMetadata(updatedMetadata);
            
            // Also update individual thumbnail URL fields for backward compatibility
            photo.setThumbnailSmallUrl("/thumbnails/" + userId + "/" + photoId + "_thumbnail.jpg");
            photo.setThumbnailMediumUrl("/thumbnails/" + userId + "/" + photoId + "_medium.jpg");
            photo.setThumbnailLargeUrl("/thumbnails/" + userId + "/" + photoId + "_large.jpg");
            
            photoRepository.save(photo);

            logger.info("Successfully generated thumbnails for photo: {}", photoId);
        } catch (Exception e) {
            logger.error("Failed to generate thumbnails for photo: {}", photoId, e);
            // Don't throw exception - thumbnails are optional
        }
    }

    /**
     * Generate a single thumbnail
     */
    private String generateThumbnail(
            UUID photoId, 
            UUID userId, 
            byte[] originalBytes, 
            int size, 
            String sizeName) throws Exception {
        
        // Create thumbnail using Thumbnailator
        ByteArrayOutputStream thumbnailStream = new ByteArrayOutputStream();
        
        Thumbnails.of(new ByteArrayInputStream(originalBytes))
            .size(size, size)
            .outputFormat("jpg")
            .outputQuality(0.85)
            .toOutputStream(thumbnailStream);

        byte[] thumbnailBytes = thumbnailStream.toByteArray();
        thumbnailStream.close();

        // Store thumbnail in /uploads/thumbnails/{photoId}/ directory
        String thumbnailPath = String.format("uploads/thumbnails/%s/%s.jpg", photoId, sizeName);
        storageService.store(
            thumbnailPath,
            new ByteArrayInputStream(thumbnailBytes),
            "image/jpeg",
            thumbnailBytes.length
        );

        logger.debug("Generated {} thumbnail for photo: {} ({} bytes)", sizeName, photoId, thumbnailBytes.length);
        
        return thumbnailPath;
    }
}

