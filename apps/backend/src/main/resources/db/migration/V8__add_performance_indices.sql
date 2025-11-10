-- Performance indices for production
-- Composite indices for common query patterns

-- Photos by user and uploaded date (for gallery pagination)
CREATE INDEX IF NOT EXISTS idx_photos_user_id_uploaded_at 
ON photos(user_id, uploaded_at DESC);

-- Photos by user and status (for filtering)
CREATE INDEX IF NOT EXISTS idx_photos_user_id_status 
ON photos(user_id, status);

-- Photos by user, status, and uploaded date (for filtered gallery)
CREATE INDEX IF NOT EXISTS idx_photos_user_id_status_uploaded_at 
ON photos(user_id, status, uploaded_at DESC);

-- Photos by uploaded date (for recent photos)
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at_desc 
ON photos(uploaded_at DESC);

-- Photos by status (for admin queries)
CREATE INDEX IF NOT EXISTS idx_photos_status_uploaded_at 
ON photos(status, uploaded_at DESC);

-- Users by email (for login lookups)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Users by username (for username lookups)
CREATE INDEX IF NOT EXISTS idx_users_username 
ON users(username);

