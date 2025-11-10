export interface UploadResponse {
  photoId: string;
  status: string;
  message?: string;
}

export interface ChunkUploadResponse {
  photoId: string;
  chunkNumber: number;
  status: string;
  uploadedChunks: number;
  totalChunks: number;
  progress?: number;
  missingChunks?: number[];
  message?: string;
}

export interface UploadProgress {
  photoId: string;
  progress: number;
  uploadedChunks: number;
  totalChunks: number;
  status: string;
}

