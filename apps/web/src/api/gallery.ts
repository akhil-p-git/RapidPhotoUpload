import apiClient from './client';

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

export interface PhotoStats {
  totalPhotos: number;
  totalSizeBytes: number;
  photosByStatus: Record<string, number>;
  recentUploads: number;
  storageUsedPercent: number;
  storageQuotaBytes: number;
  storageUsedBytes: number;
}

export interface PhotoFilters {
  search?: string;
  status?: string; // Comma-separated or single
  startDate?: string; // ISO date format
  endDate?: string; // ISO date format
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const galleryApi = {
  /**
   * Get paginated list of photos for the authenticated user
   * Supports search, filters, date range, and sorting
   */
  getPhotos: async (
    page: number = 0,
    size: number = 24,
    filters?: PhotoFilters
  ): Promise<PhotosPageResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }
    if (filters?.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    if (filters?.sortOrder) {
      params.append('sortOrder', filters.sortOrder);
    }
    
    const response = await apiClient.get<PhotosPageResponse>(`/photos?${params.toString()}`);
    return response.data;
  },

  /**
   * Get photo statistics
   */
  getStats: async (): Promise<PhotoStats> => {
    const response = await apiClient.get<PhotoStats>('/photos/stats');
    return response.data;
  },

  /**
   * Get single photo by ID
   */
  getPhoto: async (photoId: string): Promise<PhotoResponse> => {
    const response = await apiClient.get<PhotoResponse>(`/photos/${photoId}`);
    return response.data;
  },

  /**
   * Batch delete photos
   */
  batchDelete: async (photoIds: string[]): Promise<{ successCount: number; failureCount: number; failedIds: string[]; totalRequested: number }> => {
    const response = await apiClient.post<{ successCount: number; failureCount: number; failedIds: string[]; totalRequested: number }>(
      '/photos/batch/delete',
      { photoIds }
    );
    return response.data;
  },

  /**
   * Batch download photos as ZIP
   */
  batchDownload: async (photoIds: string[]): Promise<Blob> => {
    const response = await apiClient.post<Blob>(
      '/photos/batch/download',
      { photoIds },
      { responseType: 'blob' }
    );
    return response.data;
  },

  /**
   * Batch get metadata
   */
  batchGetMetadata: async (photoIds: string[], format: 'json' | 'csv' = 'json'): Promise<any> => {
    const params = new URLSearchParams();
    photoIds.forEach(id => params.append('photoIds', id));
    params.append('format', format);
    
    const response = await apiClient.get(`/photos/batch/metadata?${params.toString()}`);
    return response.data;
  },

  /**
   * Delete a photo
   */
  deletePhoto: async (photoId: string): Promise<void> => {
    await apiClient.delete(`/photos/${photoId}`);
  },
};

