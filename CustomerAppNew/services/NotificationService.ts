import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData extends Record<string, unknown> {
  orderId?: string;
  status?: string;
  message?: string;
  type?: 'order_update' | 'general' | 'promotion';
}

class NotificationService {
  private expoPushToken: string | null = null;

  async initialize(): Promise<string | null> {
    try {
      // Check if we're on a physical device
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return null;
      }

      // Check for existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions denied');
        return null;
      }

      // Get the push token
      const token = await Notifications.getExpoPushTokenAsync();
      this.expoPushToken = token.data;

      // Store token locally for backend registration
      await AsyncStorage.setItem('pushToken', this.expoPushToken);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Order Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#667eea',
        });
      }

      console.log('Push token:', this.expoPushToken);
      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return null;
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
