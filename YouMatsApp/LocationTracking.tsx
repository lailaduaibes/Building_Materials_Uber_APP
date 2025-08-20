import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Switch,
  Button,
  ScrollView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationCoordinates, DriverLocation, ETAUpdate } from '../types/location';

interface LocationTrackingProps {
  isDriver?: boolean;
  orderId?: string;
  onLocationUpdate?: (location: DriverLocation) => void;
}

export const LocationTracking: React.FC<LocationTrackingProps> = ({
  isDriver = false,
  orderId,
  onLocationUpdate
}) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [isOnline, setIsOnline] = useState(false);
  const [eta, setETA] = useState<ETAUpdate | null>(null);
  const [locationHistory, setLocationHistory] = useState<DriverLocation[]>([]);
  const [watchId, setWatchId] = useState<Location.LocationSubscription | null>(null);

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  useEffect(() => {
    requestLocationPermission();
    getBatteryLevel();
    
    return () => {
      if (watchId) {
        watchId.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (isTracking && isDriver) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isTracking, isDriver]);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const getBatteryLevel = async () => {
    try {
      // Mock battery level - in real app use expo-battery
      setBatteryLevel(Math.floor(Math.random() * 100));
    } catch (error) {
      console.error('Error getting battery level:', error);
    }
  };

  const startLocationTracking = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Location permission is required for tracking');
        return;
      }

      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const coords: LocationCoordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 10,
            altitude: location.coords.altitude || 0,
            speed: location.coords.speed || 0,
            heading: location.coords.heading || 0,
          };

          setCurrentLocation(coords);
          
          if (isDriver && isOnline) {
            updateLocationOnServer(coords);
          }
        }
      );

      setWatchId(subscription);
      setIsTracking(true);
      
      Alert.alert('Tracking Started', 'Location tracking is now active');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const stopLocationTracking = () => {
    if (watchId) {
      watchId.remove();
      setWatchId(null);
    }
    setIsTracking(false);
  };

  const updateLocationOnServer = async (location: LocationCoordinates) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          location,
          batteryLevel,
          orderId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Location updated successfully:', data);
        
        if (data.data?.location) {
          onLocationUpdate?.(data.data.location);
        }
        
        if (data.data?.eta) {
          setETA(data.data.eta);
        }
      } else {
        console.error('Failed to update location:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const toggleDriverStatus = async (online: boolean) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/location/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          isOnline: online,
          location: currentLocation,
        }),
      });

      if (response.ok) {
        setIsOnline(online);
        Alert.alert(
          'Status Updated', 
          `You are now ${online ? 'online' : 'offline'}`
        );
      } else {
        console.error('Failed to update status:', response.statusText);
        Alert.alert('Error', 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const getLocationHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // In real app, get driver ID from user context
      const driverId = 'driver-id'; // Replace with actual driver ID

      const response = await fetch(
        `${API_BASE_URL}/location/driver/${driverId}/history?limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data?.history?.locations) {
          setLocationHistory(data.data.history.locations);
        }
      }
    } catch (error) {
      console.error('Error getting location history:', error);
    }
  };

  const trackOrder = async (orderIdToTrack: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/location/order/${orderIdToTrack}/track`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Order tracking data:', data);
        
        if (data.data?.eta) {
          setETA(data.data.eta);
        }
        
        if (data.data?.history?.locations) {
          setLocationHistory(data.data.history.locations);
        }
      }
    } catch (error) {
      console.error('Error tracking order:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Location Tracking</Text>
        <Text style={styles.subtitle}>
          {isDriver ? 'Driver Mode' : 'Customer Mode'}
        </Text>
      </View>

      {/* Current Location */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Location</Text>
        {currentLocation ? (
          <View>
            <Text>Latitude: {currentLocation.latitude.toFixed(6)}</Text>
            <Text>Longitude: {currentLocation.longitude.toFixed(6)}</Text>
            <Text>Accuracy: {currentLocation.accuracy?.toFixed(1)}m</Text>
            {currentLocation.speed && (
              <Text>Speed: {(currentLocation.speed * 3.6).toFixed(1)} km/h</Text>
            )}
          </View>
        ) : (
          <Text style={styles.noData}>No location data</Text>
        )}
      </View>

      {/* Driver Controls */}
      {isDriver && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driver Controls</Text>
          
          <View style={styles.row}>
            <Text>Location Tracking</Text>
            <Switch
              value={isTracking}
              onValueChange={setIsTracking}
            />
          </View>
          
          <View style={styles.row}>
            <Text>Online Status</Text>
            <Switch
              value={isOnline}
              onValueChange={toggleDriverStatus}
              disabled={!isTracking}
            />
          </View>

          <View style={styles.row}>
            <Text>Battery Level: {batteryLevel}%</Text>
          </View>

          <Button
            title="Get Location History"
            onPress={getLocationHistory}
            disabled={!isOnline}
          />
        </View>
      )}

      {/* ETA Information */}
      {eta && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estimated Time of Arrival</Text>
          <Text>ETA: {new Date(eta.estimatedArrival).toLocaleTimeString()}</Text>
          <Text>Distance Remaining: {eta.distanceRemaining.toFixed(1)} km</Text>
          <Text>Traffic: {eta.trafficConditions}</Text>
          <Text>Confidence: {eta.confidence}%</Text>
        </View>
      )}

      {/* Order Tracking */}
      {orderId && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Tracking</Text>
          <Text>Order ID: {orderId}</Text>
          <Button
            title="Track This Order"
            onPress={() => trackOrder(orderId)}
          />
        </View>
      )}

      {/* Location History */}
      {locationHistory.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Locations</Text>
          {locationHistory.slice(0, 5).map((loc, index) => (
            <View key={loc.id || index} style={styles.historyItem}>
              <Text style={styles.historyTime}>
                {new Date(loc.timestamp).toLocaleTimeString()}
              </Text>
              <Text>
                {loc.location.latitude.toFixed(4)}, {loc.location.longitude.toFixed(4)}
              </Text>
              {loc.batteryLevel && (
                <Text style={styles.battery}>Battery: {loc.batteryLevel}%</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Status Indicators */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: isTracking ? '#4CAF50' : '#f44336' }]}>
          <Text style={styles.statusText}>
            {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
          </Text>
        </View>
        
        {isDriver && (
          <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#2196F3' : '#9E9E9E' }]}>
            <Text style={styles.statusText}>
              {isOnline ? 'Driver Online' : 'Driver Offline'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E86C1',
    padding: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  card: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  noData: {
    color: '#999',
    fontStyle: 'italic',
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  historyTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  battery: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  statusContainer: {
    margin: 10,
  },
  statusIndicator: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LocationTracking;
