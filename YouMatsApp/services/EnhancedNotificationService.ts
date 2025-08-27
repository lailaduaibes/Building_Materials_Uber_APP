/**
 * EnhancedNotificationService for YouMats Driver App
 * Integrates with the customer app notification system
 * Now works alongside the comprehensive chat system
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverCommunicationService } from './DriverCommunicationService';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';
// Service role key for server-side operations like sending notifications
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

// Regular supabase client for general operations
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Service role client specifically for sending notifications (bypasses RLS)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface CustomerNotification {
  user_id: string;
  trip_id: string;
  title: string;
  message: string;
  type: 'status_update' | 'eta_update' | 'arrival' | 'driver_message' | 'general';
  data?: Record<string, any>;
}

class EnhancedNotificationService {
  private static instance: EnhancedNotificationService;

  public static getInstance(): EnhancedNotificationService {
    if (!EnhancedNotificationService.instance) {
      EnhancedNotificationService.instance = new EnhancedNotificationService();
    }
    return EnhancedNotificationService.instance;
  }

  /**
   * Send trip status notification to customer
   * Also sends a chat message for better communication
   */
  async sendTripStatusNotification(
    customerId: string,
    tripId: string,
    status: string,
    driverName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { title, message, type } = this.getStatusNotificationContent(status, driverName);

      // Send notification to notifications table using service role (bypasses RLS)
      const { data, error } = await supabaseService
        .from('notifications')
        .insert({
          user_id: customerId,
          // trip_id: tripId, // Comment out to avoid FK constraint issue
          title,
          message,
          type,
          data: { 
            status, 
            driver_name: driverName,
            trip_assignment_id: tripId // Store as metadata instead
          },
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Notification DB error:', error);
        throw error;
      }

      // Also send as chat message for better customer experience
      try {
        const chatResult = await driverCommunicationService.sendTextMessage(tripId, customerId, message);
        if (!chatResult.success) {
          console.warn('⚠️ Failed to send chat message:', chatResult.error);
        }
      } catch (chatError) {
        console.warn('⚠️ Failed to send chat message (notification still sent):', chatError);
      }

      console.log('✅ Customer notification sent:', data.id);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send customer notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send ETA update notification to customer
   * Uses chat system for immediate delivery
   */
  async sendETAUpdateNotification(
    customerId: string,
    tripId: string,
    newETA: number,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Send via chat system (more immediate)
      const result = await driverCommunicationService.sendETAUpdate(
        tripId,
        customerId,
        newETA,
        reason
      );

      if (result.success) {
        // Also send as notification (without trip_id FK constraint)
        const title = reason ? 'Delivery Delayed' : 'ETA Updated';
        const message = reason 
          ? `Your delivery is running ${newETA} minutes late due to ${reason}`
          : `New estimated arrival time: ${newETA} minutes`;

        await supabaseService
          .from('notifications')
          .insert({
            user_id: customerId,
            // trip_id: tripId, // Comment out to avoid FK constraint
            title,
            message,
            type: 'eta_update',
            data: { 
              new_eta: newETA, 
              delay_reason: reason,
              trip_assignment_id: tripId
            },
          });

        console.log('✅ ETA update notification sent');
        return { success: true };
      } else {
        throw new Error(result.error || 'Chat service failed');
      }
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
   * Uses chat system for real-time delivery
   */
  async sendDriverArrivalNotification(
    customerId: string,
    tripId: string,
    location: 'pickup' | 'delivery',
    driverName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const title = location === 'pickup' 
        ? 'Driver Arrived at Pickup' 
        : 'Driver Arriving Soon';
      
      const message = location === 'pickup'
        ? `${driverName || 'Your driver'} has arrived at the pickup location and is loading materials`
        : `${driverName || 'Your driver'} is arriving at your delivery location in 2-3 minutes`;

      // Send via chat system first
      const chatResult = await driverCommunicationService.sendTextMessage(
        tripId,
        customerId,
        message
      );

      // Also send as notification using service role (bypasses RLS)
      const { data, error } = await supabaseService
        .from('notifications')
        .insert({
          user_id: customerId,
          // trip_id: tripId, // Comment out to avoid FK constraint
          title,
          message,
          type: 'arrival',
          data: { 
            location, 
            driver_name: driverName,
            trip_assignment_id: tripId
          },
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Driver arrival notification sent:', data.id);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send arrival notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get notification content based on trip status
   */
  private getStatusNotificationContent(status: string, driverName?: string): {
    title: string;
    message: string;
    type: 'status_update' | 'arrival';
  } {
    const driver = driverName || 'Your driver';

    switch (status) {
      case 'assigned':
        return {
          title: 'Driver Assigned',
          message: `${driver} has been assigned to your delivery and is heading to pickup location`,
          type: 'status_update'
        };

      case 'en_route_pickup':
      case 'pickup_started':
      case 'start_trip':
        return {
          title: 'Driver En Route',
          message: `${driver} is on the way to pickup your materials`,
          type: 'status_update'
        };

      case 'arrived_pickup':
        return {
          title: 'Driver Arrived',
          message: `${driver} has arrived at pickup location and is loading materials`,
          type: 'arrival'
        };

      case 'picked_up':
      case 'pickup_completed':
      case 'materials_loaded':
        return {
          title: 'Materials Loaded',
          message: `Materials have been loaded! ${driver} is now heading to your location`,
          type: 'status_update'
        };

      case 'in_transit':
      case 'en_route_delivery':
        return {
          title: 'On The Way',
          message: `${driver} is heading to your delivery location with your materials`,
          type: 'status_update'
        };

      case 'arrived_delivery':
        return {
          title: 'Driver Arriving',
          message: `${driver} is arriving at your location in 2-3 minutes`,
          type: 'arrival'
        };

      case 'delivered':
      case 'completed':
        return {
          title: 'Delivery Complete',
          message: 'Your materials have been successfully delivered! Thank you for using our service',
          type: 'status_update'
        };

      default:
        return {
          title: 'Trip Update',
          message: `Trip status updated: ${status}`,
          type: 'status_update'
        };
    }
  }
}

export const enhancedNotificationService = EnhancedNotificationService.getInstance();
