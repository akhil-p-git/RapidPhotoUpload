import * as FileSystem from 'expo-file-system/legacy';
import { UploadApi, GalleryApi } from '@rapidphoto/shared';
import { authService } from './authService';
import { CHUNK_SIZE } from '@rapidphoto/shared';

export interface UploadTask {
  id: string;
  photoId?: string;
  uri: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'paused';
  progress: number;
  error?: string;
}

class UploadService {
  private uploadQueue: Map<string, UploadTask> = new Map();
  private uploadApi: UploadApi;
  private galleryApi: GalleryApi;

  constructor() {
    const apiClient = authService.getApiClient();
    this.uploadApi = new UploadApi(apiClient.instance);
    this.galleryApi = new GalleryApi(apiClient.instance);
  }

  async addToQueue(uri: string, fileName: string): Promise<string> {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    const taskId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: UploadTask = {
      id: taskId,
      uri,
      fileName,
      fileSize: fileInfo.size || 0,
      status: 'pending',
      progress: 0,
    };

    this.uploadQueue.set(taskId, task);
    return taskId;
  }

  async upload(taskId: string): Promise<void> {
    const task = this.uploadQueue.get(taskId);
    if (!task) {
      throw new Error('Upload task not found');
    }

    if (task.status === 'uploading') {
      return; // Already uploading
    }

    task.status = 'uploading';

    try {
      const fileSize = task.fileSize;
      
      if (fileSize < 5 * 1024 * 1024) {
        // Direct upload for small files
        await this.uploadDirect(task);
      } else {
        // Chunked upload for large files
        await this.uploadChunked(task);
      }

      task.status = 'completed';
      task.progress = 100;
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message || 'Upload failed';
      throw error;
    }
  }

  private async uploadDirect(task: UploadTask): Promise<void> {
    const fileUri = task.uri;
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // Use FormData for React Native
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: task.fileName,
    } as any);

    const token = await authService.getToken();
    const apiClient = authService.getApiClient();
    
    const response = await fetch(`${apiClient.instance.defaults.baseURL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    task.progress = 100;
  }

  private async uploadChunked(task: UploadTask): Promise<void> {
    const fileUri = task.uri;
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // Initialize upload
    const initResponse = await this.uploadApi.initializeUpload(
      task.fileName,
      'image/jpeg',
      task.fileSize
    );

    task.photoId = initResponse.photoId;

    // Calculate chunks
    const totalChunks = Math.ceil(task.fileSize / CHUNK_SIZE);

    // Upload chunks
    for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
      if (task.status === 'paused') {
        break;
      }

      const start = chunkNumber * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, task.fileSize);

      // For chunked upload, use FormData with file slice
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: 'image/jpeg',
        name: `chunk-${chunkNumber}`,
      } as any);

      const token = await authService.getToken();
      const apiClient = authService.getApiClient();
      const response = await fetch(
        `${apiClient.instance.defaults.baseURL}/upload/chunk?photoId=${initResponse.photoId}&chunkNumber=${chunkNumber}&totalChunks=${totalChunks}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Chunk upload failed');
      }

      task.progress = Math.round(((chunkNumber + 1) / totalChunks) * 100);
    }
  }

  // Note: React Native doesn't support Blob directly, use FormData instead

  pause(taskId: string): void {
    const task = this.uploadQueue.get(taskId);
    if (task && task.status === 'uploading') {
      task.status = 'paused';
    }
  }

  resume(taskId: string): Promise<void> {
    const task = this.uploadQueue.get(taskId);
    if (task && task.status === 'paused') {
      return this.upload(taskId);
    }
    return Promise.resolve();
  }

  remove(taskId: string): void {
    this.uploadQueue.delete(taskId);
  }

  getTask(taskId: string): UploadTask | undefined {
    return this.uploadQueue.get(taskId);
  }

  getAllTasks(): UploadTask[] {
    return Array.from(this.uploadQueue.values());
  }

  getPendingTasks(): UploadTask[] {
    return this.getAllTasks().filter(task => task.status === 'pending');
  }

  getActiveTasks(): UploadTask[] {
    return this.getAllTasks().filter(task => task.status === 'uploading' || task.status === 'paused');
  }
}

export const uploadService = new UploadService();

