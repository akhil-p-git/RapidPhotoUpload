/**
 * Environment capture. A benchmark number is meaningless without the machine,
 * the link and the server build that produced it -- these fields are what make
 * two runs comparable, or explicitly not comparable.
 */

import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

async function tryCmd(cmd, args) {
  try {
    const { stdout } = await run(cmd, args, { timeout: 5000 });
    return stdout.trim();
  } catch {
    return null;
  }
}

/** Ask the backend what it is, so results record the server actually exercised. */
async function probeBackend(apiBase) {
  const out = { reachable: false };
  try {
    const health = await fetch(`${apiBase.replace(/\/api$/, '')}/actuator/health`, {
      signal: AbortSignal.timeout(4000),
    });
    out.reachable = health.ok;
    out.health = await health.json().catch(() => null);
  } catch (err) {
    out.error = String(err?.message ?? err);
  }
  try {
    const info = await fetch(`${apiBase.replace(/\/api$/, '')}/actuator/info`, {
      signal: AbortSignal.timeout(4000),
    });
    if (info.ok) out.info = await info.json().catch(() => null);
  } catch { /* optional */ }
  return out;
}

export async function captureEnvironment({ apiBase, storageTarget, uplink }) {
  const cpus = os.cpus();
  return {
    capturedAt: new Date().toISOString(),
    host: {
      platform: `${os.platform()} ${os.release()}`,
      arch: os.arch(),
      cpuModel: cpus[0]?.model?.trim() ?? 'unknown',
      cpuCount: cpus.length,
      totalMemoryGiB: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
      loadAverage1m: Number(os.loadavg()[0].toFixed(2)),
    },
    runtime: {
      node: process.version,
      chromium: null, // filled in by the driver once the browser is launched
    },
    git: {
      commit: await tryCmd('git', ['rev-parse', '--short', 'HEAD']),
      branch: await tryCmd('git', ['rev-parse', '--abbrev-ref', 'HEAD']),
      dirty: (await tryCmd('git', ['status', '--porcelain'])) ? true : false,
    },
    storage: storageTarget,
    backend: await probeBackend(apiBase),
    uplink,
  };
}
