/**
 * Compatible Trip Matching Service - Works with existing trip_requests table
 * Uber-style ASAP trip dispatch using your current database schema
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  last_updated: string;
}

interface TripRequestData {
  id: string;
  trip_id?: string;
  driver_id: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address: any; // JSONB
  delivery_address: any; // JSONB
  material_type: string;
  estimated_earnings: number;
  estimated_duration: number;
  acceptance_deadline: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

class CompatibleTripMatchingService {
  private readonly ACCEPTANCE_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_SEARCH_RADIUS = 10; // 10 km
  private readonly MAX_DRIVERS_TO_TRY = 5;

  /**
   * Start ASAP matching for a trip request
   */
  async matchASAPTrip(tripRequestId: string): Promise<boolean> {
    try {
      console.log(`🚀 Starting ASAP matching for trip request ${tripRequestId}`);

      // Get the trip request details
      const tripRequest = await this.getTripRequestDetails(tripRequestId);
      if (!tripRequest) {
        console.error('❌ Trip request not found:', tripRequestId);
        return false;
      }

      // Only process if pickup_time_preference is ASAP
      if (tripRequest.pickup_time_preference !== 'asap') {
        console.log('ℹ️ Trip is not ASAP, skipping real-time matching');
        return false;
      }

      // Find nearby available drivers
      const nearbyDrivers = await this.findNearbyDrivers(
        tripRequest.pickup_latitude,
        tripRequest.pickup_longitude
      );

      if (nearbyDrivers.length === 0) {
        console.log('❌ No available drivers found');
        await this.handleNoDriversAvailable(tripRequestId);
        return false;
      }

      // Start sequential driver matching
      console.log(`📱 Found ${nearbyDrivers.length} nearby drivers`);
      return await this.startDriverMatching(tripRequest, nearbyDrivers);

    } catch (error) {
      console.error('💥 Error in matchASAPTrip:', error);
      return false;
    }
  }

  /**
   * Get trip request details from existing table
   */
  private async getTripRequestDetails(tripRequestId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('id', tripRequestId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('💥 Error getting trip request details:', error);
      return null;
    }
  }

  /**
   * Find nearby drivers using existing driver_locations table
   */
  private async findNearbyDrivers(
    pickupLat: number, 
    pickupLng: number
  ): Promise<DriverLocation[]> {
    try {
      // Use the SQL function we created
      const { data: drivers, error } = await supabase
        .rpc('find_nearby_drivers', {
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          max_distance_km: this.MAX_SEARCH_RADIUS,
          min_updated_minutes: 5
        });

      if (error) throw error;

      return (drivers || []).slice(0, this.MAX_DRIVERS_TO_TRY);
    } catch (error) {
      console.error('💥 Error finding nearby drivers:', error);
      return [];
    }
  }

  /**
   * Start sequential driver matching
   */
  private async startDriverMatching(tripRequest: any, drivers: DriverLocation[]): Promise<boolean> {
    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i];
      console.log(`📱 Trying driver ${i + 1}/${drivers.length}: ${driver.driver_id}`);

      try {
        // Create trip request for this driver
        const requestSuccess = await this.sendTripRequestToDriver(tripRequest, driver);
        
        if (requestSuccess) {
          // Wait for driver response (in real implementation, this would be event-driven)
          const accepted = await this.waitForDriverResponse(tripRequest.id, driver.driver_id);
          
          if (accepted) {
            console.log(`✅ Driver ${driver.driver_id} accepted trip ${tripRequest.id}`);
            return true;
          } else {
            console.log(`❌ Driver ${driver.driver_id} declined or timed out`);
            continue;
          }
        }
      } catch (error) {
        console.error(`💥 Error with driver ${driver.driver_id}:`, error);
        continue;
      }
    }

    console.log('❌ All drivers exhausted');
    await this.handleAllDriversDeclined(tripRequest.id);
    return false;
  }

  /**
   * Send trip request to specific driver
   */
  private async sendTripRequestToDriver(tripRequest: any, driver: DriverLocation): Promise<boolean> {
    try {
      const acceptanceDeadline = new Date(Date.now() + this.ACCEPTANCE_TIMEOUT);

      // Insert trip request using existing table structure
      const { error } = await supabase
        .from('trip_requests')
        .insert({
          trip_id: tripRequest.id, // Reference to original trip request
          driver_id: driver.driver_id,
          customer_id: tripRequest.customer_id,
          pickup_latitude: tripRequest.pickup_latitude,
          pickup_longitude: tripRequest.pickup_longitude,
          pickup_address: tripRequest.pickup_address,
          delivery_latitude: tripRequest.delivery_latitude,
          delivery_longitude: tripRequest.delivery_longitude,
          delivery_address: tripRequest.delivery_address,
          material_type: tripRequest.material_type,
          estimated_earnings: tripRequest.quoted_price || 0,
          estimated_duration: tripRequest.estimated_duration_minutes || 30,
          acceptance_deadline: acceptanceDeadline.toISOString(),
          status: 'pending'
        });

      if (error) throw error;

      console.log(`📱 Trip request sent to driver ${driver.driver_id}`);
      return true;
    } catch (error) {
      console.error('💥 Error sending trip request:', error);
      return false;
    }
  }

  /**
   * Wait for driver response (simplified polling - in production use real-time subscriptions)
   */
  private async waitForDriverResponse(tripRequestId: string, driverId: string): Promise<boolean> {
    const pollInterval = 1000; // Check every second
    const maxWaitTime = this.ACCEPTANCE_TIMEOUT;
    let waitedTime = 0;

    return new Promise((resolve) => {
      const checkResponse = async () => {
        try {
          const { data, error } = await supabase
            .from('trip_requests')
            .select('status')
            .eq('trip_id', tripRequestId)
            .eq('driver_id', driverId)
            .eq('status', 'accepted')
            .single();

          if (data) {
            resolve(true);
            return;
          }

          waitedTime += pollInterval;
          if (waitedTime >= maxWaitTime) {
            // Mark as expired
            await supabase
              .from('trip_requests')
              .update({ status: 'expired' })
              .eq('trip_id', tripRequestId)
              .eq('driver_id', driverId)
              .eq('status', 'pending');

            resolve(false);
            return;
          }

          setTimeout(checkResponse, pollInterval);
        } catch (error) {
          console.error('💥 Error checking response:', error);
          resolve(false);
        }
      };

      checkResponse();
    });
  }

  /**
   * Handle no drivers available
   */
  private async handleNoDriversAvailable(tripRequestId: string): Promise<void> {
    try {
      await supabase
        .from('trip_requests')
        .update({ status: 'no_drivers_available' })
        .eq('id', tripRequestId);
    } catch (error) {
      console.error('💥 Error handling no drivers available:', error);
    }
  }

  /**
   * Handle all drivers declined
   */
  private async handleAllDriversDeclined(tripRequestId: string): Promise<void> {
    try {
      await supabase
        .from('trip_requests')
        .update({ status: 'no_drivers_accepted' })
        .eq('id', tripRequestId);
    } catch (error) {
      console.error('💥 Error handling all drivers declined:', error);
    }
  }

  /**
   * Accept trip request (called by driver)
   */
  async acceptTripRequest(tripRequestId: string, driverId: string): Promise<boolean> {
    try {
      // Update the trip request status
      const { error: updateError } = await supabase
        .from('trip_requests')
        .update({ 
          status: 'accepted',
          matched_at: new Date().toISOString()
        })
        .eq('trip_id', tripRequestId)
        .eq('driver_id', driverId);

      if (updateError) throw updateError;

      // Update the original trip request with driver assignment
      const { error: assignError } = await supabase
        .from('trip_requests')
        .update({
          assigned_driver_id: driverId,
          status: 'matched',
          matched_at: new Date().toISOString()
        })
        .eq('id', tripRequestId);

      if (assignError) throw assignError;

      return true;
    } catch (error) {
      console.error('💥 Error accepting trip request:', error);
      return false;
    }
  }

  /**
   * Decline trip request (called by driver)
   */
  async declineTripRequest(tripRequestId: string, driverId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trip_requests')
        .update({ status: 'declined' })
        .eq('trip_id', tripRequestId)
        .eq('driver_id', driverId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('💥 Error declining trip request:', error);
      return false;
    }
  }
}

export const compatibleTripMatchingService = new CompatibleTripMatchingService();
export { CompatibleTripMatchingService };
