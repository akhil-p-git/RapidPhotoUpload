export interface UploadProgress {
  photoId: string;
  userId: string;
  status: 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CONNECTED';
  uploadedBytes?: number;
  totalBytes?: number;
  percentage?: number;
  uploadedChunks?: number;
  totalChunks?: number;
  message?: string;
  timestamp: string;
}

export interface UploadResponse {
  photoId: string;
  uploadUrl: string;
  status: string;
  message: string;
}

export interface ChunkUploadResponse {
  photoId: string;
  chunkNumber: number;
  status: string;
  uploadedChunks: number;
  totalChunks: number;
  progress: number;
  missingChunks?: number[];
  /** Chunk numbers the server already holds. Explicit, because chunks upload in parallel and arrive out of order. */
  receivedChunks?: number[];
  message: string;
}

