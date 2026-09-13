#!/usr/bin/env node
/**
 * Deterministic JPEG fixture generator.
 *
 * Produces N synthetic photographs with realistic EXIF and a configurable size
 * distribution. Output is written to a gitignored directory together with a
 * manifest.json recording the ACTUAL byte size of every file -- the benchmark
 * reports real totals, never the requested targets.
 *
 * Size targeting method
 * ---------------------
 * JPEG size is a function of pixel count and image entropy, not something you
 * can request directly. We calibrate once (encode a few probe images, measure
 * bytes-per-pixel at the chosen quality), then choose per-image dimensions to
 * hit the target. Actual sizes land within a few percent; the spread is
 * reported rather than corrected, because padding a JPEG to an exact size would
 * mean the backend decodes less image than the byte count implies -- which
 * would understate backend CPU in proxy mode.
 */

import sharp from 'sharp';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { streamFor, uniform, uniformInt, pick } from './lib/prng.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const MIB = 1024 * 1024;

const DEFAULTS = {
  count: 1000,
  minBytes: 2 * MIB,
  maxBytes: 4 * MIB,
  // Fraction of images pushed above the 5MiB chunking threshold so BOTH upload
  // paths are exercised. 5MiB is CHUNK_SIZE in apps/web/src/utils/uploadWorker.ts.
  largeFraction: 0.05,
  largeMinBytes: 6 * MIB,
  largeMaxBytes: 9 * MIB,
  quality: 82,
  seed: 1337,
  out: path.join(ROOT, 'fixtures'),
  concurrency: Math.max(2, Math.min(os.cpus().length, 12)),
};

const CHUNK_THRESHOLD = 5 * MIB;

const CAMERAS = [
  { make: 'Canon', model: 'Canon EOS 5D Mark IV', lens: 'EF24-70mm f/2.8L II USM' },
  { make: 'NIKON CORPORATION', model: 'NIKON D850', lens: 'AF-S NIKKOR 24-120mm f/4G ED VR' },
  { make: 'SONY', model: 'ILCE-7RM4', lens: 'FE 24-105mm F4 G OSS' },
  { make: 'FUJIFILM', model: 'X-T4', lens: 'XF16-55mmF2.8 R LM WR' },
  { make: 'Apple', model: 'iPhone 14 Pro', lens: 'iPhone 14 Pro back triple camera' },
];

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  for (const arg of argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(arg) ?? /^--([^=]+)$/.exec(arg);
    if (!m) continue;
    const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const raw = m[2];
    if (raw === undefined) { opts[key] = true; continue; }
    if (key === 'out') { opts.out = path.resolve(raw); continue; }
    const num = Number(raw);
    opts[key] = Number.isFinite(num) ? num : raw;
  }
  return opts;
}

/**
 * Build raw RGB pixels: smooth low-frequency gradient plus per-pixel noise.
 * The gradient makes it compress like a photograph rather than like static;
 * the noise keeps entropy high enough that sizes are predictable.
 */
function renderPixels(rng, width, height) {
  const buf = Buffer.allocUnsafe(width * height * 3);
  const ax = uniform(rng, 0, 1), ay = uniform(rng, 0, 1);
  const c0 = [uniformInt(rng, 20, 235), uniformInt(rng, 20, 235), uniformInt(rng, 20, 235)];
  const c1 = [uniformInt(rng, 20, 235), uniformInt(rng, 20, 235), uniformInt(rng, 20, 235)];
  const freq = uniform(rng, 1.5, 4.0);
  const noiseAmp = uniform(rng, 26, 46);

  // The gradient is evaluated on a coarse grid and bilinearly upsampled rather
  // than computed per pixel. At photo dimensions (a 3 MiB JPEG is ~10 MP) the
  // trig call per pixel dominates generation time without changing the result:
  // the gradient is low-frequency by construction, so interpolation between
  // grid points is indistinguishable from evaluating it everywhere. This is the
  // difference between minutes and a quarter of an hour for a 1000-image set.
  const GW = 33, GH = 25;
  const grid = new Float32Array(GW * GH * 3);
  for (let gy = 0; gy < GH; gy++) {
    const fy = gy / (GH - 1);
    for (let gx = 0; gx < GW; gx++) {
      const fx = gx / (GW - 1);
      const d = Math.hypot(fx - ax, fy - ay);
      const wave = 0.5 + 0.5 * Math.sin((fx * freq + fy * freq * 0.7 + d * freq) * Math.PI);
      const gi = (gy * GW + gx) * 3;
      grid[gi] = c0[0] + (c1[0] - c0[0]) * wave;
      grid[gi + 1] = c0[1] + (c1[1] - c0[1]) * wave;
      grid[gi + 2] = c0[2] + (c1[2] - c0[2]) * wave;
    }
  }

  // mulberry32 inlined: the call overhead is material across ~30M samples.
  let a = (rng() * 4294967296) >>> 0;
  const xScale = (GW - 1) / (width - 1);
  const yScale = (GH - 1) / (height - 1);

  let o = 0;
  for (let y = 0; y < height; y++) {
    const gyf = y * yScale;
    const gy0 = gyf | 0;
    const gy1 = gy0 + 1 < GH ? gy0 + 1 : gy0;
    const ty = gyf - gy0;
    const rowA = gy0 * GW, rowB = gy1 * GW;
    for (let x = 0; x < width; x++) {
      const gxf = x * xScale;
      const gx0 = gxf | 0;
      const gx1 = gx0 + 1 < GW ? gx0 + 1 : gx0;
      const tx = gxf - gx0;
      const i00 = (rowA + gx0) * 3, i01 = (rowA + gx1) * 3;
      const i10 = (rowB + gx0) * 3, i11 = (rowB + gx1) * 3;
      for (let c = 0; c < 3; c++) {
        const top = grid[i00 + c] + (grid[i01 + c] - grid[i00 + c]) * tx;
        const bot = grid[i10 + c] + (grid[i11 + c] - grid[i10 + c]) * tx;
        const base = top + (bot - top) * ty;
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        const v = base + (r - 0.5) * 2 * noiseAmp;
        buf[o++] = v < 0 ? 0 : v > 255 ? 255 : v | 0;
      }
    }
  }
  return buf;
}

function dimsForPixels(pixels) {
  // 4:3, rounded to even numbers (JPEG chroma subsampling prefers even dims).
  const h = Math.max(64, Math.round(Math.sqrt(pixels * 3 / 4)));
  const w = Math.max(64, Math.round(h * 4 / 3));
  return { width: w + (w % 2), height: h + (h % 2) };
}

function exifFor(rng, index, targetDate) {
  const cam = pick(rng, CAMERAS);
  const iso = pick(rng, [100, 125, 160, 200, 400, 800, 1600, 3200]);
  const fnum = pick(rng, ['2.8', '3.5', '4', '5.6', '8', '11']);
  const exposure = pick(rng, ['1/60', '1/125', '1/250', '1/500', '1/1000', '1/2000']);
  const focal = pick(rng, [16, 24, 35, 50, 70, 85, 105, 135]);
  const d = targetDate;
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getUTCFullYear()}:${pad(d.getUTCMonth() + 1)}:${pad(d.getUTCDate())} ` +
                `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return {
    IFD0: {
      Make: cam.make,
      Model: cam.model,
      Software: 'RapidPhotoUpload benchmark fixture generator',
      DateTime: stamp,
      Artist: 'synthetic',
      ImageDescription: `benchmark fixture #${index}`,
    },
    IFD2: {
      DateTimeOriginal: stamp,
      DateTimeDigitized: stamp,
      ExposureTime: exposure,
      FNumber: fnum,
      ISOSpeedRatings: String(iso),
      FocalLength: String(focal),
      LensModel: cam.lens,
      ColorSpace: '1',
    },
  };
}

/** Encode one fixture and return its manifest entry. */
async function makeOne(opts, index, bytesPerPixel) {
  const rng = streamFor(opts.seed, index);
  const isLarge = rng() < opts.largeFraction;
  const targetBytes = isLarge
    ? uniform(rng, opts.largeMinBytes, opts.largeMaxBytes)
    : uniform(rng, opts.minBytes, opts.maxBytes);

  const { width, height } = dimsForPixels(targetBytes / bytesPerPixel);
  const pixels = renderPixels(rng, width, height);

  // Spread capture times over a plausible two-week shoot.
  const base = Date.UTC(2025, 4, 12, 9, 0, 0);
  const date = new Date(base + Math.floor(uniform(rng, 0, 14 * 24 * 3600 * 1000)));

  const exif = exifFor(rng, index, date);

  const name = `bench_${String(index).padStart(5, '0')}.jpg`;
  const dest = path.join(opts.out, name);

  const buf = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: opts.quality, mozjpeg: false, chromaSubsampling: '4:2:0' })
    .withExif(exif)
    .toBuffer();

  await writeFile(dest, buf);

  return {
    index,
    name,
    bytes: buf.length,
    targetBytes: Math.round(targetBytes),
    width,
    height,
    intendedPath: buf.length > CHUNK_THRESHOLD ? 'chunked' : 'single',
  };
}

/** Encode probes to learn bytes-per-pixel at this quality, for size targeting. */
async function calibrate(opts) {
  const probes = [];
  for (let i = 0; i < 3; i++) {
    const rng = streamFor(opts.seed ^ 0x5eed, i);
    const { width, height } = dimsForPixels(700_000);
    const pixels = renderPixels(rng, width, height);
    const buf = await sharp(pixels, { raw: { width, height, channels: 3 } })
      .jpeg({ quality: opts.quality, chromaSubsampling: '4:2:0' })
      .toBuffer();
    probes.push(buf.length / (width * height));
  }
  const bpp = probes.reduce((a, b) => a + b, 0) / probes.length;
  return bpp;
}

async function main() {
  const opts = parseArgs(process.argv);

  if (existsSync(opts.out)) {
    const existing = await readdir(opts.out);
    if (existing.length) {
      process.stdout.write(`Clearing ${existing.length} file(s) from ${opts.out}\n`);
      await rm(opts.out, { recursive: true, force: true });
    }
  }
  await mkdir(opts.out, { recursive: true });

  process.stdout.write(`Calibrating encoder at quality ${opts.quality}...\n`);
  const bpp = await calibrate(opts);
  process.stdout.write(`  ~${bpp.toFixed(3)} bytes/pixel\n`);

  const started = Date.now();
  const entries = new Array(opts.count);
  let done = 0;
  let cursor = 0;

  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= opts.count) return;
      entries[i] = await makeOne(opts, i, bpp);
      done++;
      if (done % 50 === 0 || done === opts.count) {
        const pct = ((done / opts.count) * 100).toFixed(0);
        process.stdout.write(`\r  ${done}/${opts.count} (${pct}%)   `);
      }
    }
  }

  await Promise.all(Array.from({ length: opts.concurrency }, worker));
  process.stdout.write('\n');

  const totalBytes = entries.reduce((a, e) => a + e.bytes, 0);
  const chunked = entries.filter((e) => e.intendedPath === 'chunked').length;
  const sizes = entries.map((e) => e.bytes).sort((a, b) => a - b);
  const err = entries.map((e) => Math.abs(e.bytes - e.targetBytes) / e.targetBytes);
  const meanErr = err.reduce((a, b) => a + b, 0) / err.length;

  const manifest = {
    generatedAt: new Date().toISOString(),
    generatorVersion: 1,
    seed: opts.seed,
    quality: opts.quality,
    bytesPerPixel: Number(bpp.toFixed(4)),
    count: entries.length,
    totalBytes,
    chunkThresholdBytes: CHUNK_THRESHOLD,
    countOverChunkThreshold: chunked,
    sizeBytes: {
      min: sizes[0],
      p50: sizes[Math.floor(sizes.length * 0.5)],
      max: sizes[sizes.length - 1],
      meanTargetingErrorPct: Number((meanErr * 100).toFixed(2)),
    },
    files: entries,
  };

  await writeFile(path.join(opts.out, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  process.stdout.write(
    `\nGenerated ${entries.length} fixtures in ${secs}s\n` +
    `  total        ${(totalBytes / MIB).toFixed(1)} MiB\n` +
    `  size range   ${(sizes[0] / MIB).toFixed(2)} - ${(sizes[sizes.length - 1] / MIB).toFixed(2)} MiB (p50 ${(manifest.sizeBytes.p50 / MIB).toFixed(2)})\n` +
    `  over 5 MiB   ${chunked} (take the chunked path)\n` +
    `  targeting    mean error ${manifest.sizeBytes.meanTargetingErrorPct}%\n` +
    `  manifest     ${path.join(opts.out, 'manifest.json')}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`fixture generation failed: ${err?.stack ?? err}\n`);
  process.exit(1);
});
