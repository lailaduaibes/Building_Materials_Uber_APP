/**
 * Customer Authentication Service
 * Handles authentication specific to customer app
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'customer' | 'driver' | 'dispatcher' | 'admin';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

class AuthService {
  private baseUrl = __DEV__ ? 'http://localhost:3000/api/v1' : 'https://your-production-api.com/api/v1';

  async login(email: string, password: string): Promise<User> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data: AuthResponse = await response.json();
      
      // Ensure user is a customer
      if (data.user.role !== 'customer') {
        throw new Error('This app is for customers only');
      }

      // Store auth token and user data
      await AsyncStorage.setItem('customerAuthToken', data.token);
      await AsyncStorage.setItem('customerUserData', JSON.stringify(data.user));

      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<{ needsVerification: boolean; email: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          role: 'customer', // Force customer role
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();

      // Return registration info without storing auth data yet
      return {
        needsVerification: true,
        email: userData.email
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async verifyEmail(email: string, code: string): Promise<User> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Email verification failed');
      }

      const data: AuthResponse = await response.json();
      
      // Ensure user is a customer
      if (data.user.role !== 'customer') {
        throw new Error('This app is for customers only');
      }

      // Store auth token and user data
      await AsyncStorage.setItem('customerAuthToken', data.token);
      await AsyncStorage.setItem('customerUserData', JSON.stringify(data.user));

      return data.user;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  async resendVerificationCode(email: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resend verification code');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = await AsyncStorage.getItem('customerAuthToken');
      const userData = await AsyncStorage.getItem('customerUserData');

      if (!token || !userData) {
        return null;
      }

      const user: User = JSON.parse(userData);
      
      // Verify token is still valid
      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token is invalid, clear storage
        await this.logout();
        return null;
      }

      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      await this.logout(); // Clear potentially corrupted data
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear stored auth data
      await AsyncStorage.removeItem('customerAuthToken');
      await AsyncStorage.removeItem('customerUserData');
      await AsyncStorage.removeItem('customerCurrentScreen');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('customerAuthToken');
  }

  async updateProfile(updates: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>): Promise<User> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Profile update failed');
      }

      const updatedUser: User = await response.json();
      
      // Update stored user data
      await AsyncStorage.setItem('customerUserData', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset request failed');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  // Customer-specific API calls
  async getCustomerOrders(): Promise<any[]> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.baseUrl}/customer/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      return await response.json();
    } catch (error) {
      console.error('Get orders error:', error);
      throw error;
    }
  }

  async placeOrder(orderData: any): Promise<any> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.baseUrl}/customer/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place order');
      }

      return await response.json();
    } catch (error) {
      console.error('Place order error:', error);
      throw error;
    }
  }

  async trackOrder(orderId: string): Promise<any> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.baseUrl}/customer/orders/${orderId}/track`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get tracking information');
      }

      return await response.json();
    } catch (error) {
      console.error('Track order error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
