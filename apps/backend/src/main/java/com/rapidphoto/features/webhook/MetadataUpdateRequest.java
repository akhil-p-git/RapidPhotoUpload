package com.rapidphoto.features.webhook;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public class MetadataUpdateRequest {
    @NotBlank(message = "Photo ID is required")
    private String photoId;
    
    private Map<String, Object> exifData;
    private Integer width;
    private Integer height;
    private Double locationLat;
    private Double locationLon;
    private String takenAt; // ISO format

    public MetadataUpdateRequest() {}

    public String getPhotoId() {
        return photoId;
    }

    public void setPhotoId(String photoId) {
        this.photoId = photoId;
    }

    public Map<String, Object> getExifData() {
        return exifData;
    }

    public void setExifData(Map<String, Object> exifData) {
        this.exifData = exifData;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public Double getLocationLat() {
        return locationLat;
    }

    public void setLocationLat(Double locationLat) {
        this.locationLat = locationLat;
    }

    public Double getLocationLon() {
        return locationLon;
    }

    public void setLocationLon(Double locationLon) {
        this.locationLon = locationLon;
    }

    public String getTakenAt() {
        return takenAt;
    }

    public void setTakenAt(String takenAt) {
        this.takenAt = takenAt;
    }
}

