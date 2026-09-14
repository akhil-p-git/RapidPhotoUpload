# Performance

Every number here was produced by `scripts/benchmark` and read back out of the
JSON files in [`benchmark-results/`](./benchmark-results). Nothing in this file
is typed by hand; re-running the benchmark rewrites it.

## How it is measured

The harness drives the **real React client** in headless Chromium (Playwright).
It does not reimplement the upload scheduling, because the browser's per-origin
connection limit is part of what is being measured and a Node script would not
reproduce it.

Two independent sources are combined:

- **Per-file duration** comes from marks the app emits itself (`VITE_BENCH=1`),
  measured from the moment a task starts uploading to the moment it reports
  completion.
- **Request counts, failures and concurrency** come from Chrome DevTools
  Protocol `Network.*` events — i.e. what actually crossed the wire.

**In flight vs on wire.** `in flight` counts requests the app has dispatched
and is waiting on. `on wire` counts requests whose body Chrome was actually
transmitting (`sendStart`→`sendEnd`). When `in flight` greatly exceeds
`on wire`, the configured concurrency is producing queueing, not parallelism.

**Excess requests** is observed upload requests minus the protocol minimum for
the fixture set. Retries are the usual cause; it is labelled "excess" rather
than "retries" because a preflight or redirect would also be counted.

## What this is not

- A single machine on a single network, not a distributed load test.
- Synthetic fixtures: deterministic JPEGs with real EXIF, generated from a seed.
  They are not photographs and their compressibility is uniform by construction.
- **Duration is bounded by this machine's uplink.** The `uplink` column is
  measured at run time. A run cannot beat the `transfer floor` implied by it,
  and comparing runs taken on different links is meaningless.
- Timing ends when the client has uploaded a file and the completion call has
  returned. Server-side thumbnailing and EXIF extraction continue afterwards and
  are **not** included.
- `proxy` and `presigned` differ **only for files at or below the 5 MiB chunk
  threshold**. Larger files take the chunked path, which routes through the
  backend in both modes. A fixture set of mostly-large files would show little
  difference between the two modes by construction.

### Reading a proxy-vs-presigned comparison

`presigned` costs **three** requests per file (presign → PUT → complete) where
`proxy` costs **one**. It buys back the cost of moving the bytes through the
backend. So which mode wins depends entirely on what the backend costs:

- Against a **loopback store**, the backend costs almost nothing to traverse, so
  the two extra round trips dominate and `proxy` is expected to be *faster*.
  A loopback run therefore cannot support a claim that going direct is quicker.
- Against a **remote store**, with a backend that is bandwidth- or CPU-bound,
  the byte path dominates and `presigned` should win.

A run against MinIO answers "how much concurrency does the client actually
achieve, and how many requests does each architecture cost". It does **not**
answer "is the current architecture faster in production". Only a `--target=r2`
run can speak to that.

## Concurrency: configured versus achieved

`MAX_CONCURRENT_UPLOADS` caps how many files the queue has in flight. It does
not cap how many requests the browser actually transmits -- Chrome limits
connections per origin, so beyond that everything queues.

Sweeping the setting across a 50x range against a local S3-compatible store
(100 files, best of two runs each):

| configured | throughput | peak on wire |
|---|---|---|
| 2 | 14.89 MiB/s | 4 |
| 4 | 14.77 MiB/s | 4 |
| 6 | 14.92 MiB/s | 4 |
| 8 | 14.83 MiB/s | 4 |
| 12 | 14.84 MiB/s | 5 |
| 16 | 14.89 MiB/s | 4 |
| 32 | 14.85 MiB/s | 4 |
| 100 | 15.20 MiB/s | 4 |

Throughput varies by under 3% across the whole range, and the number of
requests actually in transmission never exceeds five. The previous setting of
500 bought no parallelism: it bought a deeper queue and a longer pending list
for React to re-render on every progress event.

Reproduce with:

```bash
node scripts/benchmark/src/sweep-concurrency.mjs --values=2,4,6,8,12,16,32,100 --repeats=2
```

Caveat worth keeping in mind: this is a loopback store, where round-trip time is
near zero and very little concurrency is needed to saturate it. Against a remote
store, more requests in flight are needed simply to cover latency, so the knee
would move right. That is why the shipped value is 12 rather than the measured
knee of 2 -- see the comment on the constant.

## Runs

| When (UTC) | Mode | Max conc | Files ok | Wall clock | Throughput | Per-file p50/p95/p99 (ms) | Upload reqs | Excess | Net fails | Peak in-flight / on-wire | Uplink |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-13 22:38 | `presigned` | 2 | 100/100 | 20.72 s | 14.89 MiB/s | 541.1 / 12802.8 / 12804.7 | 313 | 13 | 0 | 16 / 4 | — |
| 2026-09-13 22:38 | `presigned` | 2 | 100/100 | 21.42 s | 14.4 MiB/s | 540.7 / 12967.6 / 12969.4 | 312 | 12 | 0 | 16 / 4 | — |
| 2026-09-13 22:39 | `presigned` | 4 | 100/100 | 20.89 s | 14.76 MiB/s | 505.3 / 12921.1 / 12922.9 | 312 | 12 | 0 | 16 / 3 | — |
| 2026-09-13 22:39 | `presigned` | 4 | 100/100 | 20.88 s | 14.77 MiB/s | 482.8 / 13738.7 / 13740.1 | 312 | 12 | 0 | 16 / 4 | — |
| 2026-09-13 22:39 | `presigned` | 6 | 100/100 | 20.68 s | 14.92 MiB/s | 500.7 / 13652.9 / 13654.7 | 312 | 12 | 0 | 16 / 4 | — |
| 2026-09-13 22:40 | `presigned` | 6 | 100/100 | 21.17 s | 14.57 MiB/s | 520.4 / 12772.9 / 13798.6 | 312 | 12 | 0 | 16 / 4 | — |
| 2026-09-13 22:40 | `presigned` | 8 | 100/100 | 20.8 s | 14.83 MiB/s | 504.6 / 13774.3 / 13776.8 | 312 | 12 | 0 | 15 / 4 | — |
| 2026-09-13 22:40 | `presigned` | 8 | 100/100 | 21.06 s | 14.64 MiB/s | 512.9 / 13107.1 / 13109 | 308 | 8 | 0 | 12 / 4 | — |
| 2026-09-13 22:41 | `presigned` | 12 | 100/100 | 20.95 s | 14.72 MiB/s | 526.7 / 13007 / 13009.6 | 312 | 12 | 0 | 16 / 4 | — |
| 2026-09-13 22:41 | `presigned` | 12 | 100/100 | 20.79 s | 14.84 MiB/s | 479.5 / 12921.8 / 12924.4 | 308 | 8 | 0 | 12 / 5 | — |
| 2026-09-13 22:42 | `presigned` | 16 | 100/100 | 21.25 s | 14.51 MiB/s | 543.2 / 13662.1 / 13663.5 | 309 | 9 | 0 | 13 / 3 | — |
| 2026-09-13 22:42 | `presigned` | 16 | 100/100 | 20.72 s | 14.89 MiB/s | 522.2 / 13612 / 13613.3 | 308 | 8 | 0 | 12 / 4 | — |
| 2026-09-13 22:42 | `presigned` | 32 | 100/100 | 20.77 s | 14.85 MiB/s | 498.9 / 12872.1 / 12873.8 | 312 | 12 | 0 | 16 / 4 | — |
| 2026-09-13 22:43 | `presigned` | 32 | 100/100 | 20.88 s | 14.77 MiB/s | 501.2 / 12900.6 / 12902.4 | 312 | 12 | 0 | 14 / 4 | — |
| 2026-09-13 22:43 | `presigned` | 100 | 100/100 | 20.3 s | 15.2 MiB/s | 502.9 / 12809.4 / 12811.4 | 309 | 9 | 0 | 11 / 4 | — |
| 2026-09-13 22:43 | `presigned` | 100 | 100/100 | 20.94 s | 14.73 MiB/s | 501.4 / 13846.5 / 13848.1 | 312 | 12 | 0 | 16 / 5 | — |

## Run detail

### 2026-09-13 22:38:21 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.72 s — throughput 14.89 MiB/s (124.88 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 313 upload-related of 659 total; expected minimum 300, excess 13
- Rate limited (429): 0 · other 4xx: 1 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 2
- Peak concurrency: 16 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=103, storagePut=95, complete=96, initialize=6, chunk=13
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: f39c94a (working tree dirty)

### 2026-09-13 22:38:43 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 21.42 s — throughput 14.4 MiB/s (120.79 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 312 upload-related of 658 total; expected minimum 300, excess 12
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 2
- Peak concurrency: 16 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=103, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: f39c94a (working tree dirty)

### 2026-09-13 22:39:05 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.89 s — throughput 14.76 MiB/s (123.84 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 312 upload-related of 658 total; expected minimum 300, excess 12
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 4
- Peak concurrency: 16 in flight, **3 actually on the wire**
- By request kind: auth=4, presign=103, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:39:27 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.88 s — throughput 14.77 MiB/s (123.91 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 312 upload-related of 658 total; expected minimum 300, excess 12
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 4
- Peak concurrency: 16 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=103, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:39:49 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.68 s — throughput 14.92 MiB/s (125.13 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 312 upload-related of 658 total; expected minimum 300, excess 12
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 6
- Peak concurrency: 16 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=103, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:40:11 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 21.17 s — throughput 14.57 MiB/s (122.22 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 312 upload-related of 658 total; expected minimum 300, excess 12
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 6
- Peak concurrency: 16 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=103, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:40:34 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.8 s — throughput 14.83 MiB/s (124.37 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 312 upload-related of 658 total; expected minimum 300, excess 12
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 8
- Peak concurrency: 15 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=103, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:40:56 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 21.06 s — throughput 14.64 MiB/s (122.84 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 308 upload-related of 654 total; expected minimum 300, excess 8
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 8
- Peak concurrency: 12 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=99, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:41:18 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.95 s — throughput 14.72 MiB/s (123.51 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 312 upload-related of 658 total; expected minimum 300, excess 12
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 12
- Peak concurrency: 16 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=103, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:41:40 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.79 s — throughput 14.84 MiB/s (124.48 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 308 upload-related of 654 total; expected minimum 300, excess 8
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 12
- Peak concurrency: 12 in flight, **5 actually on the wire**
- By request kind: auth=4, presign=99, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:42:03 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 21.25 s — throughput 14.51 MiB/s (121.73 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 309 upload-related of 655 total; expected minimum 300, excess 9
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 16
- Peak concurrency: 13 in flight, **3 actually on the wire**
- By request kind: auth=4, presign=100, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:42:25 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.72 s — throughput 14.89 MiB/s (124.89 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 308 upload-related of 654 total; expected minimum 300, excess 8
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 16
- Peak concurrency: 12 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=99, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:42:47 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.77 s — throughput 14.85 MiB/s (124.6 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 312 upload-related of 658 total; expected minimum 300, excess 12
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 32
- Peak concurrency: 16 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=103, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:43:09 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.88 s — throughput 14.77 MiB/s (123.91 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 312 upload-related of 658 total; expected minimum 300, excess 12
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 32
- Peak concurrency: 14 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=103, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:43:31 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.3 s — throughput 15.2 MiB/s (127.47 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 309 upload-related of 655 total; expected minimum 300, excess 9
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 100
- Peak concurrency: 11 in flight, **4 actually on the wire**
- By request kind: auth=4, presign=100, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

### 2026-09-13 22:43:53 — `presigned`

- Outcome: **completed**
- Fixtures: 100 files, 308.4 MiB, seed 7, 5 above the 5 MiB chunk threshold
- Completed: 100/100 (308.4 MiB)
- Wall clock: 20.94 s — throughput 14.73 MiB/s (123.55 Mbit/s)
- Uplink at run time: — (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 312 upload-related of 658 total; expected minimum 300, excess 12
- Rate limited (429): 0 · other 4xx: 0 · 5xx: 0 · network failures: 0
- Configured MAX_CONCURRENT_UPLOADS: 100
- Peak concurrency: 16 in flight, **5 actually on the wire**
- By request kind: auth=4, presign=103, storagePut=95, complete=96, initialize=6, chunk=12
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: 634ee29 (working tree dirty)

