# Upload Integration Testing Guide

This document provides step-by-step instructions for testing the complete upload flow between frontend and backend.

## Prerequisites

1. **Backend running** on `http://localhost:8080`
2. **Frontend running** on `http://localhost:3000`
3. **Database running** on `localhost:54321`
4. **WebSocket endpoint** available at `ws://localhost:8080/ws/upload-progress`

## Setup Steps

### 1. Start Backend

```bash
cd apps/backend
./gradlew bootRun
```

Verify backend is running:
```bash
curl http://localhost:8080/actuator/health
```

### 2. Start Frontend

```bash
cd apps/web
pnpm dev
```

Verify frontend is running:
- Open http://localhost:3000 in browser
- Should see the upload interface

### 3. Create Test User (Optional)

```bash
curl -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "fullName": "Test User"
  }'
```

Save the returned `id` for use in uploads.

## Test Cases

### Test 1: Small File Upload (< 5MB)

**Steps:**
1. Open http://localhost:3000
2. Drag a small image file (< 5MB) into the drop zone
3. Watch the upload progress bar
4. Verify file completes upload

**Expected Results:**
- ✅ File appears in upload queue
- ✅ Progress bar shows 0-100%
- ✅ Status changes: pending → uploading → completed
- ✅ No errors in browser console
- ✅ Backend logs show upload request
- ✅ Database has photo record

**Verify in Database:**
```sql
SELECT id, file_name, file_size_bytes, status, uploaded_at 
FROM photos 
ORDER BY uploaded_at DESC 
LIMIT 1;
```

**Verify in Backend Logs:**
```
Upload request received: userId=..., fileName=..., size=...
Photo uploaded successfully: photoId=..., userId=..., storage=...
```

### Test 2: Large File Chunked Upload (> 5MB)

**Steps:**
1. Open http://localhost:3000
2. Drag a large image file (> 5MB) into the drop zone
3. Watch the chunked upload progress
4. Verify all chunks upload successfully

**Expected Results:**
- ✅ File appears in upload queue
- ✅ Progress bar shows chunk-by-chunk progress
- ✅ Network tab shows multiple `/api/upload/chunk` calls
- ✅ Status changes: pending → uploading → completed
- ✅ All chunks uploaded successfully

**Verify in Database:**
```sql
-- Check photo
SELECT id, file_name, file_size_bytes, status 
FROM photos 
ORDER BY uploaded_at DESC 
LIMIT 1;

-- Check chunks
SELECT photo_id, chunk_number, chunk_size, status, uploaded_at
FROM upload_chunks
WHERE photo_id = 'YOUR_PHOTO_ID_HERE'
ORDER BY chunk_number;
```

**Verify in Network Tab:**
- Should see: `/api/upload/initialize` (POST)
- Should see: `/api/upload/chunk` (POST) multiple times
- Each chunk should return 200 OK

### Test 3: Multiple Files Concurrent Upload

**Steps:**
1. Open http://localhost:3000
2. Drag 5-10 images at once into the drop zone
3. Watch the queue management
4. Verify all files complete

**Expected Results:**
- ✅ All files appear in upload queue
- ✅ Only 3 files upload concurrently (MAX_CONCURRENT_UPLOADS)
- ✅ Remaining files show as "pending"
- ✅ Queue position updates as files complete
- ✅ All files eventually complete

**Verify in Database:**
```sql
SELECT COUNT(*) as total_photos, 
       COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed
FROM photos
WHERE uploaded_at > NOW() - INTERVAL '5 minutes';
```

### Test 4: WebSocket Progress Tracking

**Steps:**
1. Open browser DevTools → Network → WS tab
2. Start an upload
3. Watch WebSocket messages

**Expected Results:**
- ✅ WebSocket connection established to `ws://localhost:8080/ws/upload-progress`
- ✅ Real-time progress messages received
- ✅ Progress bar updates in real-time
- ✅ Upload speed and ETA calculated

**Verify WebSocket Messages:**
```json
{
  "photoId": "uuid",
  "userId": "uuid",
  "status": "UPLOADING",
  "uploadedBytes": 1234567,
  "totalBytes": 5000000,
  "percentage": 24.69,
  "uploadedChunks": 1,
  "totalChunks": 2
}
```

### Test 5: Error Handling

**Steps:**
1. Stop the backend server
2. Try uploading a file
3. Verify error message appears
4. Start backend server
5. Retry upload

**Expected Results:**
- ✅ Error message displayed: "Upload failed: Network error"
- ✅ Retry button appears
- ✅ After backend restart, retry works
- ✅ File uploads successfully

### Test 6: CORS Configuration

**Steps:**
1. Open browser DevTools → Network tab
2. Start an upload
3. Check request headers

**Expected Results:**
- ✅ No CORS errors in console
- ✅ OPTIONS preflight request succeeds
- ✅ POST requests include CORS headers
- ✅ `Access-Control-Allow-Origin: http://localhost:3000` in response

**Verify CORS Headers:**
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: *
Access-Control-Allow-Credentials: true
```

## Database Verification Queries

### Check Uploaded Photos
```sql
SELECT 
  id, 
  file_name, 
  file_size_bytes, 
  status, 
  uploaded_at,
  storage_path
FROM photos 
ORDER BY uploaded_at DESC 
LIMIT 10;
```

### Check Upload Chunks
```sql
SELECT 
  photo_id, 
  chunk_number, 
  chunk_size, 
  status, 
  uploaded_at
FROM upload_chunks
WHERE photo_id = 'YOUR_PHOTO_ID_HERE'
ORDER BY chunk_number;
```

### Check User Storage Usage
```sql
SELECT 
  u.id, 
  u.email, 
  u.storage_quota_bytes, 
  u.storage_used_bytes,
  COUNT(p.id) as photo_count,
  SUM(p.file_size_bytes) as total_photo_size
FROM users u
LEFT JOIN photos p ON p.user_id = u.id
WHERE u.id = 'YOUR_USER_ID_HERE'
GROUP BY u.id, u.email, u.storage_quota_bytes, u.storage_used_bytes;
```

### Check Upload Sessions
```sql
SELECT 
  id, 
  user_id, 
  total_files, 
  completed_files, 
  status,
  started_at,
  completed_at
FROM upload_sessions
ORDER BY started_at DESC
LIMIT 10;
```

## Debugging Commands

### Check Backend Logs
```bash
# View backend logs
tail -f apps/backend/logs/spring-boot-application.log

# Or if running with Gradle
./gradlew bootRun
```

### Check if Backend is Responding
```bash
curl http://localhost:8080/actuator/health
```

### Check if Port 8080 is in Use
```bash
lsof -i:8080
```

### Check Database Connection
```bash
psql -h localhost -p 54321 -U postgres -d rapidphotoupload -c "SELECT COUNT(*) FROM photos;"
```

### Test Upload Endpoint Directly
```bash
curl -X POST http://localhost:8080/api/upload \
  -F "userId=550e8400-e29b-41d4-a716-446655440000" \
  -F "file=@test-image.jpg"
```

### Test Initialize Upload
```bash
curl -X POST http://localhost:8080/api/upload/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "originalFileName": "large-image.jpg",
    "mimeType": "image/jpeg",
    "fileSizeBytes": 10485760
  }'
```

### Test Chunk Upload
```bash
curl -X POST http://localhost:8080/api/upload/chunk \
  -F "photoId=YOUR_PHOTO_ID" \
  -F "chunkNumber=0" \
  -F "totalChunks=2" \
  -F "file=@chunk-0.bin"
```

## Common Issues and Fixes

### Issue: CORS Error

**Symptoms:**
- Browser console shows: `Access to XMLHttpRequest has been blocked by CORS policy`
- OPTIONS request fails

**Fix:**
1. Verify `WebConfig.java` exists and has CORS configuration
2. Check controllers have `@CrossOrigin(origins = "http://localhost:3000")`
3. Restart backend server

### Issue: 413 Payload Too Large

**Symptoms:**
- Upload fails with 413 error
- Large files fail to upload

**Fix:**
1. Check `application.yml` has:
   ```yaml
   spring:
     servlet:
       multipart:
         max-file-size: 100MB
         max-request-size: 1GB
   ```
2. Restart backend server

### Issue: WebSocket Connection Failed

**Symptoms:**
- WebSocket connection fails
- No progress updates

**Fix:**
1. Verify WebSocket endpoint is exposed
2. Check `vite.config.ts` has WebSocket proxy:
   ```typescript
   '/ws': {
     target: 'ws://localhost:8080',
     ws: true,
   }
   ```
3. Check firewall isn't blocking WebSocket

### Issue: Chunks Not Assembling

**Symptoms:**
- Chunks upload but file doesn't complete
- Status stuck at "uploading"

**Fix:**
1. Check `ChunkAssemblyService` is running
2. Verify async executor is configured
3. Check backend logs for assembly errors
4. Verify all chunks uploaded successfully

### Issue: File Not Found After Upload

**Symptoms:**
- Upload completes but file not accessible
- Storage path incorrect

**Fix:**
1. Check storage service configuration
2. Verify file exists at storage path
3. Check storage permissions
4. Verify storage service is working

## Success Criteria

✅ All endpoints working (user registration, direct upload, chunked upload)
✅ CORS configured correctly
✅ Frontend successfully uploads files
✅ WebSocket shows real-time progress
✅ Database has photo records
✅ Chunks assemble correctly
✅ Multiple files upload concurrently
✅ Error handling works correctly
✅ Retry functionality works

## Next Steps

Once all tests pass:
1. Create a test user in database
2. Update frontend to use real user ID instead of hardcoded TEST_USER_ID
3. Add loading states and better error messages
4. Take screenshots of working upload for documentation
5. Document any bugs found and how they were fixed

