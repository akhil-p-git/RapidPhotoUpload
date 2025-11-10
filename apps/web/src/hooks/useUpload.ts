import { useState, useCallback } from 'react';
import { uploadApi } from '../api/upload';
import { WebSocketService } from '../services/websocket';
import { UploadProgress, UploadResponse } from '../types/upload.types';

export const useUpload = (userId: string) => {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [wsService, setWsService] = useState<WebSocketService | null>(null);

  const connectWebSocket = useCallback(() => {
    const ws = new WebSocketService(
      `ws://localhost:8080/ws/upload-progress?userId=${userId}`,
      (progress) => {
        setProgress(progress);
      },
      (error) => {
        console.error('WebSocket error:', error);
      },
      () => {
        console.log('WebSocket closed');
      }
    );

    ws.connect();
    setWsService(ws);

    return () => {
      ws.disconnect();
    };
  }, [userId]);

  const uploadPhoto = useCallback(
    async (file: File): Promise<UploadResponse> => {
      return await uploadApi.uploadPhoto(file);
    },
    []
  );

  const initializeChunkedUpload = useCallback(
    async (
      originalFileName: string,
      mimeType: string,
      fileSizeBytes: number
    ): Promise<UploadResponse> => {
      return await uploadApi.initializeUpload(
        originalFileName,
        mimeType,
        fileSizeBytes
      );
    },
    []
  );

  const uploadChunk = useCallback(
    async (
      photoId: string,
      chunkNumber: number,
      totalChunks: number,
      file: File
    ) => {
      return await uploadApi.uploadChunk(photoId, chunkNumber, totalChunks, file);
    },
    []
  );

  const getProgress = useCallback(async (photoId: string) => {
    const progress = await uploadApi.getProgress(photoId);
    setProgress(progress);
    return progress;
  }, []);

  return {
    progress,
    connectWebSocket,
    uploadPhoto,
    initializeChunkedUpload,
    uploadChunk,
    getProgress,
    disconnect: () => {
      if (wsService) {
        wsService.disconnect();
        setWsService(null);
      }
    },
  };
};

