const TOKEN_KEY = 'rapidphoto_token';
const USER_KEY = 'rapidphoto_user';

export interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  storageQuotaBytes: number;
  storageUsedBytes: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    authService.setToken(data.token);
    authService.setUser(data.user);
    return data;
  },

  /**
   * Register a new user
   */
  register: async (
    email: string,
    username: string,
    password: string,
    fullName?: string
  ): Promise<AuthResponse> => {
    const response = await fetch('http://localhost:8080/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, username, password, fullName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data: AuthResponse = await response.json();
    authService.setToken(data.token);
    authService.setUser(data.user);
    return data;
  },

  /**
   * Logout (clear token and user)
   */
  logout: async (): Promise<void> => {
    try {
      await fetch('http://localhost:8080/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
        },
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      authService.clearAuth();
    }
  },

  /**
   * Get current user info
   */
  getCurrentUser: async (): Promise<User | null> => {
    const token = authService.getToken();
    if (!token) {
      return null;
    }

    try {
      const response = await fetch('http://localhost:8080/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        authService.clearAuth();
        return null;
      }

      const user: User = await response.json();
      authService.setUser(user);
      return user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      authService.clearAuth();
      return null;
    }
  },

  /**
   * Store JWT token
   */
  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Get JWT token
   */
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Store user info
   */
  setUser: (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /**
   * Get user info
   */
  getUser: (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return authService.getToken() !== null;
  },

  /**
   * Clear authentication data
   */
  clearAuth: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

