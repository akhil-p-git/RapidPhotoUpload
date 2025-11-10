package com.rapidphoto.application.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class UserDto {
    private UUID id;
    private String email;
    private String username;
    private String fullName;
    private long storageQuotaBytes;
    private long storageUsedBytes;
    private String status;
    private LocalDateTime createdAt;

    public UserDto() {}

    public UserDto(UUID id, String email, String username, String fullName,
                   long storageQuotaBytes, long storageUsedBytes, String status,
                   LocalDateTime createdAt) {
        this.id = id;
        this.email = email;
        this.username = username;
        this.fullName = fullName;
        this.storageQuotaBytes = storageQuotaBytes;
        this.storageUsedBytes = storageUsedBytes;
        this.status = status;
        this.createdAt = createdAt;
    }

    // Getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    
    public long getStorageQuotaBytes() { return storageQuotaBytes; }
    public void setStorageQuotaBytes(long storageQuotaBytes) { 
        this.storageQuotaBytes = storageQuotaBytes; 
    }
    
    public long getStorageUsedBytes() { return storageUsedBytes; }
    public void setStorageUsedBytes(long storageUsedBytes) { 
        this.storageUsedBytes = storageUsedBytes; 
    }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

