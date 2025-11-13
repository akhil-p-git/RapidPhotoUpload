package com.rapidphoto.features.upload;

import java.util.UUID;

public class PresignedUploadResponse {
    private UUID photoId;
    private String uploadUrl;
    private String storagePath;
    private String message;

    public PresignedUploadResponse() {}

    public PresignedUploadResponse(UUID photoId, String uploadUrl, String storagePath, String message) {
        this.photoId = photoId;
        this.uploadUrl = uploadUrl;
        this.storagePath = storagePath;
        this.message = message;
    }

    public UUID getPhotoId() {
        return photoId;
    }

    public void setPhotoId(UUID photoId) {
        this.photoId = photoId;
    }

    public String getUploadUrl() {
        return uploadUrl;
    }

    public void setUploadUrl(String uploadUrl) {
        this.uploadUrl = uploadUrl;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public void setStoragePath(String storagePath) {
        this.storagePath = storagePath;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}

