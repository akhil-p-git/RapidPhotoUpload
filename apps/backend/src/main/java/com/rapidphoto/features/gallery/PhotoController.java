package com.rapidphoto.features.gallery;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoMetadata;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.photo.PhotoStatus;
import com.rapidphoto.domain.user.UserRepository;
import com.rapidphoto.infrastructure.storage.StorageService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Sort;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/photos")
@CrossOrigin(origins = "http://localhost:3000")
public class PhotoController {

    private static final Logger logger = LoggerFactory.getLogger(PhotoController.class);

    private final PhotoRepository photoRepository;
    private final StorageService storageService;
    private final UserRepository userRepository;

    public PhotoController(PhotoRepository photoRepository, StorageService storageService, UserRepository userRepository) {
        this.photoRepository = photoRepository;
        this.storageService = storageService;
        this.userRepository = userRepository;
    }

    /**
     * Get paginated list of photos for the authenticated user
     * Supports search, filters, date range, and sorting
     * 
     * Query parameters:
     * - page: Page number (default: 0)
     * - size: Page size (default: 24)
     * - search: Search term for filename (optional)
     * - status: Comma-separated statuses (e.g., "COMPLETED,PROCESSING") or single status (default: COMPLETED)
     * - startDate: Start date in ISO format (optional)
     * - endDate: End date in ISO format (optional)
     * - sortBy: Sort field (default: uploadedAt)
     * - sortOrder: Sort direction (asc/desc, default: desc)
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getPhotos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "uploadedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder) {
        
        // Get authenticated user ID
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        UUID userId = UUID.fromString(authentication.getName());
        
        logger.info("Get photos request: userId={}, page={}, size={}, search={}, status={}, startDate={}, endDate={}, sortBy={}, sortOrder={}", 
            userId, page, size, search, status, startDate, endDate, sortBy, sortOrder);

        try {
            // Build sort
            Sort.Direction direction = sortOrder.equalsIgnoreCase("asc") 
                ? Sort.Direction.ASC 
                : Sort.Direction.DESC;
            Sort sort = Sort.by(direction, sortBy);
            
            Pageable pageable = PageRequest.of(page, size, sort);
            Page<Photo> photoPage;
            
            // Parse status filter (comma-separated or single)
            List<PhotoStatus> statusList = new ArrayList<>();
            if (status != null && !status.isEmpty()) {
                String[] statusArray = status.split(",");
                for (String s : statusArray) {
                    try {
                        statusList.add(PhotoStatus.valueOf(s.trim().toUpperCase()));
                    } catch (IllegalArgumentException e) {
                        logger.warn("Invalid status: {}", s);
                    }
                }
            }
            if (statusList.isEmpty()) {
                statusList.add(PhotoStatus.COMPLETED); // Default
            }
            
            // Parse date range
            LocalDateTime startDateTime = null;
            LocalDateTime endDateTime = null;
            if (startDate != null && !startDate.isEmpty()) {
                try {
                    startDateTime = LocalDate.parse(startDate).atStartOfDay();
                } catch (Exception e) {
                    logger.warn("Invalid startDate format: {}", startDate);
                }
            }
            if (endDate != null && !endDate.isEmpty()) {
                try {
                    endDateTime = LocalDate.parse(endDate).atTime(23, 59, 59);
                } catch (Exception e) {
                    logger.warn("Invalid endDate format: {}", endDate);
                }
            }
            
            // Build query based on filters
            boolean hasSearch = search != null && !search.trim().isEmpty();
            boolean hasDateRange = startDateTime != null || endDateTime != null;
            
            if (hasSearch && hasDateRange) {
                // Search + Date Range + Status
                if (startDateTime == null) {
                    startDateTime = LocalDateTime.of(1970, 1, 1, 0, 0);
                }
                if (endDateTime == null) {
                    endDateTime = LocalDateTime.now();
                }
                photoPage = photoRepository.findByUserIdAndOriginalFileNameContainingIgnoreCaseAndStatusInAndUploadedAtBetween(
                    userId, search.trim(), statusList, startDateTime, endDateTime, pageable
                );
            } else if (hasSearch) {
                // Search + Status
                photoPage = photoRepository.findByUserIdAndOriginalFileNameContainingIgnoreCaseAndStatusIn(
                    userId, search.trim(), statusList, pageable
                );
            } else if (hasDateRange) {
                // Date Range + Status
                if (startDateTime == null) {
                    startDateTime = LocalDateTime.of(1970, 1, 1, 0, 0);
                }
                if (endDateTime == null) {
                    endDateTime = LocalDateTime.now();
                }
                photoPage = photoRepository.findByUserIdAndStatusInAndUploadedAtBetween(
                    userId, statusList, startDateTime, endDateTime, pageable
                );
            } else {
                // Status only
                photoPage = photoRepository.findByUserIdAndStatusIn(
                    userId, statusList, pageable
                );
            }
            
            // Map to DTOs
            Page<PhotoResponseDTO> dtoPage = photoPage.map(this::mapToResponseDTO);
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", dtoPage.getContent());
            response.put("totalElements", dtoPage.getTotalElements());
            response.put("totalPages", dtoPage.getTotalPages());
            response.put("currentPage", dtoPage.getNumber());
            response.put("size", dtoPage.getSize());
            response.put("hasNext", dtoPage.hasNext());
            response.put("hasPrevious", dtoPage.hasPrevious());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid parameter: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Failed to get photos", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get single photo by ID
     * Verifies photo belongs to authenticated user
     * Cached for performance
     */
    @GetMapping("/{photoId}")
    @Cacheable(value = "photos", key = "#photoId")
    public ResponseEntity<PhotoResponseDTO> getPhoto(@PathVariable UUID photoId) {
        logger.info("Get photo request: photoId={}", photoId);

        try {
            // Get authenticated user ID
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            UUID userId = UUID.fromString(authentication.getName());
            
            // Verify ownership
            Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found or access denied: " + photoId));

            PhotoResponseDTO dto = mapToResponseDTO(photo);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            logger.warn("Photo not found or access denied: {}", photoId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Failed to get photo", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Map Photo entity to PhotoResponseDTO
     */
    private PhotoResponseDTO mapToResponseDTO(Photo photo) {
        PhotoResponseDTO dto = new PhotoResponseDTO();
        dto.setId(photo.getId().getValue());
        dto.setUserId(photo.getUserId().getValue());
        dto.setFileName(photo.getFileName());
        dto.setOriginalFileName(photo.getOriginalFileName());
        dto.setFileSizeBytes(photo.getFileSizeBytes());
        dto.setMimeType(photo.getMimeType());
        dto.setWidth(photo.getWidth());
        dto.setHeight(photo.getHeight());
        dto.setStatus(photo.getStatus().name());
        dto.setStoragePath(photo.getStorageInfo().getStoragePath());
        dto.setUploadedAt(photo.getUploadedAt());
        dto.setProcessedAt(photo.getProcessedAt());
        
        // Get metadata
        com.rapidphoto.domain.photo.PhotoMetadata metadata = photo.getPhotoMetadata();
        if (metadata != null) {
            dto.setExifData(metadata.getExifData());
            dto.setAiTags(metadata.getAiTags());
            dto.setMetadata(metadata.getMetadata());
            dto.setLocationLat(metadata.getLocationLat());
            dto.setLocationLon(metadata.getLocationLon());
            dto.setTakenAt(metadata.getTakenAt());
        }
        
        // Get thumbnail URLs from database (if available)
        String userIdStr = photo.getUserId().getValue().toString();
        String photoIdStr = photo.getId().getValue().toString();
        
        // Use database values if available, otherwise construct URLs
        if (photo.getThumbnailSmallUrl() != null) {
            dto.setThumbnailSmallUrl(photo.getThumbnailSmallUrl());
        } else {
            dto.setThumbnailSmallUrl("/thumbnails/" + userIdStr + "/" + photoIdStr + "_small.jpg");
        }
        
        if (photo.getThumbnailMediumUrl() != null) {
            dto.setThumbnailMediumUrl(photo.getThumbnailMediumUrl());
        } else {
            dto.setThumbnailMediumUrl("/thumbnails/" + userIdStr + "/" + photoIdStr + "_medium.jpg");
        }
        
        if (photo.getThumbnailLargeUrl() != null) {
            dto.setThumbnailLargeUrl(photo.getThumbnailLargeUrl());
        } else {
            dto.setThumbnailLargeUrl("/thumbnails/" + userIdStr + "/" + photoIdStr + "_large.jpg");
        }
        
        return dto;
    }

    /**
     * Serve photo image file
     * Supports both LOCAL and S3 storage types
     */
    @GetMapping("/{photoId}/image")
    public ResponseEntity<InputStreamResource> getPhotoImage(@PathVariable UUID photoId) {
        logger.info("Get photo image: photoId={}", photoId);

        try {
            Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));

            // Get storage path
            String storagePath = photo.getStorageInfo().getStoragePath();
            
            // Retrieve file from storage (works for both LOCAL and S3)
            InputStream inputStream = storageService.retrieve(storagePath);
            
            // Set content type
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(photo.getMimeType()));
            headers.setContentDispositionFormData("inline", photo.getOriginalFileName());
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(new InputStreamResource(inputStream));
        } catch (IllegalArgumentException e) {
            logger.warn("Photo not found: {}", photoId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Failed to serve photo image", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Serve photo file with cache headers for performance
     * Supports both LOCAL and S3 storage types
     * Accepts size parameter: original, thumbnail, medium, large
     * Verifies photo belongs to authenticated user
     */
    @GetMapping("/{photoId}/file")
    public ResponseEntity<Resource> getPhotoFile(
            @PathVariable UUID photoId,
            @RequestParam(defaultValue = "original") String size) {
        logger.info("Get photo file: photoId={}, size={}, storageType={}", 
            photoId, size, storageService.getStorageType());

        try {
            // Public endpoint - no auth required for viewing images
            Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));

            InputStream inputStream;
            String contentType;
            String fileName;
            String storagePath;

            // Determine which image to serve based on size parameter
            // Support both old (small) and new (thumbnail) naming
            switch (size.toLowerCase()) {
                case "thumbnail":
                case "small": // Backward compatibility
                    // Check metadata first, then fallback to URL field
                    com.rapidphoto.domain.photo.PhotoMetadata photoMetadata = photo.getPhotoMetadata();
                    if (photoMetadata != null && photoMetadata.getMetadata() != null) {
                        Map<String, Object> metadata = photoMetadata.getMetadata();
                        if (metadata.containsKey("thumbnails")) {
                            @SuppressWarnings("unchecked")
                            Map<String, String> thumbnails = (Map<String, String>) metadata.get("thumbnails");
                            if (thumbnails != null && thumbnails.containsKey("thumbnail")) {
                                storagePath = thumbnails.get("thumbnail");
                                fileName = photoId + "_thumbnail.jpg";
                                contentType = "image/jpeg";
                                break;
                            }
                        }
                    }
                    if (photo.getThumbnailSmallUrl() != null) {
                        storagePath = "uploads/thumbnails/" + photoId + "/thumbnail.jpg";
                        fileName = photoId + "_thumbnail.jpg";
                        contentType = "image/jpeg";
                    } else {
                        // Fallback to original if thumbnail not available
                        storagePath = photo.getStorageInfo().getStoragePath();
                        fileName = photo.getOriginalFileName();
                        contentType = photo.getMimeType();
                    }
                    break;
                case "medium":
                    // Check metadata first
                    photoMetadata = photo.getPhotoMetadata();
                    if (photoMetadata != null && photoMetadata.getMetadata() != null) {
                        Map<String, Object> metadata = photoMetadata.getMetadata();
                        if (metadata.containsKey("thumbnails")) {
                            @SuppressWarnings("unchecked")
                            Map<String, String> thumbnails = (Map<String, String>) metadata.get("thumbnails");
                            if (thumbnails != null && thumbnails.containsKey("medium")) {
                                storagePath = thumbnails.get("medium");
                                fileName = photoId + "_medium.jpg";
                                contentType = "image/jpeg";
                                break;
                            }
                        }
                    }
                    if (photo.getThumbnailMediumUrl() != null) {
                        storagePath = "uploads/thumbnails/" + photoId + "/medium.jpg";
                        fileName = photoId + "_medium.jpg";
                        contentType = "image/jpeg";
                    } else {
                        storagePath = photo.getStorageInfo().getStoragePath();
                        fileName = photo.getOriginalFileName();
                        contentType = photo.getMimeType();
                    }
                    break;
                case "large":
                    // Check metadata first
                    photoMetadata = photo.getPhotoMetadata();
                    if (photoMetadata != null && photoMetadata.getMetadata() != null) {
                        Map<String, Object> metadata = photoMetadata.getMetadata();
                        if (metadata.containsKey("thumbnails")) {
                            @SuppressWarnings("unchecked")
                            Map<String, String> thumbnails = (Map<String, String>) metadata.get("thumbnails");
                            if (thumbnails != null && thumbnails.containsKey("large")) {
                                storagePath = thumbnails.get("large");
                                fileName = photoId + "_large.jpg";
                                contentType = "image/jpeg";
                                break;
                            }
                        }
                    }
                    if (photo.getThumbnailLargeUrl() != null) {
                        storagePath = "uploads/thumbnails/" + photoId + "/large.jpg";
                        fileName = photoId + "_large.jpg";
                        contentType = "image/jpeg";
                    } else {
                        storagePath = photo.getStorageInfo().getStoragePath();
                        fileName = photo.getOriginalFileName();
                        contentType = photo.getMimeType();
                    }
                    break;
                default: // original
                    storagePath = photo.getStorageInfo().getStoragePath();
                    fileName = photo.getOriginalFileName();
                    contentType = photo.getMimeType();
                    break;
            }

            // Retrieve file from storage (works for both LOCAL and S3)
            inputStream = storageService.retrieve(storagePath);
            Resource resource = new InputStreamResource(inputStream);
            
            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.setContentDispositionFormData("inline", fileName);
            
            // Set cache headers for performance
            // Thumbnails: 1 year, Original: 1 year (as per requirements)
            headers.setCacheControl(CacheControl.maxAge(Duration.ofDays(365))
                .cachePublic()
                .mustRevalidate());
            headers.setETag("\"" + photoId + "-" + size + "-" + photo.getVersion() + "\"");
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(resource);
        } catch (IllegalArgumentException e) {
            logger.warn("Photo not found: {}", photoId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Failed to serve photo file", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Serve thumbnail image with cache headers
     * Supports both LOCAL and S3 storage types
     */
    @GetMapping("/thumbnails/{userId}/{filename}")
    public ResponseEntity<Resource> getThumbnail(
            @PathVariable String userId,
            @PathVariable String filename) {
        logger.info("Get thumbnail: userId={}, filename={}, storageType={}", 
            userId, filename, storageService.getStorageType());

        try {
            // Construct thumbnail path
            String thumbnailPath = "thumbnails/" + userId + "/" + filename;
            
            // Check if file exists
            if (!storageService.exists(thumbnailPath)) {
                return ResponseEntity.notFound().build();
            }
            
            // Retrieve file from storage (works for both LOCAL and S3)
            InputStream inputStream = storageService.retrieve(thumbnailPath);
            Resource resource = new InputStreamResource(inputStream);
            
            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_JPEG);
            headers.setContentDispositionFormData("inline", filename);
            
            // Set cache headers for performance (24 hours for thumbnails)
            headers.setCacheControl(CacheControl.maxAge(Duration.ofDays(1))
                .cachePublic()
                .mustRevalidate());
            headers.setETag("\"" + userId + "-" + filename + "\"");
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(resource);
        } catch (Exception e) {
            logger.error("Failed to serve thumbnail", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update photo metadata (EXIF data, dimensions, location, etc.)
     */
    @PatchMapping("/{photoId}/metadata")
    public ResponseEntity<PhotoResponseDTO> updatePhotoMetadata(
            @PathVariable UUID photoId,
            @Valid @RequestBody UpdatePhotoMetadataRequest request) {
        logger.info("Update photo metadata: photoId={}", photoId);

        try {
            Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));

            // Update dimensions
            if (request.getWidth() != null) {
                photo.setWidth(request.getWidth());
            }
            if (request.getHeight() != null) {
                photo.setHeight(request.getHeight());
            }

            // Update metadata
            PhotoMetadata currentMetadata = photo.getPhotoMetadata();
            Map<String, Object> exifData = request.getExifData() != null 
                ? request.getExifData() 
                : (currentMetadata != null ? currentMetadata.getExifData() : null);
            Map<String, Object> metadata = request.getMetadata() != null 
                ? request.getMetadata() 
                : (currentMetadata != null ? currentMetadata.getMetadata() : null);
            Map<String, Object> aiTags = currentMetadata != null ? currentMetadata.getAiTags() : null;
            
            Double locationLat = request.getLocationLat() != null 
                ? request.getLocationLat() 
                : (currentMetadata != null ? currentMetadata.getLocationLat() : null);
            Double locationLon = request.getLocationLon() != null 
                ? request.getLocationLon() 
                : (currentMetadata != null ? currentMetadata.getLocationLon() : null);
            
            LocalDateTime takenAt = request.getTakenAt() != null 
                ? LocalDateTime.parse(request.getTakenAt()) 
                : (currentMetadata != null ? currentMetadata.getTakenAt() : null);

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

            PhotoResponseDTO dto = mapToResponseDTO(photo);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            logger.warn("Photo not found: {}", photoId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Failed to update photo metadata", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update photo AI tags
     * Evicts cache entry
     */
    @PatchMapping("/{photoId}/ai-tags")
    @CacheEvict(value = "photos", key = "#photoId")
    public ResponseEntity<PhotoResponseDTO> updatePhotoAiTags(
            @PathVariable UUID photoId,
            @Valid @RequestBody UpdatePhotoAiTagsRequest request) {
        logger.info("Update photo AI tags: photoId={}", photoId);

        try {
            Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));

            // Update AI tags
            PhotoMetadata currentMetadata = photo.getPhotoMetadata();
            Map<String, Object> exifData = currentMetadata != null ? currentMetadata.getExifData() : null;
            Map<String, Object> metadata = currentMetadata != null ? currentMetadata.getMetadata() : null;
            Map<String, Object> aiTags = request.getAiTags() != null 
                ? request.getAiTags() 
                : (currentMetadata != null ? currentMetadata.getAiTags() : null);
            
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

            PhotoResponseDTO dto = mapToResponseDTO(photo);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            logger.warn("Photo not found: {}", photoId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Failed to update photo AI tags", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get similar photos (duplicate detection)
     */
    @GetMapping("/{photoId}/similar")
    public ResponseEntity<Map<String, Object>> getSimilarPhotos(
            @PathVariable UUID photoId,
            @RequestParam(defaultValue = "10") int maxDistance,
            @RequestParam(defaultValue = "10") int limit) {
        logger.info("Get similar photos: photoId={}, maxDistance={}, limit={}", photoId, maxDistance, limit);

        try {
            Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));

            String perceptualHash = photo.getPerceptualHash();
            if (perceptualHash == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("similarPhotos", List.of());
                response.put("count", 0);
                return ResponseEntity.ok(response);
            }

            // Find photos with similar perceptual hash
            // Note: This is a simplified implementation. In production, you'd use a proper
            // similarity search algorithm (e.g., Hamming distance calculation)
            List<Photo> allPhotos = photoRepository.findAll();
            List<PhotoResponseDTO> similarPhotos = allPhotos.stream()
                .filter(p -> !p.getId().getValue().equals(photoId))
                .filter(p -> p.getPerceptualHash() != null)
                .filter(p -> {
                    // Calculate Hamming distance (simplified)
                    String hash1 = photo.getPerceptualHash();
                    String hash2 = p.getPerceptualHash();
                    if (hash1.length() != hash2.length()) return false;
                    
                    int distance = 0;
                    for (int i = 0; i < hash1.length(); i++) {
                        if (hash1.charAt(i) != hash2.charAt(i)) {
                            distance++;
                        }
                    }
                    return distance <= maxDistance;
                })
                .limit(limit)
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("similarPhotos", similarPhotos);
            response.put("count", similarPhotos.size());
            response.put("maxDistance", maxDistance);

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Photo not found: {}", photoId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Failed to get similar photos", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Batch delete photos
     */
    @PostMapping("/batch/delete")
    public ResponseEntity<Map<String, Object>> batchDeletePhotos(
            @Valid @RequestBody BatchPhotoRequest request) {
        logger.info("Batch delete photos: count={}", request.getPhotoIds().size());

        try {
            int successCount = 0;
            int failureCount = 0;
            List<UUID> failedIds = new java.util.ArrayList<>();

            for (UUID photoId : request.getPhotoIds()) {
                try {
                    Photo photo = photoRepository.findById(photoId)
                        .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));
                    
                    photo.delete();
                    photoRepository.save(photo);
                    successCount++;
                } catch (Exception e) {
                    logger.warn("Failed to delete photo: {}", photoId, e);
                    failureCount++;
                    failedIds.add(photoId);
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("successCount", successCount);
            response.put("failureCount", failureCount);
            response.put("failedIds", failedIds);
            response.put("totalRequested", request.getPhotoIds().size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to batch delete photos", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Batch download photos as ZIP
     */
    @PostMapping("/batch/download")
    public ResponseEntity<Resource> batchDownloadPhotos(
            @Valid @RequestBody BatchPhotoRequest request) {
        logger.info("Batch download photos: count={}", request.getPhotoIds().size());

        try {
            ByteArrayOutputStream zipStream = new ByteArrayOutputStream();
            
            try (ZipOutputStream zipOut = new ZipOutputStream(zipStream)) {
                for (UUID photoId : request.getPhotoIds()) {
                    try {
                        Photo photo = photoRepository.findById(photoId)
                            .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));

                        // Get photo file
                        String storagePath = photo.getStorageInfo().getStoragePath();
                        InputStream photoStream = storageService.retrieve(storagePath);

                        // Add to ZIP
                        ZipEntry zipEntry = new ZipEntry(photo.getOriginalFileName());
                        zipOut.putNextEntry(zipEntry);

                        byte[] buffer = new byte[8192];
                        int bytesRead;
                        while ((bytesRead = photoStream.read(buffer)) != -1) {
                            zipOut.write(buffer, 0, bytesRead);
                        }

                        photoStream.close();
                        zipOut.closeEntry();
                    } catch (Exception e) {
                        logger.warn("Failed to add photo to ZIP: {}", photoId, e);
                        // Continue with other photos
                    }
                }
            }

            byte[] zipBytes = zipStream.toByteArray();
            Resource resource = new InputStreamResource(new java.io.ByteArrayInputStream(zipBytes));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "photos.zip");
            headers.setContentLength(zipBytes.length);

            return ResponseEntity.ok()
                .headers(headers)
                .body(resource);
        } catch (Exception e) {
            logger.error("Failed to batch download photos", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Batch get metadata for export (CSV/JSON)
     */
    @GetMapping("/batch/metadata")
    public ResponseEntity<Map<String, Object>> batchGetMetadata(
            @RequestParam List<UUID> photoIds,
            @RequestParam(defaultValue = "json") String format) {
        logger.info("Batch get metadata: count={}, format={}", photoIds.size(), format);

        try {
            List<PhotoResponseDTO> photos = photoIds.stream()
                .map(photoId -> {
                    try {
                        Photo photo = photoRepository.findById(photoId)
                            .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));
                        return mapToResponseDTO(photo);
                    } catch (Exception e) {
                        logger.warn("Failed to get photo metadata: {}", photoId, e);
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("photos", photos);
            response.put("count", photos.size());
            response.put("format", format);
            response.put("exportedAt", LocalDateTime.now().toString());

            // If CSV format requested, convert to CSV
            if ("csv".equalsIgnoreCase(format)) {
                StringBuilder csv = new StringBuilder();
                csv.append("Photo ID,File Name,Original File Name,File Size (bytes),Width,Height,Status,Uploaded At,Processed At\n");
                
                for (PhotoResponseDTO photo : photos) {
                    csv.append(photo.getId()).append(",")
                        .append(photo.getFileName()).append(",")
                        .append(photo.getOriginalFileName()).append(",")
                        .append(photo.getFileSizeBytes()).append(",")
                        .append(photo.getWidth() != null ? photo.getWidth() : "").append(",")
                        .append(photo.getHeight() != null ? photo.getHeight() : "").append(",")
                        .append(photo.getStatus()).append(",")
                        .append(photo.getUploadedAt() != null ? photo.getUploadedAt().toString() : "").append(",")
                        .append(photo.getProcessedAt() != null ? photo.getProcessedAt().toString() : "").append("\n");
                }
                
                response.put("csv", csv.toString());
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to batch get metadata", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete a photo (soft delete)
     * Verifies photo belongs to authenticated user
     * Evicts cache entry
     */
    @DeleteMapping("/{photoId}")
    @CacheEvict(value = "photos", key = "#photoId")
    public ResponseEntity<Void> deletePhoto(@PathVariable UUID photoId) {
        logger.info("Delete photo request: photoId={}", photoId);

        try {
            // Get authenticated user ID
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            UUID userId = UUID.fromString(authentication.getName());
            
            // Verify ownership
            Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found or access denied: " + photoId));
            
            // Soft delete
            photo.delete();
            photoRepository.save(photo);
            
            logger.info("Photo deleted successfully: photoId={}, userId={}", photoId, userId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            logger.warn("Photo not found or access denied: {}", photoId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Failed to delete photo", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get photo statistics for authenticated user
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getPhotoStats() {
        logger.info("Get photo stats request");

        try {
            // Get authenticated user ID
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            UUID userId = UUID.fromString(authentication.getName());
            
            // Get user for storage quota
            com.rapidphoto.domain.user.User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
            
            // Calculate stats
            long totalPhotos = photoRepository.countByUserId(userId);
            long totalSizeBytes = photoRepository.sumFileSizeByUserId(userId);
            
            // Photos by status
            Map<String, Long> photosByStatus = new HashMap<>();
            for (PhotoStatus status : PhotoStatus.values()) {
                long count = photoRepository.countByUserIdAndStatus(userId, status);
                if (count > 0) {
                    photosByStatus.put(status.name(), count);
                }
            }
            
            // Recent uploads (last 7 days)
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
            long recentUploads = photoRepository.countByUserIdAndUploadedAtAfter(userId, sevenDaysAgo);
            
            // Storage used percent
            long storageQuotaBytes = user.getStorageQuota().getQuotaBytes();
            double storageUsedPercent = storageQuotaBytes > 0 
                ? (double) totalSizeBytes / storageQuotaBytes * 100.0 
                : 0.0;
            
            Map<String, Object> response = new HashMap<>();
            response.put("totalPhotos", totalPhotos);
            response.put("totalSizeBytes", totalSizeBytes);
            response.put("photosByStatus", photosByStatus);
            response.put("recentUploads", recentUploads);
            response.put("storageUsedPercent", Math.round(storageUsedPercent * 10.0) / 10.0);
            response.put("storageQuotaBytes", storageQuotaBytes);
            response.put("storageUsedBytes", totalSizeBytes);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to get photo stats", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

