/**
 * EnhancedNotificationService - Comprehensive Trip Tracking Notifications
 * Handles push notifications, real-time subscriptions, and trip status updates
 * Designed specifically for the Building Materials Uber App
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabaseClient'; // Use shared Supabase client

// Configure notification behavior for trip tracking
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data || {};
    const isHighPriority = data.type === 'arrival' || data.type === 'status_update';
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: isHighPriority,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

// Type definitions
export interface TripNotification {
  id: string;
  user_id: string;
  trip_id?: string;
  title: string;
  message: string;
  type: 'status_update' | 'eta_update' | 'arrival' | 'driver_message' | 'general';
  data?: Record<string, any>;
  read_at?: string;
  created_at: string;
}

export interface NotificationConfig {
  enablePushNotifications: boolean;
  enableSound: boolean;
  enableVibration: boolean;
  enableBadge: boolean;
}

class EnhancedNotificationService {
  private static instance: EnhancedNotificationService;
  private expoPushToken: string | null = null;
  private isInitialized: boolean = false;
  private config: NotificationConfig;
  private subscriptions: Map<string, any> = new Map();
  private notificationListener: any = null;
  private responseListener: any = null;

  constructor() {
    this.config = {
      enablePushNotifications: true,
      enableSound: true,
      enableVibration: true,
      enableBadge: true,
    };
  }

  static getInstance(): EnhancedNotificationService {
    if (!EnhancedNotificationService.instance) {
      EnhancedNotificationService.instance = new EnhancedNotificationService();
    }
    return EnhancedNotificationService.instance;
  }

  /**
   * Load configuration from storage
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('notification_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('❌ Failed to load notification config:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('❌ Failed to save notification config:', error);
    }
  }

  /**
   * Initialize the notification system
   */
  async initialize(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      console.log('🔔 Initializing Enhanced Notification Service...');

      // Load saved configuration
      await this.loadConfiguration();

      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        return { success: true, error: 'Simulator - local notifications only' };
      }

      // Request permissions
      const permissionResult = await this.requestPermissions();
      if (!permissionResult.granted) {
        console.log('❌ Notification permissions denied');
        return { success: false, error: 'Permissions denied' };
      }

      // Get push token
      const tokenResult = await this.getExpoPushToken();
      if (tokenResult.success && tokenResult.token) {
        this.expoPushToken = tokenResult.token;
        await AsyncStorage.setItem('pushToken', this.expoPushToken);
      } else {
        console.log('📱 Continuing without push token - local notifications only');
      }

      // Setup notification channels (Android)
      await this.setupNotificationChannels();

      // Setup listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('✅ Notification service initialized successfully');
      
      return { 
        success: true, 
        token: this.expoPushToken || undefined 
      };
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<{ granted: boolean }> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: true,
            allowCriticalAlerts: false,
            provideAppNotificationSettings: true,
            allowProvisional: false,
          },
        });
        finalStatus = status;
      }

      return { granted: finalStatus === 'granted' };
    } catch (error) {
      console.error('❌ Failed to request permissions:', error);
      return { granted: false };
    }
  }

  /**
   * Get Expo push token
   */
  private async getExpoPushToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      console.log('🔑 Expo push token obtained:', token.data);
      return { success: true, token: token.data };
    } catch (error) {
      console.warn('⚠️ Failed to get push token (continuing without):', error);
      
      // Continue without push token in development mode
      console.log('📱 Running in development mode without push notifications');
      return { success: true, token: undefined };
    }
  }

  /**
   * Setup notification channels for Android
   */
  private async setupNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      // High priority channel for arrivals and critical updates
      await Notifications.setNotificationChannelAsync('trip_critical', {
        name: 'Trip Critical Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        description: 'Driver arrivals and critical trip updates',
      });

      // Normal priority for status updates
      await Notifications.setNotificationChannelAsync('trip_updates', {
        name: 'Trip Status Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150, 150, 150],
        lightColor: '#007AFF',
        description: 'General trip status and progress updates',
      });

      // Low priority for ETA updates
      await Notifications.setNotificationChannelAsync('trip_eta', {
        name: 'ETA Updates',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0, 100],
        lightColor: '#007AFF',
        description: 'Estimated arrival time updates',
      });

      console.log('📱 Android notification channels created');
    }
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    // Listen for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📨 Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );
  }

  /**
   * Handle notification received while app is active
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const data = notification.request.content.data;
    console.log('📩 Processing notification:', data);
    
    // Update badge count
    this.updateBadgeCount();
    
    // Emit custom event for app components
    // You can add event emitter here if needed
  }

  /**
   * Handle user interaction with notification
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;
    console.log('🎯 User tapped notification:', data);
    
    // Handle navigation based on notification type
    if (data?.trip_id) {
      // Navigate to trip tracking screen
      console.log('🚛 Navigating to trip:', data.trip_id);
    }
  }

  /**
   * Subscribe to real-time trip notifications
   */
  subscribeToTripNotifications(
    tripId: string, 
    onNotification?: (notification: TripNotification) => void
  ): void {
    const subscriptionKey = `trip_${tripId}`;
    
    // Unsubscribe existing
    this.unsubscribe(subscriptionKey);

    console.log(`🔄 Subscribing to notifications for trip: ${tripId}`);

    const subscription = supabase
      .channel(`notifications:trip_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log('📨 Real-time notification:', payload.new);
          const notification = payload.new as TripNotification;
          
          // Show local notification
          this.showLocalNotification(notification);
          
          // Call callback
          if (onNotification) {
            onNotification(notification);
          }
        }
      )
      .subscribe();

    this.subscriptions.set(subscriptionKey, subscription);
  }

  /**
   * Subscribe to user notifications
   */
  subscribeToUserNotifications(
    userId: string, 
    onNotification?: (notification: TripNotification) => void
  ): void {
    const subscriptionKey = `user_${userId}`;
    
    // Unsubscribe existing
    this.unsubscribe(subscriptionKey);

    console.log(`🔄 Subscribing to notifications for user: ${userId}`);

    const subscription = supabase
      .channel(`notifications:user_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('📨 User notification:', payload.new);
          const notification = payload.new as TripNotification;
          
          // Show local notification
          this.showLocalNotification(notification);
          
          // Call callback
          if (onNotification) {
            onNotification(notification);
          }
        }
      )
      .subscribe();

    this.subscriptions.set(subscriptionKey, subscription);
  }

  /**
   * Show local notification
   */
  private async showLocalNotification(notification: TripNotification): Promise<void> {
    if (!this.config.enablePushNotifications) return;

    try {
      const channelId = this.getChannelId(notification.type);
      
      const notificationRequest: Notifications.NotificationRequestInput = {
        content: {
          title: notification.title,
          body: notification.message,
          data: {
            id: notification.id,
            trip_id: notification.trip_id,
            type: notification.type,
            ...notification.data,
          },
          sound: this.config.enableSound,
          badge: 1,
        },
        trigger: null, // Show immediately
      };

      // Add channelId for Android
      if (Platform.OS === 'android' && channelId) {
        (notificationRequest as any).channelId = channelId;
      }

      await Notifications.scheduleNotificationAsync(notificationRequest);

      console.log('📱 Local notification shown');
    } catch (error) {
      console.error('❌ Failed to show local notification:', error);
    }
  }

  /**
   * Get appropriate channel ID for notification type
   */
  private getChannelId(type: string): string | undefined {
    if (Platform.OS !== 'android') return undefined;

    switch (type) {
      case 'arrival':
      case 'status_update':
        return 'trip_critical';
      case 'eta_update':
        return 'trip_eta';
      default:
        return 'trip_updates';
    }
  }

  /**
   * Send trip status notification
   */
  async sendTripStatusNotification(
    userId: string,
    tripId: string,
    status: string,
    driverName?: string,
    etaMinutes?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { title, message } = this.getTripStatusMessage(status, driverName, etaMinutes);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          trip_id: tripId,
          title,
          message,
          type: 'status_update',
          data: { status, driver_name: driverName, eta_minutes: etaMinutes },
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Trip status notification sent:', data.id);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send trip status notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send ETA update notification
   */
  async sendETAUpdateNotification(
    userId: string,
    tripId: string,
    newETA: number,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const title = reason ? 'Delivery Delayed' : 'ETA Updated';
      const message = reason 
        ? `Your delivery is running ${newETA} minutes late due to ${reason}`
        : `New estimated arrival time: ${newETA} minutes`;

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          trip_id: tripId,
          title,
          message,
          type: 'eta_update',
          data: { new_eta: newETA, delay_reason: reason },
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ ETA update notification sent:', data.id);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send ETA update notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send driver arrival notification
   */
  async sendDriverArrivalNotification(
    userId: string,
    tripId: string,
    location: 'pickup' | 'delivery',
    driverName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const title = `Driver Arrived!`;
      const message = driverName 
        ? `${driverName} has arrived at the ${location} location`
        : `Your driver has arrived at the ${location} location`;

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          trip_id: tripId,
          title,
          message,
          type: 'arrival',
          data: { location, driver_name: driverName },
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Driver arrival notification sent:', data.id);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send driver arrival notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get trip status message templates
   */
  private getTripStatusMessage(status: string, driverName?: string, etaMinutes?: number): { title: string; message: string } {
    const driver = driverName || 'Your driver';
    const eta = etaMinutes ? ` ETA: ${etaMinutes} minutes` : '';

    switch (status) {
      case 'matched':
        return {
          title: 'Driver Found!',
          message: `${driver} is on the way to pickup location.${eta}`,
        };
      case 'en_route_pickup':
        return {
          title: 'Driver En Route',
          message: `${driver} is heading to pickup location.${eta}`,
        };
      case 'at_pickup':
        return {
          title: 'Driver Arrived',
          message: `${driver} has arrived at the pickup location.`,
        };
      case 'loaded':
        return {
          title: 'Materials Loaded',
          message: `${driver} is loading your materials.`,
        };
      case 'en_route_delivery':
        return {
          title: 'On The Way!',
          message: `Materials loaded! ${driver} is heading to delivery location.${eta}`,
        };
      case 'delivered':
        return {
          title: 'Delivery Complete',
          message: 'Your materials have been delivered successfully!',
        };
      default:
        return {
          title: 'Trip Update',
          message: `Trip status: ${status}`,
        };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      // Update badge count
      this.updateBadgeCount();

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update badge count
   */
  private async updateBadgeCount(): Promise<void> {
    try {
      if (this.config.enableBadge) {
        // For now, we'll set badge to 0
        // In production, get actual unread count for current user
        await Notifications.setBadgeCountAsync(0);
      }
    } catch (error) {
      console.error('❌ Failed to update badge count:', error);
    }
  }

  /**
   * Configuration management
   */
  async updateConfiguration(config: Partial<NotificationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.saveConfiguration();
  }

  /**
   * Cleanup subscriptions
   */
  unsubscribe(key?: string): void {
    if (key) {
      const subscription = this.subscriptions.get(key);
      if (subscription) {
        subscription.unsubscribe();
        this.subscriptions.delete(key);
        console.log(`📴 Unsubscribed from ${key}`);
      }
    } else {
      // Unsubscribe all
      this.subscriptions.forEach((subscription, key) => {
        subscription.unsubscribe();
        console.log(`📴 Unsubscribed from ${key}`);
      });
      this.subscriptions.clear();
    }
  }

  /**
   * Cleanup listeners and subscriptions
   */
  cleanup(): void {
    // Remove notification listeners
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }

    // Unsubscribe from real-time subscriptions
    this.unsubscribe();

    console.log('🧹 NotificationService cleanup completed');
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string, 
    message: string, 
    data: Record<string, any> = {},
    delaySeconds: number = 0
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data,
          sound: this.config.enableSound ? 'default' : undefined,
          vibrate: this.config.enableVibration ? [0, 250, 250, 250] : undefined,
        },
        trigger: delaySeconds > 0 ? { seconds: delaySeconds } as any : null,
      });
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
    }
  }

  /**
   * Show order update notification
   */
  async showOrderUpdate(orderId: string, status: string, message: string): Promise<void> {
    const title = `Order Update`;
    const body = `Order ${orderId}: ${message}`;
    
    await this.scheduleLocalNotification(title, body, {
      type: 'order_update',
      orderId,
      status,
    });
  }

  /**
   * Show general notification
   */
  async showGeneralNotification(title: string, message: string): Promise<void> {
    await this.scheduleLocalNotification(title, message, {
      type: 'general',
    });
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('📴 All notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  /**
   * Get push token for backend registration
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const enhancedNotificationService = EnhancedNotificationService.getInstance();
export default enhancedNotificationService;
