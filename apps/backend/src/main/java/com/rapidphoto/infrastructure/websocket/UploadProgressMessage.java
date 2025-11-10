package com.rapidphoto.infrastructure.websocket;

import java.time.LocalDateTime;
import java.util.UUID;

public class UploadProgressMessage {
    private UUID photoId;
    private UUID userId;
    private String status;
    private Long uploadedBytes;
    private Long totalBytes;
    private Double percentage;
    private Integer uploadedChunks;
    private Integer totalChunks;
    private String message;
    private LocalDateTime timestamp;

    public UploadProgressMessage() {
        this.timestamp = LocalDateTime.now();
    }

    public UploadProgressMessage(UUID photoId, UUID userId, String status) {
        this.photoId = photoId;
        this.userId = userId;
        this.status = status;
        this.timestamp = LocalDateTime.now();
    }

    // Getters and setters
    public UUID getPhotoId() { return photoId; }
    public void setPhotoId(UUID photoId) { this.photoId = photoId; }
    
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public Long getUploadedBytes() { return uploadedBytes; }
    public void setUploadedBytes(Long uploadedBytes) { this.uploadedBytes = uploadedBytes; }
    
    public Long getTotalBytes() { return totalBytes; }
    public void setTotalBytes(Long totalBytes) { this.totalBytes = totalBytes; }
    
    public Double getPercentage() { return percentage; }
    public void setPercentage(Double percentage) { this.percentage = percentage; }
    
    public Integer getUploadedChunks() { return uploadedChunks; }
    public void setUploadedChunks(Integer uploadedChunks) { this.uploadedChunks = uploadedChunks; }
    
    public Integer getTotalChunks() { return totalChunks; }
    public void setTotalChunks(Integer totalChunks) { this.totalChunks = totalChunks; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}

