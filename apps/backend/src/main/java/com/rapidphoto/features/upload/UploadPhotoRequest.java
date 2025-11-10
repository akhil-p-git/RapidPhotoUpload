package com.rapidphoto.features.upload;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.UUID;

public class UploadPhotoRequest {
    
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotBlank(message = "Original file name is required")
    private String originalFileName;
    
    @NotBlank(message = "MIME type is required")
    private String mimeType;
    
    @NotNull(message = "File size is required")
    @Positive(message = "File size must be positive")
    private Long fileSizeBytes;

    // Constructors
    public UploadPhotoRequest() {}

    public UploadPhotoRequest(UUID userId, String originalFileName, String mimeType, Long fileSizeBytes) {
        this.userId = userId;
        this.originalFileName = originalFileName;
        this.mimeType = mimeType;
        this.fileSizeBytes = fileSizeBytes;
    }

    // Getters and setters
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    
    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { 
        this.originalFileName = originalFileName; 
    }
    
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    
    public Long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(Long fileSizeBytes) { 
        this.fileSizeBytes = fileSizeBytes; 
    }
}

