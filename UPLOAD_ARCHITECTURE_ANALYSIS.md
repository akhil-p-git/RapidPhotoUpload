# RapidPhotoUpload - Architecture & Performance Analysis

## Executive Summary
RapidPhotoUpload is an enterprise photo upload platform with a Java Spring Boot backend and React TypeScript frontend. It implements a sophisticated chunked upload system with R2/S3 storage integration, comprehensive concurrency management, and real-time progress tracking via WebSocket.

---

## 1. UPLOAD FLOW FROM FRONTEND TO STORAGE

### Frontend Flow (React/TypeScript)

#### 1.1 File Selection & Validation (useFileUpload.ts)
- **Max File Size**: 100MB per file
- **Max Concurrent Uploads**: 100 files simultaneously
- **Validation Checks**:
  - File type validation (image files only)
  - File size validation (100MB max)
  - Empty file detection
  - Duplicate file detection (comparing existing queue)
- **Status States**: pending → uploading → processing → completed/failed/paused/cancelled

#### 1.2 Thumbnail Generation
- Asynchronous generation (non-blocking)
- Failures don't block the upload queue
- Used for UI preview

#### 1.3 Upload Decision Logic
```
if (file.size < 5MB)
  → Direct upload (single request)
else
  → Chunked upload (multiple requests)
```

#### 1.4 Chunked Upload Process (useChunkedUpload.ts)
**Chunk Configuration**:
- Chunk Size: 5MB (5,242,880 bytes) - defined in `CHUNK_SIZE`
- Total Chunks: Math.ceil(fileSize / CHUNK_SIZE)

**Retry Strategy**:
- Max Retries: 3 attempts per chunk
- Backoff: Exponential (1s, 2s, 4s)
- Pattern: delay = 1000 * Math.pow(2, retryCount)

**Upload Strategy**:
- Sequential chunk uploads (one chunk at a time per file)
- Can process up to 100 files in parallel (rate-limited)
- Idempotency: Server returns already-uploaded chunks without re-uploading

### Backend Flow (Spring Boot Java)

#### 1.5 Direct Upload (Small Files)
```
POST /api/upload
├─ Authentication Check (JWT token required)
├─ Get User ID from SecurityContext
├─ Create Photo record (DB write #1)
├─ Store file to R2/S3
├─ Extract metadata
├─ Generate thumbnails
├─ Mark as completed (DB write #2)
└─ Trigger n8n webhook (optional)
```

#### 1.6 Chunked Upload - Initialization
```
POST /api/upload/initialize
├─ Authentication Check
├─ Calculate total chunks
├─ Create Photo record (DB write #1)
├─ Initialize progress tracking
└─ Return photoId and upload endpoint
```

#### 1.7 Chunked Upload - Per Chunk
```
POST /api/upload/chunk?photoId={id}&chunkNumber={n}&totalChunks={total}
├─ Authentication Check
├─ Verify photo ownership
├─ Check for duplicate (idempotency)
├─ Store chunk to temporary location: {photoId}/chunks/chunk_{n}
├─ Calculate SHA-256 checksum
├─ Save chunk metadata (DB write #1)
├─ Broadcast progress via WebSocket
├─ Check if all chunks uploaded
│  └─ If YES:
│     ├─ Trigger assembly (async on uploadExecutor)
│     └─ Return COMPLETED status
│  └─ If NO:
│     └─ Return IN_PROGRESS status
└─ Return missing chunks list
```

#### 1.8 Chunked Upload - Assembly
```
Async: ChunkAssemblyService.assembleChunks() [@Async("uploadExecutor")]
├─ Fetch all chunks in order
├─ Validate count matches totalChunks
├─ Create temporary file
├─ Stream chunks sequentially:
│  ├─ Read from {photoId}/chunks/chunk_{n}
│  ├─ Write to temp file (8KB buffer)
│  └─ Delete chunk from storage
├─ Store assembled file to: {userId}/{photoId}
├─ Delete temporary file
├─ Extract metadata (synchronous)
├─ Generate thumbnails (asynchronous)
├─ Mark photo as COMPLETED (DB write #2)
├─ Trigger n8n webhook
├─ Return retry policy: aggressive (4 attempts)
└─ On failure: Mark as FAILED and notify n8n
```

---

## 2. CONCURRENCY & PARALLELIZATION SETTINGS

### Frontend Concurrency

#### 2.1 Upload Queue Management
- **Max Concurrent Uploads**: 100 files
- **Execution Model**: useEffect processes pending tasks
- **Rate Limiting**: Available slots = MAX_CONCURRENT_UPLOADS - activeUploads
- **Metrics Updated Every**: 1 second (upload speed, ETA)

#### 2.2 Per-File Upload Strategy
- Sequential chunks within a file (no parallel chunks per file)
- Concurrent files processed in parallel (up to 100)
- AbortController per file for cancellation

### Backend Thread Pools

#### 2.3 Upload Executor (Primary)
**Configuration** (from UploadThreadPoolConfig.java):
```
Development:
  Core Size: 20 threads
  Max Size: 100 threads
  Queue Capacity: 500 tasks
  Thread Name Prefix: "Upload-Worker-"
  Rejection Policy: CallerRunsPolicy (caller thread runs task if queue full)
  Graceful Shutdown: 120 seconds (wait for uploads to finish)

Production (application-prod.yml):
  Core Size: 50 threads
  Max Size: 200 threads
  Queue Capacity: 1000 tasks
```

**Used For**:
- Chunked upload assembly
- File storage operations
- Async processing tasks

#### 2.4 Processing Executor (Image Processing)
```
Core Size: Runtime.getRuntime().availableProcessors() (CPU-bound)
Max Size: Processors × 2
Queue Capacity: 200 tasks
Thread Name Prefix: "Processing-Worker-"
Rejection Policy: CallerRunsPolicy
Graceful Shutdown: 180 seconds
```

**Used For**:
- Thumbnail generation
- Metadata extraction
- Image processing tasks

#### 2.5 Webhook Executor (N8n Integration)
```
Core Size: 5 threads
Max Size: 20 threads
Queue Capacity: 100 tasks
Thread Name Prefix: "Webhook-Worker-"
Rejection Policy: AbortPolicy (throw exception if queue full)
Graceful Shutdown: 30 seconds
```

**Used For**:
- Webhook notifications to n8n
- Non-critical notifications

### Database Connection Pooling (HikariCP)

**Production Configuration** (application-prod.yml):
```
Maximum Pool Size: 20 connections
Minimum Idle: 5 connections
Connection Timeout: 30 seconds
Idle Timeout: 10 minutes
Max Lifetime: 30 minutes
```

---

## 3. DATABASE OPERATIONS DURING UPLOADS

### Write Operations

#### 3.1 Photo Record Creation
**Timing**: At initialization (chunked) or upload start (direct)
**Data Written**:
- photoId (UUID)
- userId (UUID)
- fileName
- originalFileName
- fileSize
- mimeType
- status (CREATED → PROCESSING → COMPLETED/FAILED)
- createdAt timestamp

**Transaction Type**: @Transactional (JPA)

#### 3.2 Chunk Metadata Recording
**Per Chunk Write**:
```java
UploadChunk {
  chunkId (UUID)
  photoId (UUID)
  chunkNumber (Integer)
  chunkSize (Long)
  checksum (SHA-256)
  status (UPLOADED)
  uploadedAt (Timestamp)
}
```

**Frequency**: One database write per chunk
**Transaction**: @Transactional

#### 3.3 Progress Tracking (In-Memory)
- ConcurrentHashMap<UUID, UploadProgress>
- NOT persisted to database
- Lost on server restart
- Used for real-time WebSocket updates

#### 3.4 Storage Quota Update
**Command Handler**: UpdateStorageUsageCommand
- Updates user.usedStorageBytes
- Checks against user.storageQuotaBytes
- Runs during photo completion

#### 3.5 Production Optimizations
```yaml
Hibernate Batch Size: 20 (batch inserts)
Order Inserts: true
Order Updates: true
```

### Read Operations

**Pre-Upload Checks**:
- Photo ownership verification (before chunk upload)
- Duplicate chunk detection (exists check)
- User storage quota check

---

## 4. R2/S3 STORAGE INTEGRATION

### Configuration

#### 4.1 S3Config.java
```java
S3Client Setup:
├─ Region: Configurable (default: us-east-1)
├─ Credentials: AWS Access Key + Secret Key
├─ Endpoint Override: For R2 (CloudFlare)
├─ Custom Endpoint: https://{account-id}.r2.cloudflarestorage.com
└─ Signed Requests: S3Presigner for pre-signed URLs
```

#### 4.2 Environment Configuration (.env.example)
```
STORAGE_TYPE=s3
S3_BUCKET_NAME=rapid-photo
S3_ENDPOINT=https://3b892790c75e56402e60c47ac996687c.r2.cloudflarestorage.com
AWS_REGION=auto (for R2)
AWS_ACCESS_KEY=YOUR_R2_ACCESS_KEY
AWS_SECRET_KEY=YOUR_R2_SECRET_KEY
```

### Storage Operations

#### 4.3 S3StorageService.java

**Store Operation**:
```
store(path, inputStream, contentType, contentLength)
├─ PutObjectRequest builder
├─ Set bucket, key, contentType, contentLength
├─ RequestBody.fromInputStream (streaming upload)
├─ Retry: Aggressive policy (4 attempts, exponential backoff)
└─ Return: s3://{bucket}/{path}
```

**Retrieve Operation**:
```
retrieve(path)
├─ GetObjectRequest builder
├─ Return InputStream
├─ Retry: Default policy
└─ Used for chunk assembly
```

**Delete Operation**:
```
delete(path)
├─ DeleteObjectRequest
├─ Cleanup after assembly
├─ Retry: Default policy
```

**Pre-signed URLs**:
```
generatePresignedUploadUrl(path, duration) → PUT URL
generatePresignedDownloadUrl(path, duration) → GET URL
Duration: Configurable (default: implementation-dependent)
```

### Storage Paths

```
Direct Upload:
  {userId}/{randomUUID}_{originalFileName}

Chunked Upload:
  Chunks: {photoId}/chunks/chunk_{chunkNumber}
  Final: {userId}/{photoId}
```

### Retry Strategy (All S3 Operations)

**ExponentialBackoffRetryService**:
```
Aggressive Policy:
  Max Attempts: 4
  Initial Delay: 100ms
  Max Delay: 32 seconds
  Backoff Factor: 2x each attempt

Timing:
  Attempt 1: Immediate
  Attempt 2: After 100ms
  Attempt 3: After 200ms
  Attempt 4: After 400ms
```

---

## 5. PERFORMANCE-RELATED CONFIGURATIONS & LIMITS

### File Size Limits

```
Frontend:
  Max per file: 100MB
  Max request size: Unlimited (handled by chunks)

Backend (Spring Boot):
  multipart.max-file-size: 100MB
  multipart.max-request-size: 1GB (for chunks)
```

### Chunk Configuration

```
Chunk Size: 5MB (5,242,880 bytes)
Rationale: Balance between:
  ✓ Fewer chunks for large files (reduced overhead)
  ✓ Smaller chunks for faster retries (resume faster)
  ✓ Network-friendly size for most connections
```

### Rate Limiting (Bucket4j)

**Default Rate Limit** (all endpoints):
```
Capacity: 100 requests/minute per user
Refill: Every 60 seconds
Applied To: IP address (unauthenticated), User ID (authenticated)
```

**Upload Rate Limit** (POST /api/upload*):
```
Capacity: 200 requests/minute per user
Rationale: Allow bulk uploads (100 files × 2 chunks avg = 200 requests)
```

**Response Headers**:
```
X-RateLimit-Limit: 100 or 200
X-RateLimit-Remaining: {tokens}
Retry-After: 60 (seconds)
HTTP Status: 429 (Too Many Requests)
```

### Server Configuration

**Compression**:
```
Enabled: true
MIME Types: application/json, application/xml, text/*, image/jpeg, image/png, image/gif
Benefits: Reduce bandwidth for metadata responses
```

**Connection Timeouts**:
```
Socket Timeout: Not explicitly set (use OS defaults)
Read Timeout: HTTP client timeout (axios default: typically 0 = no timeout)
Write Timeout: Not explicitly set
```

### HTTP Multipart Configuration

```
Spring Multipart:
  enabled: true
  max-file-size: 100MB
  max-request-size: 1GB
  Applies per-request (per chunk is 5MB, per direct upload is 100MB max)
```

### Caching Configuration

**Development** (application.yml):
```
Default: Not specified (disabled)
```

**Production** (application-prod.yml):
```
Cache Type: Caffeine
Spec: maximumSize=1000, expireAfterWrite=30m, expireAfterAccess=10m
Used For: Rate limit buckets
```

### Metadata & Monitoring

**Metrics Exposed**:
- JVM metrics
- Process metrics
- Tomcat metrics
- Database connection pool metrics

**Endpoints**:
```
/actuator/health
/actuator/info
/actuator/metrics
/actuator/prometheus
```

---

## 6. CURRENT BOTTLENECKS & RATE LIMITS

### Identified Bottlenecks

#### 6.1 Sequential Chunk Upload (Frontend)
- **Issue**: Chunks uploaded one-at-a-time per file
- **Impact**: For 100MB file (20 chunks × 5MB), upload takes longer than necessary
- **Mitigation Available**: Could implement parallel chunks per file (HTTP/2 multiplexing)
- **Current Benefit**: Simpler retry logic, better server resource management

#### 6.2 Chunk Assembly (Synchronous Streaming)
- **Issue**: Chunks streamed sequentially with 8KB buffer
- **Impact**: For large files, assembly can be slow (1-2 seconds for 500MB file)
- **Mitigation**: Using async task execution (@Async) offloads from request thread
- **Optimization**: Could use parallel stream reading with bounded executor

#### 6.3 Thread Pool Queue Saturation
- **Development**: Queue capacity 500, but could reach under 100 concurrent uploads
- **Production**: Queue capacity 1000, max 200 threads
- **Rejection Policy**: CallerRunsPolicy (caller thread runs task if queue full)
  - Can cause request thread blocking
  - Possible user-perceived latency spikes

#### 6.4 Rate Limit Bucket Cache
- **Size**: 10,000 max buckets (one per unique user ID)
- **TTL**: 1 hour expiration
- **Issue**: Under extreme load, cache lookups in ConcurrentHashMap could be slow
- **Mitigation**: Caffeine provides efficient eviction

#### 6.5 Database Connection Pool
- **Max Connections**: 20 (production)
- **Idle Timeout**: 10 minutes
- **Issue**: 20 connections with 200 upload threads could cause contention
  - Chunk metadata writes (1 per chunk)
  - Photo status updates
  - Storage quota updates
- **Risk**: Connection starvation during burst uploads

#### 6.6 WebSocket Progress Broadcast
- **Issue**: Broadcast to all connected clients per chunk completion
- **Impact**: If many clients connected, broadcast overhead increases
- **Current Implementation**: ProgressBroadcastService
- **Optimization**: Filter by userId (only notify client's own uploads)

#### 6.7 Thumbnail Generation
- **Issue**: CPU-intensive, runs synchronously for direct uploads
- **Timing**: Blocks processing executor thread
- **Configuration**: Core threads = CPU count, max = CPU count × 2
- **Risk**: Can bottleneck on machines with few cores

#### 6.8 Metadata Extraction
- **Issue**: Synchronous EXIF extraction before marking as completed
- **Timing**: Can add 0.5-2 seconds per photo
- **Risk**: If extraction fails, upload still succeeds (logged but not retried)

### Rate Limits

```
General API:        100 req/min per user
Upload API:         200 req/min per user  
Webhooks:           Not rate-limited (internal)
```

**User Experience Impact**:
- Single user: 200 uploads/minute = 3.3 uploads/sec
- At 5MB chunks: ~16.5 MB/sec (about 66 Mbps)
- Typical scenario: 1-10 concurrent uploads

---

## 7. CURRENT PERFORMANCE OPTIMIZATIONS

### Frontend Optimizations

#### 7.1 Parallel Upload Queue
- Handles 100 concurrent uploads
- Non-blocking thumbnail generation
- AbortController for cancellation
- Exponential backoff retry (1s, 2s, 4s)

#### 7.2 Chunk Processing
- 5MB chunks (balance between retry speed and overhead)
- Idempotency (skip already-uploaded chunks)
- Real-time progress tracking (WebSocket)

#### 7.3 Upload Metrics
- Speed calculation: bytes per second
- ETA calculation: remaining bytes / speed
- Updated every 1 second (10ms accuracy)

### Backend Optimizations

#### 7.4 Async Task Execution
- @Async("uploadExecutor") for chunk assembly
- @Async("processingExecutor") for thumbnails
- Request thread released immediately
- Heavy work offloaded to thread pool

#### 7.5 Streaming Operations
- InputStream streaming to S3 (not loading entire file to memory)
- 8KB buffer during chunk assembly
- Files streamed in chunks, not loaded whole

#### 7.6 Connection Pooling
- HikariCP with 20 max connections (production)
- Minimum 5 idle connections
- 10-minute idle timeout

#### 7.7 Caching
- Rate limit bucket cache (Caffeine, 1-hour expiration)
- Reduces database queries
- In-memory progress tracking (fast lookup)

#### 7.8 Compression
- HTTP compression enabled for responses
- Reduces bandwidth for metadata responses

#### 7.9 Batch Database Operations
```
Hibernate batch_size: 20
Order inserts: true
Order updates: true
```

#### 7.10 S3/R2 Integration
- Pre-signed URLs available (not implemented in current code)
- Retry with exponential backoff
- Aggressive retry policy for storage operations
- Streaming upload (no in-memory buffering)

#### 7.11 Idempotency
- Chunk uploads are idempotent (detected via database check)
- Safe to retry without side effects
- Returns progress instead of error on duplicate

---

## 8. RETRY & RESILIENCE STRATEGY

### Frontend Retry (useChunkedUpload.ts)
```
Per Chunk:
  Max Retries: 3
  Base Delay: 1000ms (1 second)
  Backoff: Exponential (multiply by 2)
  
  Attempt 1: Fail
  Attempt 2: Wait 1s, retry
  Attempt 3: Wait 2s, retry
  Attempt 4: Wait 4s, retry
  After: Chunk upload fails (user sees error)
```

### Backend Retry (ExponentialBackoffRetryService)
```
Assembly & S3 Operations:
  Aggressive Policy: 4 attempts
  Initial Delay: 100ms
  Max Delay: 32 seconds
  Factor: 2x exponential
  
  Used for:
    - Chunk assembly
    - S3 store/retrieve/delete
    - Critical operations
```

### Idempotency
- Chunk uploads checked for duplicates before writing
- PhotoId already exists before uploading new chunks
- Safe retry without data corruption

---

## 9. ERROR HANDLING & RECOVERY

### Frontend
- Validates file before adding to queue
- Captures HTTP error responses (400, 401, 403, 413, 429)
- Displays user-friendly error messages
- Allows retry of failed uploads
- Tracks failed chunks for retry

### Backend
- JWT authentication on all upload endpoints
- Ownership verification (userId must match photo owner)
- Photo existence validation before chunk upload
- Chunk validation (total count check)
- Exception handling with appropriate HTTP status codes
  - 400: Bad request (invalid upload request)
  - 401: Unauthorized (no auth token)
  - 403: Forbidden (unauthorized photo access)
  - 429: Too many requests (rate limit)
  - 500: Server error (storage/processing failure)

---

## 10. MONITORING & OBSERVABILITY

### Logging

**Development**:
```
com.rapidphoto: DEBUG
org.springframework.web: INFO
org.springframework.security: DEBUG
```

**Production**:
```
root: INFO
com.rapidphoto: INFO
org.springframework.web: WARN
org.springframework.security: WARN
org.hibernate: WARN
```

### Metrics Available

- JVM metrics
- Process metrics
- Tomcat metrics
- Database connection pool metrics
- Custom metrics (via Spring Boot Actuator)

### Real-time Progress Tracking

- WebSocket-based progress broadcast
- Per-chunk progress updates
- User-specific notifications
- Client-side ETA calculation

---

## SUMMARY TABLE: Key Performance Parameters

| Parameter | Development | Production | Impact |
|-----------|-------------|------------|--------|
| Concurrent Uploads (Frontend) | 100 | 100 | Max parallel files |
| Upload Thread Pool Size | 20-100 | 50-200 | Chunk assembly capacity |
| Upload Queue Capacity | 500 | 1000 | Burst capacity |
| Chunk Size | 5MB | 5MB | Retry speed, overhead |
| Max File Size | 100MB | 100MB | User limit |
| Rate Limit | 100-200/min | 100-200/min | API throttling |
| DB Connections | Default | 20 max | Connection contention |
| Upload Timeout (Graceful) | 120s | 120s | Upload completion wait |
| Retry Attempts | 3 (frontend), 4 (backend) | Same | Resilience |
| Thumbnail Threads | CPU count | CPU count | Processing speed |
| S3 Retry Policy | Aggressive (4x) | Aggressive (4x) | Storage reliability |

