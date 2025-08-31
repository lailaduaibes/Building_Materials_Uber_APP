import { createClient, SupabaseClient, Session, User as SupabaseUser } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const SUPABASE_URL = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

// Custom User interface for the app
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  emailConfirmed: boolean;
  createdAt?: string;
  lastSignIn?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    session?: Session;
    requiresVerification?: boolean;
  };
  error?: string;
}

class AuthServiceSupabase {
  private supabase: SupabaseClient;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;

  constructor() {
    // Initialize Supabase client with AsyncStorage for React Native
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    // Set up auth state listener  
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        // Only validate user type for initial sign-in, not for profile updates
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('🔍 Validating user type for driver app, event:', event);
          const isValidUser = await this.validateUserTypeForDriver(session.user.id);
          
          if (!isValidUser) {
            console.log('🚫 Invalid user type detected for driver app, signing out');
            await this.supabase.auth.signOut();
            return;
          }
        } else if (event === 'USER_UPDATED') {
          console.log('⚡ Skipping validation for USER_UPDATED event (performance optimization)');
        }
        
        this.currentSession = session;
        this.currentUser = this.mapSupabaseUserToUser(session.user);
        await this.storeUserData(this.currentUser);
        await this.storeSession(session);
      } else {
        this.currentSession = null;
        this.currentUser = null;
        await this.clearStoredData();
      }
    });

    // Initialize user from stored session
    this.initializeUser();
  }

  // Cache for user validation to avoid repeated DB calls
  private userValidationCache = new Map<string, boolean>();

  // Validate user type - only drivers allowed in driver app
  private async validateUserTypeForDriver(userId: string): Promise<boolean> {
    // Check cache first
    if (this.userValidationCache.has(userId)) {
      console.log('⚡ Using cached driver validation result');
      return this.userValidationCache.get(userId)!;
    }

    try {
      console.log('🔍 Validating user type for driver app, user:', userId);
      
      // Add timeout to prevent hanging
      const validationPromise = this.supabase
        .from('users')
        .select('user_type, role')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Validation timeout')), 5000)
      );

      const { data: userData, error } = await Promise.race([
        validationPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('❌ Error checking user type:', error);
        // Cache and allow access (fail open for now)
        this.userValidationCache.set(userId, true);
        console.log('✅ Allowing access due to database error (fail open)');
        return true;
      }

      console.log('👤 Driver validation result:', { 
        user_type: userData.user_type,
        role: userData.role
      });

      // ONLY allow if explicitly marked as 'driver' in user_type
      const isValidDriver = userData.user_type === 'driver';
      
      // Cache the result
      this.userValidationCache.set(userId, isValidDriver);
      
      if (isValidDriver) {
        console.log('✅ Allowing driver access');
        return true;
      }

      // Block everything else (customer, null, undefined, etc.)
      console.log('🚫 Blocking non-driver access - user type:', userData.user_type || 'null/undefined');
      return false;
      
    } catch (error) {
      console.error('💥 Error validating user type:', error);
      // Cache and allow access (fail open)
      this.userValidationCache.set(userId, true);
      console.log('✅ Allowing access due to validation error (fail open)');
      return true;
    }
  }

  private async initializeUser(): Promise<void> {
    try {
      // Get current session from Supabase
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (!error && session?.user) {
        // Validate user type before initializing
        const isValidUser = await this.validateUserTypeForDriver(session.user.id);
        
        if (!isValidUser) {
          console.log('🚫 Invalid user type detected during initialization, signing out');
          await this.supabase.auth.signOut();
          return;
        }
        
        this.currentSession = session;
        this.currentUser = this.mapSupabaseUserToUser(session.user);
        await this.storeUserData(this.currentUser);
        await this.storeSession(session);
      } else {
        // Try to get stored user data as fallback
        const storedUser = await this.getStoredUserData();
        if (storedUser) {
          this.currentUser = storedUser;
        }
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  }

  private mapSupabaseUserToUser(supabaseUser: SupabaseUser): User {
    // Access raw_user_meta_data safely
    const rawMetadata = (supabaseUser as any).raw_user_meta_data || {};
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      firstName: supabaseUser.user_metadata?.first_name || rawMetadata.first_name,
      lastName: supabaseUser.user_metadata?.last_name || rawMetadata.last_name,
      phone: supabaseUser.user_metadata?.phone || rawMetadata.phone,
      role: supabaseUser.user_metadata?.role || rawMetadata.role || 'customer',
      emailConfirmed: !!supabaseUser.email_confirmed_at,
      createdAt: supabaseUser.created_at,
      lastSignIn: supabaseUser.last_sign_in_at,
    };
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone?: string,
    role: string = 'driver'
  ): Promise<AuthResponse> {
    try {
      console.log('🚀 Starting Supabase registration...');
      console.log('📧 Email:', email);
      console.log('👤 Name:', firstName, lastName);
      console.log('📱 Phone:', phone);
      console.log('🎭 Role:', role);

      // Store email for later OTP verification
      await AsyncStorage.setItem('pending_user_email', email);

      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
            role,
          },
        },
      });

      if (error) {
        console.log('❌ Supabase error:', error.message);
        return {
          success: false,
          message: error.message,
          error: error.message,
        };
      }

      if (!data.user) {
        return {
          success: false,
          message: 'Registration failed - no user data received',
          error: 'No user data received',
        };
      }

      console.log('✅ User created:', data.user.email);
      console.log('📧 Email confirmed:', !!data.user.email_confirmed_at);

      if (!data.user.email_confirmed_at) {
        // Store user data temporarily until email verification
        const tempUser = this.mapSupabaseUserToUser(data.user);
        await AsyncStorage.setItem('temp_user_data', JSON.stringify(tempUser));
        
        return {
          success: true,
          message: 'Registration successful! Please check your email for a 6-digit verification code.',
          data: {
            user: tempUser,
            requiresVerification: true,
          },
        };
      }

      // User is already verified (shouldn't happen in normal flow)
      return {
        success: true,
        message: 'Registration successful!',
        data: {
          user: this.mapSupabaseUserToUser(data.user),
          session: data.session || undefined,
          requiresVerification: false,
        },
      };
    } catch (error: any) {
      console.error('💥 Registration error:', error);
      return {
        success: false,
        message: error.message || 'Registration failed',
        error: error.message,
      };
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let message = 'Login failed';
        if (error.message.includes('Email not confirmed')) {
          message = 'Please verify your email address before logging in';
        } else if (error.message.includes('Invalid login credentials')) {
          message = 'Invalid email or password';
        } else {
          message = error.message;
        }

        return {
          success: false,
          message,
          error: error.message,
        };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          message: 'Login failed',
          error: 'No user or session data received',
        };
      }

      if (!data.user.email_confirmed_at) {
        return {
          success: false,
          message: 'Please verify your email address before logging in',
          error: 'Email not confirmed',
        };
      }

      const user = this.mapSupabaseUserToUser(data.user);
      
      // Validate that user has driver type in database
      const isValidDriverUser = await this.validateUserTypeForDriver(data.user.id);
      if (!isValidDriverUser) {
        // Sign out the user immediately
        await this.supabase.auth.signOut();
        
        return {
          success: false,
          message: 'Access denied. This appears to be a customer account. Please use the customer app or contact support to create a driver account.',
          error: 'Invalid user type for driver app',
        };
      }
      
      await this.storeUserData(user);
      await this.storeSession(data.session);

      return {
        success: true,
        message: 'Login successful!',
        data: {
          user,
          session: data.session,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed',
        error: error.message,
      };
    }
  }

  async verifyEmail(otpCode: string): Promise<AuthResponse> {
    try {
      console.log('🔑 Verifying email with OTP code...');
      console.log('🔑 OTP Code:', otpCode);

      // Get the pending user email from storage
      const email = await AsyncStorage.getItem('pending_user_email');
      
      if (!email) {
        return {
          success: false,
          message: 'No user email found. Please register again.',
          error: 'No email found',
        };
      }

      const { data, error } = await this.supabase.auth.verifyOtp({
        email: email,
        token: otpCode,
        type: 'signup',
      });

      if (error) {
        console.log('❌ Verification error:', error.message);
        let message = 'Verification failed';
        if (error.message.includes('Token has expired')) {
          message = 'Verification code has expired. Please request a new one.';
        } else if (error.message.includes('Token is invalid')) {
          message = 'Invalid verification code. Please check and try again.';
        } else {
          message = error.message;
        }
        
        return {
          success: false,
          message,
          error: error.message,
        };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          message: 'Verification failed',
          error: 'No user or session data received',
        };
      }

      console.log('✅ Email verified successfully:', data.user.email);

      // Clean up temporary data
      await AsyncStorage.removeItem('pending_user_email');
      await AsyncStorage.removeItem('temp_user_data');

      const user = this.mapSupabaseUserToUser(data.user);
      await this.storeUserData(user);
      await this.storeSession(data.session);

      return {
        success: true,
        message: 'Email verified successfully!',
        data: {
          user,
          session: data.session,
          requiresVerification: false,
        },
      };
    } catch (error: any) {
      console.error('💥 Verification error:', error);
      return {
        success: false,
        message: error.message || 'Verification failed',
        error: error.message,
      };
    }
  }

  async resendVerification(email: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        return {
          success: false,
          message: error.message,
          error: error.message,
        };
      }

      return {
        success: true,
        message: 'Verification email sent successfully!',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to resend verification email',
        error: error.message,
      };
    }
  }

  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return {
          success: false,
          message: error.message,
          error: error.message,
        };
      }

      return {
        success: true,
        message: 'Password reset email sent successfully!',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to send password reset email',
        error: error.message,
      };
    }
  }

  async updatePassword(password: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password,
      });

      if (error) {
        return {
          success: false,
          message: error.message,
          error: error.message,
        };
      }

      return {
        success: true,
        message: 'Password updated successfully!',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update password',
        error: error.message,
      };
    }
  }

  async logout(): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          message: error.message,
          error: error.message,
        };
      }

      await this.clearStoredData();

      return {
        success: true,
        message: 'Logout successful!',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Logout failed',
        error: error.message,
      };
    }
  }

  async refreshSession(): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        return {
          success: false,
          message: error.message,
          error: error.message,
        };
      }

      if (data.session && data.user) {
        const user = this.mapSupabaseUserToUser(data.user);
        await this.storeUserData(user);
        await this.storeSession(data.session);

        return {
          success: true,
          message: 'Session refreshed successfully!',
          data: {
            user,
            session: data.session,
          },
        };
      }

      return {
        success: false,
        message: 'Failed to refresh session',
        error: 'No session data received',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to refresh session',
        error: error.message,
      };
    }
  }

  getCurrentUser(): User | null {
    console.log('⚡ Returning cached user data (optimized)');
    return this.currentUser;
  }

  // Cache management methods for performance
  clearUserCache(): void {
    console.log('🗑️ Clearing user cache');
    this.currentUser = null;
  }

  clearValidationCache(): void {
    console.log('🗑️ Clearing validation cache');
    this.userValidationCache.clear();
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.currentSession;
  }

  isEmailVerified(): boolean {
    return !!this.currentUser?.emailConfirmed;
  }

  private async storeUserData(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  private async storeSession(session: Session): Promise<void> {
    try {
      await AsyncStorage.setItem('session', JSON.stringify(session));
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  private async getStoredUserData(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user data:', error);
      return null;
    }
  }

  private async clearStoredData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['user', 'session']);
    } catch (error) {
      console.error('Error clearing stored data:', error);
    }
  }
}

export const authService = new AuthServiceSupabase();
