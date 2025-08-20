import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

interface DeliveryStatus {
  orderId: string;
  status: string;
  estimatedArrival?: string;
  currentLocation?: LocationData;
  distanceRemaining?: number;
}

const ProfessionalLocationTracking: React.FC = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  useEffect(() => {
    if (isTracking && permissionGranted) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isTracking, permissionGranted]);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionGranted(status === 'granted');
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
          accuracy: location.coords.accuracy || undefined,
          speed: location.coords.speed || undefined,
        });
      }
    } catch (error) {
      console.error('Error getting location permission:', error);
      Alert.alert('Error', 'Failed to get location permission');
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      if (!permissionGranted) {
        Alert.alert('Permission Required', 'Location permission is required for tracking');
        return;
      }

      // Start location tracking with backend
      const response = await fetch('http://localhost:3000/api/v1/location/start-tracking', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setIsTracking(true);
        startLocationUpdates();
      } else {
        Alert.alert('Error', 'Failed to start tracking');
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert('Error', 'Failed to start tracking');
    }
  };

  const stopLocationTracking = async () => {
    try {
      // Stop location tracking with backend
      const response = await fetch('http://localhost:3000/api/v1/location/stop-tracking', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      setIsTracking(false);
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  };

  const startLocationUpdates = () => {
    const interval = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const locationData: LocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
          accuracy: location.coords.accuracy || undefined,
          speed: location.coords.speed || undefined,
        };

        setCurrentLocation(locationData);

        // Send location to backend
        await fetch('http://localhost:3000/api/v1/location/update', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: locationData.timestamp,
            accuracy: locationData.accuracy,
            speed: locationData.speed,
          }),
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  };

  const getAuthToken = async (): Promise<string> => {
    // This should get the actual auth token from your auth service
    return '';
  };

  const updateDeliveryStatus = async (status: string) => {
    try {
      if (!deliveryStatus?.orderId) {
        Alert.alert('Error', 'No active delivery found');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/v1/orders/${deliveryStatus.orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setDeliveryStatus({ ...deliveryStatus, status });
        Alert.alert('Success', `Status updated to ${status.replace('_', ' ')}`);
      } else {
        Alert.alert('Error', 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const formatCoordinate = (coord: number): string => {
    return coord.toFixed(6);
  };

  const formatSpeed = (speed?: number): string => {
    if (!speed) return '0 km/h';
    return `${(speed * 3.6).toFixed(1)} km/h`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Checking Location Services...</Text>
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Location Permission Required</Text>
        <Text style={styles.permissionText}>
          This app needs location permission to track deliveries and provide real-time updates.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={checkLocationPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Location Tracking</Text>
        <Text style={styles.headerSubtitle}>Real-time Delivery Monitoring</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Tracking Control */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <Text style={styles.trackingTitle}>Live Tracking</Text>
            <Switch
              value={isTracking}
              onValueChange={setIsTracking}
              trackColor={{ false: '#e0e0e0', true: '#3498db' }}
              thumbColor={isTracking ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.trackingStatus}>
            Status: {isTracking ? 'Active' : 'Inactive'}
          </Text>
        </View>

        {/* Current Location */}
        {currentLocation && (
          <View style={styles.locationCard}>
            <Text style={styles.cardTitle}>Current Location</Text>
            <View style={styles.locationInfo}>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Latitude:</Text>
                <Text style={styles.locationValue}>
                  {formatCoordinate(currentLocation.latitude)}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Longitude:</Text>
                <Text style={styles.locationValue}>
                  {formatCoordinate(currentLocation.longitude)}
                </Text>
              </View>
              {currentLocation.accuracy && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>Accuracy:</Text>
                  <Text style={styles.locationValue}>
                    {currentLocation.accuracy.toFixed(1)}m
                  </Text>
                </View>
              )}
              {currentLocation.speed !== undefined && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>Speed:</Text>
                  <Text style={styles.locationValue}>
                    {formatSpeed(currentLocation.speed)}
                  </Text>
                </View>
              )}
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Last Update:</Text>
                <Text style={styles.locationValue}>
                  {new Date(currentLocation.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Delivery Status Controls */}
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Delivery Status</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#f39c12' }]}
              onPress={() => updateDeliveryStatus('picked_up')}
            >
              <Text style={styles.statusButtonText}>Picked Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#9b59b6' }]}
              onPress={() => updateDeliveryStatus('in_transit')}
            >
              <Text style={styles.statusButtonText}>In Transit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#2ecc71' }]}
              onPress={() => updateDeliveryStatus('delivered')}
            >
              <Text style={styles.statusButtonText}>Delivered</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tracking Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Tracking Information</Text>
          <Text style={styles.infoText}>
            • Location updates are sent every 10 seconds when tracking is active
          </Text>
          <Text style={styles.infoText}>
            • Your location is only shared with the delivery system
          </Text>
          <Text style={styles.infoText}>
            • Turn off tracking when not making deliveries to save battery
          </Text>
          <Text style={styles.infoText}>
            • GPS accuracy may vary based on device and environment
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#b3b3b3',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  trackingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: -20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  trackingStatus: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  locationInfo: {
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  locationValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default ProfessionalLocationTracking;
