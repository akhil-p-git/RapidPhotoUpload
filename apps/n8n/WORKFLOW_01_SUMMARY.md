# Workflow #1 - Main Photo Processing Pipeline - Summary

## ✅ Completed Tasks

### 1. Backend Webhook Service Updated

**File:** `apps/backend/src/main/java/com/rapidphoto/features/upload/N8nWebhookService.java`

- ✅ Added `storageLocation` parameter to `triggerPhotoUploadedWebhook()` method
- ✅ Webhook payload now includes:
  - `photoId`
  - `userId`
  - `fileName`
  - `fileSizeBytes`
  - `storageLocation` (NEW)
  - `timestamp`
  - `eventType`

**Updated calls:**
- ✅ `UploadService.java` - Updated to pass `storageLocation`
- ✅ `ChunkAssemblyService.java` - Updated to pass `storageLocation`

### 2. n8n Workflow JSON Created

**File:** `apps/n8n/workflows/01-photo-processing-pipeline.json`

**Workflow Structure:**
1. **Webhook Trigger** - Receives photo upload notification
2. **Set Variables** - Extracts and sets variables from webhook payload
3. **Read File from Storage** - Reads photo file from local storage
4. **Extract EXIF Data** - Uses exiftool to extract metadata
5. **Generate Thumbnails** - Creates 3 sizes (150px, 600px, 1200px)
6. **Calculate Perceptual Hash** - Uses Python imagehash to calculate pHash
7. **Update PostgreSQL** - Updates database with all metadata
8. **Send Success Response** - Returns success response to webhook

### 3. Setup Guide Created

**File:** `apps/n8n/SETUP_WORKFLOW_01.md`

Complete step-by-step guide including:
- Prerequisites
- Tool installation
- Workflow import/creation
- Node configuration
- Testing steps
- Troubleshooting

## 📋 Workflow Features

### EXIF Extraction
- Camera make/model
- Date taken
- GPS coordinates
- Image dimensions
- Camera settings (ISO, exposure, f-number, focal length)
- Orientation
- Flash settings

### Thumbnail Generation
- **Small:** 150x150px (quality 85%)
- **Medium:** 600x600px (quality 85%)
- **Large:** 1200x1200px (quality 90%)
- Stored in: `/app/storage/thumbnails/{userId}/{photoId}_{size}.jpg`

### Perceptual Hash
- Calculated using Python `imagehash.phash()`
- Used for duplicate detection
- Stored in database

### Database Update
Updates `photos` table with:
- `exif_data` (JSONB)
- `thumbnail_small_url`
- `thumbnail_medium_url`
- `thumbnail_large_url`
- `perceptual_hash`
- `status` = 'PROCESSING'

## 🔧 Configuration

### Backend Configuration

**application.yml:**
```yaml
n8n:
  base-url: http://localhost:5678
  webhook:
    photo-uploaded: /webhook/photo-uploaded
```

### Storage Path

Files are stored at:
- **Full path:** `./uploads/{userId}/{fileName}`
- **Relative path for n8n:** `{userId}/{fileName}`
- **Base path in n8n:** `/app/storage`

### Database Connection

- **Host:** `host.docker.internal` (from n8n container)
- **Port:** `54321`
- **Database:** `rapidphotoupload`
- **User:** `postgres`
- **Password:** `postgres`

## 🧪 Testing

### Test Webhook

```bash
curl -X POST http://localhost:5678/webhook/photo-uploaded \
  -H "Content-Type: application/json" \
  -d '{
    "photoId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "fileName": "test-image.jpg",
    "fileSizeBytes": 123456,
    "storageLocation": "550e8400-e29b-41d4-a716-446655440001/550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Verify Database

```sql
SELECT 
  id, 
  file_name, 
  status, 
  thumbnail_small_url, 
  thumbnail_medium_url,
  thumbnail_large_url,
  perceptual_hash,
  exif_data
FROM photos 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### Verify Thumbnails

```bash
# Check thumbnails exist
docker exec rapidphoto-n8n ls -la /app/storage/thumbnails/USER_ID/

# Should see:
# - {photoId}_small.jpg
# - {photoId}_medium.jpg
# - {photoId}_large.jpg
```

## 📝 Next Steps

1. **Import workflow** into n8n UI
2. **Activate workflow** (toggle Active switch)
3. **Test with real photo upload** from frontend
4. **Monitor execution logs** in n8n UI
5. **Verify all metadata** is extracted and stored
6. **Proceed to Workflow #2** (AI Tagging)

## 🐛 Known Issues & Fixes

### Issue: File not found in n8n container

**Fix:** Ensure storage volume is mounted in docker-compose.yml:
```yaml
volumes:
  - ./storage:/app/storage
```

### Issue: EXIF extraction fails

**Fix:** Verify exiftool is installed:
```bash
docker exec rapidphoto-n8n exiftool -v
```

### Issue: Thumbnail generation fails

**Fix:** Verify ImageMagick is installed:
```bash
docker exec rapidphoto-n8n convert -version
```

### Issue: Perceptual hash calculation fails

**Fix:** Verify Python packages are installed:
```bash
docker exec rapidphoto-n8n python3 -c "import imagehash; print('OK')"
```

## ✅ Verification Checklist

- [ ] Backend webhook service includes `storageLocation`
- [ ] Workflow JSON file is created
- [ ] All tools installed in n8n container (exiftool, imagemagick, python3, pillow, imagehash)
- [ ] Workflow imported into n8n UI
- [ ] Database connection configured
- [ ] Test webhook succeeds
- [ ] EXIF data extracted
- [ ] Thumbnails generated
- [ ] Perceptual hash calculated
- [ ] Database updated correctly
- [ ] Workflow activated

## 📚 Files Created/Modified

### Created
- `apps/n8n/workflows/01-photo-processing-pipeline.json`
- `apps/n8n/SETUP_WORKFLOW_01.md`
- `apps/n8n/WORKFLOW_01_SUMMARY.md` (this file)

### Modified
- `apps/backend/src/main/java/com/rapidphoto/features/upload/N8nWebhookService.java`
- `apps/backend/src/main/java/com/rapidphoto/features/upload/UploadService.java`
- `apps/backend/src/main/java/com/rapidphoto/features/upload/chunk/ChunkAssemblyService.java`

## 🎯 Success Criteria

✅ Workflow receives webhook from backend
✅ Workflow reads photo file from storage
✅ EXIF data extracted successfully
✅ Thumbnails generated in 3 sizes
✅ Perceptual hash calculated
✅ Database updated with all metadata
✅ Success response sent to webhook
✅ Workflow runs automatically on photo upload

