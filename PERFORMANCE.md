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

## Runs

| When (UTC) | Mode | Files ok | Wall clock | Throughput | Per-file p50/p95/p99 (ms) | Upload reqs | Excess | Net fails | Peak in-flight / on-wire | Uplink |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-13 21:53 | `presigned` | 39/40 | 8 s | 15.05 MiB/s | 6457.7 / 7454.9 / 7717.4 | 139 | 19 | 0 | 57 / 6 | 89.72 Mbit/s |
| 2026-09-13 21:53 | `proxy` | 39/40 | 7.07 s | 17.03 MiB/s | 5350.2 / 6810 / 6810.1 | 58 | 16 | 0 | 57 / 6 | 88.57 Mbit/s |

## Run detail

### 2026-09-13 21:53:33 — `presigned`

- Outcome: **completed**
- Fixtures: 40 files, 129.4 MiB, seed 7, 1 above the 5 MiB chunk threshold
- Completed: 39/40 (120.5 MiB)
- Wall clock: 8 s — throughput 15.05 MiB/s (126.26 Mbit/s)
- Uplink at run time: 89.72 Mbit/s (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 139 upload-related of 307 total; expected minimum 120, excess 19
- Rate limited (429): 0 · other 4xx: 1 · 5xx: 0 · network failures: 0
- Peak concurrency: 57 in flight, **6 actually on the wire**
- By request kind: auth=4, presign=58, initialize=2, storagePut=39, complete=40
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: b11d717 (working tree dirty)
- First failures: Request failed with status code 400

### 2026-09-13 21:53:47 — `proxy`

- Outcome: **completed**
- Fixtures: 40 files, 129.4 MiB, seed 7, 1 above the 5 MiB chunk threshold
- Completed: 39/40 (120.5 MiB)
- Wall clock: 7.07 s — throughput 17.03 MiB/s (142.88 Mbit/s)
- Uplink at run time: 88.57 Mbit/s (not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run)
- Requests: 58 upload-related of 185 total; expected minimum 42, excess 16
- Rate limited (429): 0 · other 4xx: 1 · 5xx: 0 · network failures: 0
- Peak concurrency: 57 in flight, **6 actually on the wire**
- By request kind: auth=4, proxyUpload=56, initialize=2
- Host: 16× 13th Gen Intel(R) Core(TM) i5-13400F, 31.1 GiB, linux 7.2.3-arch1-3; Chromium 153.0.8010.12
- Storage target: minio (local, loopback) (http://localhost:9000)
- Backend commit: b11d717 (working tree dirty)
- First failures: Request failed with status code 400

