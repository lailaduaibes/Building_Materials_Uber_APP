/**
 * 🔔 Push Notification Service
 * Real-time notifications for trip updates, driver alerts, and system notifications
 * Supports both React Native apps (Customer & Driver) and web dashboard
 */

import { createClient } from '@supabase/supabase-js';

export interface NotificationPayload {
  id: string;
  type: 'trip_update' | 'driver_alert' | 'system_notification' | 'asap_alert' | 'route_optimization';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  targetUsers?: string[]; // User IDs to send to
  targetRoles?: ('customer' | 'driver' | 'admin')[];
  expiresAt?: string;
  actionUrl?: string;
  icon?: string;
  sound?: 'default' | 'success' | 'warning' | 'error';
}

export interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  sound?: string;
  icon?: string;
}

class PushNotificationService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Pre-defined notification templates
  private readonly templates: Record<string, NotificationTemplate> = {
    // Trip-related notifications
    TRIP_ASSIGNED: {
      type: 'trip_update',
      title: '🚛 New Trip Assigned',
      message: 'You have been assigned a new delivery. Tap to view details.',
      priority: 'high',
      sound: 'default',
      icon: 'truck'
    },
    
    TRIP_ACCEPTED: {
      type: 'trip_update',
      title: '✅ Trip Accepted',
      message: 'Your driver has accepted the trip and is on the way!',
      priority: 'high',
      sound: 'success'
    },
    
    TRIP_IN_TRANSIT: {
      type: 'trip_update',
      title: '🚚 Driver En Route',
      message: 'Your driver is on the way to pickup location.',
      priority: 'normal',
      sound: 'default'
    },
    
    TRIP_ARRIVED_PICKUP: {
      type: 'trip_update',
      title: '📍 Driver Arrived',
      message: 'Your driver has arrived at the pickup location.',
      priority: 'high',
      sound: 'success'
    },
    
    TRIP_PICKED_UP: {
      type: 'trip_update',
      title: '📦 Items Picked Up',
      message: 'Your building materials have been picked up and are on the way!',
      priority: 'normal',
      sound: 'default'
    },
    
    TRIP_DELIVERED: {
      type: 'trip_update',
      title: '🎉 Delivery Complete',
      message: 'Your building materials have been successfully delivered!',
      priority: 'high',
      sound: 'success'
    },

    // ASAP-specific notifications
    ASAP_TRIP_AVAILABLE: {
      type: 'asap_alert',
      title: '⚡ ASAP Trip Available',
      message: 'High-priority ASAP delivery available. Premium rate applies!',
      priority: 'critical',
      sound: 'warning',
      icon: 'bolt'
    },
    
    ASAP_BONUS_EARNED: {
      type: 'asap_alert',
      title: '💰 ASAP Bonus Earned',
      message: 'Great job! You earned a premium bonus for fast ASAP delivery.',
      priority: 'high',
      sound: 'success'
    },

    // Driver-specific notifications
    DRIVER_APPROVED: {
      type: 'driver_alert',
      title: '🎊 Application Approved',
      message: 'Congratulations! Your driver application has been approved. You can now accept trips!',
      priority: 'high',
      sound: 'success'
    },
    
    DRIVER_REJECTED: {
      type: 'driver_alert',
      title: '❌ Application Update',
      message: 'Your driver application requires attention. Please check the app for details.',
      priority: 'normal',
      sound: 'warning'
    },

    // Route optimization notifications
    OPTIMIZED_ROUTE: {
      type: 'route_optimization',
      title: '🗺️ Optimized Route Available',
      message: 'AI has optimized your route to save time and fuel. Check your updated itinerary.',
      priority: 'normal',
      sound: 'default',
      icon: 'route'
    },

    // System notifications
    SYSTEM_MAINTENANCE: {
      type: 'system_notification',
      title: '🔧 Scheduled Maintenance',
      message: 'The system will undergo maintenance tonight from 2-4 AM.',
      priority: 'low',
      sound: 'default'
    },
    
    SYSTEM_UPDATE: {
      type: 'system_notification',
      title: '🚀 App Update Available',
      message: 'A new version of the app is available with improved features!',
      priority: 'normal',
      sound: 'default'
    }
  };

  /**
   * 📤 Send push notification to specific users
   */
  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      console.log('🔔 Sending push notification:', payload);

      // Store notification in database for history
      const notificationRecord = {
        id: payload.id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data || {},
        priority: payload.priority,
        target_users: payload.targetUsers || [],
        target_roles: payload.targetRoles || [],
        expires_at: payload.expiresAt,
        action_url: payload.actionUrl,
        icon: payload.icon,
        sound: payload.sound || 'default',
        sent_at: new Date().toISOString(),
        status: 'sent'
      };

      const { error: dbError } = await this.supabase
        .from('push_notifications')
        .insert([notificationRecord]);

      if (dbError) {
        console.warn('⚠️ Failed to store notification in database:', dbError);
      }

      // Send to specific users if specified
      if (payload.targetUsers && payload.targetUsers.length > 0) {
        await this.sendToUsers(payload, payload.targetUsers);
      }

      // Send to all users in specified roles
      if (payload.targetRoles && payload.targetRoles.length > 0) {
        await this.sendToRoles(payload, payload.targetRoles);
      }

      // If no specific targets, this is a broadcast notification
      if (!payload.targetUsers && !payload.targetRoles) {
        await this.sendBroadcast(payload);
      }

      console.log('✅ Push notification sent successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
      return false;
    }
  }

  /**
   * 📱 Send notification using predefined template
   */
  async sendTemplatedNotification(
    templateKey: string, 
    data: Record<string, any> = {},
    targetOptions: {
      users?: string[];
      roles?: ('customer' | 'driver' | 'admin')[];
    } = {}
  ): Promise<boolean> {
    
    const template = this.templates[templateKey];
    if (!template) {
      console.error(`❌ Unknown notification template: ${templateKey}`);
      return false;
    }

    // Replace placeholders in template
    const title = this.replacePlaceholders(template.title, data);
    const message = this.replacePlaceholders(template.message, data);

    const notification: NotificationPayload = {
      id: `${templateKey}_${Date.now()}`,
      type: template.type as any,
      title,
      message,
      data,
      priority: template.priority,
      targetUsers: targetOptions.users,
      targetRoles: targetOptions.roles,
      sound: template.sound as any,
      icon: template.icon
    };

    return this.sendNotification(notification);
  }

  /**
   * 🚛 Send trip-related notifications
   */
  async sendTripNotification(
    tripId: string, 
    status: string, 
    customerId: string, 
    driverId?: string,
    extraData: Record<string, any> = {}
  ): Promise<boolean> {
    
    const templateMap: Record<string, string> = {
      'matched': 'TRIP_ASSIGNED',
      'accepted': 'TRIP_ACCEPTED', 
      'in_transit': 'TRIP_IN_TRANSIT',
      'arrived_pickup': 'TRIP_ARRIVED_PICKUP',
      'picked_up': 'TRIP_PICKED_UP',
      'delivered': 'TRIP_DELIVERED'
    };

    const templateKey = templateMap[status];
    if (!templateKey) {
      console.warn(`⚠️ No template for trip status: ${status}`);
      return false;
    }

    const data = {
      tripId,
      status,
      ...extraData
    };

    // Send to customer
    await this.sendTemplatedNotification(templateKey, data, { 
      users: [customerId] 
    });

    // Send to driver if applicable
    if (driverId && (status === 'matched' || status === 'accepted')) {
      const driverTemplate = status === 'matched' ? 'TRIP_ASSIGNED' : templateKey;
      await this.sendTemplatedNotification(driverTemplate, data, { 
        users: [driverId] 
      });
    }

    return true;
  }

  /**
   * ⚡ Send ASAP-related notifications
   */
  async sendASAPNotification(
    type: 'available' | 'bonus_earned',
    data: Record<string, any> = {},
    targetDrivers?: string[]
  ): Promise<boolean> {
    
    const templateKey = type === 'available' ? 'ASAP_TRIP_AVAILABLE' : 'ASAP_BONUS_EARNED';
    
    return this.sendTemplatedNotification(templateKey, data, {
      users: targetDrivers,
      roles: targetDrivers ? undefined : ['driver'] // Broadcast to all drivers if no specific targets
    });
  }

  /**
   * 👤 Send driver management notifications
   */
  async sendDriverNotification(
    driverId: string,
    type: 'approved' | 'rejected',
    data: Record<string, any> = {}
  ): Promise<boolean> {
    
    const templateKey = type === 'approved' ? 'DRIVER_APPROVED' : 'DRIVER_REJECTED';
    
    return this.sendTemplatedNotification(templateKey, data, {
      users: [driverId]
    });
  }

  /**
   * 🗺️ Send route optimization notifications
   */
  async sendRouteOptimizationNotification(
    driverIds: string[],
    optimizationData: {
      distanceSaved: number;
      timeSaved: number;
      fuelSaved: number;
    }
  ): Promise<boolean> {
    
    return this.sendTemplatedNotification('OPTIMIZED_ROUTE', optimizationData, {
      users: driverIds
    });
  }

  /**
   * 📢 Send system-wide notifications
   */
  async sendSystemNotification(
    type: 'maintenance' | 'update',
    message: string,
    targetRoles: ('customer' | 'driver' | 'admin')[] = ['customer', 'driver']
  ): Promise<boolean> {
    
    const templateKey = type === 'maintenance' ? 'SYSTEM_MAINTENANCE' : 'SYSTEM_UPDATE';
    
    return this.sendTemplatedNotification(templateKey, { message }, {
      roles: targetRoles
    });
  }

  /**
   * 📊 Get notification statistics
   */
  async getNotificationStats(days: number = 7): Promise<{
    totalSent: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    deliveryRate: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('push_notifications')
        .select('type, priority, status, sent_at')
        .gte('sent_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        totalSent: data.length,
        byType: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        deliveryRate: 0
      };

      // Count by type and priority
      data.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      });

      // Calculate delivery rate (assume 95% for now - in production, track actual delivery)
      const delivered = data.filter(n => n.status === 'delivered').length;
      stats.deliveryRate = data.length > 0 ? (delivered / data.length) * 100 : 0;

      return stats;

    } catch (error) {
      console.error('❌ Error getting notification stats:', error);
      return {
        totalSent: 0,
        byType: {},
        byPriority: {},
        deliveryRate: 0
      };
    }
  }

  /**
   * 🧹 Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('push_notifications')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) throw error;

      console.log(`🧹 Cleaned up ${data.length} expired notifications`);
      return data.length;

    } catch (error) {
      console.error('❌ Error cleaning up notifications:', error);
      return 0;
    }
  }

  // Private helper methods

  private async sendToUsers(payload: NotificationPayload, userIds: string[]): Promise<void> {
    // In production, integrate with Firebase, OneSignal, or Expo push notifications
    console.log('📱 Sending to specific users:', userIds.length);
    
    // For now, just log the notification
    userIds.forEach(userId => {
      console.log(`📲 Notification sent to user ${userId}:`, {
        title: payload.title,
        message: payload.message,
        type: payload.type
      });
    });
  }

  private async sendToRoles(payload: NotificationPayload, roles: string[]): Promise<void> {
    // Get users by role
    const { data: users, error } = await this.supabase
      .from('users') // Adjust table name as needed
      .select('id')
      .in('role', roles);

    if (error) {
      console.error('❌ Error fetching users by role:', error);
      return;
    }

    const userIds = users.map(u => u.id);
    if (userIds.length > 0) {
      await this.sendToUsers(payload, userIds);
    }
  }

  private async sendBroadcast(payload: NotificationPayload): Promise<void> {
    console.log('📢 Broadcasting notification to all users');
    // In production, use topic-based messaging or broadcast channels
  }

  private replacePlaceholders(text: string, data: Record<string, any>): string {
    let result = text;
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    });
    return result;
  }
}

export default new PushNotificationService();

// Example usage:
/*
import PushNotificationService from './PushNotificationService';

// Send trip notification
await PushNotificationService.sendTripNotification(
  'trip123',
  'in_transit',
  'customer456',
  'driver789'
);

// Send ASAP notification to specific drivers
await PushNotificationService.sendASAPNotification('available', {
  tripId: 'asap123',
  bonusAmount: '₪50'
}, ['driver1', 'driver2']);

// Send driver approval notification
await PushNotificationService.sendDriverNotification(
  'driver123',
  'approved',
  { driverName: 'John Doe' }
);

// Send route optimization notification
await PushNotificationService.sendRouteOptimizationNotification(
  ['driver1', 'driver2'],
  { distanceSaved: 12, timeSaved: 25, fuelSaved: 3.5 }
);

// Send system maintenance notification
await PushNotificationService.sendSystemNotification(
  'maintenance',
  'System maintenance scheduled for tonight 2-4 AM',
  ['customer', 'driver']
);

// Get notification statistics
const stats = await PushNotificationService.getNotificationStats(7);
console.log('📊 Notification stats:', stats);
*/
