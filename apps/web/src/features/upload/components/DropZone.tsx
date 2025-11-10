import React, { useCallback, useState, useRef, useEffect } from 'react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent default drag behaviors on the document
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the dropzone itself
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter(file => file.type.startsWith('image/'));
      if (files.length > 0) {
        onFilesSelected(files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onFilesSelected]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <>
      <style>{`
        .dropzone { position: relative; border: 2px dashed rgba(255,255,255,0.3); border-radius: 24px; transition: all 0.3s; cursor: pointer; background: rgba(255,255,255,0.1); backdrop-filter: blur(12px); }
        .dropzone:hover { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.15); }
        .dropzone.dragging { border-color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.2); transform: scale(1.01); }
        .dropzone-content { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 32px; }
        .upload-icon { width: 64px; height: 64px; color: white; margin-bottom: 24px; transition: transform 0.3s; }
        .dropzone.dragging .upload-icon { transform: scale(1.1); }
        .dropzone-text { font-size: 1.125rem; font-weight: 600; color: white; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        .dropzone-or { font-size: 0.875rem; color: rgba(255,255,255,0.7); margin-bottom: 16px; }
        .browse-btn { padding: 12px 32px; background: rgba(255,255,255,0.9); color: #111827; border: none; border-radius: 12px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
        .browse-btn:hover { background: white; transform: translateY(-1px); }
        .file-types { font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 24px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.05em; }
      `}</style>
      <div
        className={`dropzone ${isDragging ? 'dragging' : ''} ${className}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        <div className="dropzone-content" onClick={handleClick}>
          <svg
            className="upload-icon"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="dropzone-text">
            {isDragging ? 'Drop files here' : 'Drag and drop images'}
          </p>
          <p className="dropzone-or">or</p>
          <button
            type="button"
            className="browse-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            Browse Files
          </button>
          <p className="file-types">JPG, PNG, GIF, WEBP, HEIC, BMP, TIFF</p>
        </div>
      </div>
    </>
  );
};
