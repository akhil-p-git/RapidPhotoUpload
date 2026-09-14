# Architecture

A media platform built against the Teamfront PRD: bulk photo upload, EXIF and
thumbnail processing, a searchable gallery, and live progress.

This document describes what the code does, including the parts that do not yet
work. Where a claim is measured, it links to the measurement.

## Shape

```
apps/web  (React 18 + TS + Vite)          apps/mobile (Expo)
      |                                          |
      |  JWT over HTTP                           |
      v                                          v
              apps/backend  (Spring Boot 3.3.5, Java 17)
                   |                    |
                   v                    v
            PostgreSQL + Flyway    Cloudflare R2 (S3 API, AWS SDK v2)
                                        ^
      browser PUTs bytes directly ------+
```

`apps/n8n` holds optional workflow automation; the backend posts webhooks to it
and does not depend on it.

## The two upload paths

Dispatch is by file size, in `apps/web/src/features/upload/hooks/useFileUpload.ts`,
against `CHUNK_SIZE = 5 MiB` from `apps/web/src/utils/uploadWorker.ts`.

| File size | Path | Do bytes cross the backend? | Resumable |
|---|---|---|---|
| <= 5 MiB | presign → browser `PUT` to R2 → `POST /complete` | No | No |
| > 5 MiB | `POST /initialize` → N x `POST /chunk` → server assembles → R2 | **Yes** | Yes |

Two consequences worth being explicit about, because they are easy to state
backwards:

1. **Large files still go through the backend.** The direct-to-R2 change
   (`0f02ef5`) altered only the small-file path. The chunked path uploads to the
   server, which holds the pieces and pushes the assembled file to R2.
2. **Only large files can resume.** Resume is a property of chunking, and
   chunking only happens above 5 MiB. A 4 MiB file that fails restarts whole.

`VITE_UPLOAD_MODE=proxy` restores the pre-`0f02ef5` behaviour for small files so
the two architectures can be measured against each other. See
[`scripts/benchmark`](./scripts/benchmark).

## Where the speed came from

The project's headline claim is that a 1000-image batch went from roughly
15-20 minutes to 2-3. Three changes were supposed to be responsible. Two were
real; the third never took effect. **Chunking is not among them.**

1. **The backend left the data path** for small files. Bytes go browser to R2
   instead of browser to backend to R2, removing a store-and-forward hop and the
   backend's own bandwidth and disk from the critical path. Real.
2. **Client concurrency went up.** The upload queue runs many files at once
   rather than a handful. Real, but far less than the configured number
   suggests -- see below.
3. **A self-imposed rate limit was lifted from 200 to 5000 requests/minute.**
   **This did not happen.** `RateLimitConfig` built its buckets from constants
   in the code and never read the `rate-limit` block in `application.yml`, so
   raising the YAML value changed nothing. The effective limit stayed at 200
   requests/minute per user until it was fixed. Every document in the repository
   quoted a different figure (1000, 5000, 10) and all of them were wrong.

**Chunking buys recovery, not throughput.** Splitting a file into 5 MiB pieces
does not make bytes travel faster; the same bytes cross the same link. It means
a failure costs one chunk instead of a whole file, and it is what makes resume
possible. Presenting it as the source of the speedup gets the mechanism
backwards.

### The arithmetic nobody did

Two numbers make the original claim hard to sustain, and both are worth being
able to produce from memory.

**Request cost.** The presigned path spends **three** requests per file
(presign, PUT, complete). The proxied path it replaced spent **one**. Against an
effective 200 requests/minute, a 1000-image batch costs:

| Path | Requests | Minutes of rate-limit budget |
|---|---|---|
| Proxied (old) | 1,000 | 5 |
| Presigned (new) | 3,000 | **15** |

So under the limit that was actually in force, moving to presigned uploads
*tripled* the request cost of a batch without raising the ceiling it spent
against. A 2-3 minute run was not reachable on that path regardless of
bandwidth. (With the limit now reading its configured 5000/minute, the same
batch costs about 36 seconds of budget and stops being the binding constraint.)

**Bandwidth.** 1000 images at roughly 3 MiB each is about 3.4 GB, or 27 Gbit.
Two to three minutes needs 150-215 Mbit/s sustained upstream. The measured
uplink on the development machine was about 89 Mbit/s, which puts a floor of
roughly five minutes on the transfer alone. Removing the backend from the data
path cannot multiply an uplink; it can only stop wasting it.

None of this means the work was worthless -- both real changes moved in the
right direction. It means the specific figure "2-3 minutes" has not been
demonstrated, and the reasons given for it were partly wrong.

**Concurrency.** `MAX_CONCURRENT_UPLOADS` limits files in flight, not requests
on the wire. The browser caps connections per origin, so most of a large setting
queues. See [PERFORMANCE.md](./PERFORMANCE.md) for the measured
in-flight-versus-on-wire gap and the sweep that chose the current value.

The proxy-versus-direct comparison has so far only been run against a loopback
store, where it cannot show the benefit of leaving the data path. Do not quote a
speedup factor that has not been measured against R2.

## Data model

`Photo` is the aggregate. `UploadChunk` rows track pieces of an in-flight
chunked upload and are deleted on assembly. `User` carries the storage quota.
Flyway owns the schema (`apps/backend/src/main/resources/db/migration`);
Hibernate is set to `validate`, so entities never silently reshape the database.

`UploadSession` and `upload_sessions` exist but are **dead**: nothing constructs
or persists one, and `Photo.uploadSessionId` is always null. Do not read the
entity as a description of how uploads are tracked. Reclaiming abandoned uploads
is keyed on `Photo` status instead — see `AbandonedUploadCleanupService`.

## Validating a direct upload

Moving bytes out of the backend removed the point where the server saw them, so
size and type became client assertions. They are re-established at the only two
moments the server still controls:

- **Before the URL exists**: the declared type must be in the allowlist, the
  declared size must be positive and within `upload.max-file-size-bytes`, and it
  must fit the caller's quota.
- **In the URL itself**: `content-length` and `content-type` are signed, so the
  store rejects a body of any other size or type. Verified against MinIO;
  **not** yet verified against R2 — run
  `scripts/benchmark/src/probe-presigned-limits.mjs` there before claiming it.
- **On completion**: the object is HEADed, its real size compared to the
  declaration, and its leading bytes sniffed to confirm the format. A mismatch
  deletes the object, fails the photo, and refunds the quota.

The completion check is the one that holds regardless of what any particular
store enforces at PUT time, so it is the one to rely on.

## Processing

`POST /complete` (or chunk assembly) marks the photo PROCESSING, extracts EXIF
synchronously, and kicks off thumbnail generation asynchronously on the
`uploadExecutor` pool. Three derivative sizes are written per photo, so a
finished upload leaves four objects in the bucket. Progress is broadcast over
WebSocket.

## Considered and not built: S3 multipart with presigned parts

The architecturally correct fix for "fast *and* resumable on every file" is to
use S3/R2 multipart upload with presigned part URLs. This is a design note, not
a plan of record -- it has not been implemented.

**How it would work.** `POST /multipart/initiate` does the quota check, creates
the Photo, calls `CreateMultipartUpload`, and returns an `uploadId` plus a
presigned `UploadPart` URL per part. The browser PUTs parts directly to R2 in
parallel, collecting an `ETag` per part. `POST /multipart/complete` sends the
part list and R2 assembles server-side. Resume becomes a `ListParts` call:
the server asks the store which parts it already holds, and the client sends the
rest.

**What it would let us delete.** `ChunkController`, `ChunkUploadService`,
`ChunkAssemblyService`, the chunk DTOs, the `UploadChunk` entity and repository,
the `upload_chunks` table, `AbandonedUploadCleanupService` and its collector
(an R2 lifecycle rule aborts stale multipart uploads for free), the client's
chunk batching, and the IndexedDB resume bookkeeping -- the store becomes the
source of truth for what has arrived. Roughly 800 lines, replaced by perhaps
500.

**What it would gain.** Resume on every file above the part minimum. No bytes
through the backend on any path, including large files. Assembly performed by
R2 rather than by the backend reading every chunk back out of storage.

**What it would cost.**

- *It does not literally unify the two paths.* S3 requires every part except the
  last to be at least 5 MiB, so files below that are still a single presigned
  PUT. The win is that both paths then go direct to R2; the byte path is
  unified even though the endpoint count is not.
- *`ETag` must be exposed by CORS.* The browser cannot read a response header
  the bucket does not list in `ExposeHeaders`, and without the per-part `ETag`
  the completion call is impossible. This is the classic way this migration
  fails.
- *Part numbers are 1-based* and capped at 10,000, against the current 0-based
  chunk numbering -- an easy off-by-one during migration.
- *R2 support must be confirmed*, `ListParts` in particular, before committing.
- Storing `uploadId` needs a small migration.

## Known gaps

- The upload queue can dispatch the same task twice: the effect that starts
  uploads re-runs before React has flushed the `uploading` status, so a file can
  be picked up again. Measured at roughly 16 excess requests per 40 files, each
  leaving an orphaned Photo row.
- Thumbnail generation base64-encodes every selected file in the browser to
  build a preview, with no concurrency limit. At batch sizes in the hundreds
  this is the most likely thing to exhaust the renderer.
- `ImageMetadataExtractor` throws on any photo without GPS EXIF (a ternary
  unboxes a null `Double`). It is caught, so uploads succeed, but metadata
  extraction silently fails for every non-geotagged photo.
- The frontend has pre-existing type errors from mixing `@types/react-router-dom`
  v5 with `react-router-dom` v6; the production build skips `tsc`.
