package com.rapidphoto.features.gallery;

import java.util.Map;

public class UpdatePhotoAiTagsRequest {
    private Map<String, Object> aiTags;

    public UpdatePhotoAiTagsRequest() {}

    public Map<String, Object> getAiTags() { return aiTags; }
    public void setAiTags(Map<String, Object> aiTags) { this.aiTags = aiTags; }
}

