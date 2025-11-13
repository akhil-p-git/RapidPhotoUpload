import { useState, useCallback, useRef, useEffect } from 'react';
import { uploadApi } from '../../../api/upload';
import { useChunkedUpload } from './useChunkedUpload';
import { useWebSocket } from './useWebSocket';
import { needsChunking, generateThumbnail, isValidImageFile, isDuplicateFile, formatFileSize } from '../../../utils/fileUtils';
import { UploadProgress } from '../../../types/upload.types';

const MAX_CONCURRENT_UPLOADS = 500; // Maximum speed: 500 parallel uploads for ultra-fast bulk uploads
let taskIdCounter = 0;

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'paused' | 'cancelled';

export interface UploadTask {
  id: string;
  photoId?: string;
  file: File;
  thumbnail?: string;
  status: UploadStatus;
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  uploadSpeed: number; // bytes per second
  eta: number; // seconds
  error?: string;
  startTime?: number;
  lastUpdateTime?: number;
  lastUploadedBytes?: number;
}

export const useFileUpload = () => {
  const [uploadQueue, setUploadQueue] = useState<UploadTask[]>([]);
  const [activeUploads, setActiveUploads] = useState<number>(0);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const activeUploadRefs = useRef<Map<string, AbortController>>(new Map());
  const progressTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { uploadFileChunked } = useChunkedUpload();

  // WebSocket progress handler
  const handleWebSocketProgress = useCallback((progress: UploadProgress) => {
    setUploadQueue((prev) => {
      return prev.map((task) => {
        if (task.photoId === progress.photoId) {
          const now = Date.now();
          const timeDelta = task.lastUpdateTime ? (now - task.lastUpdateTime) / 1000 : 0;
          const bytesDelta = progress.uploadedBytes && task.uploadedBytes
            ? progress.uploadedBytes - task.uploadedBytes
            : 0;
          const speed = timeDelta > 0 ? bytesDelta / timeDelta : 0;
          const remaining = progress.totalBytes && progress.uploadedBytes
            ? progress.totalBytes - progress.uploadedBytes
            : 0;
          const eta = speed > 0 ? remaining / speed : 0;

          let status: UploadStatus = task.status;
          if (progress.status === 'UPLOADING') status = 'uploading';
          else if (progress.status === 'COMPLETED') status = 'completed';
          else if (progress.status === 'FAILED') status = 'failed';

          return {
            ...task,
            status,
            progress: progress.percentage ?? task.progress,
            uploadedBytes: progress.uploadedBytes ?? task.uploadedBytes,
            totalBytes: progress.totalBytes ?? task.totalBytes,
            uploadSpeed: speed,
            eta,
            lastUpdateTime: now,
            lastUploadedBytes: progress.uploadedBytes,
          };
        }
        return task;
      });
    });
  }, []);

  useWebSocket(handleWebSocketProgress, true);

  // Calculate upload speed and ETA
  const updateUploadMetrics = useCallback((taskId: string) => {
    const timer = setInterval(() => {
      setUploadQueue((prev) => {
        return prev.map((task) => {
          if (task.id === taskId && task.status === 'uploading' && task.lastUpdateTime) {
            const now = Date.now();
            const timeDelta = (now - task.lastUpdateTime) / 1000;
            const bytesDelta = task.lastUploadedBytes && task.uploadedBytes
              ? task.uploadedBytes - task.lastUploadedBytes
              : 0;
            const speed = timeDelta > 0 ? bytesDelta / timeDelta : 0;
            const remaining = task.totalBytes - task.uploadedBytes;
            const eta = speed > 0 ? remaining / speed : 0;

            return {
              ...task,
              uploadSpeed: speed,
              eta,
              lastUpdateTime: now,
              lastUploadedBytes: task.uploadedBytes,
            };
          }
          return task;
        });
      });
    }, 1000);

    progressTimers.current.set(taskId, timer);
  }, []);

  // Direct upload (for files < 5MB)
  const uploadFileDirect = useCallback(
    async (task: UploadTask, abortController: AbortController): Promise<void> => {
      try {
        const response = await uploadApi.uploadPhoto(task.file);
        
        if (abortController.signal.aborted) {
          return;
        }

        setUploadQueue((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  photoId: response.photoId,
                  status: 'processing',
                  progress: 100,
                }
              : t
          )
        );
      } catch (error: any) {
        if (abortController.signal.aborted) {
          return;
        }
        throw error;
      }
    },
    []
  );

  // Chunked upload (for files >= 5MB)
  const uploadFileChunkedWrapper = useCallback(
    async (task: UploadTask, abortController: AbortController): Promise<void> => {
      try {
        const photoId = await uploadFileChunked(task.file, (progressPhotoId, progress, uploadedChunks, totalChunks) => {
          if (abortController.signal.aborted) {
            return;
          }

          setUploadQueue((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    photoId: progressPhotoId,
                    progress,
                    uploadedBytes: Math.floor((uploadedChunks / totalChunks) * task.totalBytes),
                  }
                : t
            )
          );
        });

        if (abortController.signal.aborted) {
          return;
        }

        setUploadQueue((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  photoId: photoId || t.photoId,
                  status: 'processing',
                  progress: 100,
                }
              : t
          )
        );
      } catch (error: any) {
        if (abortController.signal.aborted) {
          return;
        }
        throw error;
      }
    },
    [uploadFileChunked]
  );

  // Process upload queue - Fixed race condition by using refs and proper state management
  useEffect(() => {
    // Only process if there are pending tasks and available slots
    const pendingTasks = uploadQueue.filter((task) => task.status === 'pending');
    const availableSlots = MAX_CONCURRENT_UPLOADS - activeUploads;
    
    if (pendingTasks.length === 0 || availableSlots <= 0) {
      return;
    }

    const tasksToProcess = pendingTasks.slice(0, availableSlots);

    console.log(`[Upload Queue] Processing ${tasksToProcess.length} tasks (${pendingTasks.length} pending, ${activeUploads} active, ${availableSlots} slots available)`);

    // Process each task
    tasksToProcess.forEach((task) => {
      console.log(`[Upload] Starting upload for ${task.file.name} (${formatFileSize(task.file.size)}) - Task ID: ${task.id}`);

      const abortController = new AbortController();
      activeUploadRefs.current.set(task.id, abortController);

      // Increment active uploads count
      setActiveUploads((prev) => prev + 1);

      // Update task to uploading immediately
      setUploadQueue((currentQueue) =>
        currentQueue.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: 'uploading',
                startTime: Date.now(),
                lastUpdateTime: Date.now(),
                lastUploadedBytes: 0,
              }
            : t
        )
      );

      updateUploadMetrics(task.id);

      // Start upload asynchronously
      (async () => {
        try {
          if (needsChunking(task.file.size)) {
            await uploadFileChunkedWrapper(task, abortController);
          } else {
            await uploadFileDirect(task, abortController);
          }

          if (!abortController.signal.aborted) {
            console.log(`[Upload] Successfully uploaded ${task.file.name} - Task ID: ${task.id}`);
            setUploadQueue((currentQueue) =>
              currentQueue.map((t) =>
                t.id === task.id ? { ...t, status: 'completed' } : t
              )
            );
          }
        } catch (error: any) {
          if (!abortController.signal.aborted) {
            console.error(`[Upload] Upload failed for ${task.file.name}:`, error);
            // Extract better error message
            let errorMessage = 'Upload failed';
            if (error.response) {
              // HTTP error response
              if (error.response.status === 429) {
                errorMessage = 'Rate limit exceeded. Please try again in a moment.';
              } else if (error.response.status === 413) {
                errorMessage = 'File too large. Maximum size is 100MB.';
              } else if (error.response.status === 400) {
                errorMessage = error.response.data?.error || error.response.data?.message || 'Invalid file. Please check file type and size.';
              } else if (error.response.status === 401) {
                errorMessage = 'Authentication failed. Please log in again.';
              } else if (error.response.status === 403) {
                errorMessage = 'Permission denied. You may have exceeded your storage quota.';
              } else {
                errorMessage = error.response.data?.error || error.response.data?.message || `Upload failed: ${error.response.statusText}`;
              }
            } else if (error.message) {
              errorMessage = error.message;
            }

            setUploadQueue((currentQueue) =>
              currentQueue.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      status: 'failed',
                      error: errorMessage,
                    }
                  : t
              )
            );
          }
        } finally {
          activeUploadRefs.current.delete(task.id);
          const timer = progressTimers.current.get(task.id);
          if (timer) {
            clearInterval(timer);
            progressTimers.current.delete(task.id);
          }
          setActiveUploads((prev) => Math.max(0, prev - 1));
        }
      })();
    });
  }, [uploadQueue, activeUploads, uploadFileDirect, uploadFileChunkedWrapper, updateUploadMetrics]);

  // Add files to queue with validation feedback
  const addFiles = useCallback(
    async (files: File[]) => {
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      const STORAGE_QUOTA = 10 * 1024 * 1024 * 1024; // 10GB
      const rejectedFiles: Array<{ file: File; reason: string }> = [];

      // Calculate current storage usage
      const currentStorageUsed = uploadQueue
        .filter((task) => task.status === 'completed')
        .reduce((sum, task) => sum + task.totalBytes, 0);

      // Calculate pending upload size
      const pendingUploadSize = uploadQueue
        .filter((task) => task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled')
        .reduce((sum, task) => sum + task.totalBytes, 0);

      // Calculate total size of new files
      const newFilesSize = files.reduce((sum, file) => sum + file.size, 0);

      // Check if adding these files would exceed storage quota
      const totalAfterUpload = currentStorageUsed + pendingUploadSize + newFilesSize;
      if (totalAfterUpload > STORAGE_QUOTA) {
        const availableSpace = STORAGE_QUOTA - (currentStorageUsed + pendingUploadSize);
        console.warn(`Storage quota exceeded. Available: ${formatFileSize(availableSpace)}, Requested: ${formatFileSize(newFilesSize)}`);

        // Reject all files if they would exceed quota
        files.forEach((file) => {
          rejectedFiles.push({
            file,
            reason: `Storage quota exceeded. ${formatFileSize(availableSpace)} available of ${formatFileSize(STORAGE_QUOTA)} total.`
          });
        });

        return {
          valid: 0,
          rejected: rejectedFiles.length,
          rejectedFiles,
        };
      }

      const validFiles = files.filter((file) => {
        // Check file type
        if (!isValidImageFile(file)) {
          rejectedFiles.push({
            file,
            reason: `Invalid file type: ${file.type || 'unknown'}. Only image files are allowed.`
          });
          return false;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          rejectedFiles.push({
            file,
            reason: `File too large: ${formatFileSize(file.size)}. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
          });
          return false;
        }

        // Check for empty files
        if (file.size === 0) {
          rejectedFiles.push({
            file,
            reason: 'File is empty.'
          });
          return false;
        }

        // Check for duplicates
        const isDuplicate = uploadQueue.some((task) => isDuplicateFile(task.file, file));
        if (isDuplicate) {
          rejectedFiles.push({
            file,
            reason: 'Duplicate file. This file is already in the upload queue.'
          });
          return false;
        }

        return true;
      });

      // Show rejected files as failed tasks so user can see what was rejected
      const rejectedTasks: UploadTask[] = rejectedFiles.map(({ file, reason }) => {
        taskIdCounter++;
        return {
          id: `task-${taskIdCounter}-rejected`,
          file,
          thumbnail: undefined,
          status: 'failed' as UploadStatus,
          progress: 0,
          uploadedBytes: 0,
          totalBytes: file.size,
          uploadSpeed: 0,
          eta: 0,
          error: reason,
        };
      });

      // Start timer if this is the first batch of uploads
      if (validFiles.length > 0 && uploadQueue.length === 0 && !uploadStartTime) {
        const startTime = Date.now();
        setUploadStartTime(startTime);
        setElapsedTime(0);
        
        // Start timer interval (update every 10ms for smooth millisecond display)
        timerIntervalRef.current = setInterval(() => {
          setElapsedTime(Date.now() - startTime);
        }, 10);
      }

      // Generate thumbnails individually and don't let failures block the queue
      const newTasks: UploadTask[] = [];
      for (const file of validFiles) {
        taskIdCounter++;
        const taskId = `task-${taskIdCounter}`;

        // Generate thumbnail asynchronously, don't wait
        const thumbnailPromise = generateThumbnail(file).catch((err) => {
          console.warn(`Thumbnail generation failed for ${file.name}:`, err);
          return undefined;
        });

        const task: UploadTask = {
          id: taskId,
          file,
          thumbnail: undefined,
          status: 'pending' as UploadStatus,
          progress: 0,
          uploadedBytes: 0,
          totalBytes: file.size,
          uploadSpeed: 0,
          eta: 0,
        };

        newTasks.push(task);

        // Update thumbnail when ready (non-blocking)
        thumbnailPromise.then((thumbnail) => {
          if (thumbnail) {
            setUploadQueue((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, thumbnail } : t))
            );
          }
        });
      }

      // Add both valid and rejected tasks
      setUploadQueue((prev) => [...prev, ...rejectedTasks, ...newTasks]);

      console.log(`[Upload] Added ${newTasks.length} valid files and ${rejectedTasks.length} rejected files to queue`);
      if (rejectedTasks.length > 0) {
        console.log('[Upload] Rejected files:', rejectedFiles.map(r => `${r.file.name}: ${r.reason}`));
      }

      // Return validation results for potential user notification
      return {
        valid: validFiles.length,
        rejected: rejectedFiles.length,
        rejectedFiles,
      };
    },
    [uploadQueue]
  );

  // Cancel upload
  const cancelUpload = useCallback((taskId: string) => {
    const abortController = activeUploadRefs.current.get(taskId);
    if (abortController) {
      abortController.abort();
      activeUploadRefs.current.delete(taskId);
    }

    const timer = progressTimers.current.get(taskId);
    if (timer) {
      clearInterval(timer);
      progressTimers.current.delete(taskId);
    }

    setUploadQueue((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: 'cancelled' } : t
      )
    );
    setActiveUploads((prev) => Math.max(0, prev - 1));
  }, []);

  // Retry upload
  const retryUpload = useCallback(
    async (taskId: string) => {
      const task = uploadQueue.find((t) => t.id === taskId);
      if (!task) return;

      setUploadQueue((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'pending',
                error: undefined,
                progress: 0,
                uploadedBytes: 0,
              }
            : t
        )
      );
    },
    [uploadQueue]
  );

  // Pause upload (for future implementation)
  const pauseUpload = useCallback((taskId: string) => {
    setUploadQueue((prev) =>
      prev.map((t) => (t.id === taskId && t.status === 'uploading' ? { ...t, status: 'paused' } : t))
    );
  }, []);

  // Resume upload (for future implementation)
  const resumeUpload = useCallback((taskId: string) => {
    setUploadQueue((prev) =>
      prev.map((t) => (t.id === taskId && t.status === 'paused' ? { ...t, status: 'pending' } : t))
    );
  }, []);

  // Clear completed uploads
  const clearCompleted = useCallback(() => {
    setUploadQueue((prev) => {
      const remaining = prev.filter((t) => t.status !== 'completed');
      // Reset timer if queue is empty
      if (remaining.length === 0) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setUploadStartTime(null);
        setElapsedTime(0);
      }
      return remaining;
    });
  }, []);

  // Stop timer when all uploads complete
  useEffect(() => {
    const hasActiveUploads = uploadQueue.some(
      (task) => task.status === 'uploading' || task.status === 'processing' || task.status === 'pending'
    );
    
    if (!hasActiveUploads && uploadQueue.length > 0 && timerIntervalRef.current) {
      // All uploads done, stop timer but keep final elapsed time
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, [uploadQueue]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Get total progress
  const totalProgress = uploadQueue.length > 0
    ? uploadQueue.reduce((sum, task) => sum + task.progress, 0) / uploadQueue.length
    : 0;

  return {
    uploadQueue,
    activeUploads,
    totalProgress,
    elapsedTime,
    uploadStartTime,
    addFiles,
    cancelUpload,
    retryUpload,
    pauseUpload,
    resumeUpload,
    clearCompleted,
  };
};

