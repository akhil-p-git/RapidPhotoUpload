package com.rapidphoto.features.upload;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class CompleteUploadRequest {
    @NotNull(message = "Photo ID is required")
    private UUID photoId;

    public CompleteUploadRequest() {}

    public CompleteUploadRequest(UUID photoId) {
        this.photoId = photoId;
    }

    public UUID getPhotoId() {
        return photoId;
    }

    public void setPhotoId(UUID photoId) {
        this.photoId = photoId;
    }
}

