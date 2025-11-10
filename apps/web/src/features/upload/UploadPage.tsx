import React, { useEffect, useState } from 'react';
import { useFileUpload } from './hooks/useFileUpload';
import { DropZone } from './components/DropZone';
import { UploadQueue } from './components/UploadQueue';
import { formatFileSize } from '../../utils/fileUtils';

export const UploadPage: React.FC = () => {
  const {
    uploadQueue,
    activeUploads,
    totalProgress,
    elapsedTime,
    addFiles,
    cancelUpload,
    retryUpload,
    clearCompleted,
  } = useFileUpload();

  const [showSuccess, setShowSuccess] = useState(false);

  // Show success notification when all uploads complete
  useEffect(() => {
    const allCompleted = uploadQueue.length > 0 && uploadQueue.every((task) => task.status === 'completed');
    if (allCompleted && uploadQueue.length > 0) {
      setShowSuccess(true);
      const successTimer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(successTimer);
    }
  }, [uploadQueue]);

  // Prevent navigation if uploads in progress
  useEffect(() => {
    const hasActiveUploads = uploadQueue.some(
      (task) => task.status === 'uploading' || task.status === 'processing'
    );

    if (hasActiveUploads) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [uploadQueue]);

  // Calculate storage stats
  const totalUploaded = uploadQueue
    .filter((task) => task.status === 'completed')
    .reduce((sum, task) => sum + task.totalBytes, 0);
  const storageQuota = 10 * 1024 * 1024 * 1024; // 10GB
  const storageUsed = totalUploaded;
  const storagePercentage = (storageUsed / storageQuota) * 100;

  // Format elapsed time with milliseconds
  const formatElapsedTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor(ms % 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds}.${String(milliseconds).padStart(3, '0')}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}.${String(milliseconds).padStart(3, '0')}s`;
    } else if (totalSeconds > 0) {
      return `${seconds}.${String(milliseconds).padStart(3, '0')}s`;
    } else {
      return `${milliseconds}ms`;
    }
  };

  const landscapeBg = {
    background: 'linear-gradient(180deg, #FFE5D4 0%, #FFD4B3 25%, #B8E6B8 50%, #A8D8A8 75%, #98C898 100%)',
    minHeight: '100vh',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, sans-serif; }
        .upload-container { position: relative; z-index: 10; min-height: 100vh; }
        .hero-section { padding-top: 128px; padding-bottom: 80px; padding-left: 32px; padding-right: 32px; }
        .hero-title { font-size: 4rem; font-weight: 700; color: white; margin-bottom: 24px; line-height: 1.1; letter-spacing: -0.02em; }
        .hero-subtitle { font-size: 1.5rem; color: rgba(255,255,255,0.9); max-width: 42rem; line-height: 1.6; }
        .stats-container { padding: 0 32px 48px 32px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; max-width: 1280px; margin: 0 auto; }
        .stat-card { background: rgba(255,255,255,0.9); backdrop-filter: blur(12px); border-radius: 16px; padding: 24px; }
        .stat-label { font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #111827; }
        .stat-subvalue { font-size: 0.875rem; color: #6b7280; margin-top: 4px; }
        .progress-bar-container { width: 100%; height: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; margin-top: 12px; }
        .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); transition: width 0.3s ease; }
        .timer-display { font-size: 1.25rem; font-weight: 600; color: #111827; font-variant-numeric: tabular-nums; }
        .dropzone-container { padding: 0 32px 48px 32px; }
        .success-notification { max-width: 1280px; margin: 0 auto 32px auto; padding: 16px 24px; background: rgba(255,255,255,0.9); backdrop-filter: blur(12px); border-radius: 16px; display: flex; align-items: center; justify-content: space-between; }
        .success-text { color: #059669; font-weight: 600; }
        .queue-container { padding: 0 32px 80px 32px; }
        .queue-title { font-size: 0.875rem; font-weight: 600; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 24px; }
      `}</style>
      
      <div style={landscapeBg}></div>
      
      <div className="upload-container">
        {/* Hero Section */}
        <div className="hero-section">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <h1 className="hero-title">Upload your photos</h1>
            <p className="hero-subtitle">
              Drag and drop your images or browse to get started. Instant upload, seamless experience.
            </p>
          </div>
        </div>

        {/* Success Notification */}
        {showSuccess && (
          <div className="success-notification" style={{ margin: '0 32px 32px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#059669' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <span className="success-text">
                  All {uploadQueue.length} photo{uploadQueue.length !== 1 ? 's' : ''} uploaded successfully
                </span>
                {elapsedTime > 0 && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                    Completed in {formatElapsedTime(elapsedTime)}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="stats-container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Storage</div>
              <div className="stat-value">{formatFileSize(storageUsed)}</div>
              <div className="stat-subvalue">of {formatFileSize(storageQuota)}</div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${Math.min(storagePercentage, 100)}%` }}></div>
              </div>
            </div>
            {uploadQueue.length > 0 && (
              <div className="stat-card">
                <div className="stat-label">Upload Progress</div>
                <div className="stat-value">{totalProgress.toFixed(0)}%</div>
                <div className="stat-subvalue">
                  {activeUploads} active • {uploadQueue.filter(t => t.status === 'completed').length} completed
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${totalProgress}%` }}></div>
                </div>
              </div>
            )}
            {uploadQueue.length > 0 && elapsedTime > 0 && (
              <div className="stat-card">
                <div className="stat-label">Upload Time</div>
                <div className="timer-display">{formatElapsedTime(elapsedTime)}</div>
                <div className="stat-subvalue">
                  {uploadQueue.filter(t => t.status === 'completed').length} of {uploadQueue.length} photos
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drop Zone */}
        <div className="dropzone-container">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <DropZone 
              onFilesSelected={async (files) => {
                const result = await addFiles(files);
                if (result && result.rejected > 0) {
                  console.warn(`${result.rejected} file(s) were rejected:`, result.rejectedFiles);
                }
              }} 
            />
          </div>
        </div>

        {/* Upload Queue */}
        {uploadQueue.length > 0 && (
          <div className="queue-container">
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              <p className="queue-title">Upload Queue</p>
              <UploadQueue
                tasks={uploadQueue}
                onCancel={cancelUpload}
                onRetry={retryUpload}
                onClearCompleted={clearCompleted}
                activeUploads={activeUploads}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
