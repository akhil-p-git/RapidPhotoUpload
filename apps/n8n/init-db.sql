-- Initialize database schemas

-- Create n8n schema (n8n will create its own tables here)
CREATE SCHEMA IF NOT EXISTS n8n;

-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON SCHEMA n8n TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA n8n TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA n8n TO postgres;

-- Create schema for the main application
CREATE SCHEMA IF NOT EXISTS public;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- For encryption
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "postgis";        -- For geo-location features

COMMENT ON SCHEMA n8n IS 'Schema for n8n workflow automation tables';
COMMENT ON SCHEMA public IS 'Schema for RapidPhotoUpload application tables';
