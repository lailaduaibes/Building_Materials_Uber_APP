/**
 * LocationTrackingService - Professional GPS Tracking for Drivers
 * Real-time location tracking, ETA calculations, and route visualization
 * Adapted for driver app - tracks driver location and shares with customers
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

export interface DriverLocation {
  driverId: string;
  location: LocationCoordinates;
  status: 'online' | 'offline' | 'busy' | 'on_break';
  currentOrderId?: string;
  lastUpdate: number;
}

export interface ETACalculation {
  distanceMeters: number;
  durationSeconds: number;
  trafficDelay?: number;
  formattedDistance: string;
  formattedDuration: string;
}

class DriverLocationService {
  private watchId: Location.LocationSubscription | null = null;
  private currentLocation: LocationCoordinates | null = null;
  private permissionsGranted: boolean = false;
  private driverId: string | null = null;

  // Initialize driver location service
  async initializeDriver(driverId: string): Promise<boolean> {
    this.driverId = driverId;
    return await this.requestPermissions();
  }

  // Check current permission status
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

      // Request background permissions for continuous tracking
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          console.log('Background location permission denied, but foreground is OK');
        } else {
          console.log('Background location permission granted');
        }
      } catch (backgroundError) {
        console.log('Background permission request failed, continuing with foreground only:', backgroundError);
      }

      this.permissionsGranted = true;
      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
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

  // Start continuous location tracking for active delivery
  async startDriverTracking(
    onLocationUpdate: (location: LocationCoordinates) => void,
    highAccuracy: boolean = true
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
          accuracy: highAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.High,
          timeInterval: 3000, // Update every 3 seconds for driver tracking
          distanceInterval: 5, // Update every 5 meters
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
          this.updateDriverLocationInDatabase(coordinates);
          onLocationUpdate(coordinates);
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting driver tracking:', error);
      return false;
    }
  }

  stopDriverTracking(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  // Update driver location in database for real-time tracking
  private async updateDriverLocationInDatabase(location: LocationCoordinates): Promise<void> {
    if (!this.driverId) return;

    try {
      // Update driver location in Supabase for real-time customer tracking
      await supabase
        .from('driver_locations')
        .upsert({
          driver_id: this.driverId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          heading: location.heading,
          speed: location.speed,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error updating driver location in database:', error);
    }
  }

  // Update driver status (online, busy, offline)
  async updateDriverStatus(
    status: 'online' | 'offline' | 'busy' | 'on_break',
    orderId?: string
  ): Promise<boolean> {
    if (!this.driverId) return false;

    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({
          status,
          is_available: status === 'online',
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.driverId);

      if (error) {
        console.error('Error updating driver status:', error);
        return false;
      }

      console.log(`Driver status updated to: ${status}`);
      return true;
    } catch (error) {
      console.error('Error updating driver status:', error);
      return false;
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

  // Calculate ETA to delivery location
  calculateETA(
    driverLocation: LocationCoordinates,
    destinationLocation: LocationCoordinates,
    averageSpeed: number = 40 // km/h
  ): ETACalculation {
    const distanceMeters = this.calculateDistance(driverLocation, destinationLocation);
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

  // Notify customer of delivery status updates
  async notifyCustomerOfStatusUpdate(
    orderId: string,
    status: string,
    estimatedArrival?: number
  ): Promise<boolean> {
    try {
      // Send real-time update to customer app via Supabase realtime
      await supabase
        .from('delivery_updates')
        .insert({
          order_id: orderId,
          driver_id: this.driverId,
          status,
          estimated_arrival: estimatedArrival ? new Date(estimatedArrival).toISOString() : null,
          location: this.currentLocation,
          created_at: new Date().toISOString(),
        });

      return true;
    } catch (error) {
      console.error('Error notifying customer of status update:', error);
      return false;
    }
  }

  // Generate route coordinates for navigation
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

  getCurrentDriverLocation(): LocationCoordinates | null {
    return this.currentLocation;
  }
}

export const driverLocationService = new DriverLocationService();
