import { AxiosInstance } from 'axios';
import { UploadResponse, ChunkUploadResponse } from '../types/upload.types';

export class UploadApi {
  constructor(private client: AxiosInstance) {}

  async uploadPhoto(file: File | Blob, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  async initializeUpload(
    originalFileName: string,
    mimeType: string,
    fileSizeBytes: number
  ): Promise<UploadResponse> {
    const response = await this.client.post<UploadResponse>('/upload/initialize', {
      originalFileName,
      mimeType,
      fileSizeBytes,
    });

    return response.data;
  }

  async uploadChunk(
    photoId: string,
    chunkNumber: number,
    totalChunks: number,
    chunk: File | Blob
  ): Promise<ChunkUploadResponse> {
    const formData = new FormData();
    formData.append('file', chunk);

    const response = await this.client.post<ChunkUploadResponse>(
      `/upload/chunk?photoId=${photoId}&chunkNumber=${chunkNumber}&totalChunks=${totalChunks}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }
}

