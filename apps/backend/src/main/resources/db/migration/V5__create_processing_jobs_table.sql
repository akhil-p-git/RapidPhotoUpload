-- Processing jobs for n8n integration
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    n8n_workflow_id VARCHAR(255),
    n8n_execution_id VARCHAR(255),
    priority INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result_data JSONB,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_processing_jobs_photo_id ON processing_jobs(photo_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_job_type ON processing_jobs(job_type);
CREATE INDEX idx_processing_jobs_priority ON processing_jobs(priority DESC, created_at ASC);
CREATE INDEX idx_processing_jobs_n8n_execution_id ON processing_jobs(n8n_execution_id) WHERE n8n_execution_id IS NOT NULL;

