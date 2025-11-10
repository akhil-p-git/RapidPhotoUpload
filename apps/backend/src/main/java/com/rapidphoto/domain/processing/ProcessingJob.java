package com.rapidphoto.domain.processing;

import com.rapidphoto.domain.photo.PhotoId;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "processing_jobs")
public class ProcessingJob {
    
    @Id
    private UUID id;
    
    @Column(name = "photo_id", nullable = false)
    private UUID photoId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "job_type", nullable = false)
    private JobType jobType;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status;
    
    @Column(name = "n8n_workflow_id")
    private String n8nWorkflowId;
    
    @Column(name = "n8n_execution_id")
    private String n8nExecutionId;
    
    @Column(nullable = false)
    private Integer priority;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "started_at")
    private LocalDateTime startedAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @Column(name = "result_data", columnDefinition = "jsonb")
    @Convert(converter = JsonMapConverter.class)
    private Map<String, Object> resultData;
    
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    
    @Column(name = "retry_count", nullable = false)
    private Integer retryCount;
    
    @Column(name = "max_retries", nullable = false)
    private Integer maxRetries;
    
    @Version
    private Integer version;

    protected ProcessingJob() {} // JPA

    public ProcessingJob(UUID id, PhotoId photoId, JobType jobType) {
        this.id = Objects.requireNonNull(id);
        this.photoId = photoId.getValue();
        this.jobType = Objects.requireNonNull(jobType);
        this.status = JobStatus.PENDING;
        this.priority = 5;
        this.createdAt = LocalDateTime.now();
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    public UUID getId() {
        return id;
    }

    public PhotoId getPhotoId() {
        return new PhotoId(photoId);
    }

    public JobType getJobType() {
        return jobType;
    }

    public JobStatus getStatus() {
        return status;
    }

    public String getN8nWorkflowId() {
        return n8nWorkflowId;
    }

    public void setN8nWorkflowId(String n8nWorkflowId) {
        this.n8nWorkflowId = n8nWorkflowId;
    }

    public String getN8nExecutionId() {
        return n8nExecutionId;
    }

    public void setN8nExecutionId(String n8nExecutionId) {
        this.n8nExecutionId = n8nExecutionId;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public Map<String, Object> getResultData() {
        return resultData;
    }

    public void setResultData(Map<String, Object> resultData) {
        this.resultData = resultData;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public Integer getRetryCount() {
        return retryCount;
    }

    public Integer getMaxRetries() {
        return maxRetries;
    }

    public void setMaxRetries(Integer maxRetries) {
        this.maxRetries = maxRetries;
    }

    public Integer getVersion() {
        return version;
    }

    public void start() {
        this.status = JobStatus.RUNNING;
        this.startedAt = LocalDateTime.now();
    }

    public void complete(Map<String, Object> resultData) {
        this.status = JobStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
        this.resultData = resultData;
    }

    public void fail(String errorMessage) {
        this.status = JobStatus.FAILED;
        this.completedAt = LocalDateTime.now();
        this.errorMessage = errorMessage;
    }

    public void cancel() {
        this.status = JobStatus.CANCELLED;
        this.completedAt = LocalDateTime.now();
    }

    public boolean canRetry() {
        return retryCount < maxRetries && status == JobStatus.FAILED;
    }

    public void retry() {
        if (!canRetry()) {
            throw new IllegalStateException("Cannot retry this job");
        }
        this.status = JobStatus.PENDING;
        this.errorMessage = null;
        this.retryCount++;
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

