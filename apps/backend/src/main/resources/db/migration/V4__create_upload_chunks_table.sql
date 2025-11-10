-- Upload chunks (entity, not aggregate root)
CREATE TABLE upload_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    chunk_number INTEGER NOT NULL,
    chunk_size BIGINT NOT NULL,
    checksum VARCHAR(64),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    uploaded_at TIMESTAMP,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    version INTEGER NOT NULL DEFAULT 0,
    UNIQUE(photo_id, chunk_number)
);

CREATE INDEX idx_upload_chunks_photo_id ON upload_chunks(photo_id);
CREATE INDEX idx_upload_chunks_status ON upload_chunks(status);

