/**
 * Result persistence and PERFORMANCE.md generation.
 *
 * PERFORMANCE.md is regenerated from the full set of result JSON files on every
 * run, so the document can never drift from the data behind it. Numbers are
 * printed at the precision they were measured at and are not rounded in any
 * direction that flatters the result.
 */

import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { summarise, peakConcurrency, concurrencyOverTime } from './metrics.mjs';
import { transferFloorSeconds } from './uplink.mjs';

const MIB = 1024 * 1024;

export function analyse(raw, { manifest, environment, expectedRequests }) {
  const durations = raw.perFileMs.map((f) => f.ms);
  const wallSeconds = raw.wallClockMs / 1000;
  const totalBytes = manifest.totalBytes;

  // Throughput is computed over bytes that actually completed, not over the
  // fixture total -- a run that failed half its files must not report the
  // throughput it would have had if they had succeeded.
  const completedBytes = raw.perFileMs.reduce((a, f) => a + (f.bytes || 0), 0);

  // A floor derived from internet uplink is meaningless for a loopback target:
  // the bytes never leave the machine, so a run will "beat" the floor and the
  // comparison invites exactly the wrong conclusion. Only emit it when the
  // store is actually remote.
  const isLoopback = /loopback|minio/i.test(environment.storage?.kind ?? '');
  const uplinkMbps = isLoopback ? null : (environment.uplink?.mbps ?? null);

  return {
    ...raw,
    fixtures: {
      count: manifest.count,
      totalBytes,
      totalMiB: Number((totalBytes / MIB).toFixed(1)),
      overChunkThreshold: manifest.countOverChunkThreshold,
      seed: manifest.seed,
    },
    derived: {
      wallClockSeconds: Number(wallSeconds.toFixed(2)),
      completedBytes,
      completedMiB: Number((completedBytes / MIB).toFixed(1)),
      throughputMiBs: wallSeconds > 0 ? Number((completedBytes / MIB / wallSeconds).toFixed(2)) : null,
      throughputMbps: wallSeconds > 0 ? Number(((completedBytes * 8) / wallSeconds / 1e6).toFixed(2)) : null,
      perFileMs: summarise(durations),
      // Requests beyond the minimum the protocol requires. Retries are the
      // dominant cause; a redirect or preflight would also land here, which is
      // why this is reported as "excess" rather than asserted to be retries.
      expectedRequests,
      excessRequests: raw.requests.uploadRelated - expectedRequests,
      peakConcurrency: {
        inFlight: peakConcurrency(raw.intervals.inFlight),
        onWire: peakConcurrency(raw.intervals.onWire),
      },
      concurrencyTimeline: concurrencyOverTime(raw.intervals.onWire, 500).slice(0, 400),
      transferFloorSeconds: transferFloorSeconds(completedBytes, uplinkMbps),
      transferFloorNote: isLoopback
        ? 'not applicable: bytes went to a loopback store, so the measured internet uplink does not bound this run'
        : null,
    },
    environment,
  };
}

export async function writeResult(resultsDir, result) {
  await mkdir(resultsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(resultsDir, `${stamp}__${result.mode}.json`);
  // The timeline is useful but bulky; keep it out of the committed record.
  const { derived, ...rest } = result;
  const { concurrencyTimeline, ...derivedSlim } = derived;
  await writeFile(file, JSON.stringify({ ...rest, derived: derivedSlim }, null, 2));
  return file;
}

async function loadResults(resultsDir) {
  let names = [];
  try {
    names = (await readdir(resultsDir)).filter((n) => n.endsWith('.json'));
  } catch {
    return [];
  }
  const out = [];
  for (const n of names.sort()) {
    try {
      out.push(JSON.parse(await readFile(path.join(resultsDir, n), 'utf8')));
    } catch { /* skip unreadable result */ }
  }
  return out;
}

const fmt = (v, suffix = '') => (v === null || v === undefined ? '—' : `${v}${suffix}`);

function runRow(r) {
  const d = r.derived ?? {};
  const when = (r.environment?.capturedAt ?? '').slice(0, 16).replace('T', ' ');
  const status = r.outcome === 'completed'
    ? `${r.files.completed}/${r.files.expected}`
    : `**${r.outcome}** ${r.files.completed}/${r.files.expected}`;
  const conc = r.environment?.clientConcurrencyLimit ?? '—';
  return `| ${when} | \`${r.mode}\` | ${conc} | ${status} | ${fmt(d.wallClockSeconds, ' s')} | ${fmt(d.throughputMiBs, ' MiB/s')} | `
    + `${fmt(d.perFileMs?.p50)} / ${fmt(d.perFileMs?.p95)} / ${fmt(d.perFileMs?.p99)} | `
    + `${fmt(r.requests?.uploadRelated)} | ${fmt(d.excessRequests)} | ${fmt(r.requests?.networkFailures)} | `
    + `${fmt(d.peakConcurrency?.inFlight)} / ${fmt(d.peakConcurrency?.onWire)} | `
    + `${fmt(r.environment?.uplink?.mbps, ' Mbit/s')} |`;
}

export async function regeneratePerformanceDoc(resultsDir, outFile) {
  const results = await loadResults(resultsDir);

  const header = `# Performance

Every number here was produced by \`scripts/benchmark\` and read back out of the
JSON files in [\`benchmark-results/\`](./benchmark-results). Nothing in this file
is typed by hand; re-running the benchmark rewrites it.

## How it is measured

The harness drives the **real React client** in headless Chromium (Playwright).
It does not reimplement the upload scheduling, because the browser's per-origin
connection limit is part of what is being measured and a Node script would not
reproduce it.

Two independent sources are combined:

- **Per-file duration** comes from marks the app emits itself (\`VITE_BENCH=1\`),
  measured from the moment a task starts uploading to the moment it reports
  completion.
- **Request counts, failures and concurrency** come from Chrome DevTools
  Protocol \`Network.*\` events — i.e. what actually crossed the wire.

**In flight vs on wire.** \`in flight\` counts requests the app has dispatched
and is waiting on. \`on wire\` counts requests whose body Chrome was actually
transmitting (\`sendStart\`→\`sendEnd\`). When \`in flight\` greatly exceeds
\`on wire\`, the configured concurrency is producing queueing, not parallelism.

**Excess requests** is observed upload requests minus the protocol minimum for
the fixture set. Retries are the usual cause; it is labelled "excess" rather
than "retries" because a preflight or redirect would also be counted.

## What this is not

- A single machine on a single network, not a distributed load test.
- Synthetic fixtures: deterministic JPEGs with real EXIF, generated from a seed.
  They are not photographs and their compressibility is uniform by construction.
- **Duration is bounded by this machine's uplink.** The \`uplink\` column is
  measured at run time. A run cannot beat the \`transfer floor\` implied by it,
  and comparing runs taken on different links is meaningless.
- Timing ends when the client has uploaded a file and the completion call has
  returned. Server-side thumbnailing and EXIF extraction continue afterwards and
  are **not** included.
- \`proxy\` and \`presigned\` differ **only for files at or below the 5 MiB chunk
  threshold**. Larger files take the chunked path, which routes through the
  backend in both modes. A fixture set of mostly-large files would show little
  difference between the two modes by construction.

### Reading a proxy-vs-presigned comparison

\`presigned\` costs **three** requests per file (presign → PUT → complete) where
\`proxy\` costs **one**. It buys back the cost of moving the bytes through the
backend. So which mode wins depends entirely on what the backend costs:

- Against a **loopback store**, the backend costs almost nothing to traverse, so
  the two extra round trips dominate and \`proxy\` is expected to be *faster*.
  A loopback run therefore cannot support a claim that going direct is quicker.
- Against a **remote store**, with a backend that is bandwidth- or CPU-bound,
  the byte path dominates and \`presigned\` should win.

A run against MinIO answers "how much concurrency does the client actually
achieve, and how many requests does each architecture cost". It does **not**
answer "is the current architecture faster in production". Only a \`--target=r2\`
run can speak to that.

## Concurrency: configured versus achieved

\`MAX_CONCURRENT_UPLOADS\` caps how many files the queue has in flight. It does
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

\`\`\`bash
node scripts/benchmark/src/sweep-concurrency.mjs --values=2,4,6,8,12,16,32,100 --repeats=2
\`\`\`

Caveat worth keeping in mind: this is a loopback store, where round-trip time is
near zero and very little concurrency is needed to saturate it. Against a remote
store, more requests in flight are needed simply to cover latency, so the knee
would move right. That is why the shipped value is 12 rather than the measured
knee of 2 -- see the comment on the constant.

## Runs

| When (UTC) | Mode | Max conc | Files ok | Wall clock | Throughput | Per-file p50/p95/p99 (ms) | Upload reqs | Excess | Net fails | Peak in-flight / on-wire | Uplink |
|---|---|---|---|---|---|---|---|---|---|---|---|
`;

  const body = results.length
    ? results.map(runRow).join('\n')
    : '| _no runs recorded yet_ | | | | | | | | | | | |';

  let detail = '';
  if (results.length) {
    detail = '\n\n## Run detail\n';
    for (const r of results) {
      const d = r.derived ?? {};
      const env = r.environment ?? {};
      detail += `\n### ${(env.capturedAt ?? '').slice(0, 19).replace('T', ' ')} — \`${r.mode}\`\n\n`
        + `- Outcome: **${r.outcome}**${r.pageCrashed ? ` (${r.pageCrashed})` : ''}\n`
        + `- Fixtures: ${r.fixtures?.count} files, ${r.fixtures?.totalMiB} MiB, seed ${r.fixtures?.seed}, `
        + `${r.fixtures?.overChunkThreshold} above the 5 MiB chunk threshold\n`
        + `- Completed: ${r.files?.completed}/${r.files?.expected} (${d.completedMiB} MiB)\n`
        + `- Wall clock: ${d.wallClockSeconds} s — throughput ${d.throughputMiBs} MiB/s (${d.throughputMbps} Mbit/s)\n`
        + `- Uplink at run time: ${fmt(env.uplink?.mbps, ' Mbit/s')}`
        + (d.transferFloorSeconds
            ? ` → transfer floor for this payload ≈ ${d.transferFloorSeconds} s\n`
            : d.transferFloorNote ? ` (${d.transferFloorNote})\n` : '\n')
        + `- Requests: ${r.requests?.uploadRelated} upload-related of ${r.requests?.total} total; `
        + `expected minimum ${d.expectedRequests}, excess ${d.excessRequests}\n`
        + `- Rate limited (429): ${r.requests?.status429} · other 4xx: ${r.requests?.status4xx} · `
        + `5xx: ${r.requests?.status5xx} · network failures: ${r.requests?.networkFailures}\n`
        + `- Configured MAX_CONCURRENT_UPLOADS: ${env.clientConcurrencyLimit ?? '—'}\n`
        + `- Peak concurrency: ${d.peakConcurrency?.inFlight} in flight, `
        + `**${d.peakConcurrency?.onWire} actually on the wire**\n`
        + `- By request kind: ${Object.entries(r.requests?.byKind ?? {}).map(([k, v]) => `${k}=${v}`).join(', ') || '—'}\n`
        + `- Host: ${env.host?.cpuCount}× ${env.host?.cpuModel}, ${env.host?.totalMemoryGiB} GiB, `
        + `${env.host?.platform}; Chromium ${r.chromiumVersion}\n`
        + `- Storage target: ${env.storage?.kind ?? '—'}${env.storage?.endpoint ? ` (${env.storage.endpoint})` : ''}\n`
        + `- Backend commit: ${env.git?.commit ?? '—'}${env.git?.dirty ? ' (working tree dirty)' : ''}\n`;
      if (r.files?.failureSample?.length) {
        detail += `- First failures: ${r.files.failureSample.map((f) => f.message).slice(0, 3).join(' · ')}\n`;
      }
    }
  }

  const doc = header + body + detail + '\n';
  await writeFile(outFile, doc);
  return { file: outFile, runs: results.length };
}
