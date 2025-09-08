/**
 * 🔔 Push Notification Service for Driver App
 * Handles real-time push notifications for ASAP trip assignments, trip updates, and other alerts
 * Works even when app is closed or in background
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Configure how notifications should be displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Configure Android notification channels for proper branding
if (Platform.OS === 'android') {
  // Set default YouMats channel first
  Notifications.setNotificationChannelAsync('youmats-default', {
    name: 'YouMats Driver',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#2C5CC5',
    sound: 'default',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
    description: 'YouMats driver notifications',
  });

  Notifications.setNotificationChannelAsync('asap-trips', {
    name: 'YouMats ASAP Trips 🚛',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2C5CC5',
    sound: 'default',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
    description: 'Urgent ASAP trip assignments from YouMats',
  });

  Notifications.setNotificationChannelAsync('trip-updates', {
    name: 'YouMats Trip Updates 📍',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#2C5CC5',
    sound: 'default',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
    description: 'Trip status updates from YouMats',
  });

  Notifications.setNotificationChannelAsync('messages', {
    name: 'YouMats Customer Messages 💬',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#2C5CC5',
    sound: 'default',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
    description: 'Messages from YouMats customers',
  });
}

export interface TripNotification {
  tripId: string;
  type: 'asap_assignment' | 'trip_update' | 'trip_cancelled' | 'customer_message';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  sound?: 'default' | 'urgent' | 'ding';
}

class DriverPushNotificationService {
  private static instance: DriverPushNotificationService;
  private expoPushToken: string | null = null;
  private driverId: string | null = null;

  public static getInstance(): DriverPushNotificationService {
    if (!DriverPushNotificationService.instance) {
      DriverPushNotificationService.instance = new DriverPushNotificationService();
    }
    return DriverPushNotificationService.instance;
  }

  /**
   * Initialize push notifications and register device token
   */
  async initialize(driverId: string): Promise<boolean> {
    try {
      this.driverId = driverId;

      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return false;
      }

      // Request permission for notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permission denied');
        return false;
      }

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '896ff6ff-db11-4a83-b91e-7cf49ae84bf8', // Your Expo project ID
      });

      this.expoPushToken = token.data;
      console.log('✅ Push token obtained:', this.expoPushToken);

      // Save token to database for backend to use
      await this.savePushTokenToDatabase(driverId, this.expoPushToken);

      // Set up notification listeners
      this.setupNotificationListeners();

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Save push token to database so backend can send notifications
   */
  private async savePushTokenToDatabase(driverId: string, pushToken: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('driver_profiles')
        .upsert({
          user_id: driverId,
          push_token: pushToken,
          push_token_updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Failed to save push token:', error);
      } else {
        console.log('✅ Push token saved to database');
      }
    } catch (error) {
      console.error('❌ Error saving push token:', error);
    }
  }

  /**
   * Set up listeners for notification events
   */
  private setupNotificationListeners(): void {
    // Handle notifications received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('📱 Notification received:', notification);
      // You can customize foreground behavior here
    });

    // Handle notifications tapped by user (app opened from notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      // Handle different notification types
      if (data?.type === 'asap_assignment' && data?.tripId) {
        // Navigate to trip assignment screen
        this.handleASAPTripNotification(String(data.tripId));
      } else if (data?.type === 'customer_message' && data?.tripId) {
        // Navigate to chat screen for this trip
        this.handleCustomerMessageNotification(String(data.tripId));
      } else if (data?.type === 'trip_update' && data?.tripId) {
        // Navigate to active trip screen
        this.handleTripUpdateNotification(String(data.tripId));
      }
    });
  }

  /**
   * Handle customer message notification tap
   */
  private handleCustomerMessageNotification(tripId: string): void {
    console.log('💬 Opening chat for trip:', tripId);
    // Store the trip ID for the chat screen to pick up
    AsyncStorage.setItem('pending_chat_trip', tripId);
  }

  /**
   * Handle ASAP trip assignment notification tap
   */
  private handleASAPTripNotification(tripId: string): void {
    // This would typically navigate to the order assignment screen
    // You'll need to integrate this with your navigation system
    console.log('🚛 Opening ASAP trip assignment for:', tripId);
    
    // Store the trip ID for the order assignment screen to pick up
    AsyncStorage.setItem('pending_asap_trip', tripId);
  }

  /**
   * Handle trip update notification tap
   */
  private handleTripUpdateNotification(tripId: string): void {
    console.log('📍 Opening trip update for:', tripId);
    // Navigate to active trip screen
  }

  /**
   * Send local notification (for testing or immediate feedback)
   */
  async sendLocalNotification(notification: TripNotification): Promise<void> {
    try {
      // Determine the appropriate Android channel based on notification type
      let androidChannelId = 'trip-updates';
      if (notification.type === 'asap_assignment') {
        androidChannelId = 'asap-trips';
      } else if (notification.type === 'customer_message') {
        androidChannelId = 'messages';
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: {
            tripId: notification.tripId,
            type: notification.type,
            ...notification.data,
          },
          sound: notification.sound === 'urgent' ? 'urgent.wav' : 'default',
          priority: notification.priority === 'critical' ? 
            Notifications.AndroidNotificationPriority.MAX : 
            Notifications.AndroidNotificationPriority.HIGH,
          // Android specific configuration for YouMats branding
          ...Platform.select({
            android: {
              channelId: androidChannelId,
              color: '#2C5CC5', // YouMats brand color
              sticky: notification.type === 'asap_assignment', // Keep ASAP notifications visible
              autoDismiss: notification.type !== 'asap_assignment',
              // Use the notification icon from app.json configuration
              // In development, this may still show Expo logo due to Metro bundler limitations
              // In production build, this will show YouMats logo correctly
            },
            ios: {
              sound: notification.sound === 'urgent' ? 'urgent.wav' : 'default',
              badge: 1,
            },
          }),
        },
        trigger: null, // Send immediately
      });

      console.log('✅ Local notification sent with YouMats branding');
    } catch (error) {
      console.error('❌ Failed to send local notification:', error);
    }
  }

  /**
   * Show ASAP trip assignment notification
   */
  async showASAPTripNotification(tripId: string, pickupLocation: string, estimatedEarnings: number): Promise<void> {
    const notification: TripNotification = {
      tripId,
      type: 'asap_assignment',
      title: '🚨 YouMats URGENT: New ASAP Trip!',
      message: `Pickup from ${pickupLocation} • Est. ${estimatedEarnings}₪ • Tap to accept`,
      priority: 'critical',
      sound: 'urgent',
      data: {
        pickup_location: pickupLocation,
        estimated_earnings: estimatedEarnings,
        timestamp: new Date().toISOString(),
      }
    };

    await this.sendLocalNotification(notification);
  }

  /**
   * Show trip status update notification
   */
  async showTripUpdateNotification(tripId: string, status: string, message: string): Promise<void> {
    const notification: TripNotification = {
      tripId,
      type: 'trip_update',
      title: `YouMats - Trip ${status}`,
      message,
      priority: 'normal',
      sound: 'default',
    };

    await this.sendLocalNotification(notification);
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if notifications are enabled
   */
  async isNotificationEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Subscribe to trip assignment notifications from Supabase
   * Uses the existing notifications table
   */
  subscribeToTripNotifications(): void {
    if (!this.driverId) {
      console.warn('⚠️ Cannot subscribe to notifications: No driver ID');
      return;
    }

    // Subscribe to real-time notifications from the existing notifications table
    supabase
      .channel('driver_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${this.driverId}`,
        },
        (payload) => {
          console.log('📡 Real-time notification received:', payload);
          this.handleRealtimeNotification(payload.new);
        }
      )
      .subscribe();
  }

  /**
   * Handle real-time notification from Supabase notifications table
   */
  private async handleRealtimeNotification(notification: any): Promise<void> {
    if (notification.type === 'asap_assignment') {
      await this.showASAPTripNotification(
        notification.trip_id,
        notification.data?.pickup_location || 'Unknown location',
        notification.data?.estimated_earnings || 0
      );
      
      // Mark push as sent in database
      await this.markPushAsSent(notification.id);
      
    } else if (notification.type === 'customer_message') {
      await this.showCustomerMessageNotification(
        notification.trip_id,
        notification.message,
        notification.data?.message_type || 'text'
      );
      
      // Mark push as sent in database
      await this.markPushAsSent(notification.id);
      
    } else if (notification.type === 'trip_update') {
      await this.showTripUpdateNotification(
        notification.trip_id,
        notification.title,
        notification.message
      );
      
      // Mark push as sent in database
      await this.markPushAsSent(notification.id);
    }
  }

  /**
   * Show customer message notification
   */
  async showCustomerMessageNotification(tripId: string, messageText: string, messageType: string = 'text'): Promise<void> {
    const notification: TripNotification = {
      tripId,
      type: 'customer_message',
      title: '💬 New Message from Customer',
      message: messageText,
      priority: 'normal',
      sound: 'default',
      data: {
        message_type: messageType,
        timestamp: new Date().toISOString(),
      }
    };

    await this.sendLocalNotification(notification);
  }

  /**
   * Mark notification as push sent in database
   */
  private async markPushAsSent(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          push_sent: true,
          push_sent_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Failed to mark push as sent:', error);
      } else {
        console.log('✅ Push notification marked as sent');
      }
    } catch (error) {
      console.error('❌ Error marking push as sent:', error);
    }
  }
}

export const driverPushNotificationService = DriverPushNotificationService.getInstance();
