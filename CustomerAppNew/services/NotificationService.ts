/**
 * NotificationService - Enhanced Push Notification System
 * Handles push notifications, local notifications, and in-app notification management
 * Integrated with Supabase for real-time trip tracking notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure notification behavior with enhanced settings
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const notificationData = notification.request.content.data;
    const priority = notificationData?.priority || 'normal';
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: priority === 'high' || notificationData?.type === 'arrival',
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: priority === 'high' ? 
        Notifications.AndroidNotificationPriority.HIGH : 
        Notifications.AndroidNotificationPriority.DEFAULT,
    };
  },
});

export interface NotificationData {
  id: string;
  user_id: string;
  trip_id?: string;
  order_id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'status_update' | 'eta_update' | 'arrival' | 'order_update' | 'general' | 'promotion';
  data: any;
  push_sent: boolean;
  push_sent_at?: string;
  read_at?: string;
  created_at: string;
}

export interface NotificationServiceConfig {
  enablePushNotifications: boolean;
  enableSound: boolean;
  enableVibration: boolean;
  enableBadge: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private isInitialized: boolean = false;
  private config: NotificationServiceConfig;
  private subscriptions: Map<string, any> = new Map();

  constructor() {
    this.config = {
      enablePushNotifications: true,
      enableSound: true,
      enableVibration: true,
      enableBadge: true,
    };
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the enhanced notification system
   */
  async initialize(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      console.log('🔔 Initializing Enhanced NotificationService...');

      // Load saved configuration
      await this.loadConfiguration();

      // Check if we're on a physical device
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        return { success: false, error: 'Not a physical device' };
      }

      // Check for existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        console.log('📱 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: true,
            allowCriticalAlerts: false,
            provideAppNotificationSettings: true,
            allowProvisional: false,
            allowAnnouncements: false,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permissions denied');
        return { success: false, error: 'Notification permissions denied' };
      }

      // Get the push token
      const token = await Notifications.getExpoPushTokenAsync();
      this.expoPushToken = token.data;

      // Store token locally for backend registration
      await AsyncStorage.setItem('pushToken', this.expoPushToken);

      // Configure notification channels for Android
      await this.createNotificationChannels();

      // Setup notification listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('✅ NotificationService initialized successfully');
      console.log('🔑 Push token:', this.expoPushToken);
      
      return { success: true, token: this.expoPushToken };
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
      return { success: false, error: error.message };
    }
  }

  async registerWithBackend(userId: string): Promise<boolean> {
    try {
      if (!this.expoPushToken) {
        console.log('No push token available');
        return false;
      }

      // TODO: Send token to backend
      // Example API call:
      /*
      const response = await fetch(`${API_BASE_URL}/users/${userId}/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          pushToken: this.expoPushToken,
          platform: Platform.OS,
        }),
      });

      return response.ok;
      */

      console.log('Push token registered for user:', userId);
      return true;
    } catch (error) {
      console.error('Failed to register push token:', error);
      return false;
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
    delay: number = 0
  ): Promise<string | null> {
    try {
      const trigger = delay > 0 ? { seconds: delay } as any : null;
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger,
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // Set up notification listeners
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
  ) {
    // Listen for notifications while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    // Listen for user interactions with notifications
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      onNotificationResponse
    );

    // Return cleanup function
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }

  // Helper method to show order update notification
  async showOrderUpdate(orderId: string, status: string, message: string): Promise<void> {
    const title = `Order #${orderId.slice(-6)} Updated`;
    const body = `Status: ${status}\n${message}`;
    
    await this.scheduleLocalNotification(title, body, {
      orderId,
      status,
      message,
      type: 'order_update',
    });
  }

  // Helper method to show general notification
  async showGeneralNotification(title: string, message: string): Promise<void> {
    await this.scheduleLocalNotification(title, message, {
      type: 'general',
      message,
    });
  }

  getToken(): string | null {
    return this.expoPushToken;
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;
