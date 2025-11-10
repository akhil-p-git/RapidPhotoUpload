# n8n Workflows Setup Guide

Complete setup guide for the 5 n8n workflows for automated photo processing.

## Quick Start

1. **Start Services:**
   ```bash
   cd apps/n8n
   docker-compose up -d --build
   ```

2. **Access n8n UI:**
   - URL: http://localhost:5678
   - Username: `admin`
   - Password: `rapidphoto123`

3. **Import Workflows:**
   - In n8n UI: Workflows → Import from File
   - Import all 5 JSON files from `./workflows/`:
     - `01-photo-processing-pipeline.json`
     - `02-ai-tagging-classification.json`
     - `03-duplicate-detection.json`
     - `04-smart-organization-clustering.json`
     - `05-storage-tiering-optimization.json`

4. **Configure Environment Variables:**
   - Edit `docker-compose.yml` and add your API keys
   - Or create `.env` file (see `ENVIRONMENT.md`)

5. **Activate Workflows:**
   - In n8n UI, activate all 5 workflows
   - They will listen for webhooks automatically

6. **Test Workflows:**
   ```bash
   ./test-workflows.sh
   ```

## Prerequisites

### Database Migration

Run the database migration to create required tables:

```bash
# The migration file is at:
# apps/backend/src/main/resources/db/migration/V7__add_processing_tables.sql

# Run via Flyway (if using Spring Boot)
# Or manually execute the SQL
```

### Required Tools

The Dockerfile installs these automatically:
- ImageMagick (for thumbnail generation)
- Python 3 + Pillow, imagehash, numpy (for perceptual hashing)
- ExifTool (for EXIF extraction)

### API Keys

You need at least one AI service API key:
- **Google Cloud Vision API** (recommended for development)
- **AWS Rekognition** (for production)
- **Azure Computer Vision** (alternative)

## Workflow Flow

```
Backend Upload
    ↓
Workflow 1: Photo Processing Pipeline
    ├─ Download photo
    ├─ Extract EXIF
    ├─ Generate thumbnails (3 sizes)
    ├─ Generate perceptual hash
    └─ Update database
    ↓
Workflow 2: AI Tagging & Classification
    ├─ Load image
    ├─ Call AI Vision API
    ├─ Extract tags
    ├─ Content moderation
    └─ Save AI tags
    ↓
Workflow 3: Duplicate Detection
    ├─ Get perceptual hash
    ├─ Find similar photos
    ├─ Calculate similarity
    └─ Mark duplicates
    ↓
Workflow 4: Smart Organization & Clustering
    ├─ Get photo data
    ├─ Generate collections
    ├─ Create collections
    └─ Add photo to collections
    ↓
Workflow 5: Storage Tiering & Optimization
    ├─ Check photo age
    ├─ Check access frequency
    ├─ Determine storage tier
    ├─ Move to tier (if needed)
    ├─ Compress (if needed)
    └─ Notify backend
```

## Configuration

### Environment Variables

See `ENVIRONMENT.md` for complete list of environment variables.

Minimum required:
```bash
GOOGLE_VISION_API_KEY=your_key_here
POSTGRES_HOST=postgres
POSTGRES_PASSWORD=postgres
BACKEND_WEBHOOK_URL=http://host.docker.internal:8080/api/webhooks/processing-complete
```

### Database Connection

The workflows use PostgreSQL. Configure in `docker-compose.yml`:

```yaml
environment:
  - POSTGRES_HOST=postgres
  - POSTGRES_PORT=5432
  - POSTGRES_DB=rapidphotoupload
  - POSTGRES_USER=postgres
  - POSTGRES_PASSWORD=postgres
```

### Storage Configuration

For local development with MinIO:
```yaml
environment:
  - AWS_S3_ENDPOINT=http://minio:9000
  - AWS_S3_BUCKET=rapidphotoupload-media
```

For production with AWS S3:
```yaml
environment:
  - AWS_S3_ENDPOINT=  # Leave empty for AWS S3
  - AWS_S3_BUCKET=your-production-bucket
  - AWS_ACCESS_KEY_ID=your_key
  - AWS_SECRET_ACCESS_KEY=your_secret
```

## Testing

### Manual Testing

1. **Test Workflow 1:**
   ```bash
   curl -X POST http://localhost:5678/webhook/photo-uploaded \
     -H "Content-Type: application/json" \
     -d @test-data/sample-payload.json
   ```

2. **Check Execution:**
   - Open n8n UI: http://localhost:5678
   - Go to Executions tab
   - View execution results

3. **Verify Database:**
   ```sql
   SELECT id, processing_status, exif_data, perceptual_hash 
   FROM photos 
   WHERE id = '550e8400-e29b-41d4-a716-446655440000';
   ```

### Automated Testing

Run the test script:
```bash
./test-workflows.sh
```

Or test individual workflows:
```bash
./test-workflows.sh 1  # Test workflow 1
./test-workflows.sh 2  # Test workflow 2
# etc.
```

## Troubleshooting

### Workflow Not Triggering

1. **Check webhook is activated:**
   - In n8n UI, open workflow
   - Ensure webhook node is activated (green toggle)
   - Check webhook URL is correct

2. **Check n8n logs:**
   ```bash
   docker logs rapidphoto-n8n -f
   ```

3. **Test webhook manually:**
   ```bash
   curl -X POST http://localhost:5678/webhook/photo-uploaded \
     -H "Content-Type: application/json" \
     -d '{"photoId":"test","userId":"test","fileName":"test.jpg","fileSizeBytes":1000,"storageLocation":"http://test.com/test.jpg"}'
   ```

### EXIF Extraction Failing

1. **Check ExifTool is installed:**
   ```bash
   docker exec rapidphoto-n8n exiftool -v
   ```

2. **Check image format:**
   - Ensure image is a supported format (JPEG, PNG, TIFF, etc.)
   - Check file is accessible from container

### AI Tagging Failing

1. **Check API key:**
   ```bash
   docker exec rapidphoto-n8n env | grep GOOGLE_VISION_API_KEY
   ```

2. **Check API quota:**
   - Google Cloud Console → APIs & Services → Quotas
   - Ensure quota not exceeded

3. **Test API manually:**
   ```bash
   curl -X POST "https://vision.googleapis.com/v1/images:annotate?key=YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"requests":[{"image":{"content":"base64_encoded_image"},"features":[{"type":"LABEL_DETECTION"}]}]}'
   ```

### Duplicate Detection Not Working

1. **Check perceptual hash is generated:**
   ```sql
   SELECT perceptual_hash FROM photos WHERE id = 'your-photo-id';
   ```

2. **Check database extension:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS "pg_trgm";
   ```

3. **Test Hamming distance manually:**
   ```sql
   SELECT bit_count('10101010'::bit(64) # '10101011'::bit(64));
   ```

### Storage Tiering Not Moving Files

1. **Check S3/MinIO credentials:**
   ```bash
   docker exec rapidphoto-n8n env | grep AWS
   ```

2. **Check storage endpoint:**
   - Verify MinIO is running: `docker ps | grep minio`
   - Test connectivity: `curl http://minio:9000/minio/health/live`

3. **Check file permissions:**
   - Ensure n8n container has write access to storage

## Monitoring

### n8n UI

- **Executions:** View all workflow executions
- **Logs:** Check execution logs for errors
- **Metrics:** Monitor execution times and success rates

### Database Queries

Check processing status:
```sql
SELECT 
  processing_status,
  COUNT(*) as count
FROM photos
GROUP BY processing_status;
```

Check AI tags:
```sql
SELECT 
  source,
  COUNT(*) as tag_count,
  AVG(confidence) as avg_confidence
FROM ai_tags
GROUP BY source;
```

Check collections:
```sql
SELECT 
  name,
  photo_count,
  auto_generated
FROM collections
ORDER BY created_at DESC;
```

## Production Deployment

### Security

1. **Use environment variables for secrets**
2. **Enable HTTPS for n8n**
3. **Use OAuth instead of basic auth**
4. **Rotate credentials regularly**
5. **Use least-privilege IAM roles**

### Performance

1. **Increase concurrency limit:**
   ```yaml
   environment:
     - N8N_CONCURRENCY_PRODUCTION_LIMIT=50
   ```

2. **Use Redis for queue:**
   - Already configured in docker-compose.yml

3. **Monitor execution times:**
   - Set up alerts for slow executions

### Scaling

1. **Horizontal scaling:**
   - Run multiple n8n instances
   - Use load balancer for webhooks

2. **Database connection pooling:**
   - Configure PostgreSQL connection pool
   - Use read replicas for queries

## Support

For issues:
1. Check n8n logs: `docker logs rapidphoto-n8n`
2. Check database logs: `docker logs rapidphoto-postgres`
3. Check workflow execution logs in n8n UI
4. Review `WORKFLOWS.md` for workflow details

## Next Steps

1. ✅ Import all 5 workflows
2. ✅ Configure environment variables
3. ✅ Activate workflows
4. ✅ Test with sample photo
5. ✅ Monitor execution logs
6. ✅ Verify database updates
7. ✅ Integrate with backend webhooks

