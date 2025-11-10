import React, { memo } from 'react';
import { UploadTask } from '../hooks/useFileUpload';
import { formatFileSize, formatUploadSpeed, formatTime } from '../../../utils/fileUtils';

interface UploadItemProps {
  task: UploadTask;
  onCancel: (taskId: string) => void;
  onRetry: (taskId: string) => void;
}

export const UploadItem: React.FC<UploadItemProps> = memo(({ task, onCancel, onRetry }) => {
  const getStatusColor = (status: UploadTask['status']) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'uploading':
        return '#3b82f6';
      case 'processing':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getProgressColor = (status: UploadTask['status']) => {
    switch (status) {
      case 'completed':
        return 'linear-gradient(90deg, #10b981, #34d399)';
      case 'failed':
        return 'linear-gradient(90deg, #ef4444, #f87171)';
      case 'uploading':
        return 'linear-gradient(90deg, #3b82f6, #60a5fa)';
      case 'processing':
        return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      default:
        return 'linear-gradient(90deg, #6b7280, #9ca3af)';
    }
  };

  return (
    <>
      <style>{`
        .upload-item { background: rgba(255,255,255,0.9); backdrop-filter: blur(12px); border-radius: 16px; padding: 16px; display: flex; align-items: flex-start; gap: 16px; transition: transform 0.2s; }
        .upload-item:hover { transform: translateY(-2px); }
        .upload-thumbnail { width: 80px; height: 80px; flex-shrink: 0; border-radius: 12px; object-fit: cover; }
        .upload-thumbnail-placeholder { width: 80px; height: 80px; background: rgba(0,0,0,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .upload-content { flex: 1; min-width: 0; }
        .upload-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        .upload-filename { font-size: 0.875rem; font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .upload-size { font-size: 0.75rem; color: #6b7280; margin-top: 4px; }
        .upload-status { padding: 4px 12px; font-size: 0.75rem; font-weight: 600; border-radius: 12px; color: white; }
        .upload-progress-container { width: 100%; height: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; margin-top: 12px; }
        .upload-progress-fill { height: 100%; transition: width 0.3s ease; }
        .upload-stats { display: flex; align-items: center; gap: 16px; font-size: 0.75rem; color: #6b7280; margin-top: 8px; }
        .upload-error { font-size: 0.75rem; color: #ef4444; margin-top: 8px; }
        .upload-actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
        .upload-btn { padding: 6px 16px; border: none; border-radius: 8px; font-weight: 500; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
        .upload-btn-retry { background: #111827; color: white; }
        .upload-btn-retry:hover { background: #1f2937; }
        .upload-btn-cancel { background: rgba(239,68,68,0.1); color: #ef4444; }
        .upload-btn-cancel:hover { background: rgba(239,68,68,0.2); }
      `}</style>
      <div className="upload-item">
        {/* Thumbnail */}
        <div style={{ flexShrink: 0 }}>
          {task.thumbnail ? (
            <img
              src={task.thumbnail}
              alt={task.file.name}
              className="upload-thumbnail"
            />
          ) : (
            <div className="upload-thumbnail-placeholder">
              <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#9ca3af' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="upload-content">
          <div className="upload-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="upload-filename">{task.file.name}</p>
              <p className="upload-size">{formatFileSize(task.totalBytes)}</p>
            </div>
            <span className="upload-status" style={{ background: getStatusColor(task.status) }}>
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>
          </div>

          {/* Progress Bar */}
          {task.status !== 'pending' && task.status !== 'cancelled' && (
            <div className="upload-progress-container">
              <div 
                className="upload-progress-fill" 
                style={{ 
                  width: `${task.progress}%`,
                  background: getProgressColor(task.status)
                }}
              />
            </div>
          )}

          {/* Upload Stats */}
          {task.status === 'uploading' && (
            <div className="upload-stats">
              <span>Speed: {formatUploadSpeed(task.uploadSpeed * 1024 * 1024)}</span>
              {task.eta > 0 && <span>ETA: {formatTime(task.eta)}</span>}
              <span>
                {formatFileSize(task.uploadedBytes)} / {formatFileSize(task.totalBytes)}
              </span>
            </div>
          )}

          {/* Error Message */}
          {task.status === 'failed' && task.error && (
            <p className="upload-error">{task.error}</p>
          )}

          {/* Actions */}
          <div className="upload-actions">
            {task.status === 'failed' && (
              <button className="upload-btn upload-btn-retry" onClick={() => onRetry(task.id)}>
                Retry
              </button>
            )}
            {(task.status === 'uploading' || task.status === 'pending' || task.status === 'paused') && (
              <button className="upload-btn upload-btn-cancel" onClick={() => onCancel(task.id)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

UploadItem.displayName = 'UploadItem';
