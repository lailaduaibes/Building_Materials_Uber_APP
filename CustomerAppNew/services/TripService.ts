// TripService.ts - Handles trip requests with shared authentication
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfessionalPricingService, PricingParams } from '../shared/services/ProfessionalPricingService';

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
  status: 'pending' | 'assigned' | 'matched' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'expired';
  orderType?: string; // Add order type for filtering
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
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  finalAmount: number;
  orderDate: string;
  estimatedDelivery?: string;
  driverName?: string;
  assigned_driver_id?: string;
  customer_rating?: number;
}

class TripService {
  // Get only truck types that have available physical trucks
  async getAvailableTruckTypes(): Promise<TruckType[]> {
    try {
      // Get truck types that have at least one available truck
      const { data, error } = await supabase
        .from('truck_types')
        .select(`
          *,
          trucks!inner(id, license_plate, is_available)
        `)
        .eq('is_active', true)
        .eq('trucks.is_available', true)
        .order('name');

      if (error) throw error;
      
      // Remove duplicate truck types (inner join can create duplicates)
      const uniqueTruckTypes = data?.reduce((acc: TruckType[], current) => {
        const existing = acc.find(item => item.id === current.id);
        if (!existing) {
          acc.push({
            id: current.id,
            name: current.name,
            description: current.description,
            payload_capacity: current.payload_capacity,
            volume_capacity: current.volume_capacity,
            suitable_materials: current.suitable_materials,
            base_rate_per_km: current.base_rate_per_km,
            base_rate_per_hour: current.base_rate_per_hour,
            icon_url: current.icon_url
          });
        }
        return acc;
      }, []) || [];

      return uniqueTruckTypes;
    } catch (error) {
      console.error('Error fetching available truck types:', error);
      return [];
    }
  }

  // Check how many trucks are available for a specific truck type
  async getTruckAvailabilityCount(truckTypeId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('trucks')
        .select('id', { count: 'exact' })
        .eq('truck_type_id', truckTypeId)
        .eq('is_available', true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error checking truck availability:', error);
      return 0;
    }
  }

  // Get detailed availability info for all truck types
  async getTruckTypesWithAvailability(): Promise<(TruckType & { availableCount: number })[]> {
    try {
      const { data, error } = await supabase
        .from('truck_types')
        .select(`
          *,
          trucks(id, is_available)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      return data?.map(truckType => ({
        id: truckType.id,
        name: truckType.name,
        description: truckType.description,
        payload_capacity: truckType.payload_capacity,
        volume_capacity: truckType.volume_capacity,
        suitable_materials: truckType.suitable_materials,
        base_rate_per_km: truckType.base_rate_per_km,
        base_rate_per_hour: truckType.base_rate_per_hour,
        icon_url: truckType.icon_url,
        availableCount: truckType.trucks?.filter((truck: any) => truck.is_available).length || 0
      })) || [];
    } catch (error) {
      console.error('Error fetching truck types with availability:', error);
      return [];
    }
  }

  // Get available truck types (original method for backward compatibility)
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

  // 🚀 Professional Price Calculation with ASAP Premium
  async calculateTripPrice(
    pickupLat: number,
    pickupLng: number,
    deliveryLat: number,
    deliveryLng: number,
    truckTypeId: string,
    estimatedWeight?: number,
    pickupTimePreference: 'asap' | 'scheduled' = 'scheduled',
    scheduledTime?: Date
  ): Promise<number> {
    try {
      console.log('💰 [TripService] Starting professional price calculation...');
      console.log('📊 [TripService] Params:', {
        truckType: truckTypeId,
        preference: pickupTimePreference,
        weight: estimatedWeight || 'N/A'
      });

      // Get truck type pricing from Supabase
      const { data: truckType, error: truckError } = await supabase
        .from('truck_types')
        .select('base_rate_per_km, base_rate_per_hour')
        .eq('id', truckTypeId)
        .single();

      if (truckError) {
        console.warn('⚠️ [TripService] Truck type query error:', truckError.message);
      }

      // Prepare pricing parameters
      const pricingParams: PricingParams = {
        pickupLat,
        pickupLng,
        deliveryLat,
        deliveryLng,
        truckTypeId,
        estimatedWeight,
        pickupTimePreference,
        scheduledTime,
        // Include current demand info (future enhancement)
        isHighDemand: false
      };

      // Calculate using professional pricing service
      const pricingResult = await ProfessionalPricingService.calculatePrice(
        pricingParams,
        truckType ? {
          base_rate_per_km: Number(truckType.base_rate_per_km),
          base_rate_per_hour: Number(truckType.base_rate_per_hour)
        } : undefined
      );

      console.log('✅ [TripService] Professional pricing calculated:');
      console.log(`   Final Price: ₪${pricingResult.finalPrice}`);
      console.log(`   ASAP Multiplier: ${pricingResult.asapMultiplier}x`);
      console.log(`   Proximity Bonus: ₪${pricingResult.proximityBonus}`);
      console.log(`   Premium Type: ${pricingResult.pricing.premiumType}`);

      return pricingResult.finalPrice;
      
    } catch (error) {
      console.error('❌ [TripService] Professional pricing error:', error);
      
      // Fallback to basic calculation
      const distance = this.calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
      const basePrice = Math.max(distance * 3.5 + 25, 50);
      const asapMultiplier = pickupTimePreference === 'asap' ? 1.3 : 1.0;
      
      console.log('🛡️ [TripService] Using fallback pricing: ₪' + (basePrice * asapMultiplier).toFixed(2));
      return Math.round(basePrice * asapMultiplier * 100) / 100;
    }
  }

  // 🧮 Enhanced Price Calculation with Full Parameters (For Internal Use)
  async calculateTripPriceDetailed(params: PricingParams): Promise<any> {
    try {
      // Get truck type pricing
      const { data: truckType } = await supabase
        .from('truck_types')
        .select('base_rate_per_km, base_rate_per_hour')
        .eq('id', params.truckTypeId)
        .single();

      // Calculate with full breakdown
      const result = await ProfessionalPricingService.calculatePrice(
        params,
        truckType ? {
          base_rate_per_km: Number(truckType.base_rate_per_km),
          base_rate_per_hour: Number(truckType.base_rate_per_hour)
        } : undefined
      );

      return {
        success: true,
        pricing: result,
        summary: ProfessionalPricingService.getPricingSummary(result)
      };
    } catch (error) {
      console.error('Error in detailed price calculation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown pricing error',
        fallbackPrice: 75.00
      };
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

      console.log('✅ Trip request created successfully:', data.id);

      // 🚀 CRITICAL: Start ASAP sequential matching for ASAP trips
      if (tripData.pickup_time_preference === 'asap') {
        console.log('🚨 ASAP trip detected - starting sequential driver matching...');
        
        try {
          // Call the Uber-style sequential system (one driver at a time)
          const { error: matchingError } = await supabase
            .rpc('start_asap_matching_uber_style', { trip_request_id: data.id });
          
          if (matchingError) {
            console.error('⚠️ Uber-style ASAP matching failed to start:', matchingError);
            // Don't fail the trip creation, just log the error
          } else {
            console.log('✅ Uber-style ASAP matching started for trip:', data.id);
          }
        } catch (matchingError) {
          console.error('⚠️ Error starting ASAP matching:', matchingError);
          // Continue with trip creation even if matching fails
        }
      } else {
        // For scheduled trips, use the existing driver finding system
        this.findAvailableDrivers(data.id);
      }

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
        .from('driver_profiles')
        .select(`
          id, user_id, first_name, last_name, phone, 
          current_latitude, current_longitude, status, is_available,
          users!inner(id, email),
          trucks!trucks_current_driver_id_fkey(id, truck_type_id, truck_types(name))
        `)
        .eq('is_available', true)
        .eq('status', 'online')
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
          trip_tracking(driver_latitude, driver_longitude, customer_latitude, customer_longitude, status_update, created_at)
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
  async getTripHistory(orderTypeFilter?: string): Promise<TripOrder[]> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      let allTrips: any[] = [];

      // Fetch from trip_requests table (external delivery requests)
      let tripQuery = supabase
        .from('trip_requests')
        .select(`
          *,
          driver_profiles:assigned_driver_id (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('customer_id', currentUser.id);

      // Apply active filter for trip_requests
      if (orderTypeFilter === 'active') {
        tripQuery = tripQuery.in('status', ['matched', 'in_transit', 'picked_up']);
      }

      const { data: tripRequests, error: tripError } = await tripQuery
        .order('created_at', { ascending: false });

      if (tripError) {
        console.error('Error fetching trip requests:', tripError);
      } else if (tripRequests) {
        // Add source marker and transform trip requests
        allTrips = allTrips.concat(
          tripRequests.map(trip => ({ ...trip, source: 'trip_requests' }))
        );
      }

      // Fetch from orders table (internal orders with order_type)
      let ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          driver_profiles:driver_id (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('customer_id', currentUser.id);

      // Apply order type filter if specified
      if (orderTypeFilter && orderTypeFilter !== 'active') {
        ordersQuery = ordersQuery.eq('order_type', orderTypeFilter);
      } else if (orderTypeFilter === 'active') {
        // Show active orders
        ordersQuery = ordersQuery.in('status', ['matched', 'in_transit', 'picked_up']);
      }

      const { data: orders, error: ordersError } = await ordersQuery
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      } else if (orders) {
        // Add source marker and transform orders
        allTrips = allTrips.concat(
          orders.map(order => ({ ...order, source: 'orders' }))
        );
      }

      // Sort all trips by created_at
      allTrips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Transform to TripOrder format
      return allTrips.map(trip => {
        // Debug logging for troubleshooting
        console.log('🔍 Trip data:', {
          id: trip.id.slice(0, 8),
          status: trip.status,
          order_type: trip.order_type,
          pickup_address: trip.pickup_address,
          delivery_address: trip.delivery_address,
          material_type: trip.material_type,
          assigned_driver_id: trip.assigned_driver_id,
          driver_id: trip.driver_id
        });

        // Better address parsing with fallbacks
        const parseAddress = (addressData: any, addressType: string = 'delivery') => {
          console.log(`🏠 Parsing ${addressType} address:`, addressData);
          
          if (!addressData) {
            return {
              street: `${addressType.charAt(0).toUpperCase() + addressType.slice(1)} address not available`,
              city: 'Unknown',
              state: 'Unknown',
              zipCode: 'Unknown'
            };
          }

          // Handle both direct JSONB object and string cases
          let address = addressData;
          if (typeof addressData === 'string') {
            try {
              address = JSON.parse(addressData);
            } catch {
              // If it's just a string, treat it as the full address
              return {
                street: addressData,
                city: 'Unknown',
                state: 'Unknown', 
                zipCode: 'Unknown'
              };
            }
          }

          // Extract city and state from formatted_address if individual fields are empty
          let city = address?.city || 'Unknown';
          let state = address?.state || 'Unknown';
          
          if ((city === 'Unknown' || city === '') && address?.formatted_address) {
            // Try to extract city from formatted address like "Street, City, State"
            const parts = address.formatted_address.split(',').map((s: string) => s.trim());
            if (parts.length >= 2) {
              city = parts[parts.length - 2] || 'Unknown';
              state = parts[parts.length - 1] || 'Unknown';
            } else if (parts.length === 1) {
              city = parts[0];
            }
          }

          return {
            street: address?.street || address?.formatted_address || `Unknown ${addressType} street`,
            city: city,
            state: state,
            zipCode: address?.postal_code || address?.zipCode || 'Unknown'
          };
        };

        // Get driver name from joined data or fallback
        const getDriverName = (trip: any) => {
          const driverProfile = trip.driver_profiles;
          if (driverProfile) {
            return `${driverProfile.first_name} ${driverProfile.last_name}`;
          }
          
          if (trip.assigned_driver_id || trip.driver_id) {
            return 'Driver Assigned';
          }
          
          return undefined;
        };

        return {
          id: trip.id,
          orderNumber: trip.source === 'orders' ? `OR-${trip.id.slice(0, 8)}` : `TR-${trip.id.slice(0, 8)}`,
          status: trip.status || 'pending',
          orderType: trip.order_type || 'delivery', // Add order type for filtering
          items: [{
            materialName: trip.material_type || 'Building Material',
            quantity: trip.estimated_weight_tons || trip.total_weight || 1,
            unit: (trip.estimated_weight_tons || trip.total_weight) ? 'tons' : 'units',
            pricePerUnit: trip.quoted_price || trip.delivery_fee || 0,
            totalPrice: trip.quoted_price || trip.delivery_fee || 0
          }],
          deliveryAddress: parseAddress(trip.delivery_address, 'delivery'),
          pickupAddress: parseAddress(trip.pickup_address, 'pickup'),
          finalAmount: trip.quoted_price || trip.delivery_fee || 0,
          orderDate: trip.created_at,
          estimatedDelivery: trip.scheduled_pickup_time || trip.scheduled_delivery_time,
          driverName: getDriverName(trip),
          assigned_driver_id: trip.assigned_driver_id || trip.driver_id,
          customer_rating: trip.customer_rating
        };
      });
    } catch (error) {
      console.error('Error getting trip history:', error);
      throw error;
    }
  }
}

export default new TripService();
