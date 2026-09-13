/**
 * Uplink measurement.
 *
 * Every duration in a run is bounded by how fast bytes can leave this machine,
 * so a result without a contemporaneous bandwidth figure is not interpretable:
 * a "fast" run on a fast link and a "slow" run on a slow link say nothing about
 * the architecture. Measured at run time, not looked up, because residential
 * uplink varies by hour.
 *
 * Only random bytes are sent. Disable with --no-uplink.
 */

import { randomBytes } from 'node:crypto';

/** Cloudflare's public bandwidth endpoint: purpose-built, accepts a POST body. */
const DEFAULT_ENDPOINT = 'https://speed.cloudflare.com/__up';

/**
 * POST `bytes` of random data and derive Mbit/s from the observed duration.
 * Runs a warm-up that is discarded, then takes the best of `samples` --
 * best-of measures the link's capability rather than transient contention.
 */
export async function measureUplinkMbps({
  endpoint = DEFAULT_ENDPOINT,
  bytes = 8 * 1024 * 1024,
  samples = 3,
  timeoutMs = 60_000,
} = {}) {
  const payload = randomBytes(bytes);
  const results = [];
  let lastError = null;

  for (let i = 0; i < samples + 1; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const t0 = performance.now();
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/octet-stream' },
        signal: controller.signal,
      });
      // Drain so the timing covers the full exchange.
      await res.arrayBuffer();
      const seconds = (performance.now() - t0) / 1000;
      if (i > 0 && seconds > 0) results.push((bytes * 8) / seconds / 1e6);
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }

  if (!results.length) {
    return { mbps: null, endpoint, bytes, samples: 0, error: String(lastError?.message ?? lastError ?? 'no samples') };
  }

  return {
    mbps: Number(Math.max(...results).toFixed(2)),
    allSamplesMbps: results.map((r) => Number(r.toFixed(2))),
    endpoint,
    bytes,
    samples: results.length,
    method: 'best of N POSTs of random bytes, warm-up discarded',
  };
}

/**
 * How long `totalBytes` must take at `mbps`, ignoring every other cost.
 * A run that claims to beat this floor has a measurement error somewhere.
 */
export function transferFloorSeconds(totalBytes, mbps) {
  if (!mbps || mbps <= 0) return null;
  return Number(((totalBytes * 8) / (mbps * 1e6)).toFixed(1));
}
