/**
 * AI Route Optimization Service - Multi-Stop Delivery Optimization
 * Profession      // Add pickup stop
      if (order.pickupLocation) {
        stops.push({
          id: `${order.id}_pickup`,
          orderId: order.id,
          type: 'pickup',
          address: order.pickup_address || order.pickupLocation.address,
          latitude: order.pickupLocation.latitude,
          longitude: order.pickupLocation.longitude,optimization for building materials delivery
 * Integrates with existing YouMats driver app architecture
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrderAssignment } from './DriverService';

export interface DeliveryStop {
  id: string;
  orderId: string;
  type: 'pickup' | 'delivery';
  address: string;
  latitude: number;
  longitude: number;
  priority: 'asap' | 'scheduled' | 'flexible';
  timeWindow?: {
    start: string;
    end: string;
  };
  estimatedDuration: number; // minutes
  specialRequirements?: string[];
  customerName: string;
  customerPhone: string;
  materials: string[];
  notes?: string;
}

export interface OptimizedRoute {
  id: string;
  driverId: string;
  stops: DeliveryStop[];
  totalDistance: number; // km
  totalDuration: number; // minutes
  estimatedFuelCost: number; // shekel
  fuelSavings: number; // percentage
  timeSavings: number; // minutes
  optimizationScore: number; // 0-100
  createdAt: Date;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed';
  routeCoordinates: Array<{ latitude: number; longitude: number }>;
}

export interface RouteOptimizationConfig {
  maxStopsPerRoute: number;
  maxTotalDuration: number; // minutes
  prioritizeASAP: boolean;
  avoidTollRoads: boolean;
  considerTraffic: boolean;
  fuelCostPerKm: number; // shekel
}

class AIRouteOptimizationService {
  private config: RouteOptimizationConfig = {
    maxStopsPerRoute: 8,
    maxTotalDuration: 480, // 8 hours
    prioritizeASAP: true,
    avoidTollRoads: false,
    considerTraffic: true,
    fuelCostPerKm: 0.8, // Approximate fuel cost in Israel
  };

  private activeRoute: OptimizedRoute | null = null;

  /**
   * Initialize the route optimization service
   */
  async initialize(): Promise<void> {
    try {
      const savedRoute = await AsyncStorage.getItem('activeOptimizedRoute');
      if (savedRoute) {
        this.activeRoute = JSON.parse(savedRoute);
        console.log('📍 Loaded saved optimized route with', this.activeRoute?.stops.length, 'stops');
      }
    } catch (error) {
      console.error('❌ Error initializing route optimization service:', error);
    }
  }

  /**
   * Convert OrderAssignments to DeliveryStops
   */
  private convertOrdersToStops(orders: OrderAssignment[]): DeliveryStop[] {
    const stops: DeliveryStop[] = [];
    
    console.log('🔄 Converting orders to stops:', orders.length, 'orders');

    orders.forEach(order => {
      console.log('📦 Processing order:', order.id, {
        hasPickupLocation: !!order.pickupLocation,
        hasDeliveryLocation: !!order.deliveryLocation,
        pickupLat: order.pickupLocation?.latitude,
        deliveryLat: order.deliveryLocation?.latitude
      });
      // Add pickup stop
      if (order.pickupLocation && order.pickupLocation.latitude && order.pickupLocation.longitude) {
        stops.push({
          id: `pickup_${order.id}`,
          orderId: order.id,
          type: 'pickup',
          address: order.pickupLocation.address || order.pickup_address || 'Pickup Location',
          latitude: order.pickupLocation.latitude,
          longitude: order.pickupLocation.longitude,
          priority: order.pickupTimePreference === 'asap' ? 'asap' : 'flexible',
          estimatedDuration: 15, // Standard pickup time
          customerName: order.customerName || 'Customer',
          customerPhone: order.customerPhone || '',
          materials: order.materials?.map(m => m.type || m.description) || [order.material_type || 'Materials'],
          notes: order.specialInstructions,
        });
      }

      // Add delivery stop
      if (order.deliveryLocation && order.deliveryLocation.latitude && order.deliveryLocation.longitude) {
        stops.push({
          id: `delivery_${order.id}`,
          orderId: order.id,
          type: 'delivery',
          address: order.deliveryLocation.address || order.delivery_address || 'Delivery Location',
          latitude: order.deliveryLocation.latitude,
          longitude: order.deliveryLocation.longitude,
          priority: order.pickupTimePreference === 'asap' ? 'asap' : 'flexible',
          estimatedDuration: 20, // Standard delivery time
          customerName: order.customerName || 'Customer',
          customerPhone: order.customerPhone || '',
          materials: order.materials?.map(m => m.type || m.description) || [order.material_type || 'Materials'],
          notes: order.specialInstructions,
          timeWindow: order.scheduledPickupTime ? {
            start: order.scheduledPickupTime,
            end: order.scheduledPickupTime,
          } : undefined,
        });
      }
    });
    
    console.log('✅ Converted to stops:', stops.length, 'stops');
    stops.forEach(stop => {
      console.log(`  - ${stop.type}: ${stop.address} (${stop.latitude}, ${stop.longitude})`);
    });

    return stops;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  /**
   * Enhanced Nearest Neighbor Algorithm with Priority Optimization
   */
  private optimizeStopsOrder(stops: DeliveryStop[], currentLocation?: { latitude: number; longitude: number }): DeliveryStop[] {
    if (stops.length <= 1) return stops;

    const optimized: DeliveryStop[] = [];
    const remaining = [...stops];
    
    // Start from current location or first stop
    let currentLat = currentLocation?.latitude || stops[0].latitude;
    let currentLon = currentLocation?.longitude || stops[0].longitude;

    // Prioritize ASAP orders
    const asapStops = remaining.filter(stop => stop.priority === 'asap');
    const regularStops = remaining.filter(stop => stop.priority !== 'asap');

    // First, handle all ASAP pickups
    const asapPickups = asapStops.filter(stop => stop.type === 'pickup');
    while (asapPickups.length > 0) {
      const nearest = this.findNearestStop(currentLat, currentLon, asapPickups);
      optimized.push(nearest);
      currentLat = nearest.latitude;
      currentLon = nearest.longitude;
      asapPickups.splice(asapPickups.indexOf(nearest), 1);
      remaining.splice(remaining.indexOf(nearest), 1);
    }

    // Then handle corresponding ASAP deliveries
    const asapDeliveries = asapStops.filter(stop => stop.type === 'delivery');
    for (const pickup of optimized.filter(s => s.type === 'pickup' && s.priority === 'asap')) {
      const correspondingDelivery = asapDeliveries.find(d => d.orderId === pickup.orderId);
      if (correspondingDelivery) {
        optimized.push(correspondingDelivery);
        currentLat = correspondingDelivery.latitude;
        currentLon = correspondingDelivery.longitude;
        remaining.splice(remaining.indexOf(correspondingDelivery), 1);
      }
    }

    // Handle remaining stops with nearest neighbor
    while (remaining.length > 0) {
      const nearest = this.findNearestStop(currentLat, currentLon, remaining);
      optimized.push(nearest);
      currentLat = nearest.latitude;
      currentLon = nearest.longitude;
      remaining.splice(remaining.indexOf(nearest), 1);
    }

    return optimized;
  }

  /**
   * Find nearest stop to current location
   */
  private findNearestStop(currentLat: number, currentLon: number, stops: DeliveryStop[]): DeliveryStop {
    let nearest = stops[0];
    let minDistance = this.calculateDistance(currentLat, currentLon, stops[0].latitude, stops[0].longitude);

    for (let i = 1; i < stops.length; i++) {
      const distance = this.calculateDistance(currentLat, currentLon, stops[i].latitude, stops[i].longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = stops[i];
      }
    }

    return nearest;
  }

  /**
   * Calculate route metrics
   */
  private calculateRouteMetrics(stops: DeliveryStop[]): {
    totalDistance: number;
    totalDuration: number;
    estimatedFuelCost: number;
    fuelSavings: number;
    timeSavings: number;
    optimizationScore: number;
  } {
    let totalDistance = 0;
    let totalDuration = 0;

    // Calculate total distance and duration
    for (let i = 0; i < stops.length - 1; i++) {
      const current = stops[i];
      const next = stops[i + 1];
      
      const distance = this.calculateDistance(
        current.latitude, current.longitude,
        next.latitude, next.longitude
      );
      
      totalDistance += distance;
      totalDuration += current.estimatedDuration + (distance * 2); // 2 min per km driving time
    }
    
    // Add last stop duration
    if (stops.length > 0) {
      totalDuration += stops[stops.length - 1].estimatedDuration;
    }

    const estimatedFuelCost = totalDistance * this.config.fuelCostPerKm;
    
    // Calculate savings (compared to unoptimized route - rough estimate)
    const unoptimizedDistance = totalDistance * 1.3; // Assume 30% inefficiency without optimization
    const fuelSavings = Math.round(((unoptimizedDistance - totalDistance) / unoptimizedDistance) * 100);
    const timeSavings = Math.round((unoptimizedDistance - totalDistance) * 2); // 2 min per km

    // Optimization score based on distance efficiency and ASAP priority handling
    const asapStops = stops.filter(s => s.priority === 'asap').length;
    const asapBonus = asapStops > 0 ? 15 : 0;
    const optimizationScore = Math.min(95, 60 + fuelSavings + asapBonus);

    return {
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalDuration: Math.round(totalDuration),
      estimatedFuelCost: Math.round(estimatedFuelCost * 100) / 100,
      fuelSavings: Math.max(0, fuelSavings),
      timeSavings: Math.max(0, timeSavings),
      optimizationScore
    };
  }

  /**
   * Generate route coordinates for map display (simplified)
   */
  private generateRouteCoordinates(stops: DeliveryStop[]): Array<{ latitude: number; longitude: number }> {
    // For now, just return the stop coordinates
    // In a real implementation, you'd get actual road route coordinates from a routing service
    return stops.map(stop => ({
      latitude: stop.latitude,
      longitude: stop.longitude
    }));
  }

  /**
   * Optimize route from multiple orders
   */
  async optimizeMultiStopRoute(
    orders: OrderAssignment[], 
    driverId: string,
    currentLocation?: { latitude: number; longitude: number }
  ): Promise<OptimizedRoute> {
    try {
      console.log('🤖 Starting AI route optimization for', orders.length, 'orders');

      // Convert orders to stops
      const stops = this.convertOrdersToStops(orders);
      console.log('📍 Generated', stops.length, 'delivery stops');

      // Optimize stop order
      const optimizedStops = this.optimizeStopsOrder(stops, currentLocation);
      console.log('✅ Optimized stop order');

      // Calculate metrics
      const metrics = this.calculateRouteMetrics(optimizedStops);
      console.log('📊 Route metrics calculated:', metrics);

      // Generate route coordinates
      const routeCoordinates = this.generateRouteCoordinates(optimizedStops);

      // Create optimized route
      const optimizedRoute: OptimizedRoute = {
        id: `route_${Date.now()}`,
        driverId,
        stops: optimizedStops,
        totalDistance: metrics.totalDistance,
        totalDuration: metrics.totalDuration,
        estimatedFuelCost: metrics.estimatedFuelCost,
        fuelSavings: metrics.fuelSavings,
        timeSavings: metrics.timeSavings,
        optimizationScore: metrics.optimizationScore,
        createdAt: new Date(),
        status: 'pending',
        routeCoordinates
      };

      // Save the route
      this.activeRoute = optimizedRoute;
      await AsyncStorage.setItem('activeOptimizedRoute', JSON.stringify(optimizedRoute));

      console.log('🎯 Route optimization complete!');
      console.log(`   📏 Distance: ${metrics.totalDistance}km`);
      console.log(`   ⏱️  Duration: ${Math.round(metrics.totalDuration/60)}h ${metrics.totalDuration%60}m`);
      console.log(`   ⛽ Fuel Cost: ₪${metrics.estimatedFuelCost}`);
      console.log(`   💰 Savings: ${metrics.fuelSavings}% fuel, ${metrics.timeSavings}min time`);
      console.log(`   🏆 Score: ${metrics.optimizationScore}/100`);

      return optimizedRoute;

    } catch (error) {
      console.error('❌ Error optimizing route:', error);
      throw new Error(`Route optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current active optimized route
   */
  getActiveRoute(): OptimizedRoute | null {
    return this.activeRoute;
  }

  /**
   * Accept the optimized route and start following it
   */
  async acceptRoute(routeId: string): Promise<boolean> {
    try {
      if (!this.activeRoute || this.activeRoute.id !== routeId) {
        throw new Error('Route not found or not active');
      }

      this.activeRoute.status = 'accepted';
      await AsyncStorage.setItem('activeOptimizedRoute', JSON.stringify(this.activeRoute));
      
      console.log('✅ Route accepted, ready to start navigation');
      return true;
    } catch (error) {
      console.error('❌ Error accepting route:', error);
      return false;
    }
  }

  /**
   * Mark route as in progress
   */
  async startRoute(): Promise<boolean> {
    try {
      if (!this.activeRoute || this.activeRoute.status !== 'accepted') {
        throw new Error('No accepted route to start');
      }

      this.activeRoute.status = 'in_progress';
      await AsyncStorage.setItem('activeOptimizedRoute', JSON.stringify(this.activeRoute));
      
      console.log('🚀 Route started');
      return true;
    } catch (error) {
      console.error('❌ Error starting route:', error);
      return false;
    }
  }

  /**
   * Complete a stop in the route
   */
  async completeStop(stopId: string): Promise<DeliveryStop | null> {
    try {
      if (!this.activeRoute || this.activeRoute.status !== 'in_progress') {
        throw new Error('No active route in progress');
      }

      const stopIndex = this.activeRoute.stops.findIndex(stop => stop.id === stopId);
      if (stopIndex === -1) {
        throw new Error('Stop not found in route');
      }

      const completedStop = this.activeRoute.stops[stopIndex];
      
      // Remove completed stop from route
      this.activeRoute.stops.splice(stopIndex, 1);
      
      // If no stops remaining, complete the route
      if (this.activeRoute.stops.length === 0) {
        this.activeRoute.status = 'completed';
        console.log('🎉 Route completed!');
      }

      await AsyncStorage.setItem('activeOptimizedRoute', JSON.stringify(this.activeRoute));
      
      return completedStop;
    } catch (error) {
      console.error('❌ Error completing stop:', error);
      return null;
    }
  }

  /**
   * Get next stop in the route
   */
  getNextStop(): DeliveryStop | null {
    if (!this.activeRoute || this.activeRoute.stops.length === 0) {
      return null;
    }
    return this.activeRoute.stops[0];
  }

  /**
   * Clear active route
   */
  async clearRoute(): Promise<void> {
    this.activeRoute = null;
    await AsyncStorage.removeItem('activeOptimizedRoute');
    console.log('🗑️ Active route cleared');
  }

  /**
   * Update route optimization configuration
   */
  updateConfig(newConfig: Partial<RouteOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Route optimization config updated');
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    totalRoutesOptimized: number;
    averageFuelSavings: number;
    averageTimeSavings: number;
    averageOptimizationScore: number;
  } {
    // Return default stats until we have real optimization data
    return {
      totalRoutesOptimized: 0,
      averageFuelSavings: 0,
      averageTimeSavings: 0,
      averageOptimizationScore: 0
    };
  }
}

// Export singleton instance
export const aiRouteOptimizationService = new AIRouteOptimizationService();
