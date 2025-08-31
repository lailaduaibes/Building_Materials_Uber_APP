/**
 * Advanced Analytics Integration Service
 * Connects AI Route Optimization, Push Notifications, and Analytics Dashboard
 * Provides a unified interface for all Phase 2 features
 */

import { aiRouteOptimizer, AIRouteOptimizationService } from './AIRouteOptimizationService';
import { pushNotificationService, PushNotificationService } from './PushNotificationService';

interface TripData {
  id: string;
  status: string;
  pickup_latitude: number;
  pickup_longitude: number;
  delivery_latitude: number;
  delivery_longitude: number;
  pickup_address: string;
  delivery_address: string;
  material_type: string;
  weight: number;
  pickup_time_preference: string;
  assigned_driver_id?: string;
  final_price?: number;
  created_at: string;
}

interface DriverData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  current_latitude?: number;
  current_longitude?: number;
  is_online: boolean;
  approval_status: string;
  truck_capacity_weight?: number;
  truck_capacity_volume?: number;
  fuel_efficiency?: number;
}

interface AnalyticsData {
  totalTrips: number;
  completedTrips: number;
  asapTrips: number;
  totalRevenue: number;
  asapRevenue: number;
  activeDrivers: number;
  onlineDrivers: number;
  avgTripValue: number;
  driverEfficiency: number;
  revenueGrowth: number;
  asapUplift: number;
}

interface OptimizationResult {
  routes: any[];
  totalSavings: {
    distance: number;
    time: number;
    fuel: number;
    cost: number;
  };
  unassigned: any[];
  recommendations: string[];
}

export class AdvancedAnalyticsIntegrationService {
  private static instance: AdvancedAnalyticsIntegrationService;
  private supabase: any;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AdvancedAnalyticsIntegrationService {
    if (!AdvancedAnalyticsIntegrationService.instance) {
      AdvancedAnalyticsIntegrationService.instance = new AdvancedAnalyticsIntegrationService();
    }
    return AdvancedAnalyticsIntegrationService.instance;
  }

  /**
   * Initialize the integration service
   */
  async initialize(supabaseClient: any): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Advanced Analytics Integration Service...');
      
      this.supabase = supabaseClient;

      // Initialize dependent services
      await pushNotificationService.initialize(supabaseClient);

      // Set up real-time subscriptions
      await this.setupRealtimeSubscriptions();

      this.isInitialized = true;
      console.log('✅ Advanced Analytics Integration Service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize integration service:', error);
      throw error;
    }
  }

  /**
   * Set up real-time subscriptions for live updates
   */
  private async setupRealtimeSubscriptions(): Promise<void> {
    try {
      // Subscribe to trip updates
      this.supabase
        .channel('trip-updates')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'trip_requests' },
          (payload: any) => this.handleTripUpdate(payload)
        )
        .subscribe();

      // Subscribe to driver updates
      this.supabase
        .channel('driver-updates')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'driver_profiles' },
          (payload: any) => this.handleDriverUpdate(payload)
        )
        .subscribe();

      console.log('📡 Real-time subscriptions established');

    } catch (error) {
      console.error('❌ Failed to setup real-time subscriptions:', error);
    }
  }

  /**
   * Handle trip status updates
   */
  private async handleTripUpdate(payload: any): Promise<void> {
    const { eventType, new: newTrip, old: oldTrip } = payload;
    
    console.log('🚛 Trip update received:', eventType, newTrip?.id);

    try {
      // Send appropriate notifications based on status change
      if (newTrip) {
        await this.processTripStatusNotification(newTrip, oldTrip);
      }

      // Update analytics in real-time
      await this.updateAnalyticsForTrip(newTrip, eventType);

      // Trigger route optimization if needed
      if (eventType === 'INSERT' && newTrip.pickup_time_preference === 'asap') {
        await this.triggerASAPOptimization();
      }

    } catch (error) {
      console.error('❌ Error handling trip update:', error);
    }
  }

  /**
   * Handle driver status updates
   */
  private async handleDriverUpdate(payload: any): Promise<void> {
    const { eventType, new: newDriver, old: oldDriver } = payload;
    
    console.log('👷 Driver update received:', eventType, newDriver?.id);

    try {
      // Send driver status notifications
      if (newDriver && oldDriver) {
        if (newDriver.is_online !== oldDriver.is_online) {
          await this.processDriverOnlineStatusNotification(newDriver);
        }
        
        if (newDriver.approval_status !== oldDriver.approval_status) {
          await this.processDriverApprovalNotification(newDriver);
        }
      }

      // Update analytics
      await this.updateDriverAnalytics();

    } catch (error) {
      console.error('❌ Error handling driver update:', error);
    }
  }

  /**
   * Process trip status notifications
   */
  private async processTripStatusNotification(newTrip: TripData, oldTrip?: TripData): Promise<void> {
    if (!oldTrip || newTrip.status === oldTrip.status) return;

    let templateId: string;
    const variables: {[key: string]: string} = {
      tripId: newTrip.id,
      address: newTrip.delivery_address
    };

    switch (newTrip.status) {
      case 'matched':
        templateId = 'trip_matched';
        break;
      case 'pickup_arrived':
        templateId = 'trip_pickup';
        break;
      case 'in_transit':
        templateId = 'trip_in_transit';
        break;
      case 'delivered':
        templateId = 'trip_delivered';
        break;
      default:
        return; // No notification for this status
    }

    // Send notification to customer
    const customerNotification = {
      id: `trip_${newTrip.id}_${Date.now()}`,
      type: 'trip_update' as const,
      title: this.getTripNotificationTitle(newTrip.status),
      body: this.getTripNotificationBody(newTrip.status, variables),
      data: {
        tripId: newTrip.id,
        actionType: 'trip_update',
        deepLink: `youmats://trip/${newTrip.id}`
      },
      priority: newTrip.pickup_time_preference === 'asap' ? 'high' as const : 'normal' as const
    };

    // Get customer user ID from trip (you may need to adjust this query)
    const { data: tripWithCustomer } = await this.supabase
      .from('trip_requests')
      .select('customer_id')
      .eq('id', newTrip.id)
      .single();

    if (tripWithCustomer?.customer_id) {
      await pushNotificationService.sendNotification(tripWithCustomer.customer_id, customerNotification);
    }

    // Send notification to driver if trip is matched
    if (newTrip.status === 'matched' && newTrip.assigned_driver_id) {
      const driverNotification = {
        id: `driver_trip_${newTrip.id}_${Date.now()}`,
        type: 'driver_status' as const,
        title: '📦 New Trip Assigned',
        body: `You have a new ${newTrip.pickup_time_preference === 'asap' ? 'ASAP' : ''} delivery to ${newTrip.delivery_address}`,
        data: {
          tripId: newTrip.id,
          actionType: 'trip_assigned',
          deepLink: `youmats-driver://trip/${newTrip.id}`
        },
        priority: newTrip.pickup_time_preference === 'asap' ? 'high' as const : 'normal' as const
      };

      const { data: driverProfile } = await this.supabase
        .from('driver_profiles')
        .select('user_id')
        .eq('id', newTrip.assigned_driver_id)
        .single();

      if (driverProfile?.user_id) {
        await pushNotificationService.sendNotification(driverProfile.user_id, driverNotification);
      }
    }
  }

  /**
   * Process driver status notifications
   */
  private async processDriverOnlineStatusNotification(driver: DriverData): Promise<void> {
    const notification = {
      id: `driver_online_${driver.id}_${Date.now()}`,
      type: 'system' as const,
      title: driver.is_online ? '🟢 You\'re Online' : '🔴 You\'re Offline',
      body: driver.is_online ? 
        'You\'re now receiving trip requests' : 
        'You won\'t receive new trip requests',
      data: {
        driverId: driver.id,
        actionType: 'status_change',
        deepLink: 'youmats-driver://dashboard'
      },
      priority: 'low' as const
    };

    await pushNotificationService.sendNotification(driver.user_id, notification);
  }

  /**
   * Process driver approval notifications
   */
  private async processDriverApprovalNotification(driver: DriverData): Promise<void> {
    let title: string;
    let body: string;
    let priority: 'low' | 'normal' | 'high' = 'normal';

    switch (driver.approval_status) {
      case 'approved':
        title = '🎉 Application Approved!';
        body = 'Congratulations! You can now start accepting delivery requests.';
        priority = 'high';
        break;
      case 'rejected':
        title = '❌ Application Rejected';
        body = 'Unfortunately, your application was not approved. Please contact support for details.';
        priority = 'high';
        break;
      default:
        return; // No notification for other statuses
    }

    const notification = {
      id: `driver_approval_${driver.id}_${Date.now()}`,
      type: 'system' as const,
      title,
      body,
      data: {
        driverId: driver.id,
        actionType: 'approval_update',
        deepLink: 'youmats-driver://dashboard'
      },
      priority
    };

    await pushNotificationService.sendNotification(driver.user_id, notification);
  }

  /**
   * Get comprehensive analytics data
   */
  async getAnalyticsData(): Promise<AnalyticsData> {
    try {
      console.log('📊 Fetching comprehensive analytics data...');

      // Get current period data
      const { data: trips } = await this.supabase
        .from('trip_requests')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { data: drivers } = await this.supabase
        .from('driver_profiles')
        .select('*');

      // Get previous period for growth calculation
      const { data: prevTrips } = await this.supabase
        .from('trip_requests')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Calculate current metrics
      const completedTrips = trips?.filter(t => t.status === 'delivered') || [];
      const asapTrips = trips?.filter(t => t.pickup_time_preference === 'asap') || [];
      const asapCompletedTrips = completedTrips.filter(t => t.pickup_time_preference === 'asap');

      const totalRevenue = completedTrips.reduce((sum, trip) => 
        sum + (parseFloat(trip.final_price) || 0), 0);
      const asapRevenue = asapCompletedTrips.reduce((sum, trip) => 
        sum + (parseFloat(trip.final_price) || 0), 0);

      const activeDrivers = drivers?.filter(d => d.approval_status === 'approved').length || 0;
      const onlineDrivers = drivers?.filter(d => d.is_online === true).length || 0;
      const avgTripValue = completedTrips.length > 0 ? totalRevenue / completedTrips.length : 0;
      const driverEfficiency = activeDrivers > 0 ? (onlineDrivers / activeDrivers) * 100 : 0;

      // Calculate growth metrics
      const prevCompletedTrips = prevTrips?.filter(t => t.status === 'delivered') || [];
      const prevRevenue = prevCompletedTrips.reduce((sum, trip) => 
        sum + (parseFloat(trip.final_price) || 0), 0);
      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      // Calculate ASAP uplift
      const regularRevenue = totalRevenue - asapRevenue;
      const regularTrips = completedTrips.length - asapCompletedTrips.length;
      const regularAvg = regularTrips > 0 ? regularRevenue / regularTrips : 0;
      const asapAvg = asapCompletedTrips.length > 0 ? asapRevenue / asapCompletedTrips.length : 0;
      const asapUplift = regularAvg > 0 ? ((asapAvg - regularAvg) / regularAvg * 100) : 0;

      return {
        totalTrips: trips?.length || 0,
        completedTrips: completedTrips.length,
        asapTrips: asapTrips.length,
        totalRevenue,
        asapRevenue,
        activeDrivers,
        onlineDrivers,
        avgTripValue,
        driverEfficiency,
        revenueGrowth,
        asapUplift
      };

    } catch (error) {
      console.error('❌ Error fetching analytics data:', error);
      throw error;
    }
  }

  /**
   * Run AI route optimization for all active trips
   */
  async runRouteOptimization(): Promise<OptimizationResult> {
    try {
      console.log('🤖 Running AI route optimization...');

      // Get active trips
      const { data: trips } = await this.supabase
        .from('trip_requests')
        .select('*')
        .in('status', ['pending', 'matched', 'in_transit']);

      // Get available drivers
      const { data: drivers } = await this.supabase
        .from('driver_profiles')
        .select('*')
        .eq('approval_status', 'approved')
        .eq('is_online', true);

      if (!trips || !drivers) {
        return {
          routes: [],
          totalSavings: { distance: 0, time: 0, fuel: 0, cost: 0 },
          unassigned: [],
          recommendations: ['No active trips or drivers found']
        };
      }

      // Convert to optimization format
      const deliveryPoints = trips.map(trip => ({
        id: trip.id,
        latitude: trip.pickup_latitude,
        longitude: trip.pickup_longitude,
        address: trip.pickup_address,
        type: 'pickup' as const,
        tripId: trip.id,
        priority: trip.pickup_time_preference === 'asap' ? 'asap' as const : 'medium' as const,
        materialType: trip.material_type || 'general',
        weight: parseFloat(trip.estimated_weight) || 100,
        estimatedHandlingTime: 15
      }));

      const vehicles = drivers.map(driver => ({
        id: driver.id,
        driverId: driver.user_id,
        currentLatitude: driver.current_latitude || 32.0853,
        currentLongitude: driver.current_longitude || 34.7818,
        capacity: {
          weight: driver.truck_capacity_weight || 1000,
          volume: driver.truck_capacity_volume || 10
        },
        available: true,
        type: 'truck' as const,
        fuelEfficiency: driver.fuel_efficiency || 8
      }));

      // Run optimization
      const result = await aiRouteOptimizer.optimizeRoutes(deliveryPoints, vehicles, {
        prioritizeASAP: true,
        maxRouteTime: 480, // 8 hours
        considerTraffic: true
      });

      // Log optimization to database
      await this.logOptimizationResult(result);

      // Send notifications about optimization
      await this.sendOptimizationNotifications(result);

      console.log('✅ Route optimization completed', result.totalSavings);
      return result;

    } catch (error) {
      console.error('❌ Route optimization failed:', error);
      throw error;
    }
  }

  /**
   * Trigger ASAP optimization for urgent deliveries
   */
  private async triggerASAPOptimization(): Promise<void> {
    try {
      console.log('⚡ Triggering ASAP optimization...');

      // Get ASAP trips pending assignment
      const { data: asapTrips } = await this.supabase
        .from('trip_requests')
        .select('*')
        .eq('pickup_time_preference', 'asap')
        .in('status', ['pending', 'matched']);

      if (!asapTrips || asapTrips.length === 0) return;

      // Send high-priority notifications to nearby drivers
      const notifications = asapTrips.map(trip => ({
        id: `asap_${trip.id}_${Date.now()}`,
        type: 'asap_alert' as const,
        title: '⚡ High Priority ASAP Delivery!',
        body: `₪${(parseFloat(trip.quoted_price) * 1.5).toFixed(0)} - Rush delivery needed now`,
        data: {
          tripId: trip.id,
          bonus: '50',
          actionType: 'asap_trip',
          deepLink: `youmats-driver://trip/${trip.id}`
        },
        priority: 'critical' as const
      }));

      // Get all online drivers
      const { data: onlineDrivers } = await this.supabase
        .from('driver_profiles')
        .select('user_id')
        .eq('approval_status', 'approved')
        .eq('is_online', true);

      if (onlineDrivers) {
        for (const notification of notifications) {
          for (const driver of onlineDrivers) {
            await pushNotificationService.sendNotification(driver.user_id, notification);
          }
        }
      }

    } catch (error) {
      console.error('❌ ASAP optimization failed:', error);
    }
  }

  /**
   * Log optimization result to database
   */
  private async logOptimizationResult(result: OptimizationResult): Promise<void> {
    try {
      await this.supabase
        .from('route_optimizations')
        .insert({
          vehicles_count: result.routes.length,
          trips_count: result.routes.reduce((sum, route) => sum + route.points.length, 0),
          total_distance_km: result.routes.reduce((sum, route) => sum + route.totalDistance, 0),
          optimized_distance_km: result.routes.reduce((sum, route) => sum + route.totalDistance, 0),
          distance_saved_km: result.totalSavings.distance,
          time_saved_minutes: result.totalSavings.time,
          fuel_saved_liters: result.totalSavings.fuel,
          cost_saved_shekels: result.totalSavings.cost,
          efficiency_percentage: 85, // Average efficiency
          recommendations: result.recommendations
        });
    } catch (error) {
      console.error('❌ Failed to log optimization result:', error);
    }
  }

  /**
   * Send optimization notifications to drivers
   */
  private async sendOptimizationNotifications(result: OptimizationResult): Promise<void> {
    try {
      for (const route of result.routes) {
        const notification = {
          id: `route_${route.vehicleId}_${Date.now()}`,
          type: 'system' as const,
          title: '🤖 Route Optimized!',
          body: `AI optimized your route. ${result.totalSavings.fuel.toFixed(1)}L fuel saved!`,
          data: {
            routeId: route.vehicleId,
            savings: result.totalSavings.cost.toFixed(0),
            actionType: 'route_optimization',
            deepLink: 'youmats-driver://routes'
          },
          priority: 'normal' as const
        };

        await pushNotificationService.sendNotification(route.driverId, notification);
      }
    } catch (error) {
      console.error('❌ Failed to send optimization notifications:', error);
    }
  }

  /**
   * Update analytics for trip changes
   */
  private async updateAnalyticsForTrip(trip: TripData, eventType: string): Promise<void> {
    try {
      if (eventType === 'UPDATE' && trip.status === 'delivered') {
        // Create trip analytics entry
        await this.supabase
          .from('trip_analytics')
          .insert({
            trip_id: trip.id,
            driver_id: trip.assigned_driver_id,
            final_price: trip.final_price,
            asap_multiplier: trip.pickup_time_preference === 'asap' ? 1.5 : 1.0,
            driver_earnings: trip.final_price ? (parseFloat(trip.final_price) * 0.85) : 0
          });
      }
    } catch (error) {
      console.error('❌ Failed to update trip analytics:', error);
    }
  }

  /**
   * Update driver analytics
   */
  private async updateDriverAnalytics(): Promise<void> {
    try {
      // This would typically be done in a background job
      console.log('📈 Updating driver analytics...');
    } catch (error) {
      console.error('❌ Failed to update driver analytics:', error);
    }
  }

  /**
   * Helper methods for notifications
   */
  private getTripNotificationTitle(status: string): string {
    switch (status) {
      case 'matched': return '🚛 Driver Found!';
      case 'pickup_arrived': return '📦 Driver Arrived for Pickup';
      case 'in_transit': return '🚚 On the Way!';
      case 'delivered': return '✅ Delivered Successfully!';
      default: return '📱 Trip Update';
    }
  }

  private getTripNotificationBody(status: string, variables: {[key: string]: string}): string {
    switch (status) {
      case 'matched': return 'Your delivery has been matched with a driver';
      case 'pickup_arrived': return 'Your driver has arrived at the pickup location';
      case 'in_transit': return `Your materials are now in transit to ${variables.address}`;
      case 'delivered': return 'Your materials have been delivered. Rate your experience!';
      default: return 'Your trip status has been updated';
    }
  }

  /**
   * Send test notifications for dashboard
   */
  async sendTestNotifications(): Promise<void> {
    try {
      // Get admin users
      const { data: adminUsers } = await this.supabase
        .from('auth.users')
        .select('id')
        .eq('raw_user_meta_data->>role', 'admin');

      if (!adminUsers || adminUsers.length === 0) return;

      const testNotifications = [
        {
          id: `test_${Date.now()}_1`,
          type: 'system' as const,
          title: '🧪 Test Notification',
          body: 'This is a test notification from the Advanced Analytics Dashboard',
          data: { test: true },
          priority: 'normal' as const
        },
        {
          id: `test_${Date.now()}_2`,
          type: 'asap_alert' as const,
          title: '⚡ ASAP Test Alert',
          body: 'Testing high-priority ASAP notification system',
          data: { test: true, priority: 'high' },
          priority: 'high' as const
        }
      ];

      for (const admin of adminUsers) {
        for (const notification of testNotifications) {
          await pushNotificationService.sendNotification(admin.id, notification);
        }
      }

      console.log('✅ Test notifications sent to admin users');

    } catch (error) {
      console.error('❌ Failed to send test notifications:', error);
    }
  }
}

// Export singleton instance
export const analyticsIntegration = AdvancedAnalyticsIntegrationService.getInstance();
