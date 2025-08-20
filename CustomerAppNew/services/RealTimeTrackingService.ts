/**
 * Real-Time Tracking Service
 * Handles live GPS tracking, ETA calculations, route optimization, and geofencing
 */

import * as Location from 'expo-location';
import { createClient } from '@supabase/supabase-js';
import { authService } from '../AuthServiceSupabase';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface TrackingData {
  tripId: string;
  driverId: string;
  truckId: string;
  currentLatitude: number;
  currentLongitude: number;
  heading?: number;
  speedKmh?: number;
  distanceToDestinationKm?: number;
  estimatedArrival?: string;
  trafficConditions?: string;
  statusUpdate?: string;
  milestone?: string;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RouteInfo {
  distance: number; // in kilometers
  duration: number; // in minutes
  polyline?: string;
  steps?: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  coordinates: LocationCoordinates;
}

export interface GeofenceZone {
  id: string;
  name: string;
  center: LocationCoordinates;
  radius: number; // in meters
  type: 'pickup' | 'delivery' | 'warehouse' | 'restricted';
}

export interface ETACalculation {
  estimatedArrivalTime: Date;
  remainingDistance: number;
  remainingDuration: number;
  trafficDelay: number;
  confidence: number; // 0-1 scale
}

class RealTimeTrackingService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private trackingInterval: NodeJS.Timeout | null = null;
  private isTracking: boolean = false;
  private currentTripId: string | null = null;
  private geofenceZones: GeofenceZone[] = [];

  // Google Maps API key (replace with your actual key)
  private readonly GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

  constructor() {
    this.setupLocationPermissions();
    this.loadGeofenceZones();
  }

  /**
   * Setup location permissions
   */
  private async setupLocationPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.error('Foreground location permission not granted');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission not granted - limited functionality');
      }

      return true;
    } catch (error) {
      console.error('Error setting up location permissions:', error);
      return false;
    }
  }

  /**
   * Start real-time tracking for a trip
   */
  async startTracking(tripId: string, driverId: string, truckId: string): Promise<boolean> {
    try {
      const hasPermission = await this.setupLocationPermissions();
      if (!hasPermission) {
        throw new Error('Location permissions required for tracking');
      }

      this.currentTripId = tripId;
      this.isTracking = true;

      // Start location subscription for real-time updates
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => this.handleLocationUpdate(location, tripId, driverId, truckId)
      );

      console.log(`Started tracking for trip: ${tripId}`);
      return true;
    } catch (error) {
      console.error('Error starting tracking:', error);
      return false;
    }
  }

  /**
   * Stop real-time tracking
   */
  async stopTracking(): Promise<void> {
    try {
      this.isTracking = false;
      this.currentTripId = null;

      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
      }

      console.log('Tracking stopped');
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  }

  /**
   * Handle location updates and save to database
   */
  private async handleLocationUpdate(
    location: Location.LocationObject,
    tripId: string,
    driverId: string,
    truckId: string
  ): Promise<void> {
    try {
      const { latitude, longitude, heading, speed } = location.coords;

      // Get trip details for destination
      const tripDetails = await this.getTripDetails(tripId);
      if (!tripDetails) return;

      // Calculate distance to destination
      const distanceToDestination = this.calculateDistance(
        latitude,
        longitude,
        tripDetails.delivery_latitude,
        tripDetails.delivery_longitude
      );

      // Calculate ETA
      const eta = await this.calculateETA(
        { latitude, longitude },
        { 
          latitude: tripDetails.delivery_latitude, 
          longitude: tripDetails.delivery_longitude 
        }
      );

      // Check geofencing
      const geofenceEvent = this.checkGeofences(latitude, longitude);

      // Prepare tracking data
      const trackingData: TrackingData = {
        tripId,
        driverId,
        truckId,
        currentLatitude: latitude,
        currentLongitude: longitude,
        heading: heading || undefined,
        speedKmh: speed ? speed * 3.6 : undefined, // Convert m/s to km/h
        distanceToDestinationKm: distanceToDestination,
        estimatedArrival: eta.estimatedArrivalTime.toISOString(),
        trafficConditions: await this.getTrafficConditions(latitude, longitude),
        statusUpdate: this.generateStatusUpdate(distanceToDestination, eta),
        milestone: geofenceEvent?.milestone,
      };

      // Save to database
      await this.saveTrackingData(trackingData);

      // Handle geofence events
      if (geofenceEvent) {
        await this.handleGeofenceEvent(geofenceEvent, tripId);
      }

    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  /**
   * Calculate ETA using Google Maps Directions API
   */
  async calculateETA(
    origin: LocationCoordinates,
    destination: LocationCoordinates
  ): Promise<ETACalculation> {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${origin.latitude},${origin.longitude}&` +
        `destination=${destination.latitude},${destination.longitude}&` +
        `departure_time=now&` +
        `traffic_model=best_guess&` +
        `key=${this.GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        const durationInTraffic = leg.duration_in_traffic || leg.duration;
        const estimatedArrivalTime = new Date(Date.now() + durationInTraffic.value * 1000);
        
        return {
          estimatedArrivalTime,
          remainingDistance: leg.distance.value / 1000, // Convert to km
          remainingDuration: durationInTraffic.value / 60, // Convert to minutes
          trafficDelay: durationInTraffic.value - leg.duration.value,
          confidence: 0.85 // High confidence with Google Maps
        };
      }

      // Fallback calculation
      return this.fallbackETACalculation(origin, destination);
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return this.fallbackETACalculation(origin, destination);
    }
  }

  /**
   * Fallback ETA calculation without external API
   */
  private fallbackETACalculation(
    origin: LocationCoordinates,
    destination: LocationCoordinates
  ): ETACalculation {
    const distance = this.calculateDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );

    // Assume average speed of 40 km/h in urban areas
    const averageSpeed = 40;
    const duration = (distance / averageSpeed) * 60; // in minutes
    
    return {
      estimatedArrivalTime: new Date(Date.now() + duration * 60 * 1000),
      remainingDistance: distance,
      remainingDuration: duration,
      trafficDelay: 0,
      confidence: 0.6 // Lower confidence without real traffic data
    };
  }

  /**
   * Get optimized route using Google Maps
   */
  async getOptimizedRoute(
    origin: LocationCoordinates,
    destination: LocationCoordinates,
    waypoints?: LocationCoordinates[]
  ): Promise<RouteInfo | null> {
    try {
      let url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${origin.latitude},${origin.longitude}&` +
        `destination=${destination.latitude},${destination.longitude}&` +
        `optimize=true&` +
        `key=${this.GOOGLE_MAPS_API_KEY}`;

      if (waypoints && waypoints.length > 0) {
        const waypointString = waypoints
          .map(wp => `${wp.latitude},${wp.longitude}`)
          .join('|');
        url += `&waypoints=optimize:true|${waypointString}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        return {
          distance: leg.distance.value / 1000, // Convert to km
          duration: leg.duration.value / 60, // Convert to minutes
          polyline: route.overview_polyline.points,
          steps: leg.steps.map((step: any) => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
            distance: step.distance.value / 1000,
            duration: step.duration.value / 60,
            coordinates: {
              latitude: step.end_location.lat,
              longitude: step.end_location.lng
            }
          }))
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting optimized route:', error);
      return null;
    }
  }

  /**
   * Setup geofence zones
   */
  private async loadGeofenceZones(): Promise<void> {
    try {
      // Load from database or set default zones
      this.geofenceZones = [
        {
          id: 'warehouse_main',
          name: 'Main Warehouse',
          center: { latitude: 25.2048, longitude: 55.2708 }, // Dubai example
          radius: 100,
          type: 'warehouse'
        },
        // Add more zones as needed
      ];
    } catch (error) {
      console.error('Error loading geofence zones:', error);
    }
  }

  /**
   * Check if current location is within any geofence zones
   */
  private checkGeofences(latitude: number, longitude: number): { zone: GeofenceZone; milestone: string } | null {
    for (const zone of this.geofenceZones) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        zone.center.latitude,
        zone.center.longitude
      ) * 1000; // Convert to meters

      if (distance <= zone.radius) {
        return {
          zone,
          milestone: `Entered ${zone.name} (${zone.type})`
        };
      }
    }
    return null;
  }

  /**
   * Handle geofence events
   */
  private async handleGeofenceEvent(
    event: { zone: GeofenceZone; milestone: string },
    tripId: string
  ): Promise<void> {
    try {
      console.log(`Geofence event: ${event.milestone}`);
      
      // Update trip status based on geofence type
      if (event.zone.type === 'pickup') {
        await this.updateTripStatus(tripId, 'at_pickup');
      } else if (event.zone.type === 'delivery') {
        await this.updateTripStatus(tripId, 'at_delivery');
      }

      // Send notifications or trigger other actions
      // This can be expanded based on business logic
    } catch (error) {
      console.error('Error handling geofence event:', error);
    }
  }

  /**
   * Get traffic conditions (mock implementation)
   */
  private async getTrafficConditions(latitude: number, longitude: number): Promise<string> {
    // This would typically use a traffic API
    // For now, return a mock value
    const conditions = ['light', 'moderate', 'heavy'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  /**
   * Generate status update message
   */
  private generateStatusUpdate(distanceKm: number, eta: ETACalculation): string {
    const roundedDistance = Math.round(distanceKm * 10) / 10;
    const roundedMinutes = Math.round(eta.remainingDuration);
    
    if (distanceKm < 0.1) {
      return 'Arriving now';
    } else if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m away, arriving in ${roundedMinutes} min`;
    } else {
      return `${roundedDistance}km away, arriving in ${roundedMinutes} min`;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Save tracking data to Supabase
   */
  private async saveTrackingData(data: TrackingData): Promise<void> {
    try {
      const { error } = await supabase
        .from('trip_tracking')
        .insert([{
          trip_id: data.tripId,
          driver_id: data.driverId,
          truck_id: data.truckId,
          current_latitude: data.currentLatitude,
          current_longitude: data.currentLongitude,
          heading: data.heading,
          speed_kmh: data.speedKmh,
          distance_to_destination_km: data.distanceToDestinationKm,
          estimated_arrival: data.estimatedArrival,
          traffic_conditions: data.trafficConditions,
          status_update: data.statusUpdate,
          milestone: data.milestone,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error saving tracking data:', error);
      }
    } catch (error) {
      console.error('Error saving tracking data:', error);
    }
  }

  /**
   * Get trip details from database
   */
  private async getTripDetails(tripId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) {
        console.error('Error fetching trip details:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching trip details:', error);
      return null;
    }
  }

  /**
   * Update trip status
   */
  private async updateTripStatus(tripId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('trip_requests')
        .update({ status })
        .eq('id', tripId);

      if (error) {
        console.error('Error updating trip status:', error);
      }
    } catch (error) {
      console.error('Error updating trip status:', error);
    }
  }

  /**
   * Get real-time tracking data for a trip
   */
  async getTrackingData(tripId: string): Promise<TrackingData[]> {
    try {
      const { data, error } = await supabase
        .from('trip_tracking')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching tracking data:', error);
        return [];
      }

      return data.map((item: any) => ({
        tripId: item.trip_id,
        driverId: item.driver_id,
        truckId: item.truck_id,
        currentLatitude: item.current_latitude,
        currentLongitude: item.current_longitude,
        heading: item.heading,
        speedKmh: item.speed_kmh,
        distanceToDestinationKm: item.distance_to_destination_km,
        estimatedArrival: item.estimated_arrival,
        trafficConditions: item.traffic_conditions,
        statusUpdate: item.status_update,
        milestone: item.milestone
      }));
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time tracking updates
   */
  subscribeToTrackingUpdates(
    tripId: string,
    callback: (data: TrackingData) => void
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
          callback({
            tripId: data.trip_id,
            driverId: data.driver_id,
            truckId: data.truck_id,
            currentLatitude: data.current_latitude,
            currentLongitude: data.current_longitude,
            heading: data.heading,
            speedKmh: data.speed_kmh,
            distanceToDestinationKm: data.distance_to_destination_km,
            estimatedArrival: data.estimated_arrival,
            trafficConditions: data.traffic_conditions,
            statusUpdate: data.status_update,
            milestone: data.milestone
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const realTimeTrackingService = new RealTimeTrackingService();
export default realTimeTrackingService;
