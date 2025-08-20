// AuthService.ts - Enhanced authentication with email verification
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api/v1';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: User;
    token?: string;
    userId?: string;
    email?: string;
    requiresVerification?: boolean;
  };
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  private token: string | null = null;

  async initialize(): Promise<User | null> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        this.token = token;
        const user = JSON.parse(userData);
        return user;
      }
      return null;
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      return null;
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      return result;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      if (result.success && result.data?.token && result.data?.user) {
        // Store authentication data
        await AsyncStorage.setItem('authToken', result.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(result.data.user));
        this.token = result.data.token;
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async resendVerificationEmail(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to resend verification email');
      }

      return result;
    } catch (error) {
      console.error('Resend verification error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to resend verification email',
      };
    }
  }

  async verifyEmail(token: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Email verification failed');
      }

      return result;
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Email verification failed',
      };
    }
  }

  async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send password reset email');
      }

      return result;
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send password reset email',
      };
    }
  }

  async getProfile(): Promise<AuthResponse> {
    try {
      if (!this.token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to get profile');
      }

      return result;
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get profile',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      this.token = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }
}

export const authService = new AuthService();
