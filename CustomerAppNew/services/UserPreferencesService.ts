import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  newsletter: boolean;
  pushNotifications: boolean;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  language: string;
  currency: string;
  theme: 'light' | 'dark' | 'auto';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: {
    orderUpdates: true,
    promotions: false,
    newsletter: false,
    pushNotifications: true,
  },
  language: 'en',
  currency: 'USD',
  theme: 'light',
};

class UserPreferencesService {
  private static readonly STORAGE_KEY = 'user_preferences';

  // Load preferences from local storage first, then sync with server
  async loadPreferences(userId?: string): Promise<UserPreferences> {
    try {
      // Try to load from local storage first for quick access
      const localPrefs = await this.loadFromLocal();
      
      // If user is logged in, try to sync with server
      if (userId) {
        try {
          const serverPrefs = await this.loadFromServer(userId);
          if (serverPrefs) {
            // Save server preferences locally for offline access
            await this.saveToLocal(serverPrefs);
            return serverPrefs;
          }
        } catch (error) {
          console.log('Failed to load server preferences, using local:', error);
        }
      }
      
      return localPrefs || DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Error loading preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  // Save preferences both locally and to server
  async savePreferences(preferences: UserPreferences, userId?: string): Promise<void> {
    try {
      // Save locally first for immediate access
      await this.saveToLocal(preferences);
      
      // If user is logged in, save to server
      if (userId) {
        try {
          await this.saveToServer(preferences, userId);
        } catch (error) {
          console.error('Failed to save preferences to server:', error);
          // Still continue - local save succeeded
        }
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  }

  // Load from AsyncStorage
  private async loadFromLocal(): Promise<UserPreferences | null> {
    try {
      const stored = await AsyncStorage.getItem(UserPreferencesService.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new preference keys
        return {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          notifications: {
            ...DEFAULT_PREFERENCES.notifications,
            ...parsed.notifications,
          },
        };
      }
      return null;
    } catch (error) {
      console.error('Error loading local preferences:', error);
      return null;
    }
  }

  // Save to AsyncStorage
  private async saveToLocal(preferences: UserPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(
        UserPreferencesService.STORAGE_KEY,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Error saving local preferences:', error);
      throw error;
    }
  }

  // Load from Supabase (we'll store as JSONB in users table or create preferences table)
  private async loadFromServer(userId: string): Promise<UserPreferences | null> {
    try {
      // First try to get from users table if it has a preferences column
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('User not found:', userError);
        return null;
      }

      // For now, we'll use AsyncStorage until we add preferences to database
      // TODO: Add preferences column to users table or create user_preferences table
      return null;
    } catch (error) {
      console.error('Error loading server preferences:', error);
      return null;
    }
  }

  // Save to Supabase
  private async saveToServer(preferences: UserPreferences, userId: string): Promise<void> {
    try {
      // For now, we'll use AsyncStorage until we add preferences to database
      // TODO: Add preferences column to users table or create user_preferences table
      console.log('Server save not implemented yet, using local storage');
    } catch (error) {
      console.error('Error saving server preferences:', error);
      throw error;
    }
  }

  // Get specific notification preferences
  async getNotificationPreferences(userId?: string): Promise<NotificationPreferences> {
    const prefs = await this.loadPreferences(userId);
    return prefs.notifications;
  }

  // Update only notification preferences
  async updateNotificationPreferences(
    notifications: Partial<NotificationPreferences>,
    userId?: string
  ): Promise<void> {
    const currentPrefs = await this.loadPreferences(userId);
    const updatedPrefs = {
      ...currentPrefs,
      notifications: {
        ...currentPrefs.notifications,
        ...notifications,
      },
    };
    await this.savePreferences(updatedPrefs, userId);
  }

  // Check if user wants specific type of notification
  async shouldSendNotification(type: keyof NotificationPreferences, userId?: string): Promise<boolean> {
    try {
      const prefs = await this.getNotificationPreferences(userId);
      return prefs[type] === true;
    } catch (error) {
      console.error('Error checking notification preference:', error);
      // Default to allowing notifications on error
      return type === 'orderUpdates' || type === 'pushNotifications';
    }
  }
}

// Export singleton instance
const userPreferencesService = new UserPreferencesService();
export default userPreferencesService;
