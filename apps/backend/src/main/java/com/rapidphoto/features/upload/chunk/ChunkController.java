package com.rapidphoto.features.upload.chunk;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/upload/chunk")
@CrossOrigin(origins = "http://localhost:3000")
public class ChunkController {

    private static final Logger logger = LoggerFactory.getLogger(ChunkController.class);

    private final ChunkUploadService chunkUploadService;
    private final PhotoRepository photoRepository;

    public ChunkController(ChunkUploadService chunkUploadService, PhotoRepository photoRepository) {
        this.chunkUploadService = chunkUploadService;
        this.photoRepository = photoRepository;
    }

    @PostMapping
    public ResponseEntity<ChunkUploadResponse> uploadChunk(
            @RequestParam("photoId") UUID photoId,
            @RequestParam("chunkNumber") Integer chunkNumber,
            @RequestParam("totalChunks") Integer totalChunks,
            @RequestParam("file") MultipartFile file) {
        
        // Get authenticated user ID
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        UUID userId = UUID.fromString(authentication.getName());
        
        // Verify photo ownership
        Photo photo = photoRepository.findById(photoId)
            .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));
        
        if (!photo.getUserId().getValue().equals(userId)) {
            logger.warn("Unauthorized chunk upload attempt: userId={}, photoId={}", userId, photoId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        logger.info("Chunk upload: photoId={}, chunk={}/{}, size={}", 
            photoId, chunkNumber + 1, totalChunks, file.getSize());

        ChunkUploadRequest request = new ChunkUploadRequest();
        request.setPhotoId(photoId);
        request.setChunkNumber(chunkNumber);
        request.setTotalChunks(totalChunks);
        request.setChunkSize(file.getSize());

        ChunkUploadResponse response = chunkUploadService.uploadChunk(request, file);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/progress/{photoId}")
    public ResponseEntity<ChunkUploadResponse> getProgress(
            @PathVariable UUID photoId,
            @RequestParam Integer totalChunks) {
        
        ChunkUploadResponse response = chunkUploadService.getUploadProgress(photoId, totalChunks);
        return ResponseEntity.ok(response);
    }
}

