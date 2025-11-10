package com.rapidphoto.features.upload;

import com.rapidphoto.features.upload.progress.ProgressTracker;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "http://localhost:3000")
public class UploadController {

    private static final Logger logger = LoggerFactory.getLogger(UploadController.class);

    private final UploadService uploadService;
    private final ProgressTracker progressTracker;

    public UploadController(UploadService uploadService, ProgressTracker progressTracker) {
        this.uploadService = uploadService;
        this.progressTracker = progressTracker;
    }

    /**
     * Simple upload endpoint for small-medium files (direct upload)
     */
    @PostMapping
    public ResponseEntity<UploadPhotoResponse> uploadPhoto(
            @RequestParam("file") MultipartFile file) {
        
        // Get authenticated user ID
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        UUID userId = UUID.fromString(authentication.getName());
        
        logger.info("Upload request received: userId={}, fileName={}, size={}", 
            userId, file.getOriginalFilename(), file.getSize());

        try {
            UploadPhotoResponse response = uploadService.uploadPhoto(userId, file);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid upload request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                new UploadPhotoResponse(null, null, "ERROR", e.getMessage())
            );
        } catch (Exception e) {
            logger.error("Upload failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                new UploadPhotoResponse(null, null, "ERROR", "Upload failed: " + e.getMessage())
            );
        }
    }

    /**
     * Initialize chunked upload for large files
     */
    @PostMapping("/initialize")
    public ResponseEntity<UploadPhotoResponse> initializeUpload(
            @Valid @RequestBody UploadPhotoRequest request) {
        
        // Get authenticated user ID
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        UUID userId = UUID.fromString(authentication.getName());
        
        // Set userId from authentication
        request.setUserId(userId);
        
        logger.info("Initialize upload request: userId={}, fileName={}, size={}", 
            userId, request.getOriginalFileName(), request.getFileSizeBytes());

        try {
            UploadPhotoResponse response = uploadService.initializeUpload(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to initialize upload", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                new UploadPhotoResponse(null, null, "ERROR", "Initialization failed: " + e.getMessage())
            );
        }
    }

    /**
     * Get upload progress for a photo
     */
    @GetMapping("/progress/{photoId}")
    public ResponseEntity<Map<String, Object>> getProgress(@PathVariable UUID photoId) {
        ProgressTracker.UploadProgress progress = progressTracker.getProgress(photoId);
        
        if (progress == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("photoId", progress.getPhotoId());
        response.put("userId", progress.getUserId());
        response.put("status", progress.getStatus());
        response.put("uploadedBytes", progress.getUploadedBytes());
        response.put("totalBytes", progress.getTotalBytes());
        response.put("percentage", progress.getPercentage());
        response.put("uploadedChunks", progress.getUploadedChunks());
        response.put("totalChunks", progress.getTotalChunks());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Upload service is healthy");
    }
}

