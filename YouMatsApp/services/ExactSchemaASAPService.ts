/**
 * ASAP Trip Matching Service - Compatible with YOUR EXACT Database Schema
 * Uses: trip_requests, driver_profiles, driver_locations
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface ASAPTripRequest {
  id: string;
  original_trip_id?: string;
  customer_id: string;
  pickup_latitude: string;
  pickup_longitude: string;
  pickup_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    formatted_address: string;
  };
  delivery_latitude: string;
  delivery_longitude: string;
  delivery_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    formatted_address: string;
  };
  material_type: string;
  estimated_weight_tons?: number;
  estimated_volume_m3?: number;
  load_description: string;
  special_requirements?: string;
  required_truck_type_id?: string;
  requires_crane: boolean;
  requires_hydraulic_lift: boolean;
  pickup_time_preference: 'asap' | 'scheduled';
  scheduled_pickup_time?: string;
  estimated_duration_minutes?: number;
  estimated_distance_km?: number;
  quoted_price?: number;
  final_price?: number;
  status: 'pending' | 'matched' | 'in_transit' | 'delivered' | 'accepted' | 'declined' | 'expired' | 'no_drivers_available' | 'matching';
  assigned_driver_id?: string;
  assigned_truck_id?: string;
  acceptance_deadline?: string;
  driver_request_sent_at?: string;
  matching_started_at?: string;
  matched_at?: string;
  pickup_started_at?: string;
  pickup_completed_at?: string;
  delivery_started_at?: string;
  delivered_at?: string;
  customer_rating?: number;
  customer_feedback?: string;
  driver_rating?: number;
  driver_feedback?: string;
  payment_status: 'pending' | 'paid' | 'failed';
  payment_method_id?: string;
  paid_amount?: number;
  payment_processed_at?: string;
  payment_transaction_id?: string;
  created_at: string;
}

export interface NearbyDriver {
  driver_id: string;
  driver_name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  last_updated: string;
  current_truck_id?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  rating: number;
  total_trips: number;
}

export class ExactSchemaASAPService {
  /**
   * Start ASAP matching for a trip request
   */
  static async startASAPMatching(tripRequestId: string): Promise<{
    success: boolean;
    message: string;
    driversFound: number;
  }> {
    try {
      console.log('[ASAP Service] Starting matching for trip:', tripRequestId);
      
      const { data, error } = await supabase.rpc('start_asap_matching', {
        trip_request_id: tripRequestId
      });

      if (error) {
        console.error('[ASAP Service] Matching error:', error);
        throw error;
      }

      const result = data[0];
      console.log('[ASAP Service] Matching result:', result);

      return {
        success: result.success,
        message: result.message,
        driversFound: result.drivers_found
      };
    } catch (error) {
      console.error('[ASAP Service] Start matching failed:', error);
      return {
        success: false,
        message: 'Failed to start matching process',
        driversFound: 0
      };
    }
  }

  /**
   * Get pending trip requests for a specific driver
   */
  static async getPendingRequestsForDriver(driverId: string): Promise<ASAPTripRequest[]> {
    try {
      const { data, error } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('assigned_driver_id', driverId)
        .eq('status', 'pending')
        .not('acceptance_deadline', 'is', null)
        .gt('acceptance_deadline', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ASAP Service] Get pending requests error:', error);
        throw error;
      }

      console.log(`[ASAP Service] Found ${data?.length || 0} pending requests for driver ${driverId}`);
      return data || [];
    } catch (error) {
      console.error('[ASAP Service] Get pending requests failed:', error);
      return [];
    }
  }

  /**
   * Accept a trip request
   */
  static async acceptTripRequest(requestId: string, driverId: string): Promise<{
    success: boolean;
    message: string;
    originalTripId?: string;
  }> {
    try {
      console.log('[ASAP Service] Driver accepting request:', requestId);

      const { data, error } = await supabase.rpc('accept_trip_request', {
        request_id: requestId,
        accepting_driver_id: driverId
      });

      if (error) {
        console.error('[ASAP Service] Accept error:', error);
        throw error;
      }

      const result = data[0];
      console.log('[ASAP Service] Accept result:', result);

      return {
        success: result.success,
        message: result.message,
        originalTripId: result.original_trip_id
      };
    } catch (error) {
      console.error('[ASAP Service] Accept request failed:', error);
      return {
        success: false,
        message: 'Failed to accept request'
      };
    }
  }

  /**
   * Decline a trip request
   */
  static async declineTripRequest(requestId: string, driverId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log('[ASAP Service] Driver declining request:', requestId);

      const { data, error } = await supabase.rpc('decline_trip_request', {
        request_id: requestId,
        declining_driver_id: driverId
      });

      if (error) {
        console.error('[ASAP Service] Decline error:', error);
        throw error;
      }

      const result = data[0];
      console.log('[ASAP Service] Decline result:', result);

      return {
        success: result.success,
        message: result.message
      };
    } catch (error) {
      console.error('[ASAP Service] Decline request failed:', error);
      return {
        success: false,
        message: 'Failed to decline request'
      };
    }
  }

  /**
   * Find nearby available drivers
   */
  static async findNearbyDrivers(
    pickupLat: number,
    pickupLng: number,
    maxDistanceKm: number = 10,
    requiredTruckTypeId?: string
  ): Promise<NearbyDriver[]> {
    try {
      const { data, error } = await supabase.rpc('find_nearby_available_drivers', {
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        max_distance_km: maxDistanceKm,
        min_updated_minutes: 5,
        required_truck_type_id: requiredTruckTypeId || null
      });

      if (error) {
        console.error('[ASAP Service] Find drivers error:', error);
        throw error;
      }

      console.log(`[ASAP Service] Found ${data?.length || 0} nearby drivers`);
      return data || [];
    } catch (error) {
      console.error('[ASAP Service] Find nearby drivers failed:', error);
      return [];
    }
  }

  /**
   * Update driver availability status
   */
  static async updateDriverAvailability(driverId: string, isAvailable: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({ 
          is_available: isAvailable,
          status: isAvailable ? 'online' : 'offline',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', driverId);

      if (error) {
        console.error('[ASAP Service] Update availability error:', error);
        throw error;
      }

      console.log(`[ASAP Service] Driver ${driverId} availability updated to ${isAvailable}`);
      return true;
    } catch (error) {
      console.error('[ASAP Service] Update availability failed:', error);
      return false;
    }
  }

  /**
   * Update driver location - SIMPLIFIED to use existing location system
   */
  static async updateDriverLocation(
    driverId: string, 
    latitude: number, 
    longitude: number
  ): Promise<boolean> {
    try {
      // Use the same location system as live tracking (users table)
      const { error } = await supabase
        .from('users')
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          last_location_update: new Date().toISOString()
        })
        .eq('id', driverId);

      if (error) {
        console.error('[ASAP Service] Update location error:', error);
        throw error;
      }

      console.log(`[ASAP Service] Driver ${driverId} location updated in users table`);
      return true;
    } catch (error) {
      console.error('[ASAP Service] Update location failed:', error);
      return false;
    }
  }

  /**
   * Subscribe to pending trip requests for a driver
   */
  static subscribeToPendingRequests(
    driverId: string,
    onNewRequest: (request: ASAPTripRequest) => void,
    onRequestUpdate: (request: ASAPTripRequest) => void
  ) {
    console.log(`[ASAP Service] Setting up subscription for driver ${driverId}`);

    const subscription = supabase
      .channel(`driver_requests_${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_requests',
          filter: `assigned_driver_id=eq.${driverId}`
        },
        (payload) => {
          console.log('[ASAP Service] New trip request:', payload.new);
          const request = payload.new as ASAPTripRequest;
          
          // Only notify for pending requests with deadline
          if (request.status === 'pending' && request.acceptance_deadline) {
            onNewRequest(request);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trip_requests',
          filter: `assigned_driver_id=eq.${driverId}`
        },
        (payload) => {
          console.log('[ASAP Service] Trip request updated:', payload.new);
          onRequestUpdate(payload.new as ASAPTripRequest);
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Cleanup expired requests (should be called periodically)
   */
  static async cleanupExpiredRequests(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_requests');

      if (error) {
        console.error('[ASAP Service] Cleanup error:', error);
        throw error;
      }

      const cleanedCount = data || 0;
      if (cleanedCount > 0) {
        console.log(`[ASAP Service] Cleaned up ${cleanedCount} expired requests`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('[ASAP Service] Cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get trip request by ID
   */
  static async getTripRequest(requestId: string): Promise<ASAPTripRequest | null> {
    try {
      const { data, error } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) {
        console.error('[ASAP Service] Get trip request error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('[ASAP Service] Get trip request failed:', error);
      return null;
    }
  }
}
