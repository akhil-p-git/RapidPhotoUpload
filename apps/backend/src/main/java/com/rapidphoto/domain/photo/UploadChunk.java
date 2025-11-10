package com.rapidphoto.domain.photo;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "upload_chunks")
public class UploadChunk {
    
    @Id
    private UUID id;
    
    @Column(name = "photo_id", nullable = false)
    private UUID photoId;
    
    @Column(name = "chunk_number", nullable = false)
    private Integer chunkNumber;
    
    @Column(name = "chunk_size", nullable = false)
    private Long chunkSize;
    
    @Column(name = "checksum")
    private String checksum;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChunkStatus status;
    
    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;
    
    @Column(name = "retry_count", nullable = false)
    private Integer retryCount;
    
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    
    @Version
    private Integer version;

    protected UploadChunk() {} // JPA

    public UploadChunk(UUID id, UUID photoId, Integer chunkNumber, Long chunkSize) {
        this.id = Objects.requireNonNull(id);
        this.photoId = Objects.requireNonNull(photoId);
        this.chunkNumber = Objects.requireNonNull(chunkNumber);
        this.chunkSize = Objects.requireNonNull(chunkSize);
        this.status = ChunkStatus.PENDING;
        this.retryCount = 0;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPhotoId() {
        return photoId;
    }

    public Integer getChunkNumber() {
        return chunkNumber;
    }

    public Long getChunkSize() {
        return chunkSize;
    }

    public String getChecksum() {
        return checksum;
    }

    public void setChecksum(String checksum) {
        this.checksum = checksum;
    }

    public ChunkStatus getStatus() {
        return status;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public Integer getRetryCount() {
        return retryCount;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public Integer getVersion() {
        return version;
    }

    public void markAsUploaded() {
        this.status = ChunkStatus.UPLOADED;
        this.uploadedAt = LocalDateTime.now();
    }

    public void markAsFailed(String errorMessage) {
        this.status = ChunkStatus.FAILED;
        this.errorMessage = errorMessage;
        this.retryCount++;
    }

    public void retry() {
        this.status = ChunkStatus.PENDING;
        this.errorMessage = null;
        this.retryCount++;
    }

    public enum ChunkStatus {
        PENDING,
        UPLOADED,
        FAILED
    }
}

