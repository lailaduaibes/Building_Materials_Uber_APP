import { enhancedNotificationService } from './EnhancedNotificationService';
import userPreferencesService from './UserPreferencesService';
import { authService } from '../AuthServiceSupabase';

export interface OrderNotificationData {
  orderId: string;
  status: string;
  message: string;
  customerName?: string;
  driverName?: string;
  estimatedArrival?: string;
}

class NotificationManager {
  private isInitialized = false;
  private currentUserId: string | null = null;

  // Initialize notification system
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;

      // Get current user
      const user = await authService.getCurrentUser();
      this.currentUserId = user?.id || null;

      // Initialize notification service (request permissions, get token)
      const result = await enhancedNotificationService.initialize();
      
      if (result.success && this.currentUserId) {
        console.log('✅ Enhanced notification service initialized successfully');
        // The enhanced service handles token registration automatically
      }

      this.isInitialized = true;
      console.log('NotificationManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationManager:', error);
    }
  }

  // Handle when notification is received while app is open
  private handleNotificationReceived(notification: any): void {
    console.log('Notification received:', notification);
    // You can add custom logic here, like updating UI state
  }

  // Handle when user taps on notification
  private handleNotificationResponse(response: any): void {
    console.log('Notification response:', response);
    const data = response.notification.request.content.data;
    
    if (data?.type === 'order_update' && data?.orderId) {
      // Navigate to order details screen
      // You would implement navigation logic here
      console.log('Should navigate to order:', data.orderId);
    }
  }

  // Send order status update notification
  async sendOrderUpdateNotification(data: OrderNotificationData): Promise<void> {
    try {
      // Check if user wants push notifications
      const shouldSend = await userPreferencesService.shouldSendNotification(
        'pushNotifications',
        this.currentUserId || undefined
      );

      if (!shouldSend) {
        console.log('User disabled push notifications');
        return;
      }

      // Create notification message based on status
      const message = this.getOrderStatusMessage(data);
      
      // Send the notification
      await enhancedNotificationService.showOrderUpdate(
        data.orderId,
        data.status,
        message
      );

      console.log(`Order notification sent for ${data.orderId}: ${data.status}`);
    } catch (error) {
      console.error('Failed to send order notification:', error);
    }
  }

  // Send general notification
  async sendGeneralNotification(title: string, message: string): Promise<void> {
    try {
      const shouldSend = await userPreferencesService.shouldSendNotification(
        'pushNotifications',
        this.currentUserId || undefined
      );

      if (!shouldSend) {
        console.log('User disabled push notifications');
        return;
      }

  await enhancedNotificationService.showGeneralNotification(title, message);
      console.log('General notification sent:', title);
    } catch (error) {
      console.error('Failed to send general notification:', error);
    }
  }

  // Create user-friendly status messages
  private getOrderStatusMessage(data: OrderNotificationData): string {
    const orderNumber = `#${data.orderId.slice(-6)}`;
    
    switch (data.status.toLowerCase()) {
      case 'pending':
        return `Your order ${orderNumber} has been received and is being processed.`;
      
      case 'assigned':
        return `Great news! Driver ${data.driverName || 'assigned'} will handle your order ${orderNumber}.`;
      
      case 'picked_up':
        return `Your materials for order ${orderNumber} have been picked up and are on the way!`;
      
      case 'in_transit':
        return `Your order ${orderNumber} is in transit. ${data.estimatedArrival ? `Estimated arrival: ${data.estimatedArrival}` : ''}`;
      
      case 'delivered':
        return `Your order ${orderNumber} has been delivered successfully! 🎉`;
      
      case 'cancelled':
        return `Your order ${orderNumber} has been cancelled. Contact support if you need assistance.`;
      
      case 'failed':
        return `There was an issue with your order ${orderNumber}. Our team will contact you shortly.`;
      
      default:
        return data.message || `Your order ${orderNumber} status has been updated to: ${data.status}`;
    }
  }

  // Update current user (call when user logs in/out)
  updateCurrentUser(userId: string | null): void {
    this.currentUserId = userId;
  }

  // Update notification configuration
  async updateConfiguration(config: { enablePushNotifications: boolean; enableSound: boolean; enableVibration: boolean; enableBadge: boolean; }): Promise<void> {
    try {
      await enhancedNotificationService.updateConfiguration(config);
      console.log('Notification configuration updated:', config);
    } catch (error) {
      console.error('Failed to update notification configuration:', error);
      throw error;
    }
  }

  // Reset notification system
  async reset(): Promise<void> {
    this.isInitialized = false;
    this.currentUserId = null;
  await enhancedNotificationService.cancelAllNotifications();
  }
}

// Export singleton instance
const notificationManager = new NotificationManager();
export default notificationManager;
