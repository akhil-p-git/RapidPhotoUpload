package com.rapidphoto.application.query.photo;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Read model optimized for photo queries.
 * This can be used for read-only projections or materialized views.
 */
public class PhotoReadModel {
    private UUID id;
    private UUID userId;
    private String fileName;
    private String originalFileName;
    private long fileSizeBytes;
    private String mimeType;
    private Integer width;
    private Integer height;
    private String status;
    private String storagePath;
    private String storageType;
    private LocalDateTime uploadedAt;
    private LocalDateTime processedAt;
    private String checksumSha256;

    public PhotoReadModel() {}

    // Getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    
    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { 
        this.originalFileName = originalFileName; 
    }
    
    public long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(long fileSizeBytes) { 
        this.fileSizeBytes = fileSizeBytes; 
    }
    
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    
    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }
    
    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public String getStoragePath() { return storagePath; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }
    
    public String getStorageType() { return storageType; }
    public void setStorageType(String storageType) { this.storageType = storageType; }
    
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { 
        this.uploadedAt = uploadedAt; 
    }
    
    public LocalDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(LocalDateTime processedAt) { 
        this.processedAt = processedAt; 
    }
    
    public String getChecksumSha256() { return checksumSha256; }
    public void setChecksumSha256(String checksumSha256) { 
        this.checksumSha256 = checksumSha256; 
    }
}

