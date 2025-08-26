/**
 * CommunicationService - Handle driver-customer messaging, photos, and calls
 * Integrates with trip_messages, trip_photos, and trip_call_logs tables
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { enhancedNotificationService } from './EnhancedNotificationService';
import { supabase, getCurrentUser } from '../config/supabaseClient'; // Use shared authenticated client
import { createClient } from '@supabase/supabase-js'; // For admin operations

// Service role client for admin operations (driver lookups)
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';
const supabaseAdmin = createClient('https://pjbbtmuhlpscmrbgsyzb.supabase.co', supabaseServiceKey);

// TypeScript interfaces
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
  location_data?: {
    lat: number;
    lng: number;
    address: string;
    accuracy: number;
  };
  description?: string;
  is_required: boolean;
  created_at: string;
}

export interface CallLog {
  id: string;
  trip_id: string;
  caller_id: string;
  receiver_id: string;
  caller_type: 'customer' | 'driver';
  call_type: 'voice' | 'emergency' | 'support';
  call_status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'missed' | 'failed';
  duration_seconds: number;
  call_quality?: string;
  initiated_at: string;
  answered_at?: string;
  ended_at?: string;
}

class CommunicationService {
  private static instance: CommunicationService;
  private currentUserId: string | null = null;
  private messageSubscriptions: Map<string, any> = new Map();

  constructor() {
    this.initializeUser();
  }

  static getInstance(): CommunicationService {
    if (!CommunicationService.instance) {
      CommunicationService.instance = new CommunicationService();
    }
    return CommunicationService.instance;
  }

  private async initializeUser(): Promise<void> {
    try {
      const user = await getCurrentUser();
      this.currentUserId = user?.id || null;
      
      if (this.currentUserId) {
        console.log('CommunicationService: User authenticated:', this.currentUserId);
      } else {
        console.warn('CommunicationService: No authenticated user found');
      }
    } catch (error) {
      console.error('CommunicationService: Failed to get current user:', error);
      this.currentUserId = null;
    }
  }

  // =============================================================================
  // MESSAGING FUNCTIONS
  // =============================================================================

  /**
   * Send a text message in a trip
   */
  async sendMessage(tripId: string, content: string, messageType: TripMessage['message_type'] = 'text'): Promise<{ success: boolean; message?: TripMessage; error?: string }> {
    try {
      if (!this.currentUserId) {
        await this.initializeUser();
        if (!this.currentUserId) {
          return { success: false, error: 'User not authenticated' };
        }
      }

      const messageData = {
        trip_id: tripId,
        sender_id: this.currentUserId,
        sender_type: 'customer' as const,
        message_type: messageType,
        content: content,
        delivered_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('trip_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Failed to send message:', error);
        return { success: false, error: error.message };
      }

      // Send notification to driver
      await this.notifyNewMessage(tripId, 'customer');

      console.log('✅ Message sent successfully:', data.id);
      return { success: true, message: data };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get messages for a trip
   */
  async getTripMessages(tripId: string, limit: number = 50): Promise<{ success: boolean; messages?: TripMessage[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Failed to get messages:', error);
        return { success: false, error: error.message };
      }

      return { success: true, messages: data || [] };
    } catch (error) {
      console.error('Error getting messages:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(tripId: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      if (!this.currentUserId) return { success: false, error: 'User not authenticated' };

      const { data, error } = await supabase.rpc('mark_messages_as_read', {
        trip_uuid: tripId,
        user_uuid: this.currentUserId
      });

      if (error) {
        console.error('Failed to mark messages as read:', error);
        return { success: false, error: error.message };
      }

      return { success: true, count: data };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Subscribe to real-time messages for a trip
   */
  subscribeToTripMessages(tripId: string, callback: (message: TripMessage) => void): () => void {
    const channel = supabase
      .channel(`trip_messages_${tripId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_messages',
        filter: `trip_id=eq.${tripId}`
      }, (payload) => {
        console.log('📨 New message received:', payload.new);
        callback(payload.new as TripMessage);
      })
      .subscribe();

    this.messageSubscriptions.set(tripId, channel);

    // Return cleanup function
    return () => {
      channel.unsubscribe();
      this.messageSubscriptions.delete(tripId);
    };
  }

  // =============================================================================
  // PHOTO FUNCTIONS
  // =============================================================================

  /**
   * Upload a photo for a trip
   */
  async uploadTripPhoto(
    tripId: string, 
    imageUri: string, 
    photoType: TripPhoto['photo_type'], 
    description?: string,
    location?: { lat: number; lng: number; address: string }
  ): Promise<{ success: boolean; photo?: TripPhoto; error?: string }> {
    try {
      if (!this.currentUserId) {
        await this.initializeUser();
        if (!this.currentUserId) {
          return { success: false, error: 'User not authenticated' };
        }
      }

      // Upload image to Supabase Storage
      const uploadResult = await this.uploadImageToStorage(imageUri, `trip_photos/${tripId}`);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Get image info
      const imageInfo = await FileSystem.getInfoAsync(imageUri);
      
      const photoData = {
        trip_id: tripId,
        taken_by_id: this.currentUserId,
        taken_by_type: 'customer' as const,
        photo_type: photoType,
        image_url: uploadResult.publicUrl!,
        file_size: imageInfo.exists ? imageInfo.size : undefined,
        location_data: location,
        description: description,
        is_required: false,
      };

      const { data, error } = await supabase
        .from('trip_photos')
        .insert(photoData)
        .select()
        .single();

      if (error) {
        console.error('Failed to save photo record:', error);
        return { success: false, error: error.message };
      }

      // Notify driver about photo upload
      await this.notifyPhotoUploaded(tripId, photoType);

      console.log('✅ Photo uploaded successfully:', data.id);
      return { success: true, photo: data };
    } catch (error) {
      console.error('Error uploading photo:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get photos for a trip
   */
  async getTripPhotos(tripId: string): Promise<{ success: boolean; photos?: TripPhoto[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('trip_photos')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get photos:', error);
        return { success: false, error: error.message };
      }

      return { success: true, photos: data || [] };
    } catch (error) {
      console.error('Error getting photos:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Take photo with camera or select from gallery
   */
  async selectPhoto(useCamera: boolean = false): Promise<{ success: boolean; uri?: string; error?: string }> {
    try {
      // Request permissions
      const { status } = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        return { success: false, error: 'Permission denied' };
      }

      // Launch camera or image picker
      const result = useCamera
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
        return { success: false, error: 'User cancelled' };
      }

      return { success: true, uri: result.assets[0].uri };
    } catch (error) {
      console.error('Error selecting photo:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // =============================================================================
  // CALL FUNCTIONS
  // =============================================================================

  /**
   * Initiate a call to driver
   */
  async initiateCall(tripId: string, driverIdOrUserId: string, callType: CallLog['call_type'] = 'voice'): Promise<{ success: boolean; callLog?: CallLog; error?: string; phone?: string }> {
    try {
      if (!this.currentUserId) {
        await this.initializeUser();
        if (!this.currentUserId) {
          return { success: false, error: 'User not authenticated' };
        }
      }

      let actualDriverUserId: string;
      let driverPhone: string;

      console.log('🔍 Looking for driver with ID:', driverIdOrUserId);

      // Try to determine if this is a driver_profile.id or user_id using ADMIN CLIENT
      const { data: driverByUserId, error: userIdError } = await supabaseAdmin
        .from('driver_profiles')
        .select('user_id, phone, first_name, last_name')
        .eq('user_id', driverIdOrUserId)
        .single();

      console.log('📋 Search by user_id result:', { driverByUserId, userIdError });

      if (!userIdError && driverByUserId) {
        // The ID is already a user_id
        actualDriverUserId = driverIdOrUserId;
        driverPhone = driverByUserId.phone;
        console.log('✅ Found driver by user_id:', actualDriverUserId);
      } else {
        // Try as driver_profile.id
        console.log('🔍 Trying as driver_profile.id...');
        const { data: driverByProfileId, error: profileIdError } = await supabaseAdmin
          .from('driver_profiles')
          .select('user_id, phone, first_name, last_name')
          .eq('id', driverIdOrUserId)
          .single();

        console.log('📋 Search by profile_id result:', { driverByProfileId, profileIdError });

        if (!profileIdError && driverByProfileId) {
          actualDriverUserId = driverByProfileId.user_id;
          driverPhone = driverByProfileId.phone;
          console.log('✅ Found driver by profile_id, user_id:', actualDriverUserId);
        } else {
          console.error('❌ Driver not found in driver_profiles table');
          console.error('❌ UserID search error:', userIdError);
          console.error('❌ ProfileID search error:', profileIdError);
          
          // Let's also check what drivers actually exist using ADMIN CLIENT
          const { data: allDrivers } = await supabaseAdmin
            .from('driver_profiles')
            .select('id, user_id, first_name, last_name')
            .limit(5);
          console.log('📋 Available drivers (admin query):', allDrivers);
          
          return { success: false, error: 'Driver not found' };
        }
      }

      const callData = {
        trip_id: tripId,
        caller_id: this.currentUserId,
        receiver_id: actualDriverUserId, // Use the correct user_id that exists in auth.users
        caller_type: 'customer' as const,
        call_type: callType,
        call_status: 'initiated' as const,
        initiated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('trip_call_logs')
        .insert(callData)
        .select()
        .single();

      if (error) {
        console.error('Failed to log call:', error);
        return { success: false, error: error.message };
      }

      // Here you would integrate with actual calling service (Twilio, etc.)
      console.log('📞 Call initiated:', data.id);
      
      return { success: true, callLog: data, phone: driverPhone };
    } catch (error) {
      console.error('Error initiating call:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Upload image to Supabase Storage
   */
  private async uploadImageToStorage(imageUri: string, path: string): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
    try {
      const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const filePath = `${path}/${filename}`;

      console.log('📤 Uploading image to storage...', { imageUri, filePath });

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to Uint8Array (React Native compatible)
      const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      console.log('📊 File info:', { size: byteArray.length, type: 'image/jpeg' });

      // Upload to Supabase using Uint8Array (no Blob needed)
      const { data, error } = await supabase.storage
        .from('trip-photos') // Changed from 'trip-images' to 'trip-photos'
        .upload(filePath, byteArray, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('❌ Storage upload error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Image uploaded to storage:', data.path);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('trip-photos')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL generated:', publicUrl);

      return { success: true, publicUrl };
    } catch (error) {
      console.error('❌ Error uploading to storage:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send notification for new message
   */
  private async notifyNewMessage(tripId: string, senderType: string): Promise<void> {
    try {
      // For now, we'll use the direct notification insert instead of the trip status method
      // TODO: Create a dedicated message notification method
      console.log(`📱 New message notification: ${senderType} sent a message in trip ${tripId}`);
    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  }

  /**
   * Send notification for photo upload
   */
  private async notifyPhotoUploaded(tripId: string, photoType: string): Promise<void> {
    try {
      // For now, we'll use a simple log instead of the incorrect notification call
      console.log(`📸 Photo notification: ${photoType} photo uploaded for trip ${tripId}`);
    } catch (error) {
      console.error('Error sending photo notification:', error);
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadMessageCount(): Promise<number> {
    try {
      if (!this.currentUserId) return 0;

      const { data, error } = await supabase.rpc('get_unread_message_count', {
        user_uuid: this.currentUserId
      });

      if (error) {
        console.error('Failed to get unread count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    this.messageSubscriptions.forEach((channel, tripId) => {
      channel.unsubscribe();
    });
    this.messageSubscriptions.clear();
  }
}

// Export singleton instance
export const communicationService = CommunicationService.getInstance();
export default communicationService;
