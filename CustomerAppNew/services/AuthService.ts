// AuthService.ts - Customer App Authentication Service
// Based on working YouMatsApp implementation, without email verification for now
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use backend API Cloudflare tunnel for external mobile app access
const API_BASE_URL = 'https://presents-gst-kent-equipped.trycloudflare.com/api/v1'; // Backend API tunnel URL

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  isActive?: boolean;
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

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

export interface LoginRequest {
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

  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      console.log('📝 Making register request to:', `${API_BASE_URL}/auth/register`);
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          role: data.role || 'customer',
        }),
      });

      console.log('📡 Register response status:', response.status);
      const result = await response.json();
      console.log('📨 Register response data:', result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      return result;
    } catch (error) {
      console.error('❌ Registration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('🔐 Making login request to:', `${API_BASE_URL}/auth/login`);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('📡 Response status:', response.status);
      const result = await response.json();
      console.log('📨 Response data:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      if (result.success && result.data?.token && result.data?.user) {
        // Store authentication data using same keys as YouMatsApp
        await AsyncStorage.setItem('authToken', result.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(result.data.user));
        this.token = result.data.token;
        console.log('✅ Login successful, tokens stored');
      }

      return result;
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      this.token = null;
      console.log('✅ Logout successful');
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

// Create and export the singleton instance
const authService = new AuthService();
export default authService;