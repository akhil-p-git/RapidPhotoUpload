package com.rapidphoto.features.gallery;

import java.util.Map;

public class UpdatePhotoMetadataRequest {
    private Map<String, Object> exifData;
    private Map<String, Object> metadata;
    private Integer width;
    private Integer height;
    private Double locationLat;
    private Double locationLon;
    private String takenAt;

    public UpdatePhotoMetadataRequest() {}

    // Getters and setters
    public Map<String, Object> getExifData() { return exifData; }
    public void setExifData(Map<String, Object> exifData) { this.exifData = exifData; }
    
    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
    
    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }
    
    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }
    
    public Double getLocationLat() { return locationLat; }
    public void setLocationLat(Double locationLat) { this.locationLat = locationLat; }
    
    public Double getLocationLon() { return locationLon; }
    public void setLocationLon(Double locationLon) { this.locationLon = locationLon; }
    
    public String getTakenAt() { return takenAt; }
    public void setTakenAt(String takenAt) { this.takenAt = takenAt; }
}

