import { useState, useCallback } from 'react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [disabled, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? '#646cff' : '#ccc'}`,
        borderRadius: '8px',
        padding: '3rem',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        backgroundColor: isDragging ? '#f0f0f0' : 'transparent',
        transition: 'all 0.2s',
      }}
    >
      <input
        type="file"
        id="file-input"
        onChange={handleFileInput}
        disabled={disabled}
        style={{ display: 'none' }}
        accept="image/*"
      />
      <label htmlFor="file-input" style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <p>Drag and drop a photo here, or click to select</p>
        <p style={{ fontSize: '0.9em', color: '#666' }}>
          {isDragging ? 'Drop the file here' : 'Select a file'}
        </p>
      </label>
    </div>
  );
};

