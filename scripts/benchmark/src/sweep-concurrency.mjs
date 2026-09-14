#!/usr/bin/env node
/**
 * Concurrency sweep.
 *
 * MAX_CONCURRENT_UPLOADS was set by guesswork -- git log shows it move
 * 250 -> 500 -> 50 -> 100 -> 500 with no measurement attached to any of it.
 * This finds the value past which throughput stops improving, so the constant
 * can cite a number instead of a hunch.
 *
 * Each configuration runs `repeats` times and the BEST wall clock is kept:
 * across repeated runs the noise is one-sided (contention only ever makes a run
 * slower), so the best run is the closest estimate of the configuration's
 * actual capability.
 *
 * A value above the fixture count cannot be distinguished from the fixture
 * count -- there are not enough files to fill the extra slots -- so the sweep
 * refuses to test past it rather than reporting a meaningless plateau.
 */

import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCH_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BENCH_ROOT, '../..');
const RESULTS = path.join(REPO_ROOT, 'benchmark-results');

function parseArgs(argv) {
  const o = {
    values: '2,4,6,8,16,32,64,100', repeats: 2, mode: 'presigned', target: 'minio',
    // Seconds to wait between runs so the server's rate-limit bucket refills.
    // Without this the sweep measures the rate limiter: back-to-back runs share
    // one per-IP bucket, so later configurations are throttled and look slower
    // purely because they ran later. Set to 0 when the limit has been raised
    // for the sweep, which is the faster way to remove the same confound.
    settleSeconds: 0,
  };
  for (const arg of argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) o[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = m[2];
  }
  o.repeats = Number(o.repeats);
  o.settleSeconds = Number(o.settleSeconds);
  o.values = String(o.values).split(',').map(Number).filter((n) => n > 0);
  return o;
}

/**
 * Empty the bucket between runs.
 *
 * Each run writes the whole fixture set plus three generated thumbnails per
 * photo, and nothing removes them afterwards. Left alone, a sweep fills the
 * disk and later configurations start failing with 507 Insufficient Storage --
 * which looks exactly like a concurrency limit and is not one. Purging keeps
 * every configuration measuring the same thing.
 */
function purgeBucket(target) {
  if (target !== 'minio') return;
  const res = spawnSync('docker', [
    'run', '--rm', '--network', 'host', '--entrypoint', 'sh',
    'quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z', '-c',
    'mc alias set l http://localhost:9000 benchlocal benchlocal123 >/dev/null 2>&1; ' +
    'mc rm --recursive --force --quiet l/bench-uploads >/dev/null 2>&1; true',
  ], { encoding: 'utf8' });
  if (res.status !== 0) {
    process.stdout.write('  (warning: could not purge bucket between runs)\n');
  }
}

async function newestResultFor(before) {
  const names = (await readdir(RESULTS)).filter((n) => n.endsWith('.json'));
  const fresh = names.filter((n) => !before.has(n));
  if (!fresh.length) return null;
  fresh.sort();
  return JSON.parse(await readFile(path.join(RESULTS, fresh[fresh.length - 1]), 'utf8'));
}

async function main() {
  const opts = parseArgs(process.argv);

  const manifest = JSON.parse(
    await readFile(path.join(BENCH_ROOT, 'fixtures', 'manifest.json'), 'utf8')
  );

  const testable = opts.values.filter((v) => v <= manifest.count);
  const skipped = opts.values.filter((v) => v > manifest.count);
  if (skipped.length) {
    process.stdout.write(
      `Skipping ${skipped.join(', ')}: above the ${manifest.count}-file fixture set, ` +
      `so indistinguishable from ${manifest.count}.\n`
    );
  }

  process.stdout.write(
    `Sweeping MAX_CONCURRENT_UPLOADS over ${testable.join(', ')} ` +
    `(${opts.repeats} run(s) each, mode=${opts.mode}, ${manifest.count} files, ` +
    `rateLimit=${process.env.RATE_LIMIT_UPLOAD_CAPACITY ?? 'default'})\n\n`
  );

  const rows = [];
  for (const value of testable) {
    const runs = [];
    for (let i = 0; i < opts.repeats; i++) {
      purgeBucket(opts.target);
      const before = new Set((await readdir(RESULTS)).filter((n) => n.endsWith('.json')));

      const proc = spawnSync('node', [
        path.join(__dirname, 'run.mjs'),
        `--mode=${opts.mode}`, `--target=${opts.target}`,
        `--concurrency=${value}`, '--no-uplink',
      ], { cwd: BENCH_ROOT, encoding: 'utf8' });

      if (opts.settleSeconds > 0) {
        await new Promise((r) => setTimeout(r, opts.settleSeconds * 1000));
      }

      const result = await newestResultFor(before);
      if (!result) {
        process.stdout.write(`  conc=${String(value).padStart(4)}  run ${i + 1}: no result (${proc.status})\n`);
        continue;
      }
      runs.push(result);
      process.stdout.write(
        `  conc=${String(value).padStart(4)}  run ${i + 1}: ` +
        `${result.derived.wallClockSeconds}s  ${result.derived.throughputMiBs} MiB/s  ` +
        `onWire=${result.derived.peakConcurrency.onWire}  ok=${result.files.completed}/${result.files.expected}\n`
      );
    }
    // Only runs that uploaded every file are comparable. A partial run finished
    // sooner because it did less, so admitting it would reward failure.
    const complete = runs.filter((r) => r.files.completed === r.files.expected);
    if (!complete.length) {
      process.stdout.write(`  conc=${String(value).padStart(4)}  no complete run; excluded\n`);
      continue;
    }

    const best = complete.reduce((a, b) => (a.derived.wallClockSeconds <= b.derived.wallClockSeconds ? a : b));
    rows.push({
      configured: value,
      bestWallSeconds: best.derived.wallClockSeconds,
      throughputMiBs: best.derived.throughputMiBs,
      peakOnWire: best.derived.peakConcurrency.onWire,
      peakInFlight: best.derived.peakConcurrency.inFlight,
      requests: best.requests.uploadRelated,
      rateLimited: best.requests.status429,
      completed: best.files.completed,
      expected: best.files.expected,
    });
  }

  process.stdout.write('\n configured | best wall | throughput  | on wire | in flight | 429s\n');
  process.stdout.write('------------|-----------|-------------|---------|-----------|-----\n');
  for (const r of rows) {
    process.stdout.write(
      ` ${String(r.configured).padStart(10)} | ${String(r.bestWallSeconds).padStart(8)}s | ` +
      `${String(r.throughputMiBs).padStart(7)} MiB/s | ${String(r.peakOnWire).padStart(7)} | ` +
      `${String(r.peakInFlight).padStart(9)} | ${String(r.rateLimited).padStart(4)}\n`
    );
  }

  const best = rows.reduce((a, b) => (a.throughputMiBs >= b.throughputMiBs ? a : b), rows[0]);
  // The knee: the smallest configuration within 5% of the best throughput.
  // Anything larger buys nothing and only deepens the queue.
  const knee = rows.find((r) => r.throughputMiBs >= best.throughputMiBs * 0.95);
  process.stdout.write(
    `\nBest throughput at ${best.configured} (${best.throughputMiBs} MiB/s).\n` +
    `Knee (smallest within 5% of best): ${knee?.configured} ` +
    `at ${knee?.throughputMiBs} MiB/s, ${knee?.peakOnWire} requests actually on the wire.\n`
  );
}

main().catch((err) => {
  process.stderr.write(`sweep failed: ${err?.stack ?? err}\n`);
  process.exit(1);
});
