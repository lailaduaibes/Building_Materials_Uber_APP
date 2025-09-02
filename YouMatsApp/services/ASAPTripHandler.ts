/**
 * 🚨 ASAP Trip Assignment Handler
 * Replaces Alert.alert() with proper push notifications for ASAP trip assignments
 * Works even when app is closed or in background
 */

import { driverPushNotificationService } from './DriverPushNotificationService';
import { OrderAssignment } from './DriverService';

export class ASAPTripHandler {
  private static instance: ASAPTripHandler;

  public static getInstance(): ASAPTripHandler {
    if (!ASAPTripHandler.instance) {
      ASAPTripHandler.instance = new ASAPTripHandler();
    }
    return ASAPTripHandler.instance;
  }

  /**
   * Handle new ASAP trip assignment with push notification
   */
  async handleASAPTripAssignment(
    order: OrderAssignment, 
    onOrderReceived: (order: OrderAssignment) => void
  ): Promise<void> {
    try {
      // First, trigger the in-app order assignment screen
      onOrderReceived(order);

      // Then send push notification for background/closed app scenarios
      const pickupAddress = typeof order.pickupLocation.address === 'string' 
        ? order.pickupLocation.address 
        : 'Unknown location';

      const estimatedEarnings = order.estimatedEarnings || order.originalQuotedPrice || 0;

      await driverPushNotificationService.showASAPTripNotification(
        order.id,
        pickupAddress,
        estimatedEarnings
      );

      console.log('✅ ASAP trip notification sent:', {
        tripId: order.id,
        pickup: pickupAddress,
        earnings: estimatedEarnings
      });

    } catch (error) {
      console.error('❌ Failed to handle ASAP trip assignment:', error);
      // Fallback to in-app notification only
      onOrderReceived(order);
    }
  }

  /**
   * Handle trip status updates with push notifications
   */
  async handleTripStatusUpdate(
    tripId: string, 
    status: string, 
    message: string
  ): Promise<void> {
    try {
      await driverPushNotificationService.showTripUpdateNotification(
        tripId,
        status,
        message
      );

      console.log('✅ Trip status notification sent:', { tripId, status, message });
    } catch (error) {
      console.error('❌ Failed to send trip status notification:', error);
    }
  }

  /**
   * Handle customer messages with push notifications
   */
  async handleCustomerMessage(
    tripId: string,
    customerName: string,
    message: string
  ): Promise<void> {
    try {
      await driverPushNotificationService.sendLocalNotification({
        tripId,
        type: 'customer_message',
        title: `💬 Message from ${customerName}`,
        message: message.length > 50 ? message.substring(0, 50) + '...' : message,
        priority: 'high',
        sound: 'default',
        data: {
          customer_name: customerName,
          full_message: message,
        }
      });

      console.log('✅ Customer message notification sent:', { tripId, customerName });
    } catch (error) {
      console.error('❌ Failed to send customer message notification:', error);
    }
  }

  /**
   * Clear notifications for completed/cancelled trips
   */
  async clearTripNotifications(tripId: string): Promise<void> {
    try {
      // This would clear notifications specific to the trip
      // For now, we'll implement a general clear
      await driverPushNotificationService.clearAllNotifications();
      console.log('✅ Trip notifications cleared for:', tripId);
    } catch (error) {
      console.error('❌ Failed to clear trip notifications:', error);
    }
  }
}

export const asapTripHandler = ASAPTripHandler.getInstance();
