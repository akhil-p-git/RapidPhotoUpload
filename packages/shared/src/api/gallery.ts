import { AxiosInstance } from 'axios';
import { PhotoResponse, PhotosPageResponse, PhotoFilters, PhotoStats } from '../types/photo.types';

export class GalleryApi {
  constructor(private client: AxiosInstance) {}

  async getPhotos(
    page: number = 0,
    size: number = 24,
    filters?: PhotoFilters
  ): Promise<PhotosPageResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await this.client.get<PhotosPageResponse>(`/photos?${params.toString()}`);
    return response.data;
  }

  async getPhoto(photoId: string): Promise<PhotoResponse> {
    const response = await this.client.get<PhotoResponse>(`/photos/${photoId}`);
    return response.data;
  }

  async getPhotoFile(photoId: string, size: 'thumbnail' | 'medium' | 'large' | 'original' = 'original'): Promise<string> {
    return `${this.client.defaults.baseURL}/photos/${photoId}/file?size=${size}`;
  }

  async deletePhoto(photoId: string): Promise<void> {
    await this.client.delete(`/photos/${photoId}`);
  }

  async getStats(): Promise<PhotoStats> {
    const response = await this.client.get<PhotoStats>('/photos/stats');
    return response.data;
  }
}

