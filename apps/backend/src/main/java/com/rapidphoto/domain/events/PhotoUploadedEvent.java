package com.rapidphoto.domain.events;

import com.rapidphoto.domain.photo.PhotoId;
import com.rapidphoto.domain.user.UserId;
import java.time.LocalDateTime;
import java.util.UUID;

public class PhotoUploadedEvent implements DomainEvent {
    private final UUID eventId;
    private final PhotoId photoId;
    private final UserId userId;
    private final String fileName;
    private final Long fileSizeBytes;
    private final LocalDateTime occurredAt;
    private final UUID correlationId;

    public PhotoUploadedEvent(PhotoId photoId, UserId userId, String fileName, Long fileSizeBytes) {
        this.eventId = UUID.randomUUID();
        this.photoId = photoId;
        this.userId = userId;
        this.fileName = fileName;
        this.fileSizeBytes = fileSizeBytes;
        this.occurredAt = LocalDateTime.now();
        this.correlationId = null;
    }

    public PhotoUploadedEvent(PhotoId photoId, UserId userId, String fileName, Long fileSizeBytes, UUID correlationId) {
        this.eventId = UUID.randomUUID();
        this.photoId = photoId;
        this.userId = userId;
        this.fileName = fileName;
        this.fileSizeBytes = fileSizeBytes;
        this.occurredAt = LocalDateTime.now();
        this.correlationId = correlationId;
    }

    @Override
    public UUID getEventId() {
        return eventId;
    }

    @Override
    public UUID getAggregateId() {
        return photoId.getValue();
    }

    @Override
    public String getAggregateType() {
        return "Photo";
    }

    @Override
    public String getEventType() {
        return "PhotoUploaded";
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

    public PhotoId getPhotoId() {
        return photoId;
    }

    public String getFileName() {
        return fileName;
    }

    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }
}

