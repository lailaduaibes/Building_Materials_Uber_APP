/**
 * Real-time Trip Matching Service - Uber-style ASAP trip dispatch
 * Handles immediate driver matching, notifications, and assignment
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enhancedNotificationService } from './EnhancedNotificationService';

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
  driverId: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  vehicleType: string;
  lastUpdated: string;
}

interface TripRequest {
  id: string;
  tripId: string;
  driverId: string;
  customerLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimatedEarnings: number;
  estimatedDuration: number;
  materialType: string;
  acceptanceDeadline: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: Date;
}

class TripMatchingService {
  private activeRequests: Map<string, TripRequest> = new Map();
  private requestTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Configuration
  private readonly ACCEPTANCE_TIMEOUT = 15000; // 15 seconds like Uber
  private readonly MAX_SEARCH_RADIUS = 10; // 10 km max search radius
  private readonly MAX_DRIVERS_TO_TRY = 5; // Try up to 5 drivers before giving up

  /**
   * Main ASAP trip matching function - called when customer requests ASAP pickup
   */
  async matchASAPTrip(tripId: string): Promise<boolean> {
    try {
      console.log(`🚀 Starting ASAP matching for trip ${tripId}`);

      // 1. Get trip details
      const trip = await this.getTripDetails(tripId);
      if (!trip) {
        console.error('❌ Trip not found:', tripId);
        return false;
      }

      // 2. Only process ASAP trips
      if (trip.pickup_time_preference !== 'asap') {
        console.log('ℹ️ Trip is not ASAP, skipping real-time matching');
        return false;
      }

      // 3. Find nearby available drivers
      const nearbyDrivers = await this.findNearbyDrivers(
        trip.pickup_latitude,
        trip.pickup_longitude,
        trip.material_type,
        trip.estimated_weight_tons
      );

      if (nearbyDrivers.length === 0) {
        console.log('❌ No available drivers found for ASAP trip');
        await this.handleNoDriversAvailable(tripId);
        return false;
      }

      // 4. Start sequential matching process
      console.log(`📱 Found ${nearbyDrivers.length} nearby drivers, starting matching...`);
      return await this.startDriverMatching(trip, nearbyDrivers);

    } catch (error) {
      console.error('💥 Error in matchASAPTrip:', error);
      return false;
    }
  }

  /**
   * Find nearby available drivers sorted by distance
   */
  private async findNearbyDrivers(
    pickupLat: number, 
    pickupLng: number, 
    materialType: string,
    weightTons: number
  ): Promise<DriverLocation[]> {
    try {
      // Get online drivers with location data
      const { data: drivers, error } = await supabase
        .from('driver_locations')
        .select(`
          driver_id,
          latitude,
          longitude,
          updated_at,
          driver_profiles!inner(
            user_id,
            is_online,
            vehicle_type,
            max_weight_capacity,
            availability_status
          )
        `)
        .eq('driver_profiles.is_online', true)
        .eq('driver_profiles.availability_status', 'available')
        .gte('driver_profiles.max_weight_capacity', weightTons)
        .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Updated within 5 minutes

      if (error) throw error;

      if (!drivers || drivers.length === 0) {
        return [];
      }

      // Calculate distances and filter by radius
      const driversWithDistance = drivers
        .map((driver: any) => ({
          driverId: driver.driver_id,
          latitude: driver.latitude,
          longitude: driver.longitude,
          isOnline: Array.isArray(driver.driver_profiles) 
            ? driver.driver_profiles[0]?.is_online 
            : driver.driver_profiles?.is_online,
          vehicleType: Array.isArray(driver.driver_profiles)
            ? driver.driver_profiles[0]?.vehicle_type
            : driver.driver_profiles?.vehicle_type,
          lastUpdated: driver.updated_at,
          distance: this.calculateDistance(pickupLat, pickupLng, driver.latitude, driver.longitude)
        }))
        .filter((driver: any) => driver.distance <= this.MAX_SEARCH_RADIUS)
        .sort((a: any, b: any) => a.distance - b.distance) // Closest first
        .slice(0, this.MAX_DRIVERS_TO_TRY);

      console.log(`📍 Found ${driversWithDistance.length} drivers within ${this.MAX_SEARCH_RADIUS}km`);
      return driversWithDistance;

    } catch (error) {
      console.error('💥 Error finding nearby drivers:', error);
      return [];
    }
  }

  /**
   * Start sequential driver matching process
   */
  private async startDriverMatching(trip: any, drivers: DriverLocation[]): Promise<boolean> {
    let currentDriverIndex = 0;

    const tryNextDriver = async (): Promise<boolean> => {
      if (currentDriverIndex >= drivers.length) {
        console.log('❌ All drivers exhausted for trip:', trip.id);
        await this.handleAllDriversDeclined(trip.id);
        return false;
      }

      const driver = drivers[currentDriverIndex];
      console.log(`📱 Trying driver ${currentDriverIndex + 1}/${drivers.length}: ${driver.driverId}`);

      return new Promise((resolve) => {
        // Send trip request to current driver
        this.sendTripRequest(trip, driver)
          .then(requestId => {
            if (!requestId) {
              // Failed to send, try next driver
              currentDriverIndex++;
              resolve(tryNextDriver());
              return;
            }

            // Set timeout for driver response
            const timeout = setTimeout(async () => {
              console.log(`⏰ Driver ${driver.driverId} timeout, trying next driver`);
              this.handleDriverTimeout(requestId);
              currentDriverIndex++;
              resolve(await tryNextDriver());
            }, this.ACCEPTANCE_TIMEOUT);

            this.requestTimeouts.set(requestId, timeout);

            // Listen for driver response
            this.listenForDriverResponse(requestId, (accepted) => {
              clearTimeout(timeout);
              this.requestTimeouts.delete(requestId);
              
              if (accepted) {
                console.log(`✅ Driver ${driver.driverId} accepted trip ${trip.id}`);
                resolve(true);
              } else {
                console.log(`❌ Driver ${driver.driverId} declined trip ${trip.id}`);
                currentDriverIndex++;
                resolve(tryNextDriver());
              }
            });
          });
      });
    };

    return await tryNextDriver();
  }

  /**
   * Send trip request to specific driver
   */
  private async sendTripRequest(trip: any, driver: DriverLocation): Promise<string | null> {
    try {
      const requestId = `req_${Date.now()}_${driver.driverId}`;
      const acceptanceDeadline = new Date(Date.now() + this.ACCEPTANCE_TIMEOUT);

      const tripRequest: TripRequest = {
        id: requestId,
        tripId: trip.id,
        driverId: driver.driverId,
        customerLocation: {
          latitude: trip.pickup_latitude,
          longitude: trip.pickup_longitude,
          address: trip.pickup_address
        },
        estimatedEarnings: trip.quoted_price || 0,
        estimatedDuration: trip.estimated_duration_minutes || 30,
        materialType: trip.material_type || 'General Materials',
        acceptanceDeadline,
        status: 'pending',
        sentAt: new Date()
      };

      // Store active request
      this.activeRequests.set(requestId, tripRequest);

      // Send push notification to driver  
      console.log('📱 Sending trip request notification to driver');
      // TODO: Implement actual push notification
      // For now, the database insert will trigger driver app polling

      // Insert into database for driver app polling
      await supabase
        .from('trip_requests')
        .insert({
          id: requestId,
          trip_id: trip.id,
          driver_id: driver.driverId,
          pickup_address: trip.pickup_address,
          delivery_address: trip.delivery_address,
          material_type: trip.material_type,
          estimated_earnings: trip.quoted_price,
          estimated_duration: trip.estimated_duration_minutes,
          acceptance_deadline: acceptanceDeadline.toISOString(),
          status: 'pending',
          created_at: new Date().toISOString()
        });

      console.log(`📱 Trip request sent to driver ${driver.driverId}`);
      return requestId;

    } catch (error) {
      console.error('💥 Error sending trip request:', error);
      return null;
    }
  }

  /**
   * Listen for driver response (accept/decline)
   */
  private listenForDriverResponse(requestId: string, callback: (accepted: boolean) => void) {
    // Set up real-time subscription for driver response
    const subscription = supabase
      .channel(`trip_request_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trip_requests',
          filter: `id=eq.${requestId}`
        },
        (payload: any) => {
          const newStatus = payload.new.status;
          
          if (newStatus === 'accepted') {
            subscription.unsubscribe();
            callback(true);
          } else if (newStatus === 'declined') {
            subscription.unsubscribe();
            callback(false);
          }
        }
      )
      .subscribe();

    // Clean up subscription after timeout
    setTimeout(() => {
      subscription.unsubscribe();
    }, this.ACCEPTANCE_TIMEOUT + 5000);
  }

  /**
   * Handle driver timeout
   */
  private async handleDriverTimeout(requestId: string) {
    try {
      // Update request status to expired
      await supabase
        .from('trip_requests')
        .update({ status: 'expired' })
        .eq('id', requestId);

      this.activeRequests.delete(requestId);
    } catch (error) {
      console.error('💥 Error handling driver timeout:', error);
    }
  }

  /**
   * Handle when no drivers are available
   */
  private async handleNoDriversAvailable(tripId: string) {
    try {
      // Update trip status to indicate no drivers available
      await supabase
        .from('trips')
        .update({ 
          status: 'no_drivers_available',
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      // Notify customer
      console.log('📱 No drivers available, notifying customer');
      // await enhancedNotificationService.sendCustomerNotification(tripId, 'No drivers currently available');
    } catch (error) {
      console.error('💥 Error handling no drivers available:', error);
    }
  }

  /**
   * Handle when all drivers decline
   */
  private async handleAllDriversDeclined(tripId: string) {
    try {
      // Update trip status
      await supabase
        .from('trips')
        .update({ 
          status: 'no_drivers_accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      // Could implement surge pricing or expand search radius here
    } catch (error) {
      console.error('💥 Error handling all drivers declined:', error);
    }
  }

  /**
   * Get trip details from database
   */
  private async getTripDetails(tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('💥 Error getting trip details:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two points in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Public method for drivers to accept trip requests
   */
  async acceptTripRequest(requestId: string, driverId: string): Promise<boolean> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request || request.driverId !== driverId) {
        return false;
      }

      // Update request status
      await supabase
        .from('trip_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      // Assign trip to driver
      await supabase
        .from('trips')
        .update({
          driver_id: driverId,
          status: 'matched',
          matched_at: new Date().toISOString()
        })
        .eq('id', request.tripId);

      this.activeRequests.delete(requestId);
      return true;

    } catch (error) {
      console.error('💥 Error accepting trip request:', error);
      return false;
    }
  }

  /**
   * Public method for drivers to decline trip requests
   */
  async declineTripRequest(requestId: string, driverId: string): Promise<boolean> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request || request.driverId !== driverId) {
        return false;
      }

      // Update request status
      await supabase
        .from('trip_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      return true;

    } catch (error) {
      console.error('💥 Error declining trip request:', error);
      return false;
    }
  }
}

export const tripMatchingService = new TripMatchingService();
export { TripMatchingService };
