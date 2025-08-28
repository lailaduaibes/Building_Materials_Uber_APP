/**
 * Simplified ASAP Service - Direct polling approach
 * No complex SQL triggers - just simple polling and notifications
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface SimpleASAPTrip {
  id: string;
  customer_id: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address: any;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_address: any;
  material_type: string;
  estimated_weight_tons?: number;
  load_description: string;
  special_requirements?: any;
  quoted_price: number;
  pickup_time_preference: string;
  status: string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  distance_km?: number;
}

export class SimplifiedASAPService {
  private static pollingInterval: NodeJS.Timeout | null = null;
  private static isPolling = false;
  private static callbacks: {
    onNewASAP: (trip: SimpleASAPTrip) => void;
    onASAPUpdate: (trip: SimpleASAPTrip) => void;
  } | null = null;
  private static seenTripIds = new Set<string>();
  private static currentDriverId: string | null = null;
  private static currentLocation: { latitude: number; longitude: number } | null = null;

  /**
   * Start monitoring for ASAP trips near the driver
   */
  static startMonitoring(
    driverId: string,
    driverLocation: { latitude: number; longitude: number },
    onNewASAP: (trip: SimpleASAPTrip) => void,
    onASAPUpdate: (trip: SimpleASAPTrip) => void
  ) {
    console.log(`[Simplified ASAP] 🚨 Starting ASAP monitoring for driver: ${driverId}`);
    console.log(`[Simplified ASAP] 📍 Driver location:`, driverLocation);

    // Stop existing monitoring
    this.stopMonitoring();

    // Set up new monitoring
    this.currentDriverId = driverId;
    this.currentLocation = driverLocation;
    this.callbacks = { onNewASAP, onASAPUpdate };
    this.isPolling = true;
    this.seenTripIds.clear();

    // Start polling every 3 seconds
    this.pollingInterval = setInterval(() => {
      this.checkForASAPTrips();
    }, 3000);

    // Do initial check
    this.checkForASAPTrips();
  }

  /**
   * Update driver location for proximity matching
   */
  static updateDriverLocation(location: { latitude: number; longitude: number }) {
    this.currentLocation = location;
    console.log(`[Simplified ASAP] 📍 Updated driver location:`, location);
  }

  /**
   * Stop monitoring
   */
  static stopMonitoring() {
    console.log(`[Simplified ASAP] 🛑 Stopping ASAP monitoring`);
    this.isPolling = false;
    this.currentDriverId = null;
    this.currentLocation = null;
    this.callbacks = null;
    this.seenTripIds.clear();
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Check for nearby ASAP trips
   */
  private static async checkForASAPTrips() {
    if (!this.isPolling || !this.currentDriverId || !this.currentLocation || !this.callbacks) {
      return;
    }

    try {
      console.log(`[Simplified ASAP] 🔍 Checking for ASAP trips...`);

      const { data: trips, error } = await supabase
        .from('trip_requests')
        .select(`
          *,
          users!inner(first_name, last_name, phone)
        `)
        .eq('pickup_time_preference', 'asap')
        .eq('status', 'pending')
        .is('assigned_driver_id', null)
        .gt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Only trips from last 10 minutes
        .limit(10);

      if (error) {
        console.error('[Simplified ASAP] Query error:', error);
        return;
      }

      if (!trips || trips.length === 0) {
        console.log(`[Simplified ASAP] No ASAP trips found`);
        return;
      }

      console.log(`[Simplified ASAP] Found ${trips.length} ASAP trips, filtering by distance...`);

      for (const trip of trips) {
        // Calculate distance
        const distance = this.calculateDistance(
          this.currentLocation.latitude,
          this.currentLocation.longitude,
          parseFloat(trip.pickup_latitude),
          parseFloat(trip.pickup_longitude)
        );

        console.log(`[Simplified ASAP] Trip ${trip.id.substring(0, 8)}: ${distance.toFixed(1)}km away`);

        // Only notify for trips within 10km and not seen before
        if (distance <= 10 && !this.seenTripIds.has(trip.id)) {
          console.log(`[Simplified ASAP] 🚨 NEW NEARBY ASAP TRIP FOUND!`, {
            id: trip.id.substring(0, 8),
            distance: `${distance.toFixed(1)}km`,
            material: trip.material_type,
            customer: trip.users?.first_name || 'Unknown'
          });

          const asapTrip: SimpleASAPTrip = {
            ...trip,
            customer_name: trip.users ? `${trip.users.first_name} ${trip.users.last_name}` : 'Unknown',
            customer_phone: trip.users?.phone || '',
            distance_km: distance
          };

          this.seenTripIds.add(trip.id);
          this.callbacks.onNewASAP(asapTrip);
        }
      }
    } catch (error) {
      console.error('[Simplified ASAP] Check failed:', error);
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Accept an ASAP trip
   */
  static async acceptTrip(tripId: string, driverId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[Simplified ASAP] 🚚 Driver ${driverId} accepting trip ${tripId}`);

      const { data, error } = await supabase
        .from('trip_requests')
        .update({
          assigned_driver_id: driverId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId)
        .eq('status', 'pending')
        .is('assigned_driver_id', null);

      if (error) {
        console.error('[Simplified ASAP] Accept error:', error);
        return { success: false, message: 'Failed to accept trip' };
      }

      console.log(`[Simplified ASAP] ✅ Trip accepted successfully`);
      return { success: true, message: 'Trip accepted successfully!' };
    } catch (error) {
      console.error('[Simplified ASAP] Accept failed:', error);
      return { success: false, message: 'Failed to accept trip' };
    }
  }

  /**
   * Decline an ASAP trip (just ignore it)
   */
  static async declineTrip(tripId: string): Promise<{ success: boolean; message: string }> {
    console.log(`[Simplified ASAP] ❌ Declining trip ${tripId}`);
    // For now, just ignore the trip - it will remain available for other drivers
    return { success: true, message: 'Trip declined' };
  }
}
