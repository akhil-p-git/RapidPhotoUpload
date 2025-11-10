package com.rapidphoto.domain.events;

import java.time.LocalDateTime;
import java.util.UUID;

public interface DomainEvent {
    UUID getEventId();
    UUID getAggregateId();
    String getAggregateType();
    String getEventType();
    LocalDateTime getOccurredAt();
    UUID getUserId();
    UUID getCorrelationId();
}

