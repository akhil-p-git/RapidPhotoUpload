# RapidPhotoUpload

Spring Boot + React media platform: bulk photo upload straight to object
storage, EXIF and thumbnail processing, a searchable gallery, and live progress
over WebSocket.

**Why it exists.** Built against the Teamfront PRD during the Gauntlet AI
fellowship. The problem the PRD poses is bulk upload of high-resolution photos:
getting a large batch up quickly, and surviving the failures that come with
doing a thousand of anything over a network.

**What is honest about the performance story.** Uploading a large batch got
substantially faster, and the reasons are specific: the backend left the data
path for small files, client concurrency went up, and a self-imposed rate limit
was lifted. Chunking is *not* one of the reasons -- it buys recovery, not
throughput. The numbers, the method, and the limits of both live in
[PERFORMANCE.md](./PERFORMANCE.md), reproducible via
[`scripts/benchmark`](./scripts/benchmark). Figures not reproduced there should
not be quoted.

## Features

- **Direct-to-storage upload** for files at or below 5 MiB: the browser PUTs to
  Cloudflare R2 using a presigned URL, so the bytes never cross the backend.
- **Chunked upload** above 5 MiB, in 5 MiB pieces, ten in parallel per file.
  These *do* cross the backend, which assembles and forwards them.
- **Resumable chunked uploads.** Sessions survive a reload; the client asks the
  server which chunks it holds and sends only the rest.
- **Upload validation** that survives the bytes not crossing the server: the
  presigned URL is signed over content-length and content-type, and completion
  verifies the stored object's real size and sniffs its format.
- **Gallery** with search, filters, sorting, and pagination.
- **Processing pipeline**: EXIF extraction and three thumbnail sizes per photo.
- **JWT auth**, per-user storage quotas, per-user rate limiting, Prometheus metrics.

## Architecture at a glance

```
browser ──presign──▶ backend ──▶ Postgres
   │                    │
   └───PUT bytes────▶  R2  ◀──── backend (chunked path only)
```

Full detail, including which path a file takes and what is known to be broken:
[ARCHITECTURE.md](./ARCHITECTURE.md).

## Stack

**Backend** Java 17, Spring Boot 3.3.5, PostgreSQL + Flyway, Spring Security +
JWT, AWS SDK v2 against Cloudflare R2, Thumbnailator, Bucket4j, Caffeine,
Actuator.
**Web** React 18, TypeScript, Vite, Tailwind, Axios, React Router.
**Mobile** React Native via Expo.
**Automation** optional n8n workflows.

## Running it

Prerequisites: Java 17+, Node 20+ with pnpm, Docker.

```bash
docker compose up -d postgres     # database on :54321
pnpm install
pnpm dev:backend                  # :8080
pnpm dev:web                      # :3000
```

- Web: http://localhost:3000
- API: http://localhost:8080
- Health: http://localhost:8080/actuator/health
- Metrics: http://localhost:8080/actuator/prometheus

Storage defaults to the local filesystem. The presigned upload path requires an
S3-compatible store: set `STORAGE_TYPE=s3` with the variables below. For a free
local one, `scripts/benchmark/docker-compose.minio.yml` brings up MinIO.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://localhost:54321/rapidphotoupload` | |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | `postgres` | |
| `JWT_SECRET` | dev placeholder | min 32 chars; set this in production |
| `STORAGE_TYPE` | `local` | `s3` for R2 or any S3-compatible store |
| `S3_BUCKET_NAME` / `S3_ENDPOINT` | - | |
| `AWS_REGION` | `auto` | `auto` for R2 |
| `AWS_ACCESS_KEY` / `AWS_SECRET_KEY` | - | keep these out of tracked files |
| `S3_PATH_STYLE_ACCESS` | `false` | `true` for MinIO |
| `UPLOAD_CHUNK_SIZE` | `5242880` | 5 MiB; must match `CHUNK_SIZE` in the web app |
| `UPLOAD_MAX_FILE_SIZE_BYTES` | `104857600` | 100 MiB |
| `UPLOAD_PRESIGNED_TTL_MINUTES` | `10` | lifetime of an upload URL |
| `UPLOAD_CLEANUP_TTL_MINUTES` | `120` | before an unfinished upload is reclaimed |
| `RATE_LIMIT_UPLOAD_CAPACITY` | `5000` | requests/minute, per authenticated user |

### Tuned constants

These are the numbers the code actually uses. They have drifted from the docs
before, so if you change one, change it here too.

| Constant | Value | Where |
|---|---|---|
| Chunk size | 5 MiB | `apps/web/src/utils/uploadWorker.ts`, `upload.chunk-size` |
| Parallel chunks per file | 10 | `useChunkedUpload.ts` |
| Concurrent file uploads | 12 | `useFileUpload.ts` -- measured, see PERFORMANCE.md |
| Upload rate limit | 5000 req/min per user | `rate-limit.upload.capacity` |
| Chunk retries | 3, exponential backoff | `useChunkedUpload.ts` |

Note the presigned path costs three requests per file (presign, PUT, complete),
so 5000 requests/minute is worth roughly 1600 files/minute per user.
Unauthenticated requests fall back to a per-IP bucket.

## Deploying

`railway.json`, `render.yaml`, `vercel.json` and `docker-compose.yml` are
checked in for Railway, Render, Vercel and Docker respectively. The backend
image builds from `apps/backend/Dockerfile`.

If `STORAGE_TYPE=s3`, the bucket needs a CORS rule permitting `PUT` from the web
app's origin -- without it every direct upload fails its preflight with no
useful error.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) -- how uploads work, where the speed came
  from, and known gaps
- [PERFORMANCE.md](./PERFORMANCE.md) -- measured results and the method behind them
- [API.md](./API.md) -- endpoints
- [TESTING.md](./TESTING.md) -- what is covered and what is not
- [CONTRIBUTING.md](./CONTRIBUTING.md)

## Status

A fellowship project, not a production deployment. It has never run under real
user load, and [ARCHITECTURE.md](./ARCHITECTURE.md) lists defects that are known
and unfixed.

## Author

Akhil Pinnani - [github.com/akhil-p-git](https://github.com/akhil-p-git)
