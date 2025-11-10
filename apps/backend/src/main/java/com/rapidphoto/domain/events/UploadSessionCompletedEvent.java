package com.rapidphoto.domain.events;

import com.rapidphoto.domain.upload.UploadSessionId;
import com.rapidphoto.domain.user.UserId;
import java.time.LocalDateTime;
import java.util.UUID;

public class UploadSessionCompletedEvent implements DomainEvent {
    private final UUID eventId;
    private final UploadSessionId uploadSessionId;
    private final UserId userId;
    private final Integer totalFiles;
    private final Integer completedFiles;
    private final Integer failedFiles;
    private final Long totalBytes;
    private final LocalDateTime occurredAt;
    private final UUID correlationId;

    public UploadSessionCompletedEvent(UploadSessionId uploadSessionId, UserId userId, 
                                      Integer totalFiles, Integer completedFiles, 
                                      Integer failedFiles, Long totalBytes) {
        this.eventId = UUID.randomUUID();
        this.uploadSessionId = uploadSessionId;
        this.userId = userId;
        this.totalFiles = totalFiles;
        this.completedFiles = completedFiles;
        this.failedFiles = failedFiles;
        this.totalBytes = totalBytes;
        this.occurredAt = LocalDateTime.now();
        this.correlationId = null;
    }

    public UploadSessionCompletedEvent(UploadSessionId uploadSessionId, UserId userId, 
                                      Integer totalFiles, Integer completedFiles, 
                                      Integer failedFiles, Long totalBytes, UUID correlationId) {
        this.eventId = UUID.randomUUID();
        this.uploadSessionId = uploadSessionId;
        this.userId = userId;
        this.totalFiles = totalFiles;
        this.completedFiles = completedFiles;
        this.failedFiles = failedFiles;
        this.totalBytes = totalBytes;
        this.occurredAt = LocalDateTime.now();
        this.correlationId = correlationId;
    }

    @Override
    public UUID getEventId() {
        return eventId;
    }

    @Override
    public UUID getAggregateId() {
        return uploadSessionId.getValue();
    }

    @Override
    public String getAggregateType() {
        return "UploadSession";
    }

    @Override
    public String getEventType() {
        return "UploadSessionCompleted";
    }

    @Override
    public LocalDateTime getOccurredAt() {
        return occurredAt;
    }

    @Override
    public UUID getUserId() {
        return userId.getValue();
    }

    @Override
    public UUID getCorrelationId() {
        return correlationId;
    }

    public UploadSessionId getUploadSessionId() {
        return uploadSessionId;
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
}

