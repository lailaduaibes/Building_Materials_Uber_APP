/**
 * Simple Authentication Service for Customer App
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'driver' | 'dispatcher' | 'admin';
  isActive: boolean;
  emailVerified: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private baseURL = 'https://presents-gst-kent-equipped.trycloudflare.com/api/v1/auth';

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ needsVerification?: boolean; user?: User; error?: string }> {
    try {
      console.log('🚀 Starting registration...');
      console.log('📧 Email:', userData.email);
      console.log('🌐 URL:', `${this.baseURL}/register`);
      
      const payload = { ...userData, role: 'customer' };
      console.log('📦 Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${this.baseURL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      const data = await response.json();
      console.log('📋 Response data:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.log('❌ Registration failed:', data.message);
        return { error: data.message || 'Registration failed' };
      }

      console.log('✅ Registration successful!');
      return { needsVerification: true, user: data.user };
    } catch (error) {
      console.error('💥 Registration error:', error);
      return { error: 'Network error during registration' };
    }
  }

  async login(email: string, password: string): Promise<{ user?: User; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.message || 'Login failed' };
      }

      // Store token
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));

      return { user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Network error during login' };
    }
  }

  async verifyEmail(email: string, code: string): Promise<{ success?: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, verificationCode: code }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.message || 'Verification failed' };
      }

      // Store token after verification
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Verification error:', error);
      return { error: 'Network error during verification' };
    }
  }

  async resendVerificationCode(email: string): Promise<{ success?: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        return { error: data.message || 'Failed to resend code' };
      }

      return { success: true };
    } catch (error) {
      console.error('Resend verification error:', error);
      return { error: 'Network error' };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

export const authService = new AuthService();
