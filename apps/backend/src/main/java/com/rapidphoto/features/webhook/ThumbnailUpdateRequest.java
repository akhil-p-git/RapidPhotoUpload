package com.rapidphoto.features.webhook;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public class ThumbnailUpdateRequest {
    @NotBlank(message = "Photo ID is required")
    private String photoId;
    
    private Map<String, String> thumbnails; // Map of size -> path

    public ThumbnailUpdateRequest() {}

    public String getPhotoId() {
        return photoId;
    }

    public void setPhotoId(String photoId) {
        this.photoId = photoId;
    }

    public Map<String, String> getThumbnails() {
        return thumbnails;
    }

    public void setThumbnails(Map<String, String> thumbnails) {
        this.thumbnails = thumbnails;
    }
}

