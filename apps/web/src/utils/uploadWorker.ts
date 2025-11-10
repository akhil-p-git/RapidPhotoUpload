/**
 * Web Worker for processing file chunks
 * This can be used to offload chunk processing from the main thread
 */

// 5MB chunk size (same as backend)
export const CHUNK_SIZE = 5 * 1024 * 1024;

export interface ChunkProcessingMessage {
  type: 'PROCESS_CHUNK';
  file: File;
  chunkNumber: number;
  totalChunks: number;
  chunkSize: number;
}

export interface ChunkResult {
  type: 'CHUNK_READY';
  chunkNumber: number;
  blob: Blob;
  start: number;
  end: number;
}

// Worker code (to be used with URL.createObjectURL)
export const createUploadWorker = (): Worker => {
  const workerCode = `
    self.onmessage = function(e) {
      const { type, file, chunkNumber, totalChunks, chunkSize } = e.data;
      
      if (type === 'PROCESS_CHUNK') {
        const start = chunkNumber * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const blob = file.slice(start, end);
        
        self.postMessage({
          type: 'CHUNK_READY',
          chunkNumber,
          blob,
          start,
          end
        });
      }
    };
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  return new Worker(workerUrl);
};

/**
 * Process file chunks in main thread (fallback if workers not used)
 */
export const processChunk = (
  file: File,
  chunkNumber: number,
  chunkSize: number
): Blob => {
  const start = chunkNumber * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  return file.slice(start, end);
};

