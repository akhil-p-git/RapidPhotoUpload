import { useState, useCallback } from 'react';
import { uploadApi } from '../../../api/upload';
import { CHUNK_SIZE, processChunk } from '../../../utils/uploadWorker';
import { ChunkUploadResponse } from '../../../types/upload.types';
import { fingerprintFile, isSameFileShape } from '../../../utils/fileFingerprint';
import { deleteSession, getSession, putSession, pruneSessions } from '../../../utils/uploadSessionStore';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay
const PARALLEL_CHUNKS_PER_FILE = 10; // Upload 10 chunks in parallel per file for ultra-fast speed

/** Mirrors the backend's upload.cleanup.ttl-minutes default (120 minutes). */
const SESSION_TTL_MS = 120 * 60 * 1000;

interface ChunkUploadState {
  photoId: string;
  totalChunks: number;
  uploadedChunks: number;
  failedChunks: Set<number>;
  isComplete: boolean;
  resumed: boolean;
}

export const useChunkedUpload = () => {
  const [uploadState, setUploadState] = useState<Map<string, ChunkUploadState>>(new Map());

  const calculateTotalChunks = useCallback((fileSize: number): number => {
    return Math.ceil(fileSize / CHUNK_SIZE);
  }, []);

  const uploadChunkWithRetry = useCallback(
    async (
      photoId: string,
      chunkNumber: number,
      totalChunks: number,
      chunkBlob: Blob,
      retryCount: number = 0
    ): Promise<ChunkUploadResponse> => {
      try {
        // Create a File from Blob for the API
        const chunkFile = new File([chunkBlob], `chunk-${chunkNumber}`, {
          type: chunkBlob.type || 'application/octet-stream',
        });

        const response = await uploadApi.uploadChunk(photoId, chunkNumber, totalChunks, chunkFile);
        return response;
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          return uploadChunkWithRetry(photoId, chunkNumber, totalChunks, chunkBlob, retryCount + 1);
        }
        throw error;
      }
    },
    []
  );

  /**
   * Decide whether this file continues an upload the server already knows
   * about, or starts a new one.
   *
   * A stored session is only trusted after two independent checks: the file
   * still has the same name, size and mtime as when the session was recorded,
   * and the server still returns progress for that photoId. The server call is
   * what actually authorises it -- it verifies the caller owns the photo, and
   * returns 404 once the upload has been collected as abandoned, at which point
   * the local record is dropped and the upload restarts cleanly.
   */
  const resolveSession = useCallback(
    async (file: File, totalChunks: number): Promise<{
      photoId: string;
      received: Set<number>;
      fingerprint: string;
      resumed: boolean;
    }> => {
      const fingerprint = await fingerprintFile(file);
      const saved = await getSession(fingerprint);

      if (saved && isSameFileShape(file, saved)) {
        try {
          const progress = await uploadApi.getChunkProgress(saved.photoId, totalChunks);
          return {
            photoId: saved.photoId,
            received: new Set(progress.receivedChunks ?? []),
            fingerprint,
            resumed: true,
          };
        } catch {
          // Gone, expired, or not ours. Fall through and start over.
          await deleteSession(fingerprint);
        }
      }

      const initResponse = await uploadApi.initializeUpload(file.name, file.type, file.size);
      await putSession({
        fingerprint,
        photoId: initResponse.photoId,
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
        totalChunks,
      });

      return { photoId: initResponse.photoId, received: new Set<number>(), fingerprint, resumed: false };
    },
    []
  );

  const uploadFileChunked = useCallback(
    async (
      file: File,
      onProgress?: (photoId: string, progress: number, uploadedChunks: number, totalChunks: number) => void
    ): Promise<string> => {
      const totalChunks = calculateTotalChunks(file.size);
      const { photoId, received, fingerprint, resumed } = await resolveSession(file, totalChunks);

      setUploadState((prev) => {
        const newState = new Map(prev);
        newState.set(photoId, {
          photoId,
          totalChunks,
          uploadedChunks: received.size,
          failedChunks: new Set(),
          isComplete: received.size === totalChunks,
          resumed,
        });
        return newState;
      });

      let missing = Array.from({ length: totalChunks }, (_, i) => i).filter((n) => !received.has(n));

      if (resumed) {
        console.log(
          `[Chunked] Resuming ${file.name}: ${received.size}/${totalChunks} chunks already on server, sending ${missing.length}`
        );
        onProgress?.(photoId, (received.size / totalChunks) * 100, received.size, totalChunks);
      }

      // Every chunk is already stored but the file was never assembled -- the
      // process died between the last chunk landing and assembly starting.
      // Re-sending one chunk is enough: the server treats a duplicate as a
      // completeness check and starts assembly if nothing else will.
      if (missing.length === 0 && totalChunks > 0) {
        missing = [totalChunks - 1];
      }

      let highestUploaded = received.size;

      for (let i = 0; i < missing.length; i += PARALLEL_CHUNKS_PER_FILE) {
        const batch = missing.slice(i, i + PARALLEL_CHUNKS_PER_FILE);

        const chunkPromises = batch.map((chunkNumber) => {
          const chunkBlob = processChunk(file, chunkNumber, CHUNK_SIZE);
          return uploadChunkWithRetry(photoId, chunkNumber, totalChunks, chunkBlob)
            .then((response) => ({ chunkNumber, response }))
            .catch((error) => {
              console.error(`Failed to upload chunk ${chunkNumber}:`, error);
              setUploadState((prev) => {
                const newState = new Map(prev);
                const state = newState.get(photoId);
                if (state) {
                  state.failedChunks.add(chunkNumber);
                }
                return newState;
              });
              throw error;
            });
        });

        const results = await Promise.all(chunkPromises);

        // Chunks in a batch complete out of order, so the last response to
        // arrive is not necessarily the highest count. Take the maximum.
        highestUploaded = results.reduce(
          (max, { response }) => Math.max(max, response.uploadedChunks ?? 0),
          highestUploaded
        );

        setUploadState((prev) => {
          const newState = new Map(prev);
          const state = newState.get(photoId);
          if (state) {
            state.uploadedChunks = highestUploaded;
            results.forEach(({ chunkNumber }) => state.failedChunks.delete(chunkNumber));
            if (highestUploaded >= totalChunks) {
              state.isComplete = true;
            }
          }
          return newState;
        });

        onProgress?.(photoId, (highestUploaded / totalChunks) * 100, highestUploaded, totalChunks);
      }

      // The upload is the server's problem from here; nothing local needs to
      // survive, and a stale record would make the next attempt at this file
      // query a photoId that is already finished.
      await deleteSession(fingerprint);

      return photoId;
    },
    [calculateTotalChunks, resolveSession, uploadChunkWithRetry]
  );

  const retryFailedChunks = useCallback(
    async (
      photoId: string,
      file: File,
      onProgress?: (progress: number, uploadedChunks: number, totalChunks: number) => void
    ): Promise<void> => {
      const state = uploadState.get(photoId);
      if (!state || state.failedChunks.size === 0) return;

      const totalChunks = state.totalChunks;
      const failedChunks = Array.from(state.failedChunks);

      for (const chunkNumber of failedChunks) {
        const chunkBlob = processChunk(file, chunkNumber, CHUNK_SIZE);

        try {
          const response = await uploadChunkWithRetry(photoId, chunkNumber, totalChunks, chunkBlob);

          setUploadState((prev) => {
            const newState = new Map(prev);
            const state = newState.get(photoId);
            if (state) {
              state.uploadedChunks = response.uploadedChunks;
              state.failedChunks.delete(chunkNumber);
              if (response.uploadedChunks === totalChunks) {
                state.isComplete = true;
              }
            }
            return newState;
          });

          if (onProgress) {
            const progress = (response.uploadedChunks / totalChunks) * 100;
            onProgress(progress, response.uploadedChunks, totalChunks);
          }
        } catch (error) {
          console.error(`Failed to retry chunk ${chunkNumber}:`, error);
        }
      }
    },
    [uploadState, uploadChunkWithRetry]
  );

  const getUploadState = useCallback(
    (photoId: string): ChunkUploadState | undefined => {
      return uploadState.get(photoId);
    },
    [uploadState]
  );

  /**
   * Forget the stored session for a file the user cancelled. Re-derives the
   * fingerprint rather than threading it through the queue: it costs a 192 KiB
   * read on an action the user just took deliberately, which is cheaper than
   * carrying the value through every task transition.
   */
  const clearSessionForFile = useCallback(async (file: File): Promise<void> => {
    try {
      await deleteSession(await fingerprintFile(file));
    } catch {
      // A session we cannot delete is collected by pruneStaleSessions later.
    }
  }, []);

  /**
   * Drop local records the server has already collected. Matches the backend's
   * upload.cleanup.ttl-minutes default; a local record outliving the server's
   * chunks would only produce a resume attempt that 404s and restarts anyway.
   */
  const pruneStaleSessions = useCallback(async (): Promise<number> => {
    return pruneSessions(SESSION_TTL_MS);
  }, []);

  return {
    uploadFileChunked,
    retryFailedChunks,
    getUploadState,
    calculateTotalChunks,
    clearSessionForFile,
    pruneStaleSessions,
  };
};
