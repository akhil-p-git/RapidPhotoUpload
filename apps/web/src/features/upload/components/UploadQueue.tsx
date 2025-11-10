import React from 'react';
import { UploadTask } from '../hooks/useFileUpload';
import { UploadItem } from './UploadItem';

interface UploadQueueProps {
  tasks: UploadTask[];
  onCancel: (taskId: string) => void;
  onRetry: (taskId: string) => void;
  onClearCompleted?: () => void;
  activeUploads: number;
}

export const UploadQueue: React.FC<UploadQueueProps> = ({
  tasks,
  onCancel,
  onRetry,
  onClearCompleted,
  activeUploads,
}) => {
  if (tasks.length === 0) {
    return null;
  }

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const activeTasks = tasks.filter((t) => t.status === 'uploading' || t.status === 'processing');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const failedTasks = tasks.filter((t) => t.status === 'failed');

  return (
    <>
      <style>{`
        .queue-section { margin-bottom: 32px; }
        .section-title { font-size: 0.875rem; font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
        .section-title.failed { color: #ef4444; }
        .section-title.completed { color: #10b981; }
        .queue-items { display: flex; flex-direction: column; gap: 12px; }
        .queue-header { display: flex; align-items: center; justify-between; margin-bottom: 24px; }
        .queue-stats { font-size: 0.875rem; color: rgba(255,255,255,0.7); }
        .clear-btn { padding: 8px 16px; background: rgba(255,255,255,0.9); color: #111827; border: none; border-radius: 8px; font-weight: 500; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; }
        .clear-btn:hover { background: white; }
      `}</style>
      <div>
        {/* Queue Header */}
        <div className="queue-header">
          <div>
            <p className="queue-stats">
              {activeUploads} active • {pendingTasks.length} pending • {completedTasks.length} completed
              {failedTasks.length > 0 && ` • ${failedTasks.length} failed`}
            </p>
          </div>
          {completedTasks.length > 0 && onClearCompleted && (
            <button className="clear-btn" onClick={onClearCompleted}>
              Clear Completed
            </button>
          )}
        </div>

        {/* Active Uploads */}
        {activeTasks.length > 0 && (
          <div className="queue-section">
            <h3 className="section-title">Uploading ({activeTasks.length})</h3>
            <div className="queue-items">
              {activeTasks.map((task) => (
                <UploadItem
                  key={task.id}
                  task={task}
                  onCancel={onCancel}
                  onRetry={onRetry}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pending Uploads */}
        {pendingTasks.length > 0 && (
          <div className="queue-section">
            <h3 className="section-title">Pending ({pendingTasks.length})</h3>
            <div className="queue-items">
              {pendingTasks.map((task) => (
                <UploadItem
                  key={task.id}
                  task={task}
                  onCancel={onCancel}
                  onRetry={onRetry}
                />
              ))}
            </div>
          </div>
        )}

        {/* Failed Uploads */}
        {failedTasks.length > 0 && (
          <div className="queue-section">
            <h3 className="section-title failed">Failed ({failedTasks.length})</h3>
            <div className="queue-items">
              {failedTasks.map((task) => (
                <UploadItem
                  key={task.id}
                  task={task}
                  onCancel={onCancel}
                  onRetry={onRetry}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Uploads */}
        {completedTasks.length > 0 && (
          <div className="queue-section">
            <h3 className="section-title completed">Completed ({completedTasks.length})</h3>
            <div className="queue-items">
              {completedTasks.map((task) => (
                <UploadItem
                  key={task.id}
                  task={task}
                  onCancel={onCancel}
                  onRetry={onRetry}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
