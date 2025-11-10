package com.rapidphoto.domain.events;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface DomainEventRepository extends JpaRepository<DomainEventEntity, UUID> {
    List<DomainEventEntity> findByAggregateIdAndAggregateType(UUID aggregateId, String aggregateType);
    List<DomainEventEntity> findByEventType(String eventType);
    List<DomainEventEntity> findByUserId(UUID userId);
    List<DomainEventEntity> findByCorrelationId(UUID correlationId);
}

