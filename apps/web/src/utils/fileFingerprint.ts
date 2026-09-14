/**
 * Stable per-file identity, used to match a file the user re-selects after a
 * reload against an upload session already in progress on the server.
 *
 * Shape
 * -----
 *   fingerprint = SHA-256( name | size | lastModified | sampleHash )
 *   sampleHash  = SHA-256( first 64 KiB, then middle 64 KiB, then last 64 KiB )
 *
 * Why not metadata alone (name + size + lastModified)
 * --------------------------------------------------
 * Free, but it collides on any file edited in place that preserves size and
 * mtime, and on files deliberately given a matching name and size. Resuming
 * into the wrong photo record would splice two different files together and
 * produce a corrupt image that still reports success.
 *
 * Why not a full-content hash
 * ---------------------------
 * Exact, but it reads every byte before the first byte can be uploaded. For the
 * 1000-image batch this project is built around (about 3.4 GB) that is seconds
 * of CPU plus a full extra read of the entire set, on the critical path, to
 * avoid re-sending chunks that in the common case were never sent at all.
 *
 * Why three sampled windows
 * -------------------------
 * Cost is constant in file size (192 KiB read regardless) while still reading
 * content. For a JPEG the first window covers the SOI marker, the whole
 * EXIF/APP1 block (camera make and model, capture timestamp, often a body
 * serial number) and the start of the entropy-coded scan, which is about as
 * distinguishing as a photograph gets.
 *
 * Residual collision risk, stated plainly
 * ---------------------------------------
 * Two distinct files collide only if name, size, lastModified and all three
 * 64 KiB windows match. Accidentally that needs a size-preserving edit confined
 * to the region between the windows, with the mtime restored afterwards.
 *
 * Deliberately it is trivial: someone who controls both files chooses the
 * windows. That is acceptable because this is not a security boundary. The
 * fingerprint only selects which locally stored session to resume; the server
 * independently verifies that the caller owns the photoId before returning
 * progress or accepting a chunk. The worst outcome of a forced collision is a
 * user corrupting their own upload.
 */

const WINDOW_BYTES = 64 * 1024;

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

async function sha256Hex(parts: BlobPart[]): Promise<string> {
  const buffer = await new Blob(parts).arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return toHex(digest);
}

/**
 * Head, middle and tail windows. Files smaller than the three windows combined
 * are hashed whole: sampling them would read overlapping bytes twice and still
 * cost no less than reading the file.
 */
function sampleFile(file: File): BlobPart[] {
  if (file.size <= WINDOW_BYTES * 3) {
    return [file];
  }
  const middleStart = Math.floor((file.size - WINDOW_BYTES) / 2);
  return [
    file.slice(0, WINDOW_BYTES),
    file.slice(middleStart, middleStart + WINDOW_BYTES),
    file.slice(file.size - WINDOW_BYTES, file.size),
  ];
}

export async function fingerprintFile(file: File): Promise<string> {
  const sampleHash = await sha256Hex(sampleFile(file));
  return sha256Hex([`${file.name} ${file.size} ${file.lastModified} ${sampleHash}`]);
}

/**
 * Cheap guard applied before trusting a stored session: even on a fingerprint
 * hit, refuse to resume if the obvious metadata has moved.
 */
export function isSameFileShape(
  file: File,
  saved: { fileSize: number; lastModified: number; fileName: string }
): boolean {
  return (
    file.size === saved.fileSize &&
    file.lastModified === saved.lastModified &&
    file.name === saved.fileName
  );
}
