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

#### Initialize Chunked Upload
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
  "status": "UPLOADING",
  "message": "Upload initialized"
}
```

#### Upload Chunk
```http
POST /upload/chunk?photoId={photoId}&chunkNumber=0&totalChunks=10
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <chunk-data>
```

**Response:**
```json
{
  "photoId": "uuid",
  "uploadedChunks": 1,
  "totalChunks": 10,
  "isComplete": false
}
```

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
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Rate Limiting

- **General API**: 100 requests per minute per user
- **Upload endpoints**: 10 requests per minute per user

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `Retry-After`: Seconds to wait before retrying

## WebSocket

### Upload Progress
```
ws://localhost:8080/ws/upload/{photoId}
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

