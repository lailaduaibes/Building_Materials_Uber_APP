// TripService.ts - Handles trip requests with shared authentication
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Supabase client with CORRECT URL matching authentication
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

export interface TripRequest {
  id?: string;
  customer_id?: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    formatted_address: string;
  };
  delivery_latitude: number;
  delivery_longitude: number;
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
  special_requirements?: any;
  required_truck_type_id?: string;
  requires_crane?: boolean;
  requires_hydraulic_lift?: boolean;
  pickup_time_preference?: 'asap' | 'scheduled';
  scheduled_pickup_time?: string;
  quoted_price?: number;
  status?: string;
  assigned_driver_id?: string;
  assigned_truck_id?: string;
  created_at?: string;
}

export interface TruckType {
  id: string;
  name: string;
  description: string;
  payload_capacity: number;
  volume_capacity: number;
  suitable_materials: string[];
  base_rate_per_km: number;
  base_rate_per_hour: number;
  icon_url?: string;
}

export interface AvailableDriver {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  current_latitude?: number;
  current_longitude?: number;
  truck_id?: string;
  truck_type?: string;
  rating?: number;
  distance_km?: number;
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
  // Get available truck types
  async getTruckTypes(): Promise<TruckType[]> {
    try {
      const { data, error } = await supabase
        .from('truck_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching truck types:', error);
      // Return fallback data if database query fails
      return [
        {
          id: '1',
          name: 'Small Truck',
          description: 'Perfect for small deliveries and urban areas',
          payload_capacity: 2.0,
          volume_capacity: 8.0,
          suitable_materials: ['Hardware', 'Tools', 'Small Materials'],
          base_rate_per_km: 2.50,
          base_rate_per_hour: 40.00
        },
        {
          id: '2',
          name: 'Flatbed Truck',
          description: 'Open platform truck for steel, lumber, and large materials',
          payload_capacity: 10.0,
          volume_capacity: 15.0,
          suitable_materials: ['Steel', 'Lumber', 'Concrete Blocks', 'Pipes'],
          base_rate_per_km: 3.50,
          base_rate_per_hour: 75.00
        },
        {
          id: '3',
          name: 'Dump Truck',
          description: 'Truck with hydraulic dump bed for loose materials',
          payload_capacity: 15.0,
          volume_capacity: 8.0,
          suitable_materials: ['Sand', 'Gravel', 'Crushed Stone', 'Soil'],
          base_rate_per_km: 3.00,
          base_rate_per_hour: 65.00
        }
      ];
    }
  }

  // Calculate estimated price for a trip
  async calculateTripPrice(
    pickupLat: number,
    pickupLng: number,
    deliveryLat: number,
    deliveryLng: number,
    truckTypeId: string,
    estimatedWeight?: number
  ): Promise<number> {
    try {
      // Calculate distance (simplified Haversine formula)
      const distance = this.calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
      
      // Get truck type pricing
      const { data: truckType } = await supabase
        .from('truck_types')
        .select('base_rate_per_km, base_rate_per_hour')
        .eq('id', truckTypeId)
        .single();

      const baseRatePerKm = truckType?.base_rate_per_km || 3.00;
      const baseRatePerHour = truckType?.base_rate_per_hour || 50.00;
      
      // Estimate travel time (assuming 40 km/h average speed in city)
      const estimatedHours = distance / 40;
      
      // Calculate price: base rate + distance rate + weight multiplier
      let basePrice = (distance * baseRatePerKm) + (estimatedHours * baseRatePerHour);
      
      // Add weight-based pricing
      if (estimatedWeight && estimatedWeight > 5) {
        basePrice *= (1 + (estimatedWeight - 5) * 0.1); // 10% extra per ton over 5 tons
      }
      
      // Minimum charge
      const minimumCharge = 50.00;
      return Math.max(basePrice, minimumCharge);
      
    } catch (error) {
      console.error('Error calculating trip price:', error);
      return 75.00; // Default fallback price
    }
  }

  // Calculate distance between two points (in kilometers)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Create a new trip request
  async createTripRequest(tripData: TripRequest): Promise<{ success: boolean; tripId?: string; error?: string }> {
    try {
      console.log('🚛 Creating trip request...');
      
      // First, check if we have a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        return { success: false, error: 'Authentication session error: ' + sessionError.message };
      }

      if (!session) {
        console.error('❌ No active session found');
        return { success: false, error: 'No active session. Please log in again.' };
      }

      console.log('✅ Found active session for user:', session.user.email);

      // Get user info from Supabase Auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ User authentication error:', userError);
        return { success: false, error: 'User authentication failed. Please log in again.' };
      }

      console.log('✅ User authenticated:', user.email, 'Auth ID:', user.id);

      console.log('✅ User authenticated:', user.email, 'ID:', user.id);

      // Calculate estimated price
      const estimatedPrice = await this.calculateTripPrice(
        tripData.pickup_latitude,
        tripData.pickup_longitude,
        tripData.delivery_latitude,
        tripData.delivery_longitude,
        tripData.required_truck_type_id || '1',
        tripData.estimated_weight_tons
      );

      const tripRequest = {
        ...tripData,
        customer_id: user.id, // Use auth user ID (now synchronized with database)
        quoted_price: estimatedPrice,
        status: 'pending',
        estimated_distance_km: this.calculateDistance(
          tripData.pickup_latitude,
          tripData.pickup_longitude,
          tripData.delivery_latitude,
          tripData.delivery_longitude
        )
      };

      console.log('🚛 Inserting trip request for customer:', user.id, `(${user.email})`);

      const { data, error } = await supabase
        .from('trip_requests')
        .insert([tripRequest])
        .select()
        .single();

      if (error) throw error;

      // Start looking for drivers
      this.findAvailableDrivers(data.id);

      return { success: true, tripId: data.id };
    } catch (error) {
      console.error('Error creating trip request:', error);
      return { success: false, error: 'Failed to create trip request' };
    }
  }

  // Find available drivers near pickup location
  async findAvailableDrivers(tripId: string): Promise<AvailableDriver[]> {
    try {
      // Get trip details
      const { data: trip } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('id', tripId)
        .single();

      if (!trip) return [];

      // Find available drivers within 20km radius
      const { data: drivers, error } = await supabase
        .from('users')
        .select(`
          id, first_name, last_name, phone, 
          current_latitude, current_longitude,
          trucks!trucks_current_driver_id_fkey(id, truck_type_id, truck_types(name))
        `)
        .eq('user_type', 'driver')
        .eq('is_online', true)
        .not('current_latitude', 'is', null)
        .not('current_longitude', 'is', null);

      if (error) throw error;

      // Calculate distances and filter by proximity
      const availableDrivers: AvailableDriver[] = [];
      
      drivers?.forEach((driver: any) => {
        if (driver.current_latitude && driver.current_longitude) {
          const distance = this.calculateDistance(
            trip.pickup_latitude,
            trip.pickup_longitude,
            driver.current_latitude,
            driver.current_longitude
          );

          if (distance <= 20) { // Within 20km
            availableDrivers.push({
              id: driver.id,
              first_name: driver.first_name,
              last_name: driver.last_name,
              phone: driver.phone,
              current_latitude: driver.current_latitude,
              current_longitude: driver.current_longitude,
              distance_km: distance,
              // Add truck info if available
              truck_id: driver.trucks?.[0]?.id,
              truck_type: driver.trucks?.[0]?.truck_types?.name
            });
          }
        }
      });

      // Sort by distance (closest first)
      availableDrivers.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));

      return availableDrivers;
    } catch (error) {
      console.error('Error finding available drivers:', error);
      return [];
    }
  }

  // Get user's trip requests
  async getUserTrips(): Promise<TripRequest[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('trip_requests')
        .select(`
          *,
          truck_types(name, description),
          assigned_driver:users!trip_requests_assigned_driver_id_fkey(first_name, last_name, phone)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user trips:', error);
      return [];
    }
  }

  // Get trip by ID with real-time updates
  async getTripById(tripId: string): Promise<TripRequest | null> {
    try {
      const { data, error } = await supabase
        .from('trip_requests')
        .select(`
          *,
          truck_types(name, description),
          assigned_driver:users!trip_requests_assigned_driver_id_fkey(first_name, last_name, phone),
          trip_tracking(current_latitude, current_longitude, status_update, created_at)
        `)
        .eq('id', tripId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching trip:', error);
      return null;
    }
  }

  // Cancel a trip
  async cancelTrip(tripId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('trip_requests')
        .update({ status: 'cancelled' })
        .eq('id', tripId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error cancelling trip:', error);
      return { success: false, error: 'Failed to cancel trip' };
    }
  }

  // Subscribe to trip status updates
  subscribeToTripUpdates(tripId: string, callback: (trip: any) => void) {
    return supabase
      .channel(`trip-${tripId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'trip_requests',
          filter: `id=eq.${tripId}`
        }, 
        callback
      )
      .subscribe();
  }

  // Get current authenticated user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // Get trip history for the authenticated user
  async getTripHistory(): Promise<TripOrder[]> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const { data, error } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('customer_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trip history:', error);
        throw error;
      }

      // Transform trip requests to TripOrder format
      return data.map(trip => ({
        id: trip.id,
        orderNumber: `TR-${trip.id.slice(0, 8)}`,
        status: trip.status || 'pending',
        items: [{
          materialName: trip.material_type || 'Building Material',
          quantity: trip.estimated_weight_tons || 1,
          unit: trip.estimated_weight_tons ? 'tons' : 'units',
          pricePerUnit: trip.quoted_price || 0,
          totalPrice: trip.quoted_price || 0
        }],
        deliveryAddress: {
          street: trip.delivery_address?.street || 'Unknown',
          city: trip.delivery_address?.city || 'Unknown',
          state: trip.delivery_address?.state || 'Unknown',
          zipCode: trip.delivery_address?.postal_code || 'Unknown'
        },
        finalAmount: trip.quoted_price || 0,
        orderDate: trip.created_at,
        estimatedDelivery: trip.scheduled_pickup_time,
        driverName: trip.assigned_driver_id ? 'Driver Assigned' : undefined
      }));
    } catch (error) {
      console.error('Error getting trip history:', error);
      throw error;
    }
  }
}

export default new TripService();
