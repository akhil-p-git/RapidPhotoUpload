import * as SecureStore from 'expo-secure-store';
import { AuthApi, ApiClient, API_BASE_URL } from '@rapidphoto/shared';
import axios from 'axios';

const TOKEN_KEY = 'jwt_token';
const USER_KEY = 'user_info';

class AuthService {
  private apiClient: ApiClient;
  private authApi: AuthApi;

  constructor() {
    this.apiClient = new ApiClient({
      baseURL: API_BASE_URL,
      getToken: this.getToken.bind(this),
      onUnauthorized: this.logout.bind(this),
    });
    this.authApi = new AuthApi(this.apiClient.instance);
  }

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  async getUser(): Promise<any | null> {
    try {
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async setUser(user: any): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error setting user:', error);
    }
  }

  async login(email: string, password: string) {
    const response = await this.authApi.login({ email, password });
    await this.setToken(response.token);
    const user = await this.authApi.getCurrentUser();
    await this.setUser(user);
    return response;
  }

  async register(email: string, username: string, password: string, fullName?: string) {
    await this.authApi.register({ email, username, password, fullName });
    return this.login(email, password);
  }

  async logout(): Promise<void> {
    try {
      await this.authApi.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  getApiClient(): ApiClient {
    return this.apiClient;
  }
}

export const authService = new AuthService();

