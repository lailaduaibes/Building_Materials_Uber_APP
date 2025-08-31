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
  emailConfirmed?: boolean;
  createdAt?: string;
  lastSignIn?: string;
}

// Auth response interface
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

class AuthService {
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
          console.log('🔍 Validating user type for event:', event);
          const isValidUser = await this.validateUserAccountType(session.user.id);
          
          if (!isValidUser) {
            console.log('🚫 Invalid user type detected, signing out');
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

  private async initializeUser(): Promise<void> {
    try {
      // Get current session from Supabase
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (!error && session?.user) {
        // Validate user account type before initializing
        const isValidUser = await this.validateUserAccountType(session.user.id);
        
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
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      firstName: supabaseUser.user_metadata?.first_name,
      lastName: supabaseUser.user_metadata?.last_name,
      phone: supabaseUser.user_metadata?.phone,
      role: supabaseUser.user_metadata?.role || 'customer',
      emailConfirmed: !!supabaseUser.email_confirmed_at,
      createdAt: supabaseUser.created_at,
      lastSignIn: supabaseUser.last_sign_in_at,
    };
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

  async refreshUserCache(): Promise<User | null> {
    console.log('🔄 Force refreshing user cache');
    return await this.getCurrentUser(true);
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone?: string,
    role: string = 'customer'
  ): Promise<AuthResponse> {
    try {
      console.log('🚀 Starting Supabase registration...');
      console.log('📧 Email:', email);
      console.log('👤 Role:', role);

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
          // Configure to send OTP instead of confirmation link
          emailRedirectTo: undefined, // This disables email links
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

      // Ensure user exists in custom users table (handles duplicates gracefully)
      await this.ensureUserInCustomTable(data.user);

      // Always require email verification for new registrations
      return {
        success: true,
        message: 'Registration successful! Please check your email for a 6-digit verification code.',
        data: {
          user: this.mapSupabaseUserToUser(data.user),
          requiresVerification: true,
        },
      };

      return {
        success: true,
        message: 'Registration successful!',
        data: {
          user: this.mapSupabaseUserToUser(data.user!),
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
      console.log('🚀 Starting Supabase login...');
      console.log('📧 Email:', email);

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('❌ Login error:', error.message);
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

      console.log('✅ Login successful:', data.user.email);

      // Ensure user exists in custom users table
      await this.ensureUserInCustomTable(data.user);

      // Get user from custom users table to check user type
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('user_type, role, id, email')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.error('❌ Error fetching user data:', userError);
        return {
          success: false,
          message: 'Error validating user account',
          error: userError.message,
        };
      }

      // Validate user role - ONLY block drivers from customer app
      if (userData && userData.user_type === 'driver') {
        console.log('🚫 Driver account attempting to login to customer app');
        
        // Sign out the user immediately
        await this.supabase.auth.signOut();
        
        return {
          success: false,
          message: 'Driver accounts cannot access the customer app. Please use the driver app instead.',
          error: 'Invalid account type for customer app',
        };
      }

      console.log('✅ Account type validation passed:', {
        user_type: userData?.user_type || 'null/undefined',
        role: userData?.role || 'null/undefined',
        allowing_access: true
      });

      return {
        success: true,
        message: 'Login successful!',
        data: {
          user: this.mapSupabaseUserToUser(data.user),
          session: data.session,
          requiresVerification: false,
        },
      };
    } catch (error: any) {
      console.error('💥 Login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed',
        error: error.message,
      };
    }
  }

  async verifyEmail(email: string, otp: string): Promise<AuthResponse> {
    try {
      console.log('🚀 Starting email verification with OTP...');
      console.log('� Email:', email);
      console.log('�🔑 OTP Code:', otp);

      const { data, error } = await this.supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'signup',
      });

      if (error) {
        console.log('❌ Verification error:', error.message);
        return {
          success: false,
          message: error.message,
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

      // Ensure user exists in custom table after verification
      await this.ensureUserInCustomTable(data.user);

      return {
        success: true,
        message: 'Email verified successfully!',
        data: {
          user: this.mapSupabaseUserToUser(data.user),
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

  async logout(): Promise<void> {
    try {
      console.log('🚀 Starting logout...');
      await this.supabase.auth.signOut();
      await this.clearStoredData();
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('💥 Logout error:', error);
    }
  }

  async getCurrentUser(forceRefresh: boolean = false): Promise<User | null> {
    try {
      // 1. Return cached user if available and not forcing refresh
      if (!forceRefresh && this.currentUser) {
        console.log('⚡ Using cached user data (fast path)');
        return this.currentUser;
      }

      // 2. Check if we have a valid session
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) {
        console.log('❌ No active session found');
        this.currentUser = null;
        return null;
      }

      // 3. If we have cached user and same session user, only refresh if forced or profile might be stale
      if (this.currentUser && this.currentUser.id === session.user.id && !forceRefresh) {
        console.log('⚡ Using cached user for same session (performance optimized)');
        return this.currentUser;
      }

      // 4. Fetch fresh data from database (only when necessary)
      console.log('🔍 Fetching fresh user data for ID:', session.user.id);
      const { data: userData, error } = await this.supabase
        .from('users')
        .select('first_name, last_name, phone, role, created_at, updated_at, is_active, user_type')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('❌ Database query error in getCurrentUser:', error);
        // Fallback to Auth metadata if database query fails
        console.log('🔄 Using Auth metadata as fallback');
        this.currentUser = this.mapSupabaseUserToUser(session.user);
      } else if (userData) {
        console.log('✅ Successfully fetched fresh user data from database');
        // Merge Auth data with database data (database takes priority for profile fields)
        this.currentUser = {
          id: session.user.id,
          email: session.user.email || '',
          firstName: userData.first_name || session.user.user_metadata?.first_name || '',
          lastName: userData.last_name || session.user.user_metadata?.last_name || '',
          phone: userData.phone || session.user.user_metadata?.phone || '',
          role: userData.role || session.user.user_metadata?.role || 'customer',
          emailConfirmed: !!session.user.email_confirmed_at,
          createdAt: session.user.created_at,
          lastSignIn: session.user.last_sign_in_at,
        };
      } else {
        // No user data found, fallback to Auth metadata
        console.warn('⚠️ No user data found in database, using Auth metadata');
        this.currentUser = this.mapSupabaseUserToUser(session.user);
      }
      
      // Store the updated user data
      await this.storeUserData(this.currentUser);
      return this.currentUser;
      
    } catch (error) {
      console.error('❌ Error getting current user:', error);
      // Return cached user as fallback if available
      if (this.currentUser) {
        console.log('🔄 Returning cached user due to error');
        return this.currentUser;
      }
    }

    return null;
  }

  async resendVerification(email: string): Promise<AuthResponse> {
    try {
      console.log('🚀 Resending verification OTP...');
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: undefined, // Ensure we send OTP, not link
        }
      });

      if (error) {
        console.log('❌ Resend error:', error.message);
        return {
          success: false,
          message: error.message,
          error: error.message,
        };
      }

      console.log('✅ Verification OTP resent');
      return {
        success: true,
        message: 'New verification code sent! Please check your email.',
      };
    } catch (error: any) {
      console.error('💥 Resend error:', error);
      return {
        success: false,
        message: error.message || 'Failed to resend verification code',
        error: error.message,
      };
    }
  }

  // Password reset functionality
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      console.log('🔄 Requesting password reset for:', email);
      
      // Production-ready configuration for deployed app
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://youmats.app/auth/reset-password',
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        return {
          success: false,
          message: error.message || 'Failed to send password reset email',
          error: error.message,
        };
      }

      console.log('✅ Password reset email sent successfully');
      return {
        success: true,
        message: 'Password reset email sent! Please check your email and follow the instructions.',
      };
    } catch (error: any) {
      console.error('💥 Password reset error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send password reset email',
        error: error.message,
      };
    }
  }

  // Update password for authenticated user
  async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      console.log('🔄 Updating password for current user...');
      
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('❌ Password update error:', error);
        return {
          success: false,
          message: error.message || 'Failed to update password',
          error: error.message,
        };
      }

      console.log('✅ Password updated successfully');
      return {
        success: true,
        message: 'Password updated successfully!',
      };
    } catch (error: any) {
      console.error('💥 Password update error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update password',
        error: error.message,
      };
    }
  }

  // Update user profile information
  async updateProfile(profileData: { firstName: string; lastName: string; phone?: string }): Promise<AuthResponse> {
    try {
      if (!this.currentSession?.user) {
        return {
          success: false,
          message: 'User not authenticated',
          error: 'No active session',
        };
      }

      // 1. Update user profile in the users table
      const { error: dbError } = await this.supabase
        .from('users')
        .update({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          phone: profileData.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.currentSession.user.id);

      if (dbError) {
        console.error('❌ Profile update error:', dbError);
        return {
          success: false,
          message: dbError.message || 'Failed to update profile',
          error: dbError.message,
        };
      }

      // 2. Update Supabase Auth user metadata to keep Auth and DB in sync
      const { error: authError } = await this.supabase.auth.updateUser({
        data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          full_name: `${profileData.firstName} ${profileData.lastName}`,
          phone: profileData.phone || null,
          updated_at: new Date().toISOString(),
        }
      });

      if (authError) {
        console.warn('⚠️ Auth metadata update warning:', authError.message);
        // Don't fail the whole operation, just log the warning
        // The database update succeeded, which is the main thing
      } else {
        console.log('✅ Auth metadata updated successfully');
      }

      // 3. Update local user data
      if (this.currentUser) {
        this.currentUser = {
          ...this.currentUser,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone || '',
        };
        await this.storeUserData(this.currentUser);
      }

      // 4. Refresh current session to get updated metadata
      try {
        const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
        if (!sessionError && session) {
          this.currentSession = session;
          console.log('✅ Session refreshed with updated metadata');
        }
      } catch (sessionError) {
        console.warn('⚠️ Could not refresh session:', sessionError);
        // Don't fail the operation for this
      }

      // 5. Force refresh of current user data to ensure UI updates
      try {
        await this.getCurrentUser(true); // Force refresh from database
        console.log('✅ Current user data refreshed after profile update');
      } catch (refreshError) {
        console.warn('⚠️ Could not refresh current user data:', refreshError);
        // Don't fail the operation for this
      }

      console.log('✅ Profile updated successfully');
      return {
        success: true,
        message: 'Profile updated successfully!',
      };
    } catch (error: any) {
      console.error('💥 Profile update error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update profile',
        error: error.message,
      };
    }
  }

  // Storage helpers
  private async storeUserData(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem('customer_user_data', JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  private async getStoredUserData(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('customer_user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user data:', error);
      return null;
    }
  }

  private async storeSession(session: Session): Promise<void> {
    try {
      await AsyncStorage.setItem('customer_session', JSON.stringify(session));
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  private async clearStoredData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['customer_user_data', 'customer_session']);
    } catch (error) {
      console.error('Error clearing stored data:', error);
    }
  }

  // Validate user account type - only customers allowed in customer app
  // Cache for user validation to avoid repeated DB calls
  private userValidationCache = new Map<string, boolean>();

  private async validateUserAccountType(userId: string): Promise<boolean> {
    // Check cache first
    if (this.userValidationCache.has(userId)) {
      console.log('⚡ Using cached user validation result');
      return this.userValidationCache.get(userId)!;
    }

    try {
      console.log('🔍 Validating user type for user:', userId);
      
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

      console.log('👤 User validation result:', { 
        user_type: userData.user_type,
        role: userData.role
      });

      // ONLY block if explicitly marked as 'driver' in user_type
      const isValid = userData.user_type !== 'driver';
      
      // Cache the result
      this.userValidationCache.set(userId, isValid);
      
      if (!isValid) {
        console.log('🚫 Blocking driver account');
        return false;
      }

      // Allow everything else (customer, null, undefined, etc.)
      console.log('✅ Allowing access - user type:', userData.user_type || 'null/undefined');
      return true;
      
    } catch (error) {
      console.error('💥 Error validating user type:', error);
      // Cache and allow access (fail open)
      this.userValidationCache.set(userId, true);
      console.log('✅ Allowing access due to validation error (fail open)');
      return true;
    }
  }

  // Ensure user exists in custom users table (for existing users or missed registrations)
  private async ensureUserInCustomTable(supabaseUser: SupabaseUser): Promise<void> {
    try {
      console.log('🔍 Checking if user exists in custom users table...');
      
      // Check if user already exists by ID or email
      const { data: existingUser, error: checkError } = await this.supabase
        .from('users')
        .select('id, email')
        .or(`id.eq.${supabaseUser.id},email.eq.${supabaseUser.email}`)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking user existence:', checkError);
        return;
      }

      if (existingUser) {
        console.log('✅ User found in custom users table');
        
        // If user exists with same email but different ID, this is likely an orphaned record
        if (existingUser.id !== supabaseUser.id && existingUser.email === supabaseUser.email) {
          console.log('🧹 Orphaned user detected - cleaning up old record and creating new one');
          
          // Delete the orphaned user record
          const { error: deleteError } = await this.supabase
            .from('users')
            .delete()
            .eq('id', existingUser.id);
          
          if (deleteError) {
            console.error('⚠️ Failed to delete orphaned user:', deleteError.message);
            return;
          }
          
          console.log('✅ Orphaned user record deleted');
          // Continue to create new user record
        } else {
          // User exists with correct ID
          return;
        }
      }

      console.log('🔧 Creating missing user in custom users table...');
      
      // Create user in custom users table
      const customUserData = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        password_hash: 'supabase_auth',
        first_name: supabaseUser.user_metadata?.first_name || 'User',
        last_name: supabaseUser.user_metadata?.last_name || '',
        phone: supabaseUser.user_metadata?.phone || '',
        role: supabaseUser.user_metadata?.role || 'customer',
        user_type: supabaseUser.user_metadata?.role === 'driver' ? 'driver' : 'customer',
        is_active: true
      };

      const { data: createdUser, error: createError } = await this.supabase
        .from('users')
        .insert([customUserData])
        .select()
        .single();

      if (createError) {
        // Check if it's a duplicate key error
        if (createError.message.includes('duplicate key value')) {
          console.log('⚠️ User already exists in custom table (race condition)');
        } else {
          console.error('⚠️ Warning: Failed to create user in custom users table:', createError.message);
        }
      } else {
        console.log('✅ User created in custom users table:', createdUser.id);
      }

    } catch (error) {
      console.error('Error ensuring user in custom table:', error);
    }
  }
}

export const authService = new AuthService();
