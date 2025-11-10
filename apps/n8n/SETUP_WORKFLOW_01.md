# Setup Guide: n8n Workflow #1 - Main Photo Processing Pipeline

This guide will help you set up the first n8n workflow for photo processing.

## Prerequisites

1. **n8n running** at http://localhost:5678
2. **Backend running** at http://localhost:8080
3. **PostgreSQL running** at localhost:54321
4. **Docker containers** running (if using Docker)

## Step 1: Install Required Tools in n8n Container

The n8n container needs these tools installed:

```bash
# Access n8n container
docker exec -it rapidphoto-n8n bash

# Install tools
apk update
apk add --no-cache imagemagick python3 py3-pip exiftool

# Install Python packages
pip3 install pillow imagehash numpy

# Exit container
exit
```

Or if using the Dockerfile, these are already installed.

## Step 2: Access n8n UI

1. Open http://localhost:5678 in your browser
2. Log in with:
   - Username: `admin`
   - Password: `rapidphoto123`

## Step 3: Import Workflow

### Option A: Import from JSON File (Recommended)

1. In n8n UI, click **"Workflows"** in the left sidebar
2. Click **"Import from File"** button
3. Select `apps/n8n/workflows/01-photo-processing-pipeline.json`
4. Click **"Import"**

### Option B: Create Manually

1. Click **"Create new workflow"**
2. Name it: **"01 - Main Photo Processing Pipeline"**
3. Follow the node configuration below

## Step 4: Configure Nodes

### Node 1: Webhook Trigger

1. Click **"Add node"** → Search **"Webhook"**
2. Configure:
   - **HTTP Method:** POST
   - **Path:** `photo-uploaded`
   - **Response Mode:** "Last Node"
   - **Response Data:** "All Entries"

### Node 2: Set Variables

1. Add **"Set"** node
2. Configure variables:
   - `photoId`: `{{ $json.body.photoId }}`
   - `userId`: `{{ $json.body.userId }}`
   - `fileName`: `{{ $json.body.fileName }}`
   - `fileSizeBytes`: `{{ $json.body.fileSizeBytes }}`
   - `storageLocation`: `{{ $json.body.storageLocation }}`
   - `storageBasePath`: `/app/storage`

### Node 3: Read File from Storage

1. Add **"Read Binary File"** node
2. Configure:
   - **File Name:** `{{ $json.storageBasePath }}/{{ $json.storageLocation }}`
   - **File Content:** Binary

### Node 4: Extract EXIF Data

1. Add **"Code"** node
2. Copy the JavaScript code from the workflow JSON file
3. This uses `exiftool` to extract EXIF metadata

### Node 5: Generate Thumbnails

1. Add **"Code"** node
2. Copy the JavaScript code from the workflow JSON file
3. This uses ImageMagick to generate 3 thumbnail sizes:
   - Small: 150x150px
   - Medium: 600x600px
   - Large: 1200x1200px

### Node 6: Calculate Perceptual Hash

1. Add **"Code"** node
2. Copy the JavaScript code from the workflow JSON file
3. This uses Python `imagehash` to calculate perceptual hash

### Node 7: Update PostgreSQL

1. Add **"Postgres"** node
2. Configure database connection:
   - **Host:** `host.docker.internal` (or `localhost` if not in Docker)
   - **Port:** `54321`
   - **Database:** `rapidphotoupload`
   - **User:** `postgres`
   - **Password:** `postgres`
3. Configure query:
   ```sql
   UPDATE photos 
   SET 
     exif_data = $1::jsonb,
     thumbnail_small_url = $2,
     thumbnail_medium_url = $3,
     thumbnail_large_url = $4,
     perceptual_hash = $5,
     status = 'PROCESSING',
     updated_at = NOW()
   WHERE id = $6::uuid
   RETURNING id, file_name, status
   ```
4. Set parameters:
   - `$1`: `{{ JSON.stringify($json.exifData) }}`
   - `$2`: `{{ $json.thumbnailSmall }}`
   - `$3`: `{{ $json.thumbnailMedium }}`
   - `$4`: `{{ $json.thumbnailLarge }}`
   - `$5`: `{{ $json.perceptualHash }}`
   - `$6`: `{{ $json.photoId }}`

### Node 8: Send Success Response

1. Add **"Respond to Webhook"** node
2. Configure:
   - **Response Code:** 200
   - **Response Body:** JSON
   - **Response Data:**
     ```json
     {
       "success": true,
       "photoId": "{{ $json.photoId }}",
       "status": "processing_complete",
       "thumbnails": {
         "small": "{{ $json.thumbnailSmall }}",
         "medium": "{{ $json.thumbnailMedium }}",
         "large": "{{ $json.thumbnailLarge }}"
       },
       "exifExtracted": true,
       "phash": "{{ $json.perceptualHash }}"
     }
     ```

## Step 5: Connect Nodes

Connect nodes in this order:
1. Webhook → Set Variables
2. Set Variables → Read File
3. Read File → Extract EXIF
4. Extract EXIF → Generate Thumbnails
5. Generate Thumbnails → Calculate pHash
6. Calculate pHash → Update PostgreSQL
7. Update PostgreSQL → Send Success Response

## Step 6: Configure Error Handling

For each Code node:
1. Click the node
2. Go to **Settings** tab
3. Enable **"Continue on Fail"** (optional)
4. Add error handling in the code

## Step 7: Test the Workflow

### Test 1: Execute Workflow Manually

1. Click **"Execute Workflow"** button
2. Add test data:
   ```json
   {
     "photoId": "550e8400-e29b-41d4-a716-446655440000",
     "userId": "550e8400-e29b-41d4-a716-446655440001",
     "fileName": "test-image.jpg",
     "fileSizeBytes": 123456,
     "storageLocation": "550e8400-e29b-41d4-a716-446655440001/550e8400-e29b-41d4-a716-446655440000"
   }
   ```
3. Check each node's output
4. Verify no errors

### Test 2: Send Test Webhook

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

### Test 3: Verify Database Update

```sql
SELECT 
  id, 
  file_name, 
  status, 
  thumbnail_small_url, 
  perceptual_hash,
  exif_data
FROM photos 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

## Step 8: Activate Workflow

1. Toggle **"Active"** switch to **ON** (top right)
2. The workflow will now run automatically when backend sends webhooks

## Step 9: Verify Backend Integration

The backend should already be configured to send webhooks. Verify:

1. Check `N8nWebhookService.java` includes `storageLocation` in payload
2. Check `application.yml` has n8n configuration:
   ```yaml
   n8n:
     base-url: http://localhost:5678
     webhook:
       photo-uploaded: /webhook/photo-uploaded
   ```

## Troubleshooting

### Issue: EXIF extraction fails

**Solution:**
```bash
# Verify exiftool is installed
docker exec rapidphoto-n8n exiftool -v

# Check file exists
docker exec rapidphoto-n8n ls -la /app/storage/USER_ID/PHOTO_ID
```

### Issue: Thumbnail generation fails

**Solution:**
```bash
# Verify ImageMagick is installed
docker exec rapidphoto-n8n convert -version

# Check permissions
docker exec rapidphoto-n8n ls -la /app/storage/thumbnails/
```

### Issue: Perceptual hash calculation fails

**Solution:**
```bash
# Verify Python packages are installed
docker exec rapidphoto-n8n python3 -c "import imagehash; print('OK')"

# Check Python script
docker exec rapidphoto-n8n cat /tmp/calculate_phash.py
```

### Issue: Database connection fails

**Solution:**
1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Verify connection settings in Postgres node
3. Test connection: `docker exec rapidphoto-n8n psql -h host.docker.internal -p 54321 -U postgres -d rapidphotoupload -c "SELECT 1;"`

### Issue: File not found

**Solution:**
1. Verify file exists at: `/app/storage/USER_ID/PHOTO_ID`
2. Check storage path in backend logs
3. Verify `storageLocation` in webhook payload

## Next Steps

Once this workflow is working:
1. Test with real photo uploads
2. Monitor execution logs in n8n UI
3. Verify thumbnails are generated
4. Check EXIF data is extracted
5. Verify perceptual hash is calculated
6. Proceed to build Workflow #2 (AI Tagging)

## Verification Checklist

- [ ] n8n is running at http://localhost:5678
- [ ] Workflow is imported and activated
- [ ] All tools are installed (exiftool, imagemagick, python3, pillow, imagehash)
- [ ] Database connection works
- [ ] Test webhook succeeds
- [ ] Database is updated with EXIF data
- [ ] Thumbnails are generated
- [ ] Perceptual hash is calculated
- [ ] Backend sends webhooks correctly

