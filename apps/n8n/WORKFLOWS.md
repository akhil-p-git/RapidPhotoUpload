# n8n Workflows for Photo Processing

This document describes the 5 automated workflows for photo processing in the RapidPhotoUpload platform.

## Overview

The workflows are designed to process photos automatically after upload, performing:
1. EXIF extraction and thumbnail generation
2. AI tagging and classification
3. Duplicate detection
4. Smart organization into collections
5. Storage tiering and optimization

## Workflow Architecture

```
Backend Upload → Workflow 1 → Workflow 2 → Workflow 3 → Workflow 4 → Workflow 5 → Backend Notification
```

## Workflow 1: Photo Processing Pipeline

**Trigger:** Webhook at `/webhook/photo-uploaded`

**Payload:**
```json
{
  "photoId": "uuid",
  "userId": "uuid",
  "fileName": "image.jpg",
  "fileSizeBytes": 1234567,
  "storageLocation": "s3://bucket/path" or "file:///local/path"
}
```

**Steps:**
1. **Webhook Trigger** - Receives photo upload notification
2. **Download Photo** - Downloads image from storage location
3. **Extract EXIF Data** - Uses exiftool to extract metadata
4. **Parse EXIF** - Processes EXIF data into structured format
5. **Generate Thumbnails** - Creates 3 sizes:
   - Small: 150x150px
   - Medium: 600x600px
   - Large: 1200x1200px
6. **Generate Perceptual Hash** - Creates pHash for duplicate detection
7. **Update Database** - Stores EXIF, thumbnails, and pHash
8. **Trigger AI Tagging** - Calls Workflow 2

**Database Updates:**
```sql
UPDATE photos SET 
  exif_data = $1::jsonb,
  thumbnail_small_url = $2,
  thumbnail_medium_url = $3,
  thumbnail_large_url = $4,
  perceptual_hash = $5,
  processing_status = 'AI_TAGGING',
  width = $6,
  height = $7,
  location_lat = $8,
  location_lon = $9,
  taken_at = $10::timestamp
WHERE id = $11::uuid
```

## Workflow 2: AI Tagging & Classification

**Trigger:** Called from Workflow 1

**Steps:**
1. **Load Image** - Downloads photo from storage
2. **Google Vision API** - Calls Google Cloud Vision API for:
   - Label detection (20 labels)
   - Object localization (10 objects)
   - Safe search detection
   - Image properties (dominant colors)
3. **Extract Tags** - Processes API response into structured tags
4. **Content Moderation** - Checks for inappropriate content
5. **Save AI Tags** - Stores tags in `ai_tags` table
6. **Update Photo Tags** - Updates `photos.ai_tags` JSONB field
7. **Trigger Duplicate Check** - Calls Workflow 3

**AI Tags Structure:**
```sql
INSERT INTO ai_tags (photo_id, tag, confidence, source, category, detected_at)
VALUES ($1, $2, $3, 'google_vision', $4, NOW())
```

**Content Moderation:**
- If `adult`, `violence`, or `racy` is `VERY_LIKELY`, photo is blocked
- Blocked photos have `processing_status = 'BLOCKED'`

## Workflow 3: Duplicate Detection

**Trigger:** Called from Workflow 2

**Steps:**
1. **Get Photo pHash** - Retrieves perceptual hash from database
2. **Find Similar Photos** - Queries for photos with Hamming distance < 10
3. **Check If Duplicates Found** - Determines if similar photos exist
4. **Process Duplicate Results** - Calculates similarity scores
5. **Save Duplicate Records** - Stores in `duplicate_photos` table
6. **Mark as Duplicate** - Updates photo metadata if duplicate found
7. **Trigger Smart Organization** - Calls Workflow 4

**Duplicate Detection Query:**
```sql
SELECT 
  id, file_name, perceptual_hash,
  (bit_count(perceptual_hash::bit(64) # $1::bit(64))) as hamming_distance
FROM photos
WHERE user_id = $2::uuid
  AND id != $3::uuid
  AND perceptual_hash IS NOT NULL
  AND (bit_count(perceptual_hash::bit(64) # $1::bit(64))) < 10
ORDER BY hamming_distance ASC
LIMIT 10
```

**Similarity Threshold:**
- Hamming distance < 5 = Duplicate
- Hamming distance 5-10 = Similar (stored but not marked as duplicate)

## Workflow 4: Smart Organization & Clustering

**Trigger:** Called from Workflow 3

**Steps:**
1. **Get Photo Data** - Retrieves photo with EXIF and AI tags
2. **Generate Collection Suggestions** - Creates collections based on:
   - **Time-based:** Season, Month, Year (e.g., "Summer 2024", "January 2024")
   - **Location-based:** Photos with GPS coordinates
   - **Content-based:** Scene keywords (beach, sunset, mountain, etc.)
   - **Event-based:** Event keywords (wedding, birthday, vacation, etc.)
3. **Create Collections** - Inserts into `collections` table
4. **Add Photo to Collections** - Links photo to matching collections

**Collection Examples:**
- "Summer 2024" - Time-based
- "Beach Photos" - Content-based (tag: beach)
- "Family Events" - Event-based (tag: family)
- "Location Photos" - Location-based (has GPS)

**Collection Structure:**
```sql
INSERT INTO collections (user_id, name, auto_generated, query_criteria, created_at)
VALUES ($1, $2, true, $3::jsonb, NOW())
ON CONFLICT (user_id, name) DO UPDATE SET updated_at = NOW()
```

## Workflow 5: Storage Tiering & Optimization

**Trigger:** Called from Workflow 4

**Steps:**
1. **Get Photo Info** - Retrieves photo metadata
2. **Check Access Frequency** - Queries `photo_access_log` for last 90 days
3. **Determine Storage Tier** - Based on:
   - Age (days since upload)
   - Access frequency (views/downloads in last 90 days)
4. **Move to Storage Tier** - If needed, moves to appropriate tier:
   - **HOT:** Frequently accessed, recent uploads
   - **COLD:** >90 days old, <5 accesses
   - **GLACIER:** >180 days old, <10 accesses
   - **DEEP_ARCHIVE:** >365 days old, <3 accesses
5. **Compress Image** - If >5MB, re-compresses to 85% quality
6. **Final Database Update** - Sets `processing_status = 'COMPLETED'`
7. **Notify Backend** - Sends completion webhook

**Storage Tier Logic:**
```javascript
if (daysOld > 90 && accessCount < 5) → COLD
if (daysOld > 180 && accessCount < 10) → GLACIER
if (daysOld > 365 && accessCount < 3) → DEEP_ARCHIVE
if (accessCount > 20) → HOT
```

**Final Update:**
```sql
UPDATE photos 
SET 
  processing_status = 'COMPLETED',
  storage_tier = $1,
  processed_at = NOW()
WHERE id = $2::uuid
```

## Environment Variables

Required environment variables in `docker-compose.yml`:

```yaml
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=rapidphotoupload
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# AI Services (choose one or more)
GOOGLE_VISION_API_KEY=your_key_here
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AZURE_COMPUTER_VISION_ENDPOINT=your_endpoint
AZURE_COMPUTER_VISION_KEY=your_key

# Storage
AWS_S3_BUCKET=rapidphotoupload-media
AWS_S3_ENDPOINT=http://minio:9000
LOCAL_STORAGE_PATH=/app/storage

# Backend Webhook
BACKEND_WEBHOOK_URL=http://host.docker.internal:8080/api/webhooks/processing-complete
```

## Required Tools

The n8n container needs these tools installed:

```bash
# ImageMagick for thumbnail generation
apk add imagemagick

# Python for perceptual hash generation
apk add python3 py3-pip
pip3 install pillow imagehash numpy

# ExifTool for EXIF extraction
apk add exiftool
```

## Testing

See `test-workflows.sh` for testing scripts.

### Manual Testing

1. **Test Workflow 1:**
```bash
curl -X POST http://localhost:5678/webhook/photo-uploaded \
  -H "Content-Type: application/json" \
  -d '{
    "photoId": "test-123",
    "userId": "user-456",
    "fileName": "test.jpg",
    "fileSizeBytes": 1024000,
    "storageLocation": "http://minio:9000/bucket/test.jpg"
  }'
```

2. **Check Database:**
```sql
SELECT id, processing_status, exif_data, perceptual_hash 
FROM photos 
WHERE id = 'test-123';
```

3. **Verify AI Tags:**
```sql
SELECT * FROM ai_tags WHERE photo_id = 'test-123';
```

4. **Check Collections:**
```sql
SELECT c.name, cp.photo_id 
FROM collections c
JOIN collection_photos cp ON c.id = cp.collection_id
WHERE cp.photo_id = 'test-123';
```

## Error Handling

Each workflow includes error handling:
- **Retry Logic:** Failed operations retry 3 times with exponential backoff
- **Error Logging:** All errors logged to n8n execution logs
- **Status Updates:** Failed photos marked with `processing_status = 'FAILED'`
- **Notifications:** Critical errors can trigger alerts

## Performance Considerations

- **Concurrency:** n8n processes up to 10 concurrent executions
- **Thumbnail Generation:** Uses ImageMagick for fast processing
- **Database Queries:** All queries use indexes for performance
- **Storage Operations:** Async where possible to avoid blocking

## Monitoring

Monitor workflows via:
- n8n UI: http://localhost:5678
- Execution logs in n8n dashboard
- Database queries on `photos.processing_status`
- Webhook response times

## Troubleshooting

### Workflow Not Triggering
- Check webhook URL is correct
- Verify webhook is activated in n8n UI
- Check n8n logs: `docker logs rapidphoto-n8n`

### EXIF Extraction Failing
- Verify exiftool is installed: `docker exec rapidphoto-n8n exiftool -v`
- Check image format is supported
- Verify file is accessible from container

### AI Tagging Failing
- Check API key is set: `echo $GOOGLE_VISION_API_KEY`
- Verify API quota not exceeded
- Check network connectivity from container

### Duplicate Detection Not Working
- Verify perceptual_hash is generated
- Check database has extension: `CREATE EXTENSION IF NOT EXISTS "pg_trgm";`
- Test Hamming distance calculation manually

### Storage Tiering Not Moving Files
- Check S3/MinIO credentials
- Verify storage endpoint is accessible
- Check file permissions

