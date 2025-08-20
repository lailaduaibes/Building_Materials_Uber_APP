/**
 * LocationTrackingService - Professional GPS Tracking like Uber
 * Real-time location tracking, ETA calculations, and route visualization
 */

import * as Location from 'expo-location';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface DeliveryTracking {
  orderId: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: string;
  currentLocation?: LocationCoordinates;
  customerLocation: LocationCoordinates;
  supplierLocation?: LocationCoordinates;
  estimatedArrival?: number;
  distanceRemaining?: number;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'nearby' | 'delivered';
  routePolyline?: string;
  lastUpdate: number;
}

export interface ETACalculation {
  distanceMeters: number;
  durationSeconds: number;
  trafficDelay?: number;
  formattedDistance: string;
  formattedDuration: string;
}

class LocationTrackingService {
  private watchId: Location.LocationSubscription | null = null;
  private currentLocation: LocationCoordinates | null = null;
  private permissionsGranted: boolean = false;

  // Add a method to check current permission status
  async checkPermissionStatus(): Promise<{
    foreground: string;
    background: string;
    canTrack: boolean;
  }> {
    try {
      const foregroundPermissions = await Location.getForegroundPermissionsAsync();
      const backgroundPermissions = await Location.getBackgroundPermissionsAsync();
      
      return {
        foreground: foregroundPermissions.status,
        background: backgroundPermissions.status,
        canTrack: foregroundPermissions.status === 'granted'
      };
    } catch (error) {
      console.error('Error checking permission status:', error);
      return {
        foreground: 'unknown',
        background: 'unknown',
        canTrack: false
      };
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied');
        return false;
      }

      // For background tracking (when app is minimized)
      // Only request if foreground is already granted
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          console.log('Background location permission denied, but foreground is OK');
          // Still return true since foreground is sufficient for tracking
        } else {
          console.log('Background location permission granted');
        }
      } catch (backgroundError) {
        console.log('Background permission request failed, continuing with foreground only:', backgroundError);
        // Continue with foreground-only permissions
      }

      this.permissionsGranted = true;
      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Method specifically for initializing trip tracking
  async initializeForTripTracking(): Promise<{
    success: boolean;
    error?: string;
    permissions?: any;
  }> {
    try {
      console.log('🚀 Initializing location tracking for trip...');
      
      // Check current permissions
      const permissionStatus = await this.checkPermissionStatus();
      console.log('📍 Current permission status:', permissionStatus);
      
      if (!permissionStatus.canTrack) {
        console.log('🔐 Requesting location permissions...');
        const granted = await this.requestPermissions();
        
        if (!granted) {
          return {
            success: false,
            error: 'Location permissions are required for trip tracking. Please enable location access in your device settings.',
            permissions: permissionStatus
          };
        }
      }
      
      // Test getting current location
      console.log('📡 Testing location access...');
      const location = await this.getCurrentLocation();
      
      if (!location) {
        return {
          success: false,
          error: 'Unable to get your current location. Please check that location services are enabled.',
          permissions: permissionStatus
        };
      }
      
      console.log('✅ Location tracking initialized successfully');
      return {
        success: true,
        permissions: permissionStatus
      };
      
    } catch (error) {
      console.error('❌ Failed to initialize trip tracking:', error);
      return {
        success: false,
        error: `Failed to initialize location tracking: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getCurrentLocation(): Promise<LocationCoordinates | null> {
    try {
      if (!this.permissionsGranted) {
        const granted = await this.requestPermissions();
        if (!granted) return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinates: LocationCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
        timestamp: location.timestamp,
      };

      this.currentLocation = coordinates;
      return coordinates;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  async startLocationTracking(
    onLocationUpdate: (location: LocationCoordinates) => void,
    highAccuracy: boolean = false
  ): Promise<boolean> {
    try {
      if (!this.permissionsGranted) {
        const granted = await this.requestPermissions();
        if (!granted) return false;
      }

      if (this.watchId) {
        this.watchId.remove();
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: highAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const coordinates: LocationCoordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
            timestamp: location.timestamp,
          };

          this.currentLocation = coordinates;
          onLocationUpdate(coordinates);
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  stopLocationTracking(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(
    location1: LocationCoordinates,
    location2: LocationCoordinates
  ): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = location1.latitude * Math.PI / 180;
    const lat2Rad = location2.latitude * Math.PI / 180;
    const deltaLat = (location2.latitude - location1.latitude) * Math.PI / 180;
    const deltaLon = (location2.longitude - location1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Calculate ETA based on distance and estimated speed
  calculateETA(
    driverLocation: LocationCoordinates,
    customerLocation: LocationCoordinates,
    averageSpeed: number = 40 // km/h
  ): ETACalculation {
    const distanceMeters = this.calculateDistance(driverLocation, customerLocation);
    const distanceKm = distanceMeters / 1000;
    
    // Basic ETA calculation (can be enhanced with real traffic data)
    let durationSeconds = (distanceKm / averageSpeed) * 3600;
    
    // Add some buffer for traffic and stops
    const trafficBuffer = durationSeconds * 0.2; // 20% buffer
    durationSeconds += trafficBuffer;

    return {
      distanceMeters,
      durationSeconds,
      trafficDelay: trafficBuffer,
      formattedDistance: this.formatDistance(distanceMeters),
      formattedDuration: this.formatDuration(durationSeconds),
    };
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  // Simulate driver location updates for demo purposes
  async simulateDriverMovement(
    orderId: string,
    startLocation: LocationCoordinates,
    endLocation: LocationCoordinates,
    onUpdate: (tracking: DeliveryTracking) => void
  ): Promise<void> {
    const steps = 20; // Number of simulation steps
    const stepDelay = 3000; // 3 seconds between updates

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      
      // Interpolate between start and end locations
      const currentLat = startLocation.latitude + 
        (endLocation.latitude - startLocation.latitude) * progress;
      const currentLng = startLocation.longitude + 
        (endLocation.longitude - startLocation.longitude) * progress;

      const driverLocation: LocationCoordinates = {
        latitude: currentLat,
        longitude: currentLng,
        timestamp: Date.now(),
        speed: 45 + Math.random() * 20, // Simulate speed variation
        heading: this.calculateBearing(startLocation, endLocation),
      };

      const eta = this.calculateETA(driverLocation, endLocation);
      
      let status: DeliveryTracking['status'] = 'in_transit';
      if (progress < 0.1) status = 'picked_up';
      else if (progress > 0.9) status = 'nearby';
      else if (progress === 1) status = 'delivered';

      const tracking: DeliveryTracking = {
        orderId,
        driverId: 'demo-driver-123',
        driverName: 'John Driver',
        driverPhone: '+1-555-0123',
        vehicleInfo: 'Blue Ford Transit Van - ABC123',
        currentLocation: driverLocation,
        customerLocation: endLocation,
        estimatedArrival: Date.now() + (eta.durationSeconds * 1000),
        distanceRemaining: eta.distanceMeters,
        status,
        lastUpdate: Date.now(),
      };

      onUpdate(tracking);

      if (i < steps) {
        await new Promise(resolve => setTimeout(resolve, stepDelay));
      }
    }
  }

  private calculateBearing(start: LocationCoordinates, end: LocationCoordinates): number {
    const lat1 = start.latitude * Math.PI / 180;
    const lat2 = end.latitude * Math.PI / 180;
    const deltaLon = (end.longitude - start.longitude) * Math.PI / 180;

    const x = Math.sin(deltaLon) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    const bearing = Math.atan2(x, y);
    return (bearing * 180 / Math.PI + 360) % 360;
  }

  // Get real-time delivery tracking for an order
  async getDeliveryTracking(orderId: string): Promise<DeliveryTracking | null> {
    try {
      // In a real implementation, this would fetch from Supabase or API
      // For now, return mock data
      const mockTracking: DeliveryTracking = {
        orderId,
        driverId: 'driver-123',
        driverName: 'John Driver',
        driverPhone: '+1-555-0123',
        vehicleInfo: 'Blue Ford Transit Van - ABC123',
        currentLocation: {
          latitude: 40.7589, // New York coordinates for demo
          longitude: -73.9851,
          timestamp: Date.now(),
          speed: 35,
          heading: 45,
        },
        customerLocation: {
          latitude: 40.7505, // Slightly different location
          longitude: -73.9934,
          timestamp: Date.now(),
        },
        estimatedArrival: Date.now() + (15 * 60 * 1000), // 15 minutes from now
        distanceRemaining: 2500, // 2.5km
        status: 'in_transit',
        lastUpdate: Date.now(),
      };

      return mockTracking;
    } catch (error) {
      console.error('Error getting delivery tracking:', error);
      return null;
    }
  }

  // Update delivery status
  async updateDeliveryStatus(
    orderId: string,
    status: DeliveryTracking['status'],
    location?: LocationCoordinates
  ): Promise<boolean> {
    try {
      // In real implementation, update Supabase
      console.log(`Order ${orderId} status updated to: ${status}`);
      if (location) {
        console.log(`Location: ${location.latitude}, ${location.longitude}`);
      }
      return true;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      return false;
    }
  }

  // Generate route coordinates for polyline (simplified)
  generateRouteCoordinates(
    start: LocationCoordinates,
    end: LocationCoordinates,
    steps: number = 10
  ): LocationCoordinates[] {
    const coordinates: LocationCoordinates[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      coordinates.push({
        latitude: start.latitude + (end.latitude - start.latitude) * progress,
        longitude: start.longitude + (end.longitude - start.longitude) * progress,
        timestamp: Date.now(),
      });
    }
    
    return coordinates;
  }
}

export const locationService = new LocationTrackingService();
