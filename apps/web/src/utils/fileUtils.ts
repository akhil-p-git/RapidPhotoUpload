/**
 * Format file size in bytes to human-readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format upload speed in bytes per second to MB/s
 */
export const formatUploadSpeed = (bytesPerSecond: number): string => {
  const mbPerSecond = bytesPerSecond / (1024 * 1024);
  return `${mbPerSecond.toFixed(2)} MB/s`;
};

/**
 * Calculate estimated time remaining in seconds
 */
export const calculateETA = (uploaded: number, total: number, speed: number): number => {
  if (speed === 0 || total === 0) return 0;
  const remaining = total - uploaded;
  return Math.ceil(remaining / speed);
};

/**
 * Format time in seconds to human-readable string
 */
export const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

/**
 * Validate if file is an image
 */
export const isValidImageFile = (file: File): boolean => {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/tiff',
  ];
  return validTypes.includes(file.type.toLowerCase());
};

/**
 * Generate thumbnail from file
 */
export const generateThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Calculate thumbnail size (max 200x200)
        const maxSize = 200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Check if two files are duplicates (by name and size)
 */
export const isDuplicateFile = (file1: File, file2: File): boolean => {
  return file1.name === file2.name && file1.size === file2.size;
};

/**
 * Chunk size constant (5MB)
 */
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Check if file needs chunking
 */
export const needsChunking = (fileSize: number): boolean => {
  return fileSize > CHUNK_SIZE;
};

