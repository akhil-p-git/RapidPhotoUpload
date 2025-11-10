import apiClient from './client';
import { UploadResponse, ChunkUploadResponse } from '../types/upload.types';

// Retry configuration for rate-limited requests
const MAX_RETRIES = 5; // Increased for bulk uploads
const RETRY_DELAY = 1000; // 1 second base delay

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_DELAY
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on rate limit (429) or network errors
      if (attempt < maxRetries && (
        error.response?.status === 429 || 
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        !error.response
      )) {
        // Check for Retry-After header from rate limit response
        let delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        
        if (error.response?.status === 429) {
          const retryAfter = error.response?.headers?.['retry-after'];
          if (retryAfter) {
            // Use Retry-After header value (in seconds), convert to milliseconds
            delay = parseInt(retryAfter, 10) * 1000;
            // Add some jitter to prevent thundering herd
            delay += Math.random() * 1000;
          } else {
            // If no Retry-After header, use longer delay for rate limits
            delay = Math.min(baseDelay * Math.pow(2, attempt + 2), 30000); // Cap at 30 seconds
          }
        }
        
        await sleep(delay);
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

export const uploadApi = {
  /**
   * Upload a file directly (userId comes from JWT token)
   * Includes retry logic for rate-limited requests
   */
  uploadPhoto: async (file: File): Promise<UploadResponse> => {
    return retryWithBackoff(async () => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<UploadResponse>('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes timeout for large files
      });

      return response.data;
    });
  },

  /**
   * Initialize chunked upload (userId comes from JWT token)
   */
  initializeUpload: async (
    originalFileName: string,
    mimeType: string,
    fileSizeBytes: number
  ): Promise<UploadResponse> => {
    const response = await apiClient.post<UploadResponse>('/upload/initialize', {
      originalFileName,
      mimeType,
      fileSizeBytes,
    });

    return response.data;
  },

  /**
   * Upload a chunk
   * Includes retry logic for rate-limited requests
   */
  uploadChunk: async (
    photoId: string,
    chunkNumber: number,
    totalChunks: number,
    file: File
  ): Promise<ChunkUploadResponse> => {
    return retryWithBackoff(async () => {
      const formData = new FormData();
      formData.append('photoId', photoId);
      formData.append('chunkNumber', chunkNumber.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('file', file);

      const response = await apiClient.post<ChunkUploadResponse>(
        '/upload/chunk',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 300000, // 5 minutes timeout for large chunks
        }
      );

      return response.data;
    });
  },

  /**
   * Get upload progress
   */
  getProgress: async (photoId: string) => {
    const response = await apiClient.get(`/upload/progress/${photoId}`);
    return response.data;
  },
};

