package com.rapidphoto.features.user;

import java.util.UUID;

public class UserResponse {
    private UUID id;
    private String email;
    private String username;
    private String fullName;
    private long storageQuotaBytes;
    private long storageUsedBytes;

    public UserResponse() {}

    public UserResponse(UUID id, String email, String username, String fullName,
                       long storageQuotaBytes, long storageUsedBytes) {
        this.id = id;
        this.email = email;
        this.username = username;
        this.fullName = fullName;
        this.storageQuotaBytes = storageQuotaBytes;
        this.storageUsedBytes = storageUsedBytes;
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
}

