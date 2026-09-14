# RapidPhoto API Documentation

Complete API reference for RapidPhoto backend.

## Base URL

```
http://localhost:8080/api
```

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "fullName": "Full Name"
}
```

**Response:**
```json
{
  "userId": "uuid"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "userId": "uuid",
  "username": "username",
  "email": "user@example.com"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "username": "username",
  "email": "user@example.com",
  "fullName": "Full Name",
  "storageQuotaBytes": 10737418240,
  "storageUsedBytes": 1048576
}
```

### Photos

#### List Photos
```http
GET /photos?page=0&size=24&search=vacation&status=COMPLETED&sortBy=uploadedAt&sortOrder=desc
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (default: 0) - Page number
- `size` (default: 24) - Page size
- `search` (optional) - Search term for filename
- `status` (optional) - Filter by status (COMPLETED, PROCESSING, FAILED)
- `startDate` (optional) - Start date (ISO format)
- `endDate` (optional) - End date (ISO format)
- `sortBy` (default: uploadedAt) - Sort field
- `sortOrder` (default: desc) - Sort direction (asc/desc)

**Response:**
```json
{
  "content": [
    {
      "id": "uuid",
      "fileName": "photo.jpg",
      "originalFileName": "photo.jpg",
      "fileSizeBytes": 1048576,
      "mimeType": "image/jpeg",
      "width": 1920,
      "height": 1080,
      "status": "COMPLETED",
      "uploadedAt": "2024-01-01T00:00:00",
      "processedAt": "2024-01-01T00:00:01"
    }
  ],
  "totalElements": 100,
  "totalPages": 5,
  "currentPage": 0,
  "size": 24,
  "hasNext": true,
  "hasPrevious": false
}
```

#### Get Photo Details
```http
GET /photos/{photoId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "fileName": "photo.jpg",
  "originalFileName": "photo.jpg",
  "fileSizeBytes": 1048576,
  "mimeType": "image/jpeg",
  "width": 1920,
  "height": 1080,
  "status": "COMPLETED",
  "exifData": {
    "Make": "Canon",
    "Model": "EOS R5"
  },
  "aiTags": ["nature", "landscape"],
  "locationLat": 40.7128,
  "locationLon": -74.0060,
  "uploadedAt": "2024-01-01T00:00:00"
}
```

#### Get Photo File
```http
GET /photos/{photoId}/file?size=thumbnail
Authorization: Bearer <token>
```

**Query Parameters:**
- `size` (default: original) - Image size: `thumbnail`, `medium`, `large`, `original`

**Response:** Image file with appropriate content-type

#### Delete Photo
```http
DELETE /photos/{photoId}
Authorization: Bearer <token>
```

**Response:** 204 No Content

#### Get Photo Statistics
```http
GET /photos/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalPhotos": 100,
  "totalSizeBytes": 1073741824,
  "photosByStatus": {
    "COMPLETED": 95,
    "PROCESSING": 3,
    "FAILED": 2
  },
  "recentUploads": 10,
  "storageUsedPercent": 10.0,
  "storageQuotaBytes": 10737418240,
  "storageUsedBytes": 1073741824
}
```

### Upload

#### Direct Upload
```http
POST /upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
```

**Response:**
```json
{
  "photoId": "uuid",
  "status": "UPLOADING",
  "message": "Upload started"
}
```

#### Request a Presigned Upload URL

The path used for files at or below the 5 MiB chunk threshold. The browser then
PUTs the bytes straight to object storage; they never cross the backend.

```http
POST /upload/presigned
Authorization: Bearer <token>
Content-Type: application/json

{
  "originalFileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "fileSizeBytes": 2097152
}
```

**Response:**
```json
{
  "photoId": "uuid",
  "uploadUrl": "https://<bucket>.<account>.r2.cloudflarestorage.com/...",
  "storagePath": "<userId>/<uuid>_photo.jpg",
  "message": "Presigned URL generated. Upload directly to R2."
}
```

Refused with `400` if `mimeType` is outside the allowlist (`image/jpeg`,
`image/jpg`, `image/png`, `image/gif`, `image/webp`, `image/heic`, `image/heif`,
`image/bmp`, `image/tiff`), or if `fileSizeBytes` is not positive or exceeds
`upload.max-file-size-bytes` (100 MiB by default). Refused with `403` if it
would exceed the caller's storage quota.

The returned URL is signed over `Content-Length` and `Content-Type` and expires
after `upload.presigned.ttl-minutes` (10 by default). The PUT must send exactly
the declared byte count and content type, or the store rejects it with `403
SignatureDoesNotMatch`.

#### Complete a Presigned Upload

```http
POST /upload/complete
Authorization: Bearer <token>
Content-Type: application/json

{ "photoId": "uuid" }
```

**Response:**
```json
{
  "photoId": "uuid",
  "uploadUrl": "<storagePath>",
  "status": "COMPLETED",
  "message": "Photo uploaded and processed successfully"
}
```

The server HEADs the stored object, compares its real size against the declared
size, and sniffs its leading bytes to confirm the format. On any mismatch it
responds `400`, deletes the object, marks the photo `FAILED`, and refunds the
quota.

#### Initialize Chunked Upload

The path used above 5 MiB. Note the owner is taken from the token; there is no
`userId` field.

```http
POST /upload/initialize
Authorization: Bearer <token>
Content-Type: application/json

{
  "originalFileName": "large-photo.jpg",
  "mimeType": "image/jpeg",
  "fileSizeBytes": 52428800
}
```

**Response:**
```json
{
  "photoId": "uuid",
  "status": "INITIALIZED",
  "message": "Upload session created. Ready to receive chunks."
}
```

#### Upload Chunk

Chunks are 5 MiB and may arrive in any order. Re-sending one already stored is
safe and does not double-count.

```http
POST /upload/chunk
Authorization: Bearer <token>
Content-Type: multipart/form-data

photoId=<uuid>&chunkNumber=0&totalChunks=10
file: <chunk-data>
```

**Response:**
```json
{
  "photoId": "uuid",
  "chunkNumber": 0,
  "status": "SUCCESS",
  "uploadedChunks": 1,
  "totalChunks": 10,
  "progress": 10.0,
  "message": "Chunk 1/10 uploaded successfully"
}
```

`404` if the photo does not exist, `403` if it belongs to another user.

#### Chunk Progress

What a resuming client calls before deciding what to send.

```http
GET /upload/chunk/progress/{photoId}
Authorization: Bearer <token>
```

`totalChunks` may be supplied as a query parameter but is advisory; when omitted
the server derives the expected count from the stored file size.

**Response:**
```json
{
  "photoId": "uuid",
  "status": "IN_PROGRESS",
  "uploadedChunks": 2,
  "totalChunks": 10,
  "progress": 20.0,
  "receivedChunks": [0, 4],
  "missingChunks": [1, 2, 3, 5, 6, 7, 8, 9],
  "message": "2/10 chunks uploaded"
}
```

Use `receivedChunks`, not `uploadedChunks`: chunks upload in parallel and land
out of order, so the count says how many arrived but not which. Responds `404`
both when the photo does not exist and when it belongs to another caller.

## Error Responses

All errors follow this format:

```json
{
  "status": 400,
  "message": "Error message",
  "error": "Error type",
  "timestamp": "2024-01-01T00:00:00",
  "path": "/api/photos"
}
```

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success with no content
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - No valid token; authenticate and retry
- `403 Forbidden` - Token is valid but the action is not permitted (includes
  exceeding a storage quota)
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Rate Limiting

Configured by `rate-limit.*`; see `application.yml`.

- **General API**: 100 requests/minute (`rate-limit.default.capacity`)
- **Upload endpoints** (`/api/upload/**`): 5000 requests/minute
  (`rate-limit.upload.capacity`)

Buckets are keyed per authenticated user, falling back to client IP for
unauthenticated requests.

Budget in practice: the presigned path costs three requests per file (presign,
PUT, complete), so 5000/minute is worth roughly 1600 files per minute.

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `Retry-After`: Seconds to wait before retrying

## WebSocket

### Upload Progress

One connection carries progress for all of the caller's uploads; there is no
per-photo path.

```
ws://localhost:8080/ws/upload-progress
```

**Messages:**
```json
{
  "photoId": "uuid",
  "progress": 50,
  "uploadedChunks": 5,
  "totalChunks": 10,
  "status": "UPLOADING"
}
```

## OpenAPI/Swagger

Interactive API documentation available at:
```
http://localhost:8080/swagger-ui.html
```

