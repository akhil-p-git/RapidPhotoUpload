package com.rapidphoto.features.gallery;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public class PhotoResponseDTO {
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
    private String thumbnailSmallUrl;
    private String thumbnailMediumUrl;
    private String thumbnailLargeUrl;
    private Map<String, Object> exifData;
    private Map<String, Object> aiTags;
    private Map<String, Object> metadata;
    private Double locationLat;
    private Double locationLon;
    private LocalDateTime takenAt;
    private LocalDateTime uploadedAt;
    private LocalDateTime processedAt;

    public PhotoResponseDTO() {}

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
    
    public String getThumbnailSmallUrl() { return thumbnailSmallUrl; }
    public void setThumbnailSmallUrl(String thumbnailSmallUrl) { 
        this.thumbnailSmallUrl = thumbnailSmallUrl; 
    }
    
    public String getThumbnailMediumUrl() { return thumbnailMediumUrl; }
    public void setThumbnailMediumUrl(String thumbnailMediumUrl) { 
        this.thumbnailMediumUrl = thumbnailMediumUrl; 
    }
    
    public String getThumbnailLargeUrl() { return thumbnailLargeUrl; }
    public void setThumbnailLargeUrl(String thumbnailLargeUrl) { 
        this.thumbnailLargeUrl = thumbnailLargeUrl; 
    }
    
    public Map<String, Object> getExifData() { return exifData; }
    public void setExifData(Map<String, Object> exifData) { 
        this.exifData = exifData; 
    }
    
    public Map<String, Object> getAiTags() { return aiTags; }
    public void setAiTags(Map<String, Object> aiTags) { 
        this.aiTags = aiTags; 
    }
    
    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { 
        this.metadata = metadata; 
    }
    
    public Double getLocationLat() { return locationLat; }
    public void setLocationLat(Double locationLat) { 
        this.locationLat = locationLat; 
    }
    
    public Double getLocationLon() { return locationLon; }
    public void setLocationLon(Double locationLon) { 
        this.locationLon = locationLon; 
    }
    
    public LocalDateTime getTakenAt() { return takenAt; }
    public void setTakenAt(LocalDateTime takenAt) { 
        this.takenAt = takenAt; 
    }
    
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { 
        this.uploadedAt = uploadedAt; 
    }
    
    public LocalDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(LocalDateTime processedAt) { 
        this.processedAt = processedAt; 
    }
}

