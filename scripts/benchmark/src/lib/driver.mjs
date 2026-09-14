/**
 * Playwright driver: runs a batch through the REAL React client.
 *
 * Why a browser rather than a Node harness that replays the same HTTP calls:
 * the browser enforces a per-origin connection limit that Node does not. That
 * limit is the reason MAX_CONCURRENT_UPLOADS can be raised without throughput
 * following, so a Node harness would report a concurrency the app can never
 * actually reach and would answer the wrong question.
 *
 * Timing comes from two independent sources:
 *   - window.__bench   per-task start/finish marks emitted by the app itself
 *                      (VITE_BENCH=1). Gives per-file durations.
 *   - CDP Network.*    every request that crossed the wire, with Chrome's own
 *                      send timings. Gives request counts, failures, and the
 *                      difference between requests in flight and bytes actually
 *                      being sent -- i.e. how much of the configured
 *                      concurrency is real and how much is queued.
 */

import { chromium } from 'playwright';
import path from 'node:path';

const UPLOAD_URL_CLASSES = [
  [/\/api\/upload\/presigned$/, 'presign'],
  [/\/api\/upload\/complete$/, 'complete'],
  [/\/api\/upload\/initialize$/, 'initialize'],
  [/\/api\/upload\/chunk$/, 'chunk'],
  [/\/api\/upload\/progress\//, 'progress'],
  [/\/api\/upload$/, 'proxyUpload'],
  [/\/api\/auth\//, 'auth'],
];

function classify(url, method) {
  for (const [re, name] of UPLOAD_URL_CLASSES) {
    if (re.test(url)) return name;
  }
  // A PUT that is not our API is the direct-to-object-store upload.
  if (method === 'PUT' && !/\/api\//.test(url)) return 'storagePut';
  return 'other';
}

const COUNTED_AS_UPLOAD = new Set([
  'presign', 'complete', 'initialize', 'chunk', 'proxyUpload', 'storagePut',
]);

/** Create (or reuse) the benchmark user and return a usable JWT. */
export async function ensureBenchUser(apiBase, creds) {
  const body = {
    email: creds.email,
    username: creds.username,
    password: creds.password,
    fullName: 'Benchmark User',
  };

  // Register is idempotent from our side: a duplicate just means we log in.
  await fetch(`${apiBase}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);

  const res = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`benchmark user login failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

/** Minimum request count if nothing is retried -- the baseline for "retries". */
export function expectedRequestCount(manifest, mode, chunkSizeBytes) {
  let expected = 0;
  for (const f of manifest.files) {
    if (f.bytes > manifest.chunkThresholdBytes) {
      expected += 1 + Math.ceil(f.bytes / chunkSizeBytes); // initialize + chunks
    } else {
      expected += mode === 'proxy' ? 1 : 3; // POST /upload  |  presign + PUT + complete
    }
  }
  return expected;
}

export async function runBatch({
  fixtureDir,
  manifest,
  appUrl,
  apiBase,
  mode,
  headless = true,
  credentials,
  timeoutMs = 45 * 60 * 1000,
  stallTimeoutMs = 180 * 1000,
  onProgress = () => {},
}) {
  const auth = await ensureBenchUser(apiBase, credentials);

  const browser = await chromium.launch({
    headless,
    args: [
      '--disable-dev-shm-usage',
      // The app base64-encodes every selected file to build thumbnails, so the
      // renderer needs far more heap than the default for a 1000-image batch.
      '--js-flags=--max-old-space-size=8192',
    ],
  });

  const chromiumVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });

  await context.addInitScript(
    ({ token, user }) => {
      try {
        localStorage.setItem('rapidphoto_token', token);
        localStorage.setItem('rapidphoto_user', JSON.stringify(user));
      } catch { /* first-run storage errors are not fatal */ }
    },
    { token: auth.token, user: auth.user }
  );

  const page = await context.newPage();

  // ---- wire-level capture -------------------------------------------------
  const requests = new Map();
  const consoleErrors = [];
  let pageCrashed = null;

  page.on('crash', () => { pageCrashed = 'renderer crashed (most likely out of memory)'; });
  page.on('pageerror', (err) => { consoleErrors.push(`uncaught: ${String(err?.message ?? err)}`); });
  // The app reports upload failures through console.error rather than by
  // throwing, so without this a file that quietly fails leaves no trace in the
  // result beyond a count that never reaches the expected total.
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    if (consoleErrors.length < 200) consoleErrors.push(`${msg.type()}: ${msg.text().slice(0, 400)}`);
  });

  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');

  cdp.on('Network.requestWillBeSent', (e) => {
    const kind = classify(e.request.url, e.request.method);
    requests.set(e.requestId, {
      kind,
      url: e.request.url,
      method: e.request.method,
      sentAt: e.timestamp,
      status: null,
      wireStart: null,
      wireEnd: null,
      finishedAt: null,
      failed: null,
    });
  });

  cdp.on('Network.responseReceived', (e) => {
    const r = requests.get(e.requestId);
    if (!r) return;
    r.status = e.response.status;
    const t = e.response.timing;
    if (t && Number.isFinite(t.requestTime)) {
      // Chrome reports offsets in ms from timing.requestTime (seconds).
      // sendStart -> sendEnd is the window in which the request body, i.e. the
      // image, was actually being pushed onto the wire.
      if (t.sendStart >= 0) r.wireStart = t.requestTime + t.sendStart / 1000;
      if (t.sendEnd >= 0) r.wireEnd = t.requestTime + t.sendEnd / 1000;
    }
  });

  cdp.on('Network.loadingFinished', (e) => {
    const r = requests.get(e.requestId);
    if (r) r.finishedAt = e.timestamp;
  });

  cdp.on('Network.loadingFailed', (e) => {
    const r = requests.get(e.requestId);
    if (r) {
      r.finishedAt = e.timestamp;
      r.failed = e.errorText || 'unknown';
      r.canceled = Boolean(e.canceled);
    }
  });

  // ---- drive the app ------------------------------------------------------
  const files = manifest.files.map((f) => path.join(fixtureDir, f.name));
  const expected = files.length;

  await page.goto(new URL('/upload', appUrl).toString(), { waitUntil: 'domcontentloaded' });

  const input = page.locator('input[type="file"]').first();
  await input.waitFor({ state: 'attached', timeout: 30_000 });

  const wallStart = performance.now();
  await input.setInputFiles(files);
  const selectMs = performance.now() - wallStart;

  // ---- wait for the queue to drain ---------------------------------------
  let lastDone = -1;
  let lastProgressAt = Date.now();
  let outcome = 'completed';

  for (;;) {
    if (pageCrashed) { outcome = 'crashed'; break; }

    let counts;
    try {
      counts = await page.evaluate(() => {
        const b = window.__bench || [];
        let started = 0, completed = 0, failed = 0;
        for (const e of b) {
          if (e.phase === 'start') started++;
          else if (e.phase === 'completed') completed++;
          else if (e.phase === 'failed') failed++;
        }
        return { started, completed, failed };
      });
    } catch (err) {
      pageCrashed = `evaluate failed: ${String(err?.message ?? err)}`;
      outcome = 'crashed';
      break;
    }

    const done = counts.completed + counts.failed;
    onProgress({ ...counts, done, expected, elapsedMs: performance.now() - wallStart });

    if (done >= expected) break;

    if (done !== lastDone) { lastDone = done; lastProgressAt = Date.now(); }
    else if (Date.now() - lastProgressAt > stallTimeoutMs) { outcome = 'stalled'; break; }

    if (performance.now() - wallStart > timeoutMs) { outcome = 'timeout'; break; }

    await page.waitForTimeout(500);
  }

  const wallMs = performance.now() - wallStart;

  // ---- harvest ------------------------------------------------------------
  let marks = [];
  try {
    marks = await page.evaluate(() => window.__bench || []);
  } catch { /* renderer gone; wire data below still stands */ }

  await context.close().catch(() => {});
  await browser.close().catch(() => {});

  return buildResult({
    marks, requests, wallMs, selectMs, outcome, expected, manifest, mode,
    chromiumVersion, consoleErrors, pageCrashed,
  });
}

function buildResult({
  marks, requests, wallMs, selectMs, outcome, expected, manifest, mode,
  chromiumVersion, consoleErrors, pageCrashed,
}) {
  // Per-file durations from the app's own marks.
  const startById = new Map();
  const perFileMs = [];
  const failures = [];
  for (const m of marks) {
    if (m.phase === 'start') startById.set(m.taskId, m);
    else if (m.phase === 'completed') {
      const s = startById.get(m.taskId);
      if (s) perFileMs.push({ ms: m.t - s.t, bytes: s.bytes ?? 0, path: s.path ?? 'unknown' });
    } else if (m.phase === 'failed') {
      failures.push({ taskId: m.taskId, message: m.message ?? 'unknown' });
    }
  }

  // Page marks use the page's performance timeline, which has a different
  // origin from Node's -- only differences within the page are comparable.
  // The span from first start to last completion is the uploading phase; what
  // is left of the wall clock is client-side preparation (file selection,
  // validation, and the thumbnail pass the app runs over every file).
  const startTimes = marks.filter((m) => m.phase === 'start').map((m) => m.t);
  const endTimes = marks.filter((m) => m.phase === 'completed' || m.phase === 'failed').map((m) => m.t);
  const uploadSpanMs = startTimes.length && endTimes.length
    ? Math.max(...endTimes) - Math.min(...startTimes)
    : null;

  const all = [...requests.values()];
  const uploadReqs = all.filter((r) => COUNTED_AS_UPLOAD.has(r.kind));

  const byKind = {};
  for (const r of all) {
    if (r.kind === 'other') continue;
    byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
  }

  const status429 = uploadReqs.filter((r) => r.status === 429).length;
  const status5xx = uploadReqs.filter((r) => r.status >= 500).length;
  const status4xx = uploadReqs.filter((r) => r.status >= 400 && r.status < 500 && r.status !== 429).length;
  const netFailed = uploadReqs.filter((r) => r.failed && !r.canceled).length;

  // Intervals in ms, relative to the first upload request.
  const base = uploadReqs.reduce(
    (min, r) => (Number.isFinite(r.sentAt) && r.sentAt < min ? r.sentAt : min),
    Infinity
  );
  const toMs = (sec) => (Number.isFinite(sec) ? (sec - base) * 1000 : NaN);

  const inFlight = uploadReqs
    .map((r) => [toMs(r.sentAt), toMs(r.finishedAt)])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));

  const onWire = uploadReqs
    .map((r) => [toMs(r.wireStart), toMs(r.wireEnd)])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));

  return {
    outcome,
    pageCrashed,
    mode,
    chromiumVersion,
    wallClockMs: Math.round(wallMs),
    phases: {
      fileSelectionMs: Math.round(selectMs ?? 0),
      uploadSpanMs: uploadSpanMs === null ? null : Math.round(uploadSpanMs),
      clientPrepMs: uploadSpanMs === null ? null : Math.round(wallMs - uploadSpanMs),
    },
    files: {
      expected,
      completed: perFileMs.length,
      failed: failures.length,
      failureSample: failures.slice(0, 10),
    },
    perFileMs,
    requests: {
      total: all.length,
      uploadRelated: uploadReqs.length,
      byKind,
      status429,
      status4xx,
      status5xx,
      networkFailures: netFailed,
    },
    intervals: { inFlight, onWire },
    consoleErrorSample: consoleErrors.slice(0, 25),
    consoleErrorCount: consoleErrors.length,
    failedRequestSample: uploadReqs
      .filter((r) => r.failed || (r.status && r.status >= 400))
      .slice(0, 15)
      .map((r) => ({ kind: r.kind, method: r.method, status: r.status, error: r.failed ?? null })),
  };
}
