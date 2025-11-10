export interface PhotoResponse {
  id: string;
  userId: string;
  fileName: string;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
  status: string;
  storagePath: string;
  thumbnailSmallUrl?: string;
  thumbnailMediumUrl?: string;
  thumbnailLargeUrl?: string;
  exifData?: Record<string, any>;
  aiTags?: Record<string, any>;
  metadata?: Record<string, any>;
  locationLat?: number;
  locationLon?: number;
  takenAt?: string;
  uploadedAt: string;
  processedAt?: string;
}

export interface PhotosPageResponse {
  content: PhotoResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PhotoFilters {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PhotoStats {
  totalPhotos: number;
  totalSizeBytes: number;
  photosByStatus: Record<string, number>;
  recentUploads: number;
  storageUsedPercent: number;
  storageQuotaBytes: number;
  storageUsedBytes: number;
}

