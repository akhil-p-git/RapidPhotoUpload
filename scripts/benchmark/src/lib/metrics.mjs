/**
 * Aggregation helpers. Percentiles use nearest-rank on the sorted sample, which
 * is the conservative choice for small n: no interpolation invents a value that
 * was never observed.
 */

export function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return null;
  const rank = Math.ceil((p / 100) * sortedAsc.length);
  return sortedAsc[Math.min(sortedAsc.length - 1, Math.max(0, rank - 1))];
}

export function summarise(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    n: s.length,
    min: round(s[0]),
    p50: round(percentile(s, 50)),
    p95: round(percentile(s, 95)),
    p99: round(percentile(s, 99)),
    max: round(s[s.length - 1]),
    mean: round(sum / s.length),
  };
}

const round = (v) => (v === null || v === undefined ? null : Math.round(v * 100) / 100);

/**
 * Maximum number of simultaneously open intervals.
 * Intervals are [start, end) in the same time base; ends are processed before
 * starts at equal timestamps so a request that finishes exactly as another
 * begins is not counted as overlapping.
 */
export function peakConcurrency(intervals) {
  const events = [];
  for (const [start, end] of intervals) {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    events.push([start, 1], [end, -1]);
  }
  events.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  let cur = 0, peak = 0;
  for (const [, delta] of events) {
    cur += delta;
    if (cur > peak) peak = cur;
  }
  return peak;
}

/**
 * Concurrency sampled on a fixed grid, so a run can be plotted and a single
 * outlying instant cannot masquerade as sustained parallelism.
 */
export function concurrencyOverTime(intervals, stepMs = 250, maxSamples = 400) {
  const valid = intervals.filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && e >= s);
  if (!valid.length) return [];
  let t0 = Infinity, t1 = -Infinity;
  for (const [s, e] of valid) {
    if (s < t0) t0 = s;
    if (e > t1) t1 = e;
  }
  // Widen the step rather than emit thousands of samples for a long run.
  const span = t1 - t0;
  if (span / stepMs > maxSamples) stepMs = span / maxSamples;
  const out = [];
  for (let t = t0; t <= t1; t += stepMs) {
    out.push({ t: Math.round(t - t0), open: valid.reduce((n, [s, e]) => n + (s <= t && t < e ? 1 : 0), 0) });
  }
  return out;
}

export function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
