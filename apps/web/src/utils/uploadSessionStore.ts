/**
 * Durable record of chunked uploads that are in flight, so a reload does not
 * mean starting a multi-megabyte file again from byte zero.
 *
 * What this can and cannot do
 * ---------------------------
 * A browser cannot hold on to a File across a reload: the handle dies with the
 * page, and nothing here can resurrect the bytes. What survives is the mapping
 * from a file fingerprint to the server-side photoId. Resume therefore means:
 * the user selects the same files again, each one is fingerprinted, a stored
 * session is found, the server is asked which chunks it already holds, and only
 * the missing ones are sent. The user re-picks the files; they do not re-upload
 * them.
 *
 * (The File System Access API can persist a re-openable handle, but it is
 * Chromium-only, needs a permission prompt on every reload, and does not cover
 * drag-and-drop, so it is not used here.)
 *
 * Every call is defensive. IndexedDB is unavailable in some private-browsing
 * modes and can be disabled outright; when it fails, uploads must still work,
 * just without resume.
 */

const DB_NAME = 'rapidphoto-uploads';
const DB_VERSION = 1;
const STORE = 'sessions';

export interface StoredUploadSession {
  /** Primary key: see utils/fileFingerprint.ts for how it is derived. */
  fingerprint: string;
  photoId: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
  totalChunks: number;
  createdAt: number;
  updatedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'fingerprint' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return null; // No IndexedDB: callers fall back to a fresh upload.
  }
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = fn(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export async function getSession(fingerprint: string): Promise<StoredUploadSession | null> {
  const result = await withStore<StoredUploadSession | undefined>('readonly', (s) => s.get(fingerprint));
  return result ?? null;
}

export async function putSession(
  session: Omit<StoredUploadSession, 'createdAt' | 'updatedAt'> & Partial<Pick<StoredUploadSession, 'createdAt'>>
): Promise<void> {
  const now = Date.now();
  const record: StoredUploadSession = {
    ...session,
    createdAt: session.createdAt ?? now,
    updatedAt: now,
  };
  await withStore('readwrite', (s) => s.put(record));
}

export async function deleteSession(fingerprint: string): Promise<void> {
  await withStore('readwrite', (s) => s.delete(fingerprint));
}

export async function allSessions(): Promise<StoredUploadSession[]> {
  const result = await withStore<StoredUploadSession[]>('readonly', (s) => s.getAll());
  return result ?? [];
}

/**
 * Drop local records older than the server's own retention window. Past that
 * point the backend has collected the chunks, so a resume attempt would query
 * a photoId that no longer has anything behind it. Keeping them would grow the
 * store without bound for every abandoned upload.
 */
export async function pruneSessions(maxAgeMs: number): Promise<number> {
  const sessions = await allSessions();
  const cutoff = Date.now() - maxAgeMs;
  const stale = sessions.filter((s) => s.updatedAt < cutoff);
  for (const session of stale) {
    await deleteSession(session.fingerprint);
  }
  return stale.length;
}
