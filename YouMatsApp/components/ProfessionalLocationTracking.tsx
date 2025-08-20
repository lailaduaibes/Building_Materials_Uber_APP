import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

interface DeliveryStatus {
  orderId: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
  customerName: string;
  address: string;
  estimatedTime: string;
  distance: string;
}

const ProfessionalLocationTracking: React.FC = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>({
    orderId: 'BM-2025-001',
    status: 'assigned',
    customerName: 'Ahmed Construction Co.',
    address: '123 Business District, Dubai',
    estimatedTime: '25 mins',
    distance: '8.5 km'
  });

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for tracking');
        return;
      }
      getCurrentLocation();
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
      });
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const toggleTracking = async () => {
    setLoading(true);
    
    try {
      if (isTracking) {
        // Stop tracking
        setIsTracking(false);
        setIsOnline(false);
      } else {
        // Start tracking
        await getCurrentLocation();
        setIsTracking(true);
        setIsOnline(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle tracking');
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = (newStatus: DeliveryStatus['status']) => {
    setDeliveryStatus(prev => ({ ...prev, status: newStatus }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF6B35';
      case 'assigned': return '#4A90E2';
      case 'picked_up': return '#F5A623';
      case 'in_transit': return '#7ED321';
      case 'delivered': return '#50E3C2';
      default: return '#9B9B9B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Assignment';
      case 'assigned': return 'Order Assigned';
      case 'picked_up': return 'Items Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      default: return 'Unknown Status';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>BuildMate Delivery</Text>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#50E3C2' : '#FF6B35' }]} />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Current Location</Text>
            <TouchableOpacity onPress={getCurrentLocation} style={styles.refreshButton}>
              <Text style={styles.refreshText}>📍 Refresh</Text>
            </TouchableOpacity>
          </View>
          
          {location ? (
            <View style={styles.locationInfo}>
              <View style={styles.coordinateRow}>
                <Text style={styles.coordinateLabel}>Latitude:</Text>
                <Text style={styles.coordinateValue}>{location.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordinateRow}>
                <Text style={styles.coordinateLabel}>Longitude:</Text>
                <Text style={styles.coordinateValue}>{location.longitude.toFixed(6)}</Text>
              </View>
              {location.accuracy && (
                <View style={styles.coordinateRow}>
                  <Text style={styles.coordinateLabel}>Accuracy:</Text>
                  <Text style={styles.coordinateValue}>{Math.round(location.accuracy)}m</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noLocationText}>Location not available</Text>
          )}
        </View>

        {/* Tracking Control */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location Tracking</Text>
          <TouchableOpacity
            style={[styles.trackingButton, isTracking && styles.trackingButtonActive]}
            onPress={toggleTracking}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.trackingButtonText}>
                  {isTracking ? '🛑 Stop Tracking' : '📡 Start Tracking'}
                </Text>
                <Text style={styles.trackingSubtext}>
                  {isTracking ? 'Location updates active' : 'Tap to begin location updates'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Current Delivery */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Current Delivery</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(deliveryStatus.status) }]}>
              <Text style={styles.statusBadgeText}>{getStatusText(deliveryStatus.status)}</Text>
            </View>
          </View>
          
          <View style={styles.deliveryInfo}>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>Order ID:</Text>
              <Text style={styles.deliveryValue}>{deliveryStatus.orderId}</Text>
            </View>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>Customer:</Text>
              <Text style={styles.deliveryValue}>{deliveryStatus.customerName}</Text>
            </View>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>Address:</Text>
              <Text style={styles.deliveryValue}>{deliveryStatus.address}</Text>
            </View>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>ETA:</Text>
              <Text style={styles.deliveryValue}>{deliveryStatus.estimatedTime}</Text>
            </View>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>Distance:</Text>
              <Text style={styles.deliveryValue}>{deliveryStatus.distance}</Text>
            </View>
          </View>
        </View>

        {/* Status Update Buttons */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Update Status</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[styles.statusButton, styles.pickupButton]}
              onPress={() => updateDeliveryStatus('picked_up')}
            >
              <Text style={styles.statusButtonText}>📦 Picked Up</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.statusButton, styles.transitButton]}
              onPress={() => updateDeliveryStatus('in_transit')}
            >
              <Text style={styles.statusButtonText}>🚛 In Transit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.statusButton, styles.deliveredButton]}
              onPress={() => updateDeliveryStatus('delivered')}
            >
              <Text style={styles.statusButtonText}>✅ Delivered</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Deliveries</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>248</Text>
              <Text style={styles.statLabel}>KM Driven</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>8.5</Text>
              <Text style={styles.statLabel}>Hours Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>98%</Text>
              <Text style={styles.statLabel}>On Time</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    letterSpacing: 0.3,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  locationInfo: {
    gap: 12,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  coordinateLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  coordinateValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  noLocationText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
  },
  trackingButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  trackingButtonActive: {
    backgroundColor: '#50E3C2',
  },
  trackingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trackingSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deliveryInfo: {
    gap: 12,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  deliveryLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  deliveryValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  pickupButton: {
    backgroundColor: '#F5A623',
  },
  transitButton: {
    backgroundColor: '#7ED321',
  },
  deliveredButton: {
    backgroundColor: '#50E3C2',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});

export default ProfessionalLocationTracking;
