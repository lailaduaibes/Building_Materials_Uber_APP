/**
 * Enhanced LocationTrackingService with Real Supabase Integration
 * Extends existing LocationTrackingService with real-time subscriptions
 */

import { createClient } from '@supabase/supabase-js';
import { locationService } from '../LocationTrackingService';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

const supabase = createClient(supabaseUrl, supabaseKey);

export interface RealTimeTrackingUpdate {
  tripId: string;
  driverId: string;
  currentLocation: LocationCoordinates;
  status: string;
  estimatedArrival: string;
  distanceRemaining: number;
}

class EnhancedTrackingService {
  private subscriptions: Map<string, any> = new Map();

  /**
   * Subscribe to real-time tracking updates for a trip
   */
  subscribeToTripTracking(
    tripId: string,
    onUpdate: (update: RealTimeTrackingUpdate) => void
  ): () => void {
    const subscription = supabase
      .channel(`trip_tracking_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_tracking',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          const data = payload.new as any;
          const update: RealTimeTrackingUpdate = {
            tripId: data.trip_id,
            driverId: data.driver_id,
            currentLocation: {
              latitude: data.current_latitude,
              longitude: data.current_longitude,
              timestamp: new Date(data.created_at).getTime(),
              speed: data.speed_kmh,
              heading: data.heading
            },
            status: data.status_update || 'in_transit',
            estimatedArrival: data.estimated_arrival,
            distanceRemaining: data.distance_to_destination_km * 1000 // Convert to meters
          };
          onUpdate(update);
        }
      )
      .subscribe();

    this.subscriptions.set(tripId, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(tripId);
    };
  }

  /**
   * Subscribe to trip status changes
   */
  subscribeToTripStatus(
    tripId: string,
    onStatusChange: (status: string, trip: any) => void
  ): () => void {
    const subscription = supabase
      .channel(`trip_status_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trip_requests',
          filter: `id=eq.${tripId}`
        },
        (payload) => {
          const trip = payload.new as any;
          onStatusChange(trip.status, trip);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Save driver location to trip_tracking table
   */
  async saveDriverLocation(
    tripId: string,
    driverId: string,
    truckId: string,
    location: LocationCoordinates,
    statusUpdate?: string
  ): Promise<boolean> {
    try {
      // Get trip details for ETA calculation
      const { data: trip } = await supabase
        .from('trip_requests')
        .select('delivery_latitude, delivery_longitude')
        .eq('id', tripId)
        .single();

      if (!trip) return false;

      // Calculate distance to destination
      const distanceKm = locationService.calculateDistance(
        location,
        {
          latitude: trip.delivery_latitude,
          longitude: trip.delivery_longitude,
          timestamp: Date.now()
        }
      ) / 1000;

      // Calculate ETA
      const eta = locationService.calculateETA(
        location,
        {
          latitude: trip.delivery_latitude,
          longitude: trip.delivery_longitude,
          timestamp: Date.now()
        }
      );

      const estimatedArrival = new Date(Date.now() + eta.durationSeconds * 1000);

      // Save to trip_tracking table
      const { error } = await supabase
        .from('trip_tracking')
        .insert([{
          trip_id: tripId,
          driver_id: driverId,
          truck_id: truckId,
          current_latitude: location.latitude,
          current_longitude: location.longitude,
          heading: location.heading || null,
          speed_kmh: location.speed ? location.speed * 3.6 : null, // Convert m/s to km/h
          distance_to_destination_km: distanceKm,
          estimated_arrival: estimatedArrival.toISOString(),
          status_update: statusUpdate || 'in_transit',
          created_at: new Date().toISOString()
        }]);

      return !error;
    } catch (error) {
      console.error('Error saving driver location:', error);
      return false;
    }
  }

  /**
   * Get latest tracking data for a trip
   */
  async getLatestTrackingData(tripId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('trip_tracking')
        .select(`
          *,
          trip_requests!inner(
            pickup_address,
            delivery_address,
            customer_id,
            assigned_driver_id
          ),
          users!trip_tracking_driver_id_fkey(
            first_name,
            last_name,
            phone
          )
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) return null;

      return {
        tripId: data.trip_id,
        driverId: data.driver_id,
        driverName: `${data.users?.first_name} ${data.users?.last_name}`,
        driverPhone: data.users?.phone,
        currentLocation: {
          latitude: data.current_latitude,
          longitude: data.current_longitude,
          speed: data.speed_kmh,
          heading: data.heading,
          timestamp: new Date(data.created_at).getTime()
        },
        distanceRemaining: data.distance_to_destination_km * 1000,
        estimatedArrival: new Date(data.estimated_arrival).getTime(),
        statusUpdate: data.status_update,
        pickupAddress: data.trip_requests.pickup_address,
        deliveryAddress: data.trip_requests.delivery_address
      };
    } catch (error) {
      console.error('Error getting tracking data:', error);
      return null;
    }
  }

  /**
   * Update trip status with geofencing detection
   */
  async updateTripStatusWithGeofence(
    tripId: string,
    currentLocation: LocationCoordinates,
    pickupLocation: LocationCoordinates,
    deliveryLocation: LocationCoordinates
  ): Promise<void> {
    try {
      const pickupDistance = locationService.calculateDistance(currentLocation, pickupLocation);
      const deliveryDistance = locationService.calculateDistance(currentLocation, deliveryLocation);

      let newStatus = 'in_transit';
      let statusUpdate = 'Driver en route';

      // Geofencing logic
      if (pickupDistance < 100) { // Within 100m of pickup
        newStatus = 'at_pickup';
        statusUpdate = 'Driver arrived at pickup location';
      } else if (deliveryDistance < 100) { // Within 100m of delivery
        newStatus = 'at_delivery';
        statusUpdate = 'Driver arrived at delivery location';
      } else if (deliveryDistance < 500) { // Within 500m of delivery
        newStatus = 'nearby';
        statusUpdate = 'Driver nearby, arriving soon';
      }

      // Update trip status
      await supabase
        .from('trip_requests')
        .update({ status: newStatus })
        .eq('id', tripId);

      console.log(`Trip ${tripId} status updated: ${newStatus}`);
    } catch (error) {
      console.error('Error updating trip status:', error);
    }
  }

  /**
   * Start real-time tracking for a driver
   */
  async startDriverTracking(
    tripId: string,
    driverId: string,
    truckId: string
  ): Promise<boolean> {
    try {
      const hasPermissions = await locationService.requestPermissions();
      if (!hasPermissions) return false;

      // Get trip details
      const { data: trip } = await supabase
        .from('trip_requests')
        .select('pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude')
        .eq('id', tripId)
        .single();

      if (!trip) return false;

      const pickupLocation: LocationCoordinates = {
        latitude: trip.pickup_latitude,
        longitude: trip.pickup_longitude,
        timestamp: Date.now()
      };

      const deliveryLocation: LocationCoordinates = {
        latitude: trip.delivery_latitude,
        longitude: trip.delivery_longitude,
        timestamp: Date.now()
      };

      // Start location tracking
      const success = await locationService.startLocationTracking(
        async (location: LocationCoordinates) => {
          // Save location to database
          await this.saveDriverLocation(tripId, driverId, truckId, location);
          
          // Check geofencing and update status
          await this.updateTripStatusWithGeofence(
            tripId,
            location,
            pickupLocation,
            deliveryLocation
          );
        },
        true // High accuracy for driver tracking
      );

      return success;
    } catch (error) {
      console.error('Error starting driver tracking:', error);
      return false;
    }
  }

  /**
   * Stop tracking and cleanup subscriptions
   */
  stopAllTracking(): void {
    locationService.stopLocationTracking();
    
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    
    this.subscriptions.clear();
  }
}

export const enhancedTrackingService = new EnhancedTrackingService();
export default enhancedTrackingService;
