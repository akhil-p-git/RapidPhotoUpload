package com.rapidphoto.domain.photo;

import java.util.Map;
import java.util.Objects;

public class PhotoMetadata {
    private final Map<String, Object> metadata;
    private final Map<String, Object> exifData;
    private final Map<String, Object> aiTags;
    private final Double locationLat;
    private final Double locationLon;
    private final java.time.LocalDateTime takenAt;

    public PhotoMetadata(Map<String, Object> metadata, Map<String, Object> exifData, 
                        Map<String, Object> aiTags, Double locationLat, Double locationLon,
                        java.time.LocalDateTime takenAt) {
        this.metadata = metadata;
        this.exifData = exifData;
        this.aiTags = aiTags;
        this.locationLat = locationLat;
        this.locationLon = locationLon;
        this.takenAt = takenAt;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public Map<String, Object> getExifData() {
        return exifData;
    }

    public Map<String, Object> getAiTags() {
        return aiTags;
    }

    public Double getLocationLat() {
        return locationLat;
    }

    public Double getLocationLon() {
        return locationLon;
    }

    public java.time.LocalDateTime getTakenAt() {
        return takenAt;
    }

    public boolean hasLocation() {
        return locationLat != null && locationLon != null;
    }

    public boolean hasExifData() {
        return exifData != null && !exifData.isEmpty();
    }

    public boolean hasAiTags() {
        return aiTags != null && !aiTags.isEmpty();
    }
}

