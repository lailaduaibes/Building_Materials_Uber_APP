/**
 * OrderService - Fixed version that properly handles Supabase materials table
 * Handles order creation, tracking, and history with proper error handling
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationManager from './services/NotificationManager';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface MaterialItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  pricePerUnit: number;
  description: string;
  imageUrl?: string;
  stockQuantity?: number;
  isAvailable?: boolean;
}

export interface OrderItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  landmark?: string;
  contactPhone: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  totalAmount: number;
  deliveryFee: number;
  finalAmount: number;
  status: 'pending' | 'confirmed' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  orderDate: string;
  estimatedDelivery?: string;
  driverId?: string;
  driverName?: string;
  specialInstructions?: string;
  orderNumber: string;
}

// Fallback sample materials in case database query fails
const SAMPLE_MATERIALS: MaterialItem[] = [
  {
    id: 'cement-1',
    name: 'Portland Cement',
    category: 'Cement',
    unit: 'kg',
    pricePerUnit: 0.15,
    description: 'High quality portland cement',
    stockQuantity: 10000,
    isAvailable: true
  },
  {
    id: 'sand-1',
    name: 'Construction Sand',
    category: 'Aggregates',
    unit: 'm3',
    pricePerUnit: 25.00,
    description: 'Fine construction sand',
    stockQuantity: 500,
    isAvailable: true
  },
  {
    id: 'gravel-1',
    name: 'Crushed Gravel',
    category: 'Aggregates',
    unit: 'm3',
    pricePerUnit: 30.00,
    description: 'Construction grade gravel',
    stockQuantity: 300,
    isAvailable: true
  },
  {
    id: 'blocks-1',
    name: 'Concrete Blocks',
    category: 'Blocks',
    unit: 'pieces',
    pricePerUnit: 2.50,
    description: 'Standard concrete blocks',
    stockQuantity: 2000,
    isAvailable: true
  },
  {
    id: 'rebar-1',
    name: 'Steel Rebar',
    category: 'Steel',
    unit: 'kg',
    pricePerUnit: 0.80,
    description: '12mm steel reinforcement bars',
    stockQuantity: 5000,
    isAvailable: true
  }
];

class OrderService {
  async getMaterials(): Promise<MaterialItem[]> {
    try {
      console.log('Fetching materials from Supabase...');
      
      // Try to fetch from Supabase materials table
      const { data: materials, error } = await supabase
        .from('materials')
        .select('*')
        .eq('is_available', true)
        .order('name');

      if (error) {
        console.warn('Failed to fetch from materials table, using sample data:', error.message);
        return SAMPLE_MATERIALS;
      }

      if (!materials || materials.length === 0) {
        console.warn('No materials found in database, using sample data');
        return SAMPLE_MATERIALS;
      }

      // Transform database format to app format
      const transformedMaterials: MaterialItem[] = materials.map(material => ({
        id: material.id,
        name: material.name,
        category: material.category,
        unit: material.unit,
        pricePerUnit: parseFloat(material.price_per_unit),
        description: material.description || '',
        imageUrl: material.image_url,
        stockQuantity: material.stock_quantity,
        isAvailable: material.is_available
      }));

      console.log(`Successfully loaded ${transformedMaterials.length} materials from database`);
      return transformedMaterials;

    } catch (error) {
      console.error('Error fetching materials:', error);
      console.log('Falling back to sample materials');
      return SAMPLE_MATERIALS;
    }
  }

  async createOrder(orderData: {
    items: OrderItem[];
    deliveryAddress: DeliveryAddress;
    specialInstructions?: string;
  }): Promise<Order> {
    try {
      console.log('Creating order with data:', orderData);

      // Get current user from Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        throw new Error('User not authenticated. Please log in to create an order.');
      }

      const userData = {
        id: session.user.id,
        email: session.user.email || '',
        firstName: session.user.user_metadata?.first_name || 'Guest',
        lastName: session.user.user_metadata?.last_name || 'User'
      };

      const orderNumber = this.generateOrderNumber();
      
      const totalAmount = orderData.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const deliveryFee = this.calculateDeliveryFee(totalAmount);
      const finalAmount = totalAmount + deliveryFee;

      const newOrder: Order = {
        id: `order-${Date.now()}`,
        customerId: userData.id,
        customerName: `${userData.firstName} ${userData.lastName}`,
        customerEmail: userData.email,
        items: orderData.items,
        deliveryAddress: orderData.deliveryAddress,
        totalAmount,
        deliveryFee,
        finalAmount,
        status: 'pending',
        orderDate: new Date().toISOString(),
        estimatedDelivery: this.calculateEstimatedDelivery(),
        specialInstructions: orderData.specialInstructions,
        orderNumber,
      };

      console.log('Attempting to save order to Supabase...');

      // Try to save to Supabase orders table
      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert([{
          id: newOrder.id,
          customer_id: newOrder.customerId,
          customer_name: newOrder.customerName,
          customer_email: newOrder.customerEmail,
          delivery_address: newOrder.deliveryAddress,
          total_amount: newOrder.totalAmount,
          delivery_fee: newOrder.deliveryFee,
          final_amount: newOrder.finalAmount,
          status: newOrder.status,
          order_date: newOrder.orderDate,
          estimated_delivery: newOrder.estimatedDelivery,
          special_instructions: newOrder.specialInstructions,
          order_number: newOrder.orderNumber
        }])
        .select();

      if (orderError) {
        console.warn('Failed to save to orders table:', orderError.message);
        console.log('Saving order locally as fallback...');
        await this.saveOrderLocally(newOrder);
      } else {
        console.log('Order saved to Supabase successfully');
        
        // Save order items
        if (orderData.items.length > 0) {
          const orderItems = orderData.items.map(item => ({
            order_id: newOrder.id,
            material_id: item.materialId,
            material_name: item.materialName,
            quantity: item.quantity,
            unit: item.unit,
            price_per_unit: item.pricePerUnit,
            total_price: item.totalPrice
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

          if (itemsError) {
            console.warn('Failed to save order items:', itemsError.message);
          } else {
            console.log('Order items saved successfully');
          }
        }

        // Also save locally as backup
        await this.saveOrderLocally(newOrder);
      }

      // Send order confirmation notification
      try {
        await notificationManager.sendOrderUpdateNotification({
          orderId: newOrder.id,
          status: 'pending',
          message: `Your order #${newOrder.orderNumber} has been placed successfully!`,
          customerName: newOrder.customerName,
        });
      } catch (notifError) {
        console.log('Failed to send order notification:', notifError);
        // Don't fail the order creation if notification fails
      }

      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrderHistory(): Promise<Order[]> {
    try {
      // Get current user
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        console.log('User not authenticated, returning empty order history');
        return [];
      }

      // Try to fetch from Supabase first
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('customer_id', session.user.id)
        .order('order_date', { ascending: false });

      if (ordersError) {
        console.warn('Failed to fetch orders from Supabase:', ordersError.message);
        // Fall back to local storage
        return await this.getOrdersFromLocal();
      }

      // Transform Supabase data to app format
      const transformedOrders: Order[] = orders.map(order => ({
        id: order.id,
        customerId: order.customer_id,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        items: order.order_items?.map((item: any) => ({
          materialId: item.material_id,
          materialName: item.material_name,
          quantity: item.quantity,
          unit: item.unit,
          pricePerUnit: parseFloat(item.price_per_unit),
          totalPrice: parseFloat(item.total_price)
        })) || [],
        deliveryAddress: order.delivery_address,
        totalAmount: parseFloat(order.total_amount),
        deliveryFee: parseFloat(order.delivery_fee),
        finalAmount: parseFloat(order.final_amount),
        status: order.status,
        orderDate: order.order_date,
        estimatedDelivery: order.estimated_delivery,
        specialInstructions: order.special_instructions,
        orderNumber: order.order_number,
        driverId: order.driver_id,
        driverName: order.driver_name
      }));

      return transformedOrders;
    } catch (error) {
      console.error('Error fetching order history:', error);
      return await this.getOrdersFromLocal();
    }
  }

  private async getOrdersFromLocal(): Promise<Order[]> {
    try {
      const orders = await AsyncStorage.getItem('user_orders');
      if (orders) {
        return JSON.parse(orders);
      }
      return [];
    } catch (error) {
      console.error('Error fetching local orders:', error);
      return [];
    }
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const orders = await this.getOrderHistory();
      return orders.find(order => order.id === orderId) || null;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  private async saveOrderLocally(order: Order): Promise<void> {
    try {
      const existingOrders = await this.getOrdersFromLocal();
      const updatedOrders = [order, ...existingOrders];
      await AsyncStorage.setItem('user_orders', JSON.stringify(updatedOrders));
      console.log('Order saved locally as backup');
    } catch (error) {
      console.error('Error saving order locally:', error);
      throw new Error('Failed to save order');
    }
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BM${timestamp.slice(-6)}${random}`;
  }

  private calculateDeliveryFee(totalAmount: number): number {
    // Basic delivery fee calculation
    if (totalAmount >= 500) return 0; // Free delivery for orders over $500
    if (totalAmount >= 200) return 25; // $25 for orders $200-$499
    return 45; // $45 for orders under $200
  }

  private calculateEstimatedDelivery(): string {
    const now = new Date();
    const deliveryDate = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000)); // 2 days from now
    return deliveryDate.toISOString();
  }

  async getMaterialCategories(): Promise<string[]> {
    try {
      const materials = await this.getMaterials();
      return [...new Set(materials.map(material => material.category))];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [...new Set(SAMPLE_MATERIALS.map(material => material.category))];
    }
  }

  async getMaterialsByCategory(category: string): Promise<MaterialItem[]> {
    try {
      const materials = await this.getMaterials();
      return materials.filter(material => material.category === category);
    } catch (error) {
      console.error('Error getting materials by category:', error);
      return SAMPLE_MATERIALS.filter(material => material.category === category);
    }
  }

  async searchMaterials(query: string): Promise<MaterialItem[]> {
    try {
      const materials = await this.getMaterials();
      const lowercaseQuery = query.toLowerCase();
      return materials.filter(material => 
        material.name.toLowerCase().includes(lowercaseQuery) ||
        material.description.toLowerCase().includes(lowercaseQuery) ||
        material.category.toLowerCase().includes(lowercaseQuery)
      );
    } catch (error) {
      console.error('Error searching materials:', error);
      const lowercaseQuery = query.toLowerCase();
      return SAMPLE_MATERIALS.filter(material => 
        material.name.toLowerCase().includes(lowercaseQuery) ||
        material.description.toLowerCase().includes(lowercaseQuery) ||
        material.category.toLowerCase().includes(lowercaseQuery)
      );
    }
  }
}

export const orderService = new OrderService();
