-- Add thumbnail fields to photos table
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS thumbnail_small_url VARCHAR(1000),
ADD COLUMN IF NOT EXISTS thumbnail_medium_url VARCHAR(1000),
ADD COLUMN IF NOT EXISTS thumbnail_large_url VARCHAR(1000),
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS storage_tier VARCHAR(20) DEFAULT 'HOT';

-- Create ai_tags table for detailed AI tag storage
CREATE TABLE IF NOT EXISTS ai_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    tag VARCHAR(255) NOT NULL,
    confidence DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000
    source VARCHAR(50) NOT NULL, -- 'google_vision', 'aws_rekognition', 'azure_vision', 'clip'
    category VARCHAR(50), -- 'object', 'scene', 'color', 'text', 'face'
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_tags_photo_id ON ai_tags(photo_id);
CREATE INDEX idx_ai_tags_tag ON ai_tags(tag);
CREATE INDEX idx_ai_tags_source ON ai_tags(source);
CREATE INDEX idx_ai_tags_confidence ON ai_tags(confidence DESC);

-- Create collections table for smart organization
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    auto_generated BOOLEAN NOT NULL DEFAULT false,
    query_criteria JSONB, -- Criteria used to generate collection
    cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
    photo_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_auto_generated ON collections(auto_generated);
CREATE INDEX idx_collections_query_criteria ON collections USING GIN(query_criteria);

-- Create collection_photos junction table
CREATE TABLE IF NOT EXISTS collection_photos (
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection_id, photo_id)
);

CREATE INDEX idx_collection_photos_collection_id ON collection_photos(collection_id);
CREATE INDEX idx_collection_photos_photo_id ON collection_photos(photo_id);

-- Create photo_access_log for tracking access frequency
CREATE TABLE IF NOT EXISTS photo_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_type VARCHAR(50) NOT NULL, -- 'view', 'download', 'share', 'edit'
    accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45), -- IPv6 compatible
    user_agent TEXT
);

CREATE INDEX idx_photo_access_log_photo_id ON photo_access_log(photo_id);
CREATE INDEX idx_photo_access_log_user_id ON photo_access_log(user_id);
CREATE INDEX idx_photo_access_log_accessed_at ON photo_access_log(accessed_at DESC);
CREATE INDEX idx_photo_access_log_photo_accessed ON photo_access_log(photo_id, accessed_at DESC);

-- Create duplicate_photos table for tracking duplicate relationships
CREATE TABLE IF NOT EXISTS duplicate_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    duplicate_of_photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000
    hamming_distance INTEGER,
    detection_method VARCHAR(50) NOT NULL, -- 'perceptual_hash', 'checksum', 'ai_similarity'
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_primary BOOLEAN NOT NULL DEFAULT false, -- True if this is the "original"
    UNIQUE(photo_id, duplicate_of_photo_id)
);

CREATE INDEX idx_duplicate_photos_photo_id ON duplicate_photos(photo_id);
CREATE INDEX idx_duplicate_photos_duplicate_of ON duplicate_photos(duplicate_of_photo_id);
CREATE INDEX idx_duplicate_photos_similarity ON duplicate_photos(similarity_score DESC);

-- Function to update collection photo count
CREATE OR REPLACE FUNCTION update_collection_photo_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE collections 
        SET photo_count = photo_count + 1 
        WHERE id = NEW.collection_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE collections 
        SET photo_count = GREATEST(0, photo_count - 1) 
        WHERE id = OLD.collection_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain collection photo count
CREATE TRIGGER trigger_update_collection_photo_count
AFTER INSERT OR DELETE ON collection_photos
FOR EACH ROW EXECUTE FUNCTION update_collection_photo_count();

-- Function to calculate photo access frequency (last 90 days)
CREATE OR REPLACE FUNCTION get_photo_access_frequency(photo_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM photo_access_log 
        WHERE photo_id = photo_uuid 
        AND accessed_at > NOW() - INTERVAL '90 days'
    );
END;
$$ LANGUAGE plpgsql;

