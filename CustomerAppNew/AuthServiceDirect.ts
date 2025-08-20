/**
 * Direct Supabase Authentication Service (No email verification needed)
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
  role: 'customer' | 'driver' | 'dispatcher' | 'admin';
  isActive: boolean;
  emailVerified: boolean;
}

class AuthServiceDirect {
  
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🚀 Starting direct Supabase registration...');
      console.log('📧 Email:', userData.email);

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: 'customer',
          }
        }
      });

      if (error) {
        console.error('❌ Registration error:', error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('✅ User created:', data.user.email);
        
        // Create user profile in our database
        const userProfile: User = {
          id: data.user.id,
          email: data.user.email!,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: 'customer',
          isActive: true,
          emailVerified: true, // We'll set this to true to skip verification
        };

        // Store user data locally
        await AsyncStorage.setItem('user', JSON.stringify(userProfile));
        
        return { success: true, user: userProfile };
      }

      return { success: false, error: 'Failed to create user' };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🚀 Starting direct Supabase login...');
      console.log('📧 Email:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Login error:', error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('✅ Login successful:', data.user.email);
        
        const userProfile: User = {
          id: data.user.id,
          email: data.user.email!,
          firstName: data.user.user_metadata?.first_name || 'User',
          lastName: data.user.user_metadata?.last_name || '',
          role: 'customer',
          isActive: true,
          emailVerified: true,
        };

        await AsyncStorage.setItem('user', JSON.stringify(userProfile));
        
        return { success: true, user: userProfile };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('❌ Login failed:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚀 Starting logout...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Logout error:', error.message);
        return { success: false, error: error.message };
      }

      await AsyncStorage.removeItem('user');
      console.log('✅ Logout successful');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Logout failed:', error);
      return { success: false, error: 'Logout failed' };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        return JSON.parse(userString);
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get current user:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('❌ Failed to check auth status:', error);
      return false;
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'undefined');
      
      if (session?.user) {
        const userProfile: User = {
          id: session.user.id,
          email: session.user.email!,
          firstName: session.user.user_metadata?.first_name || 'User',
          lastName: session.user.user_metadata?.last_name || '',
          role: 'customer',
          isActive: true,
          emailVerified: true,
        };
        callback(userProfile);
      } else {
        callback(null);
      }
    });
  }
}

export const authServiceDirect = new AuthServiceDirect();
export default authServiceDirect;
