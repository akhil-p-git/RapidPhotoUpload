#!/usr/bin/env node
/**
 * Empirical check of what a presigned PUT actually enforces.
 *
 * Stage 3 claims the upload URL is bound to an exact byte count. That claim is
 * only worth making if it has been observed, so this script asks the running
 * backend for a real presigned URL and then tries to abuse it:
 *
 *   1. PUT exactly the declared number of bytes   -> must succeed
 *   2. PUT more bytes than declared               -> must be rejected
 *   3. PUT fewer bytes than declared              -> must be rejected
 *   4. PUT with a different Content-Type          -> must be rejected
 *
 * It also prints X-Amz-SignedHeaders from the URL, which is the direct evidence
 * of which headers the store will actually verify.
 *
 * Run against whatever store the backend is pointed at. A pass against MinIO
 * does NOT establish the same for Cloudflare R2 -- rerun it with the backend
 * configured for R2 to make that claim.
 */

const API = process.env.API_BASE || 'http://localhost:8080/api';
const EMAIL = process.env.BENCH_EMAIL || 'presign-probe@localhost.test';
const PASSWORD = process.env.BENCH_PASSWORD || 'presign-probe-1234';
const DECLARED = 4096;

async function login() {
  await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, username: 'presignprobe', password: PASSWORD, fullName: 'Presign Probe' }),
  }).catch(() => null);

  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  return (await res.json()).token;
}

async function presign(token, sizeBytes, mimeType) {
  const res = await fetch(`${API}/upload/presigned`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ originalFileName: 'probe.jpg', mimeType, fileSizeBytes: sizeBytes }),
  });
  if (!res.ok) throw new Error(`presign failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function jpeg(length) {
  const buf = Buffer.alloc(length);
  buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff; buf[3] = 0xe0;
  return buf;
}

async function attempt(label, url, body, contentType, expectOk) {
  let status, note = '';
  try {
    const res = await fetch(url, { method: 'PUT', body, headers: { 'Content-Type': contentType } });
    status = res.status;
    if (!res.ok) note = (await res.text()).slice(0, 160).replace(/\s+/g, ' ');
  } catch (err) {
    status = 'network-error';
    note = String(err?.message ?? err);
  }
  const ok = status >= 200 && status < 300;
  const pass = ok === expectOk;
  console.log(
    `  ${pass ? 'PASS' : 'FAIL'}  ${label.padEnd(34)} status=${String(status).padEnd(16)} ` +
    `expected=${expectOk ? 'accepted' : 'rejected'}${note ? `  ${note}` : ''}`
  );
  return pass;
}

async function main() {
  const token = await login();

  const first = await presign(token, DECLARED, 'image/jpeg');
  const signedHeaders = new URL(first.uploadUrl).searchParams.get('X-Amz-SignedHeaders');
  console.log(`\nX-Amz-SignedHeaders: ${signedHeaders}`);
  console.log(`content-length signed: ${/(^|;)content-length(;|$)/.test(signedHeaders || '') ? 'YES' : 'NO'}`);
  console.log(`content-type signed:   ${/(^|;)content-type(;|$)/.test(signedHeaders || '') ? 'YES' : 'NO'}\n`);

  const results = [];
  results.push(await attempt('exact declared size', first.uploadUrl, jpeg(DECLARED), 'image/jpeg', true));

  const over = await presign(token, DECLARED, 'image/jpeg');
  results.push(await attempt('more bytes than declared', over.uploadUrl, jpeg(DECLARED * 16), 'image/jpeg', false));

  const under = await presign(token, DECLARED, 'image/jpeg');
  results.push(await attempt('fewer bytes than declared', under.uploadUrl, jpeg(DECLARED / 2), 'image/jpeg', false));

  const wrongType = await presign(token, DECLARED, 'image/jpeg');
  results.push(await attempt('different content type', wrongType.uploadUrl, jpeg(DECLARED), 'application/octet-stream', false));

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} expectations held.`);
  if (failed) {
    console.log('A FAIL on a rejection case means the store did not enforce that binding.');
    console.log('The /upload/complete verification is the backstop and still applies.');
  }
  process.exitCode = failed ? 1 : 0;
}

main().catch((err) => {
  console.error(`probe failed: ${err?.message ?? err}`);
  process.exit(2);
});
