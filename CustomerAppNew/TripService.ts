/**
 * TripService - Service for managing trip requests and history
 * Connects to Supabase trip_requests table
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the correct Supabase URL and key that matches authentication
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface TripRequest {
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
  estimated_volume_m3?: number;
  load_description: string;
  special_requirements?: any;
  required_truck_type_id?: string;
  requires_crane: boolean;
  requires_hydraulic_lift: boolean;
  pickup_time_preference: string;
  scheduled_pickup_time?: string;
  estimated_duration_minutes?: number;
  estimated_distance_km?: number;
  quoted_price?: number;
  final_price?: number;
  status: 'pending' | 'matched' | 'driver_en_route' | 'at_pickup' | 'loaded' | 'in_transit' | 'at_delivery' | 'delivered' | 'cancelled' | 'failed';
  assigned_driver_id?: string;
  assigned_truck_id?: string;
  created_at: string;
  matched_at?: string;
  pickup_started_at?: string;
  pickup_completed_at?: string;
  delivery_started_at?: string;
  delivered_at?: string;
  customer_rating?: number;
  customer_feedback?: string;
  driver_rating?: number;
  driver_feedback?: string;
}

// Transform trip request to Order format for compatibility with existing UI
export interface TripOrder {
  id: string;
  orderNumber: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  items: Array<{
    materialName: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    totalPrice: number;
  }>;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  finalAmount: number;
  orderDate: string;
  estimatedDelivery?: string;
  driverName?: string;
}

class TripService {
  /**
   * Get trip history for the current user
   */
  async getTripHistory(): Promise<TripOrder[]> {
    try {
      // Get current user
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        console.log('User not authenticated, returning empty trip history');
        return [];
      }

      // Fetch trip requests from Supabase
      const { data: trips, error: tripsError } = await supabase
        .from('trip_requests')
        .select(`
          *,
          users!trip_requests_assigned_driver_id_fkey(full_name)
        `)
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (tripsError) {
        console.warn('Failed to fetch trips from Supabase:', tripsError.message);
        return [];
      }

      if (!trips || trips.length === 0) {
        console.log('No trips found for user');
        return [];
      }

      // Transform Supabase trip data to Order format for UI compatibility
      const transformedTrips: TripOrder[] = trips.map((trip: any) => {
        // Parse addresses
        const pickupAddr = trip.pickup_address || {};
        const deliveryAddr = trip.delivery_address || {};
        
        // Map trip status to order status
        const statusMap: { [key: string]: TripOrder['status'] } = {
          'pending': 'pending',
          'matched': 'assigned', 
          'driver_en_route': 'assigned',
          'at_pickup': 'picked_up',
          'loaded': 'picked_up',
          'in_transit': 'in_transit',
          'at_delivery': 'in_transit',
          'delivered': 'delivered',
          'cancelled': 'cancelled',
          'failed': 'cancelled'
        };

        return {
          id: trip.id,
          orderNumber: `TR-${trip.id.substring(0, 8).toUpperCase()}`,
          status: statusMap[trip.status] || 'pending',
          items: [{
            materialName: trip.material_type,
            quantity: trip.estimated_weight_tons || 1,
            unit: trip.estimated_weight_tons ? 'tons' : 'load',
            pricePerUnit: trip.quoted_price || 0,
            totalPrice: trip.final_price || trip.quoted_price || 0
          }],
          deliveryAddress: {
            street: deliveryAddr.street || 'Unknown address',
            city: deliveryAddr.city || 'Unknown city',
            state: deliveryAddr.state || 'Unknown state',
            zipCode: deliveryAddr.zipCode || deliveryAddr.postal_code || '00000'
          },
          finalAmount: trip.final_price || trip.quoted_price || 0,
          orderDate: trip.created_at,
          estimatedDelivery: trip.scheduled_pickup_time || undefined,
          driverName: trip.users?.full_name || undefined
        };
      });

      console.log(`Loaded ${transformedTrips.length} trips for user`);
      return transformedTrips;
    } catch (error) {
      console.error('Error fetching trip history:', error);
      return [];
    }
  }

  /**
   * Get a specific trip by ID
   */
  async getTripById(tripId: string): Promise<TripRequest | null> {
    try {
      const { data: trip, error } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) {
        console.error('Error fetching trip:', error);
        return null;
      }

      return trip;
    } catch (error) {
      console.error('Error fetching trip by ID:', error);
      return null;
    }
  }

  /**
   * Get active/ongoing trips for the current user
   */
  async getActiveTrips(): Promise<TripRequest[]> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        return [];
      }

      const { data: trips, error: tripsError } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('customer_id', session.user.id)
        .in('status', ['pending', 'matched', 'driver_en_route', 'at_pickup', 'loaded', 'in_transit', 'at_delivery'])
        .order('created_at', { ascending: false });

      if (tripsError) {
        console.error('Error fetching active trips:', tripsError);
        return [];
      }

      return trips || [];
    } catch (error) {
      console.error('Error fetching active trips:', error);
      return [];
    }
  }
}

export const tripService = new TripService();
export default tripService;
