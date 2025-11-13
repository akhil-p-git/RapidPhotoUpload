import { useEffect, useRef, useCallback } from 'react';
import { UploadProgress } from '../../../types/upload.types';
import { WebSocketService } from '../../../services/websocket';

// Convert HTTP API URL to WebSocket URL
const getWebSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    // Replace http:// with ws:// and https:// with wss://
    return apiUrl.replace(/^http/, 'ws') + '/ws/upload-progress';
  }
  // Default to relative WebSocket URL (works with proxy)
  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/upload-progress`;
};

const WS_URL = getWebSocketUrl();

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

