package com.rapidphoto.features.gallery;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public class BatchPhotoRequest {
    @NotEmpty(message = "Photo IDs list cannot be empty")
    private List<UUID> photoIds;

    public BatchPhotoRequest() {}

    public List<UUID> getPhotoIds() {
        return photoIds;
    }

    public void setPhotoIds(List<UUID> photoIds) {
        this.photoIds = photoIds;
    }
}

