# Upload benchmark

Measures how long a batch of images takes to upload through the **real** React
client, and compares the current direct-to-object-store architecture against the
older proxied one.

It exists because the performance claim about this project ("a 1,000-image batch
went from ~15–20 minutes to 2–3 minutes") previously lived only in prose. This
harness makes that number reproducible, or shows that it is not.

## One-command run

```bash
pnpm --filter @rapid-photo/benchmark fixtures        # once, ~5 min, ~3.2 GiB
pnpm --filter @rapid-photo/benchmark bench -- --mode=presigned
pnpm --filter @rapid-photo/benchmark bench -- --mode=proxy
```

Each run appends a JSON file to `benchmark-results/` and regenerates
`PERFORMANCE.md` at the repo root from **all** recorded runs.

## What you have to start first

The harness starts the Vite dev server itself (the upload mode is a build-time
flag, so it cannot be switched per page load). It does **not** start the backend
or the object store.

### 1. Postgres

```bash
docker compose up -d postgres
```

### 2. Object store

**MinIO (default, free, loopback):**

```bash
pnpm --filter @rapid-photo/benchmark minio:up
```

**Cloudflare R2:** no local container. Keep credentials in an untracked file
(`~/.secrets.env`) and export them before starting the backend. The bucket needs
a CORS rule allowing `PUT` from `http://localhost:3000`, or every direct upload
fails its preflight.

### 3. Backend, pointed at the same store

MinIO:

```bash
cd apps/backend
STORAGE_TYPE=s3 \
S3_ENDPOINT=http://localhost:9000 \
S3_BUCKET_NAME=bench-uploads \
S3_PATH_STYLE_ACCESS=true \
AWS_REGION=us-east-1 \
AWS_ACCESS_KEY=benchlocal \
AWS_SECRET_KEY=benchlocal123 \
./gradlew bootRun
```

R2: set `S3_ENDPOINT`, `S3_BUCKET_NAME`, `AWS_REGION=auto` and the real keys from
your secrets file, and leave `S3_PATH_STYLE_ACCESS` unset.

> Both modes must point at the **same** store. Comparing a proxied run that wrote
> to local disk against a direct run that wrote to R2 measures the storage
> backend, not the architecture.

## Flags

### `fixtures`

| Flag | Default | Meaning |
|---|---|---|
| `--count` | `1000` | Number of images |
| `--seed` | `1337` | Same seed ⇒ byte-identical fixtures |
| `--min-bytes` / `--max-bytes` | 2–4 MiB | Size band for normal files |
| `--large-fraction` | `0.05` | Fraction pushed above the 5 MiB chunk threshold |
| `--quality` | `82` | JPEG quality |
| `--out` | `./fixtures` | Output dir (gitignored) |

### `bench`

| Flag | Default | Meaning |
|---|---|---|
| `--mode` | `presigned` | `presigned` (direct to store) or `proxy` (through backend) |
| `--target` | `minio` | Recorded in the result so runs are not silently compared across stores |
| `--headed` | off | Show the browser |
| `--no-uplink` | off | Skip the run-time bandwidth measurement |
| `--app-url` | `http://localhost:3000` | Vite dev server |
| `--api-base` | `http://localhost:8080/api` | Backend |
| `--timeout-minutes` | `45` | Hard ceiling for a run |

## What the two modes actually differ in

Only the path taken by files **at or below the 5 MiB chunk threshold**:

| File size | `--mode=proxy` | `--mode=presigned` |
|---|---|---|
| ≤ 5 MiB | `POST /api/upload` through the backend | presign → browser `PUT` direct to store → complete |
| > 5 MiB | chunked through the backend | **chunked through the backend (identical)** |

Large files take the same route in both modes, so a fixture set weighted toward
large files will show little difference. This is a property of the application,
not of the harness.

## Reading the output

- **in flight vs on wire** — `in flight` is requests the app has dispatched;
  `on wire` is requests whose body Chrome was actually transmitting. A large gap
  means the configured concurrency is queueing rather than parallelising.
- **excess requests** — observed upload requests minus the protocol minimum.
  Usually retries.
- **transfer floor** — the shortest possible time for the payload at the uplink
  measured during that run. A result at or near the floor is bandwidth-bound,
  and no architectural change will improve it.

## Two changes this harness needed in application code

Both are inert unless the corresponding env var is set:

- `VITE_UPLOAD_MODE=proxy` restores the pre-`0f02ef5` proxied path for
  sub-threshold files. The code for it was still present and unused.
- `VITE_BENCH=1` makes `useFileUpload` push task start/finish marks onto
  `window.__bench`. Nothing reads it in normal operation.
