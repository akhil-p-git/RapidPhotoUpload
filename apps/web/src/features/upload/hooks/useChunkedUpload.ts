import { useState, useCallback } from 'react';
import { uploadApi } from '../../../api/upload';
import { CHUNK_SIZE, processChunk } from '../../../utils/uploadWorker';
import { ChunkUploadResponse } from '../../../types/upload.types';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

interface ChunkUploadState {
  photoId: string;
  totalChunks: number;
  uploadedChunks: number;
  failedChunks: Set<number>;
  isComplete: boolean;
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

  const uploadFileChunked = useCallback(
    async (
      file: File,
      onProgress?: (photoId: string, progress: number, uploadedChunks: number, totalChunks: number) => void
    ): Promise<string> => {
      const totalChunks = calculateTotalChunks(file.size);

      // Initialize upload (userId comes from JWT token)
      const initResponse = await uploadApi.initializeUpload(
        file.name,
        file.type,
        file.size
      );

      const photoId = initResponse.photoId;

      // Initialize state
      setUploadState((prev) => {
        const newState = new Map(prev);
        newState.set(photoId, {
          photoId,
          totalChunks,
          uploadedChunks: 0,
          failedChunks: new Set(),
          isComplete: false,
        });
        return newState;
      });

      // Upload chunks sequentially
      for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
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
            onProgress(photoId, progress, response.uploadedChunks, totalChunks);
          }
        } catch (error) {
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
        }
      }

      return photoId;
    },
    [calculateTotalChunks, uploadChunkWithRetry]
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

  return {
    uploadFileChunked,
    retryFailedChunks,
    getUploadState,
    calculateTotalChunks,
  };
};

