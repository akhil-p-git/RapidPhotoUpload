#!/usr/bin/env node
/**
 * Benchmark runner.
 *
 * Starts the Vite dev server with the upload mode baked in (Vite resolves
 * import.meta.env at server start, so mode cannot be switched per page load),
 * drives a batch through headless Chromium, and writes both a machine-readable
 * result and a regenerated PERFORMANCE.md.
 *
 * The backend and the object store must already be running -- see README.md.
 */

import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBatch, expectedRequestCount } from './lib/driver.mjs';
import { captureEnvironment } from './lib/env.mjs';
import { measureUplinkMbps } from './lib/uplink.mjs';
import { analyse, writeResult, regeneratePerformanceDoc } from './lib/report.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCH_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BENCH_ROOT, '../..');
const CHUNK_SIZE = 5 * 1024 * 1024; // must match apps/web/src/utils/uploadWorker.ts

const DEFAULTS = {
  mode: 'presigned',
  target: 'minio',
  appUrl: 'http://localhost:3000',
  apiBase: 'http://localhost:8080/api',
  fixtures: path.join(BENCH_ROOT, 'fixtures'),
  results: path.join(REPO_ROOT, 'benchmark-results'),
  performanceDoc: path.join(REPO_ROOT, 'PERFORMANCE.md'),
  headed: false,
  uplink: true,
  email: 'benchmark@localhost.test',
  username: 'benchmarkuser',
  password: 'benchmark-pass-1234',
  timeoutMinutes: 45,
  /** Overrides the client's MAX_CONCURRENT_UPLOADS for this run. */
  concurrency: null,
};

function parseArgs(argv) {
  const o = { ...DEFAULTS };
  for (const arg of argv.slice(2)) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (!m) continue;
    const key = m[1].replace(/^no-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (m[1].startsWith('no-')) { o[key] = false; continue; }
    if (m[2] === undefined) { o[key] = true; continue; }
    const n = Number(m[2]);
    o[key] = Number.isFinite(n) && m[2].trim() !== '' ? n : m[2];
  }
  if (!['presigned', 'proxy'].includes(o.mode)) {
    throw new Error(`--mode must be 'presigned' or 'proxy', got '${o.mode}'`);
  }
  return o;
}

/** Start the Vite dev server with the mode and instrumentation flags set. */
async function startDevServer(opts) {
  const url = new URL(opts.appUrl);
  const child = spawn(
    'pnpm',
    ['--filter', '@rapid-photo/web', 'dev', '--port', url.port || '3000', '--strictPort'],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        VITE_UPLOAD_MODE: opts.mode,
        VITE_BENCH: '1',
        VITE_API_URL: opts.apiBase,
        ...(opts.concurrency ? { VITE_MAX_CONCURRENT_UPLOADS: String(opts.concurrency) } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      // Own process group: `pnpm` execs node/vite as children, and signalling
      // only the pnpm pid leaves vite alive holding the port and keeping this
      // process's event loop open after the run has finished.
      detached: true,
    }
  );

  const log = [];
  child.stdout.on('data', (d) => log.push(String(d)));
  child.stderr.on('data', (d) => log.push(String(d)));

  const deadline = Date.now() + 90_000;
  for (;;) {
    if (child.exitCode !== null) {
      throw new Error(`vite dev server exited early (${child.exitCode}):\n${log.join('').slice(-2000)}`);
    }
    try {
      const res = await fetch(opts.appUrl, { signal: AbortSignal.timeout(2000) });
      if (res.ok) break;
    } catch { /* not up yet */ }
    if (Date.now() > deadline) {
      stopDevServer(child);
      throw new Error(`vite dev server did not come up at ${opts.appUrl}:\n${log.join('').slice(-2000)}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return child;
}

/** Terminate the dev server's whole process group and release its pipes. */
function stopDevServer(child) {
  if (!child || child.exitCode !== null) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try { child.kill('SIGTERM'); } catch { /* already gone */ }
  }
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.unref();
}

async function assertBackendUp(apiBase) {
  const base = apiBase.replace(/\/api$/, '');
  try {
    const res = await fetch(`${base}/actuator/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`health returned ${res.status}`);
  } catch (err) {
    throw new Error(
      `Backend is not reachable at ${base}.\n` +
      `Start it first (see scripts/benchmark/README.md):\n` +
      `  cd apps/backend && ./gradlew bootRun\n` +
      `Cause: ${String(err?.message ?? err)}`
    );
  }
}

function storageDescriptor(opts) {
  if (opts.target === 'minio') {
    return {
      kind: 'minio (local, loopback)',
      endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
      bucket: process.env.S3_BUCKET_NAME ?? 'bench-uploads',
      note: 'Loopback: measures architecture and concurrency, NOT internet upload duration.',
    };
  }
  return {
    kind: 'cloudflare-r2',
    endpoint: process.env.S3_ENDPOINT ? '(set via S3_ENDPOINT)' : '(unset)',
    bucket: process.env.S3_BUCKET_NAME ? '(set via S3_BUCKET_NAME)' : '(unset)',
    region: process.env.AWS_REGION ?? 'auto',
  };
}

async function main() {
  const opts = parseArgs(process.argv);

  const manifestPath = path.join(opts.fixtures, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(
      `No fixtures found at ${opts.fixtures}.\nGenerate them first:\n  pnpm --filter @rapid-photo/benchmark fixtures`
    );
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  process.stdout.write(
    `Benchmark\n` +
    `  mode      ${opts.mode}\n` +
    `  target    ${opts.target}\n` +
    (opts.concurrency ? `  maxConc   ${opts.concurrency}\n` : '') +
    `  fixtures  ${manifest.count} files, ${(manifest.totalBytes / 1024 ** 2).toFixed(1)} MiB ` +
    `(${manifest.countOverChunkThreshold} chunked)\n\n`
  );

  await assertBackendUp(opts.apiBase);
  process.stdout.write('Backend reachable.\n');

  let uplink = { mbps: null, skipped: true };
  if (opts.uplink) {
    process.stdout.write('Measuring uplink... ');
    uplink = await measureUplinkMbps();
    process.stdout.write(uplink.mbps ? `${uplink.mbps} Mbit/s\n` : `failed (${uplink.error})\n`);
  }

  const environment = await captureEnvironment({
    apiBase: opts.apiBase,
    storageTarget: storageDescriptor(opts),
    uplink,
  });

  process.stdout.write('Starting dev server... ');
  const dev = await startDevServer(opts);
  process.stdout.write('up.\n\n');

  let raw;
  try {
    let lastLine = 0;
    raw = await runBatch({
      fixtureDir: opts.fixtures,
      manifest,
      appUrl: opts.appUrl,
      apiBase: opts.apiBase,
      mode: opts.mode,
      headless: !opts.headed,
      credentials: { email: opts.email, username: opts.username, password: opts.password },
      timeoutMs: opts.timeoutMinutes * 60 * 1000,
      onProgress: ({ completed, failed, done, expected, elapsedMs }) => {
        const now = Date.now();
        if (now - lastLine < 1000) return;
        lastLine = now;
        const pct = ((done / expected) * 100).toFixed(1);
        process.stdout.write(
          `\r  ${done}/${expected} (${pct}%)  ok=${completed} fail=${failed}  ${(elapsedMs / 1000).toFixed(0)}s   `
        );
      },
    });
    process.stdout.write('\n');
  } finally {
    stopDevServer(dev);
  }

  environment.runtime.chromium = raw.chromiumVersion;

  environment.clientConcurrencyLimit = opts.concurrency ?? 'default (500)';

  const result = analyse(raw, {
    manifest,
    environment,
    expectedRequests: expectedRequestCount(manifest, opts.mode, CHUNK_SIZE),
  });

  await mkdir(opts.results, { recursive: true });
  const file = await writeResult(opts.results, result);
  const doc = await regeneratePerformanceDoc(opts.results, opts.performanceDoc);

  const d = result.derived;
  process.stdout.write(
    `\nOutcome: ${result.outcome}\n` +
    `  files        ${result.files.completed}/${result.files.expected} completed\n` +
    `  wall clock   ${d.wallClockSeconds} s\n` +
    `  throughput   ${d.throughputMiBs} MiB/s (${d.throughputMbps} Mbit/s)\n` +
    `  per-file ms  p50 ${d.perFileMs?.p50} / p95 ${d.perFileMs?.p95} / p99 ${d.perFileMs?.p99}\n` +
    `  requests     ${result.requests.uploadRelated} (expected ${d.expectedRequests}, excess ${d.excessRequests})\n` +
    `  429s         ${result.requests.status429}\n` +
    `  concurrency  ${d.peakConcurrency.inFlight} in flight / ${d.peakConcurrency.onWire} on wire\n` +
    (d.transferFloorSeconds ? `  uplink floor ${d.transferFloorSeconds} s for this payload\n` : '') +
    `\n  result  ${path.relative(REPO_ROOT, file)}\n` +
    `  doc     ${path.relative(REPO_ROOT, doc.file)} (${doc.runs} run(s))\n`
  );

  if (result.outcome !== 'completed') process.exitCode = 1;
}

main().catch((err) => {
  process.stderr.write(`\nbenchmark failed: ${err?.message ?? err}\n`);
  process.exit(1);
});
