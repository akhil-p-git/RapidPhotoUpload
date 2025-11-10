package com.rapidphoto.features.upload.chunk;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class ChunkUploadRequest {
    
    @NotNull
    private UUID photoId;
    
    @NotNull
    @Min(0)
    private Integer chunkNumber;
    
    @NotNull
    @Min(0)
    private Integer totalChunks;
    
    @NotNull
    @Min(1)
    private Long chunkSize;
    
    private String checksum;

    // Constructors
    public ChunkUploadRequest() {}

    // Getters and setters
    public UUID getPhotoId() { return photoId; }
    public void setPhotoId(UUID photoId) { this.photoId = photoId; }
    
    public Integer getChunkNumber() { return chunkNumber; }
    public void setChunkNumber(Integer chunkNumber) { this.chunkNumber = chunkNumber; }
    
    public Integer getTotalChunks() { return totalChunks; }
    public void setTotalChunks(Integer totalChunks) { this.totalChunks = totalChunks; }
    
    public Long getChunkSize() { return chunkSize; }
    public void setChunkSize(Long chunkSize) { this.chunkSize = chunkSize; }
    
    public String getChecksum() { return checksum; }
    public void setChecksum(String checksum) { this.checksum = checksum; }
}

