package com.rapidphoto.domain.events;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "domain_events")
public class DomainEventEntity {
    
    @Id
    private UUID id;
    
    @Column(name = "aggregate_id", nullable = false)
    private UUID aggregateId;
    
    @Column(name = "aggregate_type", nullable = false)
    private String aggregateType;
    
    @Column(name = "event_type", nullable = false)
    private String eventType;
    
    @Column(name = "event_data", nullable = false, columnDefinition = "jsonb")
    @Convert(converter = JsonMapConverter.class)
    private Map<String, Object> eventData;
    
    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;
    
    @Column(name = "user_id")
    private UUID userId;
    
    @Column(name = "correlation_id")
    private UUID correlationId;
    
    @Column(nullable = false)
    private Integer version;

    protected DomainEventEntity() {} // JPA

    public DomainEventEntity(DomainEvent event) {
        this.id = event.getEventId();
        this.aggregateId = event.getAggregateId();
        this.aggregateType = event.getAggregateType();
        this.eventType = event.getEventType();
        this.occurredAt = event.getOccurredAt();
        this.userId = event.getUserId();
        this.correlationId = event.getCorrelationId();
        this.version = 1;
        // eventData will be serialized from the event
    }

    public UUID getId() {
        return id;
    }

    public UUID getAggregateId() {
        return aggregateId;
    }

    public String getAggregateType() {
        return aggregateType;
    }

    public String getEventType() {
        return eventType;
    }

    public Map<String, Object> getEventData() {
        return eventData;
    }

    public void setEventData(Map<String, Object> eventData) {
        this.eventData = eventData;
    }

    public LocalDateTime getOccurredAt() {
        return occurredAt;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getCorrelationId() {
        return correlationId;
    }

    public Integer getVersion() {
        return version;
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

