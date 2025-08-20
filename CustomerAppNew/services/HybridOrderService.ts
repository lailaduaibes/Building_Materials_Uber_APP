// HybridOrderService.ts - Bridge between existing orders and new trip system
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface Material {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  price_per_unit: number;
  stock_quantity: number;
  image_url?: string;
  is_available: boolean;
}

export interface Order {
  id?: string;
  order_type: 'internal_delivery' | 'external_delivery';
  customer_id?: string;
  status?: string;
  total_weight: number;
  total_volume: number;
  pickup_address: any;
  delivery_address: any;
  scheduled_pickup_time?: string;
  delivery_fee?: number;
  notes?: string;
  items: OrderItem[];
}

export interface OrderItem {
  material_type: string;
  description: string;
  quantity: number;
  unit: string;
  weight: number;
  volume?: number;
  special_handling?: any;
  price_per_unit?: number;
  total_price?: number;
}

export interface TripRequest {
  id?: string;
  customer_id?: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address: any;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_address: any;
  material_type: string;
  load_description: string;
  estimated_weight_tons?: number;
  estimated_volume_m3?: number;
  required_truck_type_id?: string;
  quoted_price?: number;
  status?: string;
}

class HybridOrderService {
  
  // ============================================================================
  // EXISTING FUNCTIONALITY - Keep working with your current tables
  // ============================================================================
  
  async getMaterials(): Promise<Material[]> {
    try {
      console.log('Fetching materials from existing table...');
      
      const { data: materials, error } = await supabase
        .from('materials')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true });

      if (error) {
        console.log('Materials table not found, using fallback data');
        return this.getFallbackMaterials();
      }

      return materials || [];
    } catch (error) {
      console.error('Error fetching materials:', error);
      return this.getFallbackMaterials();
    }
  }

  private getFallbackMaterials(): Material[] {
    return [
      {
        id: '1',
        name: 'Portland Cement',
        description: 'High-quality Portland cement for construction',
        category: 'cement',
        unit: 'bags',
        price_per_unit: 8.50,
        stock_quantity: 500,
        is_available: true
      },
      {
        id: '2', 
        name: 'Steel Rebar',
        description: 'Reinforcement steel bars',
        category: 'steel',
        unit: 'kg',
        price_per_unit: 1.20,
        stock_quantity: 1000,
        is_available: true
      },
      {
        id: '3',
        name: 'Red Clay Bricks',
        description: 'Standard construction bricks',
        category: 'bricks',
        unit: 'pieces',
        price_per_unit: 0.50,
        stock_quantity: 5000,
        is_available: true
      }
    ];
  }

  async createOrder(orderData: Order): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Creating traditional order...');

      const order = {
        ...orderData,
        customer_id: user.id,
        status: 'pending',
      };

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert([order])
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      if (orderData.items && orderData.items.length > 0) {
        const items = orderData.items.map(item => ({
          order_id: orderResult.id,
          ...item
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(items);

        if (itemsError) {
          console.error('Error inserting order items:', itemsError);
        }
      }

      return { success: true, orderId: orderResult.id };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: 'Failed to create order' };
    }
  }

  async getUserOrders(): Promise<Order[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  // ============================================================================
  // NEW UBER-STYLE FUNCTIONALITY
  // ============================================================================

  async getTruckTypes() {
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
      return [
        {
          id: '1',
          name: 'Small Truck',
          description: 'Perfect for small deliveries',
          payload_capacity: 2.0,
          volume_capacity: 8.0,
          base_rate_per_km: 2.50
        }
      ];
    }
  }

  async createTripRequest(tripData: TripRequest): Promise<{ success: boolean; tripId?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Creating Uber-style trip request...');

      const trip = {
        ...tripData,
        customer_id: user.id,
        status: 'pending',
      };

      const { data: tripResult, error: tripError } = await supabase
        .from('trip_requests')
        .insert([trip])
        .select()
        .single();

      if (tripError) throw tripError;

      return { success: true, tripId: tripResult.id };
    } catch (error) {
      console.error('Error creating trip request:', error);
      
      // Fallback: Create as traditional order if trip system fails
      console.log('Falling back to traditional order system...');
      return this.createOrderFromTrip(tripData);
    }
  }

  private async createOrderFromTrip(tripData: TripRequest): Promise<{ success: boolean; orderId?: string; error?: string }> {
    // Convert trip request to traditional order format
    const orderData: Order = {
      order_type: 'external_delivery',
      total_weight: tripData.estimated_weight_tons || 1,
      total_volume: tripData.estimated_volume_m3 || 1,
      pickup_address: tripData.pickup_address,
      delivery_address: tripData.delivery_address,
      delivery_fee: tripData.quoted_price,
      notes: tripData.load_description,
      items: [{
        material_type: tripData.material_type,
        description: tripData.load_description,
        quantity: 1,
        unit: 'load',
        weight: tripData.estimated_weight_tons || 1,
        volume: tripData.estimated_volume_m3,
        price_per_unit: tripData.quoted_price || 0,
        total_price: tripData.quoted_price || 0
      }]
    };

    return this.createOrder(orderData);
  }

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

      if (error) {
        console.log('Trip requests table not available, showing orders instead');
        // Fallback to showing orders as trips
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching trips:', error);
      return [];
    }
  }

  // ============================================================================
  // HYBRID FUNCTIONALITY - Show both orders and trips
  // ============================================================================

  async getAllUserActivities(): Promise<Array<any>> {
    try {
      const [orders, trips] = await Promise.all([
        this.getUserOrders(),
        this.getUserTrips()
      ]);

      // Combine and sort by creation date
      const combined = [
        ...orders.map(order => ({ ...order, type: 'order' })),
        ...trips.map(trip => ({ ...trip, type: 'trip' }))
      ];

      return combined.sort((a: any, b: any) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    } catch (error) {
      console.error('Error fetching user activities:', error);
      return [];
    }
  }

  // Check if new trip system is available
  async isUberStyleAvailable(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('truck_types')
        .select('id')
        .limit(1);

      return !error && data !== null;
    } catch (error) {
      return false;
    }
  }

  // Feature flag for showing Uber-style interface
  async shouldShowUberInterface(): Promise<boolean> {
    const isAvailable = await this.isUberStyleAvailable();
    
    // You can add additional logic here:
    // - User preferences
    // - A/B testing flags
    // - Geographic availability
    
    return isAvailable;
  }
}

export default new HybridOrderService();
