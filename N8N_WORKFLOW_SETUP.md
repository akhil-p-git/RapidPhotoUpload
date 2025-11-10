# n8n Workflow Integration Guide

This document describes how to set up n8n workflows for automated photo processing.

## Prerequisites

1. **Start n8n via Docker:**
   ```bash
   docker run -d --name n8n \
     -p 5678:5678 \
     -v ~/.n8n:/home/node/.n8n \
     n8nio/n8n
   ```

2. **Access n8n UI:**
   - Open http://localhost:5678 in your browser
   - Create an account or login

## Backend Configuration

The backend is already configured with:
- **N8nWebhookService**: Sends webhooks to n8n when photos are uploaded/processed/failed
- **N8nWebhookController**: Receives callbacks from n8n workflows
- **Configuration** in `application.yml`:
  ```yaml
  n8n:
    base-url: http://localhost:5678
    webhook:
      photo-uploaded: /webhook/photo-uploaded
      photo-processed: /webhook/photo-processed
      upload-failed: /webhook/upload-failed
  ```

## Webhook Endpoints

### Outgoing (Backend → n8n)

1. **POST /webhook/photo-uploaded**
   - Triggered when a photo is uploaded
   - Payload:
     ```json
     {
       "photoId": "uuid",
       "userId": "uuid",
       "fileName": "photo.jpg",
       "fileSizeBytes": 1234567,
       "storageLocation": "path/to/photo",
       "timestamp": "2024-01-01T12:00:00",
       "eventType": "PHOTO_UPLOADED"
     }
     ```

2. **POST /webhook/photo-processed**
   - Triggered when a photo is processed
   - Payload includes status, processedAt, and metadata flags

3. **POST /webhook/upload-failed**
   - Triggered when upload fails
   - Payload includes error message

### Incoming (n8n → Backend)

1. **POST /api/webhooks/n8n/metadata-extracted**
   - Receives EXIF data from n8n
   - Request body: `MetadataUpdateRequest`
   ```json
   {
     "photoId": "uuid",
     "exifData": { "cameraMake": "Canon", "iso": 400, ... },
     "width": 1920,
     "height": 1080,
     "locationLat": 37.7749,
     "locationLon": -122.4194,
     "takenAt": "2024-01-01T12:00:00"
   }
   ```

2. **POST /api/webhooks/n8n/thumbnail-ready**
   - Receives thumbnail paths from n8n
   - Request body: `ThumbnailUpdateRequest`
   ```json
   {
     "photoId": "uuid",
     "thumbnails": {
       "thumbnail": "/uploads/thumbnails/{id}/thumbnail.jpg",
       "medium": "/uploads/thumbnails/{id}/medium.jpg",
       "large": "/uploads/thumbnails/{id}/large.jpg"
     }
   }
   ```

3. **POST /api/webhooks/n8n/ai-tags-generated**
   - Receives AI-generated tags from n8n
   - Request body: `AiTagsUpdateRequest`
   ```json
   {
     "photoId": "uuid",
     "aiTags": {
       "objects": ["person", "building"],
       "scene": "outdoor",
       "colors": ["blue", "green"],
       "mood": "peaceful"
     }
   }
   ```

## n8n Workflow Examples

### Workflow 1: Photo Upload Processing (EXIF Extraction)

**Trigger:** Webhook - POST /webhook/photo-uploaded

**Nodes:**
1. **Webhook** - Receive photo data from backend
2. **HTTP Request** - Download photo file:
   - Method: GET
   - URL: `http://localhost:8080/api/photos/{{$json.photoId}}/file?size=original`
   - Headers: `Authorization: Bearer {token}` (if needed)
   - Save to: `/tmp/photo-{{$json.photoId}}.jpg`
3. **Execute Command** - Extract EXIF:
   ```bash
   exiftool -json /tmp/photo-{{$json.photoId}}.jpg > /tmp/exif-{{$json.photoId}}.json
   ```
4. **Code** - Parse EXIF JSON and format for backend:
   ```javascript
   const exif = JSON.parse($input.item.json);
   return {
     photoId: $('Webhook').item.json.photoId,
     exifData: {
       cameraMake: exif[0].Make,
       cameraModel: exif[0].Model,
       iso: exif[0].ISO,
       fNumber: exif[0].FNumber,
       exposureTime: exif[0].ExposureTime,
       focalLength: exif[0].FocalLength,
       dateTaken: exif[0].DateTimeOriginal
     },
     width: exif[0].ImageWidth,
     height: exif[0].ImageHeight,
     locationLat: exif[0].GPSLatitude,
     locationLon: exif[0].GPSLongitude,
     takenAt: exif[0].DateTimeOriginal
   };
   ```
5. **HTTP Request** - POST to backend:
   - Method: POST
   - URL: `http://localhost:8080/api/webhooks/n8n/metadata-extracted`
   - Body: JSON from Code node
6. **Webhook Response** - Return success

### Workflow 2: Thumbnail Generation (Alternative to Backend)

**Trigger:** Webhook - POST /webhook/photo-uploaded

**Nodes:**
1. **Webhook** - Receive photo data
2. **HTTP Request** - Download original photo
3. **Execute Command** - ImageMagick resize:
   ```bash
   # Thumbnail (200x200)
   convert /tmp/photo.jpg -resize 200x200^ -gravity center -extent 200x200 /tmp/thumb.jpg
   
   # Medium (800x800)
   convert /tmp/photo.jpg -resize 800x800> /tmp/medium.jpg
   
   # Large (1600x1600)
   convert /tmp/photo.jpg -resize 1600x1600> /tmp/large.jpg
   ```
4. **HTTP Request** - Upload thumbnails back to backend
5. **HTTP Request** - POST to `/api/webhooks/n8n/thumbnail-ready`

### Workflow 3: AI Image Tagging (Requires OpenAI API Key)

**Trigger:** Webhook - POST /webhook/photo-processed

**Nodes:**
1. **Webhook** - Receive processed photo data
2. **HTTP Request** - Download photo
3. **OpenAI** - Vision API:
   - Model: `gpt-4-vision-preview`
   - Prompt: "Describe this image and provide relevant tags. Include: objects, scene, colors, mood"
   - Image: Photo from HTTP Request
4. **Code** - Parse AI response:
   ```javascript
   const response = $input.item.json;
   return {
     photoId: $('Webhook').item.json.photoId,
     aiTags: {
       description: response.choices[0].message.content,
       objects: extractObjects(response),
       scene: extractScene(response),
       colors: extractColors(response),
       mood: extractMood(response)
     }
   };
   ```
5. **HTTP Request** - POST to `/api/webhooks/n8n/ai-tags-generated`

### Workflow 4: Duplicate Detection

**Trigger:** Webhook - POST /webhook/photo-uploaded

**Nodes:**
1. **Webhook** - Receive photo with perceptual hash
2. **HTTP Request** - GET all user photos:
   - URL: `http://localhost:8080/api/photos?userId={{$json.userId}}`
3. **Code** - Compare hashes:
   ```javascript
   const newHash = $('Webhook').item.json.perceptualHash;
   const photos = $('HTTP Request').item.json.content;
   
   const duplicates = photos.filter(photo => {
     if (!photo.perceptualHash) return false;
     const distance = hammingDistance(newHash, photo.perceptualHash);
     return distance < 5; // Threshold for duplicate
   });
   
   return { photoId: $('Webhook').item.json.photoId, duplicates };
   ```
4. **IF** - If duplicates found:
   - HTTP Request - Mark as duplicate in backend
   - Email (optional) - Notify user

## Testing

1. **Upload a photo with EXIF data** (from camera/phone)
2. **Watch n8n execution logs** in the n8n UI
3. **Verify metadata appears in gallery** via `/api/photos/{photoId}`
4. **Check AI tags** (if OpenAI configured) in photo metadata
5. **Test duplicate detection** by uploading the same image twice

## Notes

- The backend already handles thumbnail generation and EXIF extraction
- n8n workflows are optional and can be used for additional processing
- All webhook endpoints require authentication (JWT token) except the n8n callback endpoints
- The n8n callback endpoints (`/api/webhooks/n8n/*`) allow CORS from any origin for n8n integration

