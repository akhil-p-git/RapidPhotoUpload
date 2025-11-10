package com.rapidphoto.features.upload.chunk;

import java.util.List;
import java.util.UUID;

public class ChunkUploadResponse {
    private UUID photoId;
    private Integer chunkNumber;
    private String status;
    private Integer uploadedChunks;
    private Integer totalChunks;
    private Double progress;
    private List<Integer> missingChunks;
    private String message;

    public ChunkUploadResponse() {}

    public ChunkUploadResponse(UUID photoId, Integer chunkNumber, String status, 
                              Integer uploadedChunks, Integer totalChunks) {
        this.photoId = photoId;
        this.chunkNumber = chunkNumber;
        this.status = status;
        this.uploadedChunks = uploadedChunks;
        this.totalChunks = totalChunks;
        this.progress = totalChunks > 0 ? (double) uploadedChunks / totalChunks * 100 : 0;
    }

    // Getters and setters
    public UUID getPhotoId() { return photoId; }
    public void setPhotoId(UUID photoId) { this.photoId = photoId; }
    
    public Integer getChunkNumber() { return chunkNumber; }
    public void setChunkNumber(Integer chunkNumber) { this.chunkNumber = chunkNumber; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public Integer getUploadedChunks() { return uploadedChunks; }
    public void setUploadedChunks(Integer uploadedChunks) { this.uploadedChunks = uploadedChunks; }
    
    public Integer getTotalChunks() { return totalChunks; }
    public void setTotalChunks(Integer totalChunks) { this.totalChunks = totalChunks; }
    
    public Double getProgress() { return progress; }
    public void setProgress(Double progress) { this.progress = progress; }
    
    public List<Integer> getMissingChunks() { return missingChunks; }
    public void setMissingChunks(List<Integer> missingChunks) { this.missingChunks = missingChunks; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}

