-- Photos aggregate root
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upload_session_id UUID REFERENCES upload_sessions(id) ON DELETE SET NULL,
    file_name VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER,
    height INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'UPLOADING',
    storage_path VARCHAR(1000) NOT NULL,
    storage_type VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    s3_bucket VARCHAR(255),
    s3_key VARCHAR(1000),
    checksum_md5 VARCHAR(32),
    checksum_sha256 VARCHAR(64),
    perceptual_hash VARCHAR(64),
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    metadata JSONB,
    exif_data JSONB,
    ai_tags JSONB,
    location_lat DECIMAL(10, 8),
    location_lon DECIMAL(11, 8),
    taken_at TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_upload_session_id ON photos(upload_session_id);
CREATE INDEX idx_photos_status ON photos(status);
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at DESC);
CREATE INDEX idx_photos_perceptual_hash ON photos(perceptual_hash) WHERE perceptual_hash IS NOT NULL;
CREATE INDEX idx_photos_checksum_sha256 ON photos(checksum_sha256) WHERE checksum_sha256 IS NOT NULL;
CREATE INDEX idx_photos_ai_tags ON photos USING GIN(ai_tags) WHERE ai_tags IS NOT NULL;
CREATE INDEX idx_photos_location ON photos(location_lat, location_lon) WHERE location_lat IS NOT NULL;

