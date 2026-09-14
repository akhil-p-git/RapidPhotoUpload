/**
 * Deterministic PRNG utilities.
 *
 * Every random choice in fixture generation flows through here so that a given
 * --seed always produces a byte-identical fixture set. That is what makes a
 * benchmark run comparable to a previous one.
 */

/** mulberry32: small, fast, good enough distribution for synthetic image data. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive an independent stream for item `i` so images can be generated out of order. */
export function streamFor(seed, i) {
  return mulberry32((Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(i + 1, 0xc2b2ae35)) >>> 0);
}

/** Uniform float in [min, max). */
export function uniform(rng, min, max) {
  return min + rng() * (max - min);
}

/** Uniform integer in [min, max]. */
export function uniformInt(rng, min, max) {
  return Math.floor(uniform(rng, min, max + 1));
}

/** Pick one element deterministically. */
export function pick(rng, arr) {
  return arr[uniformInt(rng, 0, arr.length - 1)];
}
