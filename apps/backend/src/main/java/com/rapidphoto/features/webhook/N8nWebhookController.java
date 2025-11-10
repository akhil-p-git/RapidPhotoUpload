package com.rapidphoto.features.webhook;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.photo.PhotoMetadata;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/webhooks/n8n")
@CrossOrigin(origins = "*") // Allow n8n to call from any origin
public class N8nWebhookController {

    private static final Logger logger = LoggerFactory.getLogger(N8nWebhookController.class);

    private final PhotoRepository photoRepository;

    @Autowired
    public N8nWebhookController(PhotoRepository photoRepository) {
        this.photoRepository = photoRepository;
    }

    /**
     * Receive metadata extraction results from n8n
     */
    @PostMapping("/metadata-extracted")
    public ResponseEntity<Void> receiveMetadata(@Valid @RequestBody MetadataUpdateRequest request) {
        logger.info("Received metadata update from n8n for photo: {}", request.getPhotoId());

        try {
            Photo photo = photoRepository.findById(UUID.fromString(request.getPhotoId()))
                .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + request.getPhotoId()));

            // Update photo with EXIF data from n8n
            PhotoMetadata currentMetadata = photo.getPhotoMetadata();
            Map<String, Object> existingMetadata = currentMetadata != null ? currentMetadata.getMetadata() : new HashMap<>();
            Map<String, Object> existingAiTags = currentMetadata != null ? currentMetadata.getAiTags() : null;
            
            // Merge EXIF data from n8n
            Map<String, Object> exifData = request.getExifData() != null ? request.getExifData() : new HashMap<>();
            if (currentMetadata != null && currentMetadata.getExifData() != null) {
                // Merge with existing EXIF data
                exifData.putAll(currentMetadata.getExifData());
                exifData.putAll(request.getExifData()); // n8n data takes precedence
            }

            // Update dimensions if provided
            if (request.getWidth() != null) {
                photo.setWidth(request.getWidth());
            }
            if (request.getHeight() != null) {
                photo.setHeight(request.getHeight());
            }

            // Update location if provided
            Double locationLat = request.getLocationLat() != null 
                ? request.getLocationLat() 
                : (currentMetadata != null ? currentMetadata.getLocationLat() : null);
            Double locationLon = request.getLocationLon() != null 
                ? request.getLocationLon() 
                : (currentMetadata != null ? currentMetadata.getLocationLon() : null);

            // Update takenAt if provided
            LocalDateTime takenAt = request.getTakenAt() != null 
                ? LocalDateTime.parse(request.getTakenAt()) 
                : (currentMetadata != null ? currentMetadata.getTakenAt() : null);

            PhotoMetadata updatedMetadata = new PhotoMetadata(
                existingMetadata,
                exifData,
                existingAiTags,
                locationLat,
                locationLon,
                takenAt
            );
            photo.setPhotoMetadata(updatedMetadata);
            
            photoRepository.save(photo);

            logger.info("Successfully updated metadata for photo: {}", request.getPhotoId());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Failed to update metadata for photo: {}", request.getPhotoId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Receive thumbnail generation results from n8n
     */
    @PostMapping("/thumbnail-ready")
    public ResponseEntity<Void> thumbnailReady(@Valid @RequestBody ThumbnailUpdateRequest request) {
        logger.info("Received thumbnail update from n8n for photo: {}", request.getPhotoId());

        try {
            Photo photo = photoRepository.findById(UUID.fromString(request.getPhotoId()))
                .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + request.getPhotoId()));

            // Update photo with thumbnail paths from n8n
            PhotoMetadata currentMetadata = photo.getPhotoMetadata();
            Map<String, Object> metadata = currentMetadata != null ? currentMetadata.getMetadata() : new HashMap<>();
            
            // Update thumbnail paths in metadata
            @SuppressWarnings("unchecked")
            Map<String, String> thumbnails = (Map<String, String>) metadata.getOrDefault("thumbnails", new HashMap<String, String>());
            if (request.getThumbnails() != null) {
                thumbnails.putAll(request.getThumbnails());
            }
            metadata.put("thumbnails", thumbnails);

            // Update individual thumbnail URL fields for backward compatibility
            if (request.getThumbnails() != null) {
                if (request.getThumbnails().containsKey("thumbnail")) {
                    photo.setThumbnailSmallUrl(request.getThumbnails().get("thumbnail"));
                }
                if (request.getThumbnails().containsKey("medium")) {
                    photo.setThumbnailMediumUrl(request.getThumbnails().get("medium"));
                }
                if (request.getThumbnails().containsKey("large")) {
                    photo.setThumbnailLargeUrl(request.getThumbnails().get("large"));
                }
            }

            // Update photo metadata
            Map<String, Object> exifData = currentMetadata != null ? currentMetadata.getExifData() : null;
            Map<String, Object> aiTags = currentMetadata != null ? currentMetadata.getAiTags() : null;
            Double locationLat = currentMetadata != null ? currentMetadata.getLocationLat() : null;
            Double locationLon = currentMetadata != null ? currentMetadata.getLocationLon() : null;
            LocalDateTime takenAt = currentMetadata != null ? currentMetadata.getTakenAt() : null;

            PhotoMetadata updatedMetadata = new PhotoMetadata(
                metadata,
                exifData,
                aiTags,
                locationLat,
                locationLon,
                takenAt
            );
            photo.setPhotoMetadata(updatedMetadata);
            
            photoRepository.save(photo);

            logger.info("Successfully updated thumbnails for photo: {}", request.getPhotoId());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Failed to update thumbnails for photo: {}", request.getPhotoId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Receive AI tags generation results from n8n
     */
    @PostMapping("/ai-tags-generated")
    public ResponseEntity<Void> aiTagsGenerated(@Valid @RequestBody AiTagsUpdateRequest request) {
        logger.info("Received AI tags update from n8n for photo: {}", request.getPhotoId());

        try {
            Photo photo = photoRepository.findById(UUID.fromString(request.getPhotoId()))
                .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + request.getPhotoId()));

            // Update photo with AI tags from n8n
            PhotoMetadata currentMetadata = photo.getPhotoMetadata();
            Map<String, Object> existingMetadata = currentMetadata != null ? currentMetadata.getMetadata() : new HashMap<>();
            Map<String, Object> existingExifData = currentMetadata != null ? currentMetadata.getExifData() : null;
            
            // Merge AI tags from n8n
            Map<String, Object> aiTags = request.getAiTags() != null ? request.getAiTags() : new HashMap<>();
            if (currentMetadata != null && currentMetadata.getAiTags() != null) {
                // Merge with existing AI tags
                aiTags.putAll(currentMetadata.getAiTags());
                aiTags.putAll(request.getAiTags()); // n8n data takes precedence
            }

            PhotoMetadata updatedMetadata = new PhotoMetadata(
                existingMetadata,
                existingExifData,
                aiTags,
                currentMetadata != null ? currentMetadata.getLocationLat() : null,
                currentMetadata != null ? currentMetadata.getLocationLon() : null,
                currentMetadata != null ? currentMetadata.getTakenAt() : null
            );
            photo.setPhotoMetadata(updatedMetadata);
            
            photoRepository.save(photo);

            logger.info("Successfully updated AI tags for photo: {}", request.getPhotoId());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Failed to update AI tags for photo: {}", request.getPhotoId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

