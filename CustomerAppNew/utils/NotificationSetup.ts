/**
 * NotificationSetup - Initialize notification service in the app
 * Call this during app startup to set up push notifications
 */

import { enhancedNotificationService } from '../services/EnhancedNotificationService';

export interface NotificationSetupResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Initialize notification service during app startup
 */
export async function initializeNotificationService(): Promise<NotificationSetupResult> {
  try {
    console.log('🔔 Setting up notification service...');
    
    const result = await enhancedNotificationService.initialize();
    
    if (result.success) {
      console.log('✅ Notification service initialized successfully');
      
      if (result.token) {
        console.log('🔑 Push token obtained:', result.token.slice(0, 20) + '...');
        
        // Here you can send the token to your backend
        // await registerPushTokenWithBackend(result.token);
      }
      
      return {
        success: true,
        token: result.token,
      };
    } else {
      console.warn('⚠️ Notification service initialization failed:', result.error);
      return {
        success: false,
        error: result.error,
      };
    }
  } catch (error) {
    console.error('❌ Error setting up notifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Setup notifications for a specific user
 */
export function setupUserNotifications(userId: string): void {
  try {
    console.log('👤 Setting up user notifications for:', userId);
    
    // Subscribe to user-specific notifications
    enhancedNotificationService.subscribeToUserNotifications(
      userId,
      (notification) => {
        console.log('📨 User notification received:', notification);
        
        // Handle notification based on type
        handleUserNotification(notification);
      }
    );
    
    console.log('✅ User notifications set up successfully');
  } catch (error) {
    console.error('❌ Error setting up user notifications:', error);
  }
}

/**
 * Setup notifications for a specific trip
 */
export function setupTripNotifications(tripId: string): void {
  try {
    console.log('🚛 Setting up trip notifications for:', tripId);
    
    // Subscribe to trip-specific notifications
    enhancedNotificationService.subscribeToTripNotifications(
      tripId,
      (notification) => {
        console.log('📨 Trip notification received:', notification);
        
        // Handle notification based on type
        handleTripNotification(notification);
      }
    );
    
    console.log('✅ Trip notifications set up successfully');
  } catch (error) {
    console.error('❌ Error setting up trip notifications:', error);
  }
}

/**
 * Handle user-level notifications
 */
function handleUserNotification(notification: any): void {
  switch (notification.type) {
    case 'status_update':
      console.log('📊 Status update notification:', notification.message);
      break;
    case 'general':
      console.log('📝 General notification:', notification.message);
      break;
    default:
      console.log('📬 User notification:', notification.message);
  }
}

/**
 * Handle trip-specific notifications
 */
function handleTripNotification(notification: any): void {
  switch (notification.type) {
    case 'status_update':
      console.log('🚛 Trip status update:', notification.message);
      // You can emit events here to update UI components
      break;
    case 'eta_update':
      console.log('⏰ ETA update:', notification.message);
      break;
    case 'arrival':
      console.log('📍 Driver arrival:', notification.message);
      break;
    case 'driver_message':
      console.log('💬 Driver message:', notification.message);
      break;
    default:
      console.log('📨 Trip notification:', notification.message);
  }
}

/**
 * Cleanup notifications when user logs out or app closes
 */
export function cleanupNotifications(): void {
  try {
    console.log('🧹 Cleaning up notifications...');
    
    // Unsubscribe from all notifications
    enhancedNotificationService.unsubscribe();
    
    // Clear all local notifications
    enhancedNotificationService.cleanup();
    
    console.log('✅ Notifications cleaned up successfully');
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
  }
}

/**
 * Send a test notification (development only)
 */
export async function sendTestNotification(
  userId: string,
  tripId?: string
): Promise<void> {
  try {
    console.log('🧪 Sending test notification...');
    
    if (tripId) {
      await enhancedNotificationService.sendTripStatusNotification(
        userId,
        tripId,
        'matched',
        'Test Driver',
        15
      );
    } else {
      // Send a general notification directly to database
      console.log('📝 Test notification would be sent to user:', userId);
    }
    
    console.log('✅ Test notification sent');
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
  }
}

// Export notification service for direct access
export { enhancedNotificationService };
