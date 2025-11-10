package com.rapidphoto.features.webhook;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public class AiTagsUpdateRequest {
    @NotBlank(message = "Photo ID is required")
    private String photoId;
    
    private Map<String, Object> aiTags;

    public AiTagsUpdateRequest() {}

    public String getPhotoId() {
        return photoId;
    }

    public void setPhotoId(String photoId) {
        this.photoId = photoId;
    }

    public Map<String, Object> getAiTags() {
        return aiTags;
    }

    public void setAiTags(Map<String, Object> aiTags) {
        this.aiTags = aiTags;
    }
}

