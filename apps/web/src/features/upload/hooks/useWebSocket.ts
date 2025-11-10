import { useEffect, useRef, useCallback } from 'react';
import { UploadProgress } from '../../../types/upload.types';
import { WebSocketService } from '../../../services/websocket';

const WS_URL = 'ws://localhost:8080/ws/upload-progress';

export const useWebSocket = (
  onProgress: (progress: UploadProgress) => void,
  enabled: boolean = true
) => {
  const wsServiceRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const wsService = new WebSocketService(
      WS_URL,
      onProgress,
      (error) => {
        console.error('WebSocket error:', error);
      },
      () => {
        console.log('WebSocket closed');
      }
    );

    wsService.connect();
    wsServiceRef.current = wsService;

    return () => {
      wsService.disconnect();
      wsServiceRef.current = null;
    };
  }, [enabled, onProgress]);

  const sendMessage = useCallback((message: string) => {
    if (wsServiceRef.current) {
      wsServiceRef.current.send(message);
    }
  }, []);

  const isConnected = useCallback(() => {
    return wsServiceRef.current?.isConnected() ?? false;
  }, []);

  return { sendMessage, isConnected };
};

