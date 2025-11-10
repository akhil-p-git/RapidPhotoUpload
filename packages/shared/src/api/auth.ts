import { AxiosInstance } from 'axios';
import { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/user.types';

export class AuthApi {
  constructor(private client: AxiosInstance) {}

  async register(request: RegisterRequest): Promise<{ userId: string }> {
    const response = await this.client.post<{ userId: string }>('/auth/register', request);
    return response.data;
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', request);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }
}

