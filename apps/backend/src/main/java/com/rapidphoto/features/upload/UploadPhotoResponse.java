package com.rapidphoto.features.upload;

import java.util.UUID;

public class UploadPhotoResponse {
    private UUID photoId;
    private String uploadUrl;
    private String status;
    private String message;

    public UploadPhotoResponse() {}

    public UploadPhotoResponse(UUID photoId, String uploadUrl, String status, String message) {
        this.photoId = photoId;
        this.uploadUrl = uploadUrl;
        this.status = status;
        this.message = message;
    }

    // Getters and setters
    public UUID getPhotoId() { return photoId; }
    public void setPhotoId(UUID photoId) { this.photoId = photoId; }
    
    public String getUploadUrl() { return uploadUrl; }
    public void setUploadUrl(String uploadUrl) { this.uploadUrl = uploadUrl; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}

