/**
 * DriverCommunicationService - Compatible with CustomerApp Chat System
 * Handles driver-customer messaging via trip_messages, trip_photos, and trip_call_logs tables
 * Integrates seamlessly with existing customer app chat functionality
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { driverPushNotificationService } from './DriverPushNotificationService';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// TypeScript interfaces matching the database schema
export interface TripMessage {
  id: string;
  trip_id: string;
  sender_id: string;
  sender_type: 'customer' | 'driver';
  message_type: 'text' | 'image' | 'location' | 'voice' | 'system' | 'eta_update';
  content: string;
  image_url?: string;
  location_data?: {
    lat: number;
    lng: number;
    address: string;
  };
  voice_url?: string;
  voice_duration?: number;
  is_read: boolean;
  read_at?: string;
  delivered_at: string;
  created_at: string;
  updated_at: string;
}

export interface TripPhoto {
  id: string;
  trip_id: string;
  taken_by_id: string;
  taken_by_type: 'customer' | 'driver';
  photo_type: 'pickup_before' | 'pickup_after' | 'delivery_before' | 'delivery_after' | 'damage_report' | 'location_proof' | 'signature' | 'general';
  image_url: string;
  thumbnail_url?: string;
  file_size?: number;
  image_width?: number;
  image_height?: number;
  location_data?: {
    lat: number;
    lng: number;
    address: string;
  };
  description?: string;
  is_required: boolean;
  created_at: string;
}

export interface TripCallLog {
  id: string;
  trip_id: string;
  caller_id: string;
  receiver_id: string;
  caller_type: 'customer' | 'driver';
  call_type: 'voice' | 'video';
  call_status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'missed' | 'declined';
  duration_seconds?: number;
  call_quality?: string;
  call_id?: string;
  provider: string;
  initiated_at: string;
  answered_at?: string;
  ended_at?: string;
  created_at: string;
}

class DriverCommunicationService {
  private static instance: DriverCommunicationService;
  private currentUserId: string | null = null;

  constructor() {
    this.initializeUser();
  }

  public static getInstance(): DriverCommunicationService {
    if (!DriverCommunicationService.instance) {
      DriverCommunicationService.instance = new DriverCommunicationService();
    }
    return DriverCommunicationService.instance;
  }

  private async initializeUser(): Promise<void> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      this.currentUserId = user?.id || null;
      
      if (this.currentUserId) {
        console.log('DriverCommunicationService: User authenticated:', this.currentUserId);
      } else {
        console.warn('DriverCommunicationService: No authenticated user found');
      }
    } catch (error) {
      console.error('DriverCommunicationService: Failed to get current user:', error);
      this.currentUserId = null;
    }
  }

  /**
   * Initialize method (optional - kept for backward compatibility)
   */
  async initialize(driverId?: string): Promise<boolean> {
    try {
      await this.initializeUser();
      console.log('📱 Driver Communication Service ready');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize driver communication service:', error);
      return false;
    }
  }

  /**
   * Send text message to customer
   */
  async sendTextMessage(
    tripId: string,
    customerId: string,
    message: string
  ): Promise<{ success: boolean; error?: string; message?: TripMessage }> {
    try {
      if (!this.currentUserId) {
        await this.initializeUser();
        if (!this.currentUserId) {
          return { success: false, error: 'Driver not authenticated' };
        }
      }

      const messageData = {
        trip_id: tripId,
        sender_id: this.currentUserId,
        sender_type: 'driver' as const,
        message_type: 'text' as const,
        content: message,
        is_read: false,
        delivered_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('trip_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to send text message:', error);
        return { 
          success: false, 
          error: error.message || 'Unknown error' 
        };
      }

      console.log('✅ Text message sent:', data.id);
      return { success: true, message: data };
    } catch (error) {
      console.error('❌ Exception sending text message:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send ETA update message
   */
  async sendETAUpdate(
    tripId: string,
    customerId: string,
    newETA: number,
    reason?: string
  ): Promise<{ success: boolean; error?: string; message?: TripMessage }> {
    try {
      if (!this.currentUserId) {
        await this.initializeUser();
        if (!this.currentUserId) {
          return { success: false, error: 'Driver not authenticated' };
        }
      }

      const message = reason 
        ? `ETA updated to ${newETA} minutes due to ${reason}`
        : `New ETA: ${newETA} minutes`;

      const messageData = {
        trip_id: tripId,
        sender_id: this.currentUserId,
        sender_type: 'driver' as const,
        message_type: 'eta_update' as const,
        content: message,
        is_read: false,
        delivered_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('trip_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to send ETA update:', error);
        return { 
          success: false, 
          error: error.message || 'Unknown error' 
        };
      }

      console.log('⏱️ ETA update message sent:', data.id);
      return { success: true, message: data };
    } catch (error) {
      console.error('❌ Exception sending ETA update:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send location update
   */
  async sendLocationUpdate(
    tripId: string,
    customerId: string,
    latitude: number,
    longitude: number,
    address: string
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      // Get current authenticated user (driver)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'Driver not authenticated' };
      }

      const { data, error } = await supabase
        .from('trip_messages')
        .insert({
          trip_id: tripId,
          sender_id: user.id, // Use authenticated user's ID
          sender_type: 'driver',
          message_type: 'location',
          content: `Location shared: ${address}`,
          location_data: {
            lat: latitude,
            lng: longitude,
            address: address,
          },
          is_read: false,
          delivered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      console.log('📍 Location update sent:', data.id);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('❌ Failed to send location update:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Upload and send photo with camera/library choice
   */
  async sendPhoto(
    tripId: string,
    customerId: string,
    photoType: TripPhoto['photo_type'],
    description?: string,
    source: 'camera' | 'library' = 'library'
  ): Promise<{ success: boolean; error?: string; photoId?: string; message?: TripMessage }> {
    try {
      // Get current authenticated user (driver)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'Driver not authenticated' };
      }

      // Request permission based on source
      if (source === 'camera') {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          return { success: false, error: 'Permission to access camera is required' };
        }
      } else {
        const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!mediaPermission.granted) {
          return { success: false, error: 'Permission to access camera roll is required' };
        }
      }

      // Launch the appropriate picker
      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

      if (result.canceled) {
        return { success: false, error: 'Photo selection canceled' };
      }

      const asset = result.assets[0];
      
      // Upload to Supabase Storage using the same method as customer app
      const fileExt = asset.uri.split('.').pop();
      const fileName = `${tripId}_${user.id}_${Date.now()}.${fileExt}`;
      
      console.log('📤 Uploading image to storage...', { uri: asset.uri, fileName });

      // Read file as base64 (same as customer app)
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to Uint8Array (React Native compatible, same as customer app)
      const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      console.log('📊 File info:', { size: byteArray.length, type: 'image/jpeg' });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trip-photos')
        .upload(fileName, byteArray, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      console.log('✅ Image uploaded to storage:', uploadData.path);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('trip-photos')
        .getPublicUrl(fileName);

      console.log('📷 Generated public URL:', publicUrl);
      console.log('🔗 URL breakdown:', {
        bucket: 'trip-photos',
        fileName,
        fullUrl: publicUrl
      });

      // Save photo record
      const { data, error } = await supabase
        .from('trip_photos')
        .insert({
          trip_id: tripId,
          taken_by_id: user.id, // Use authenticated user's ID
          taken_by_type: 'driver',
          photo_type: photoType,
          image_url: publicUrl,
          file_size: byteArray.length,
          image_width: asset.width,
          image_height: asset.height,
          description: description,
          is_required: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Send message with photo
      const messageData = {
        trip_id: tripId,
        sender_id: user.id,
        sender_type: 'driver' as const,
        message_type: 'image' as const,
        content: description || `${photoType.replace('_', ' ')} photo`,
        image_url: publicUrl,
        is_read: false,
        delivered_at: new Date().toISOString(),
      };

      const { data: messageData2, error: messageError } = await supabase
        .from('trip_messages')
        .insert(messageData)
        .select()
        .single();

      if (messageError) {
        console.error('❌ Failed to create image message:', messageError);
        // Don't fail the whole operation if message creation fails
        return { success: true, photoId: data.id };
      }

      console.log('📷 Photo uploaded and message sent:', data.id);
      return { success: true, photoId: data.id, message: messageData2 };
    } catch (error) {
      console.error('❌ Failed to send photo:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get all messages for a trip
   */
  async getTripMessages(tripId: string): Promise<{ success: boolean; messages?: TripMessage[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return { success: true, messages: data };
    } catch (error) {
      console.error('❌ Failed to get trip messages:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get all photos for a trip
   */
  async getTripPhotos(tripId: string): Promise<{ success: boolean; photos?: TripPhoto[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('trip_photos')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return { success: true, photos: data };
    } catch (error) {
      console.error('❌ Failed to get trip photos:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(tripId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current authenticated user (driver)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'Driver not authenticated' };
      }

      const { error } = await supabase
        .from('trip_messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('trip_id', tripId)
        .eq('sender_type', 'customer') // Mark customer messages as read
        .eq('is_read', false);

      if (error) throw error;

      console.log('✅ Messages marked as read for trip:', tripId);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to mark messages as read:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Subscribe to real-time messages for a trip
   */
  subscribeToTripMessages(
    tripId: string,
    onMessage: (message: TripMessage) => void
  ): () => void {
    console.log('🔄 Subscribing to trip messages:', tripId);

    const subscription = supabase
      .channel(`trip-messages-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload) => {
          console.log('📨 New message received:', payload.new);
          const newMessage = payload.new as TripMessage;
          
          // Check if this is a customer message (not from driver)
          if (newMessage.sender_type === 'customer' && newMessage.sender_id !== this.currentUserId) {
            console.log('💬 Customer message received, sending push notification');
            
            // Send push notification for customer message
            try {
              await driverPushNotificationService.sendLocalNotification({
                tripId: tripId,
                type: 'customer_message',
                title: '💬 New Message from Customer',
                message: this.truncateMessage(newMessage.content),
                priority: 'normal',
                sound: 'default',
                data: {
                  message_id: newMessage.id,
                  sender_type: newMessage.sender_type,
                  message_type: newMessage.message_type,
                  timestamp: newMessage.created_at,
                }
              });
            } catch (error) {
              console.error('❌ Failed to send push notification for customer message:', error);
            }
          }
          
          // Call the original callback
          onMessage(newMessage);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
      console.log('🔄 Unsubscribed from trip messages');
    };
  }

  /**
   * Truncate message for notification display
   */
  private truncateMessage(message: string, maxLength: number = 50): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength) + '...';
  }

  /**
   * Log call attempt
   */
  async logCallAttempt(
    tripId: string,
    customerId: string,
    callType: 'voice' | 'video' = 'voice'
  ): Promise<{ success: boolean; error?: string; callId?: string }> {
    try {
      // Get current authenticated user (driver)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'Driver not authenticated' };
      }

      const { data, error } = await supabase
        .from('trip_call_logs')
        .insert({
          trip_id: tripId,
          caller_id: user.id, // Use authenticated user's ID
          receiver_id: customerId,
          caller_type: 'driver',
          call_type: callType,
          call_status: 'initiated',
          provider: 'system',
          initiated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      console.log('📞 Call attempt logged:', data.id);
      return { success: true, callId: data.id };
    } catch (error) {
      console.error('❌ Failed to log call attempt:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const driverCommunicationService = DriverCommunicationService.getInstance();
