package com.rapidphoto.domain.upload;

import com.rapidphoto.domain.user.UserId;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "upload_sessions")
public class UploadSession {
    
    @Id
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "session_key", nullable = false, unique = true)
    private String sessionKey;
    
    @Column(name = "total_files", nullable = false)
    private Integer totalFiles;
    
    @Column(name = "completed_files", nullable = false)
    private Integer completedFiles;
    
    @Column(name = "failed_files", nullable = false)
    private Integer failedFiles;
    
    @Column(name = "total_bytes", nullable = false)
    private Long totalBytes;
    
    @Column(name = "uploaded_bytes", nullable = false)
    private Long uploadedBytes;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UploadSessionStatus status;
    
    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Convert(converter = JsonMapConverter.class)
    private Map<String, Object> metadata;
    
    @Version
    private Integer version;

    protected UploadSession() {} // JPA

    public UploadSession(UUID id, UserId userId, String sessionKey, 
                       Integer totalFiles, Long totalBytes) {
        this.id = Objects.requireNonNull(id);
        this.userId = userId.getValue();
        this.sessionKey = Objects.requireNonNull(sessionKey);
        this.totalFiles = Objects.requireNonNull(totalFiles);
        this.totalBytes = Objects.requireNonNull(totalBytes);
        this.completedFiles = 0;
        this.failedFiles = 0;
        this.uploadedBytes = 0L;
        this.status = UploadSessionStatus.IN_PROGRESS;
        this.startedAt = LocalDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UploadSessionId getUploadSessionId() {
        return new UploadSessionId(id);
    }

    public UserId getUserId() {
        return new UserId(userId);
    }

    public String getSessionKey() {
        return sessionKey;
    }

    public Integer getTotalFiles() {
        return totalFiles;
    }

    public Integer getCompletedFiles() {
        return completedFiles;
    }

    public Integer getFailedFiles() {
        return failedFiles;
    }

    public Long getTotalBytes() {
        return totalBytes;
    }

    public Long getUploadedBytes() {
        return uploadedBytes;
    }

    public UploadSessionStatus getStatus() {
        return status;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    public Integer getVersion() {
        return version;
    }

    public void recordFileCompleted(long bytes) {
        this.completedFiles++;
        this.uploadedBytes += bytes;
        checkCompletion();
    }

    public void recordFileFailed() {
        this.failedFiles++;
        checkCompletion();
    }

    public void recordBytesUploaded(long bytes) {
        this.uploadedBytes += bytes;
    }

    private void checkCompletion() {
        if (completedFiles + failedFiles >= totalFiles) {
            if (failedFiles == 0) {
                this.status = UploadSessionStatus.COMPLETED;
            } else {
                this.status = UploadSessionStatus.FAILED;
            }
            this.completedAt = LocalDateTime.now();
        }
    }

    public void cancel() {
        this.status = UploadSessionStatus.CANCELLED;
        this.completedAt = LocalDateTime.now();
    }

    public double getProgressPercentage() {
        if (totalBytes == 0) return 0.0;
        return (double) uploadedBytes / totalBytes * 100;
    }
}

// Simple JSON converter for Map<String, Object>
@Converter
class JsonMapConverter implements AttributeConverter<Map<String, Object>, String> {
    @Override
    public String convertToDatabaseColumn(Map<String, Object> attribute) {
        // For now, return null - will implement with Jackson later
        return null;
    }

    @Override
    public Map<String, Object> convertToEntityAttribute(String dbData) {
        // For now, return null - will implement with Jackson later
        return null;
    }
}

