/**
 * LiveTripTrackingScreen - Driver's Real-time Trip Tracking
 * Matches the customer app experience with real-time location updates
 * Shows trip progress, customer location, and provides status updates
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Linking,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MapView, { Marker, Polyline, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../src/contexts/LanguageContext';
import { LocationCoordinates, driverLocationService } from '../services/DriverLocationService';
import { driverService, OrderAssignment } from '../services/DriverService';
import { createClient } from '@supabase/supabase-js';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

// Black & White Theme (matching customer app)
const theme = {
  primary: '#000000',
  secondary: '#FFFFFF',
  accent: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#FFFFFF',
  text: '#000000',
  lightText: '#8E8E93',
  border: '#C6C6C8',
};

// Supabase client for real-time updates
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';
// Service role key for trip tracking operations (bypasses RLS)
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);
// Service role client for trip tracking (bypasses RLS restrictions)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

interface LiveTripTrackingScreenProps {
  order: OrderAssignment;
  driverId: string;
  onBack: () => void;
  onCompleteTrip: () => void;
}

interface TripTracking {
  id: string;
  trip_id: string; // Correct column name
  driver_latitude: number;
  driver_longitude: number;
  customer_latitude?: number;
  customer_longitude?: number;
  status: 'matched' | 'driver_en_route' | 'at_pickup' | 'loaded' | 'in_transit' | 'at_delivery' | 'delivered'; // ACTUAL database constraint values
  eta_minutes?: number;
  distance_remaining_km?: number;
  current_speed_kmh?: number;
  created_at?: string;
  updated_at?: string;
}

export const LiveTripTrackingScreen: React.FC<LiveTripTrackingScreenProps> = ({
  order,
  driverId,
  onBack,
  onCompleteTrip,
}) => {
  const { t } = useLanguage();
  const { t: i18nT } = useTranslation();
  const [driverLocation, setDriverLocation] = useState<LocationCoordinates | null>(null);
  const [customerLocation, setCustomerLocation] = useState<LocationCoordinates | null>(null);
  const [tripStatus, setTripStatus] = useState<TripTracking['status']>('matched');
  const [loading, setLoading] = useState(true);
  const [distanceToCustomer, setDistanceToCustomer] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<any>(null);
  const trackingUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeTrip();
    return () => {
      cleanup();
    };
  }, []);

  // Map database order status to LiveTripTrackingScreen status
  const mapOrderStatusToTripStatus = (orderStatus: string): TripTracking['status'] => {
    console.log('🔄 Mapping order status to trip status:', orderStatus);
    
    switch (orderStatus) {
      case 'accepted':
      case 'matched':
        console.log('➡️ Order status mapped to: matched');
        return 'matched';
      case 'in_transit':
        console.log('➡️ Order status "in_transit" mapped to: in_transit');
        return 'in_transit';
      case 'delivered':
        console.log('➡️ Order status mapped to: delivered');
        return 'delivered';
      default:
        console.log('➡️ Unknown order status, defaulting to: matched');
        return 'matched';
    }
  };

  const initializeTrip = async () => {
    try {
      setLoading(true);
      
      // Initialize trip status based on order status from database
      const initialTripStatus = mapOrderStatusToTripStatus(order.status);
      setTripStatus(initialTripStatus);
      console.log('🗺️ LiveTripTrackingScreen - Initialize trip status:');
      console.log('   Order ID:', order.id.substring(0, 8));
      console.log('   Order status from props:', order.status);
      console.log('   Mapped to trip status:', initialTripStatus);
      
      // Also fetch fresh data from database to verify
      try {
        console.log('🔄 Fetching fresh trip data from database...');
        const { data: freshTripData, error: fetchError } = await supabase
          .from('trip_requests')
          .select('id, status, pickup_started_at, pickup_completed_at')
          .eq('id', order.id)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no rows found
        
        if (fetchError) {
          console.error('   Error fetching fresh trip data:', fetchError);
        } else if (freshTripData) {
          console.log('   Fresh status from database:', freshTripData.status);
          const freshTripStatus = mapOrderStatusToTripStatus(freshTripData.status);
          console.log('   Fresh mapped trip status:', freshTripStatus);
          
          if (freshTripStatus !== initialTripStatus) {
            console.log('   ⚠️ Status mismatch! Using database status');
            setTripStatus(freshTripStatus);
          }
        } else {
          console.log('   ℹ️ No trip found in database with ID:', order.id.substring(0, 8));
          console.log('   Using status from props:', initialTripStatus);
        }
      } catch (error) {
        console.error('   Error fetching fresh data:', error);
      }
      
      // Initialize location tracking
      const locationPermissionGranted = await driverLocationService.initializeDriver(driverId);
      if (!locationPermissionGranted) {
        Alert.alert(
          t('liveTracking.locationPermissionRequired'),
          t('liveTracking.enableLocationAccess'),
          [
            { text: t('liveTracking.cancel'), style: 'cancel' },
            { text: t('liveTracking.settings'), onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Get initial driver location
      const initialLocation = await driverLocationService.getCurrentLocation();
      if (initialLocation) {
        setDriverLocation(initialLocation);
      }

      // Set customer location from order
      const custLocation: LocationCoordinates = {
        latitude: order.pickupLocation.latitude,
        longitude: order.pickupLocation.longitude,
        timestamp: Date.now(),
      };
      setCustomerLocation(custLocation);

      // Start continuous location tracking
      startLocationTracking();
      
      // Start updating trip tracking in database
      startTripTracking();
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing trip:', error);
      Alert.alert(t('liveTracking.error'), t('liveTracking.failedToInitialize'));
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      const success = await driverLocationService.startDriverTracking(
        (location: LocationCoordinates) => {
          setDriverLocation(location);
          updateTripTrackingInDatabase(location);
          calculateDistanceAndETA(location);
        },
        true // high accuracy for trip tracking
      );
      
      if (!success) {
        console.error('Failed to start location tracking');
      }
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  };

  const startTripTracking = () => {
    // Update trip tracking every 10 seconds
    trackingUpdateInterval.current = setInterval(() => {
      if (driverLocation && customerLocation) {
        updateTripTrackingInDatabase(driverLocation);
      }
    }, 10000);
  };

  const updateTripTrackingInDatabase = async (location: LocationCoordinates) => {
    try {
      // Update trip_tracking table with correct schema
      const trackingData = {
        trip_id: order.id, // Use order.id as trip_id
        driver_latitude: location.latitude,
        driver_longitude: location.longitude,
        customer_latitude: customerLocation?.latitude || order.pickupLocation.latitude,
        customer_longitude: customerLocation?.longitude || order.pickupLocation.longitude,
        status: tripStatus, // Should be one of: assigned, en_route_pickup, at_pickup, loaded, en_route_delivery, delivered
        eta_minutes: etaMinutes,
        distance_remaining_km: distanceToCustomer ? distanceToCustomer / 1000 : null,
        current_speed_kmh: location.speed ? location.speed * 3.6 : null, // Convert m/s to km/h
      };

      // Insert or update trip tracking data using service role (bypasses RLS)
      const { error: trackingError } = await supabaseService
        .from('trip_tracking')
        .insert(trackingData);

      if (trackingError) {
        console.log('ℹ️ trip_tracking insert failed:', trackingError.message);
        // This is not critical for the app functionality, just tracking data
      } else {
        console.log('✅ Trip tracking inserted successfully');
      }

      // Also update the main trip_requests table status
      const { error: tripError } = await supabase
        .from('trip_requests')
        .update({
          status: tripStatus,
        })
        .eq('id', order.id);

      if (tripError) {
        console.log('ℹ️ trip_requests update failed:', tripError.message);
      } else {
        console.log('✅ Trip request status updated successfully');
      }

    } catch (error) {
      console.error('Error in updateTripTrackingInDatabase:', error);
    }
  };

  const calculateDistanceAndETA = (driverLoc: LocationCoordinates) => {
    if (!customerLocation) return;

    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      driverLoc.latitude,
      driverLoc.longitude,
      customerLocation.latitude,
      customerLocation.longitude
    );
    
    setDistanceToCustomer(distance);

    // Simple ETA calculation (assuming average speed of 40 km/h in city)
    const averageSpeedKmh = 40;
    const distanceKm = distance / 1000;
    const estimatedMinutes = Math.round((distanceKm / averageSpeedKmh) * 60);
    setEtaMinutes(estimatedMinutes);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Map LiveTripTrackingScreen status back to database status
  const mapTripStatusToOrderStatus = (tripStatus: TripTracking['status']): string => {
    switch (tripStatus) {
      case 'matched':
        return 'matched';
      case 'in_transit':
        return 'start_trip'; // Send correct status for "Start Trip" action
      case 'delivered':
        return 'delivered';
      default:
        return 'matched';
    }
  };

  const updateTripStatus = async (newStatus: TripTracking['status']) => {
    console.log('📱 LiveTripTrackingScreen - updateTripStatus called:');
    console.log('   Current tripStatus:', tripStatus);
    console.log('   New tripStatus:', newStatus);
    
    setTripStatus(newStatus);
    
    // Map trip status to database status
    const databaseStatus = mapTripStatusToOrderStatus(newStatus);
    console.log('   Mapped to database status:', databaseStatus);
    
    // Use DriverService to update the trip status (has proper permissions)
    try {
      console.log('   Calling driverService.updateTripStatus...');
      const success = await driverService.updateTripStatus(order.id, databaseStatus);
      
      if (success) {
        console.log(`✅ Database updated via DriverService: trip ${order.id.substring(0,8)} status = ${databaseStatus}`);
        
        // Force immediate tracking update
        if (driverLocation) {
          updateTripTrackingInDatabase(driverLocation);
        }
      } else {
        console.error('❌ DriverService.updateTripStatus returned false');
        // Revert UI state on failure
        setTripStatus(tripStatus);
      }
    } catch (error) {
      console.error('❌ Error in updateTripStatus via DriverService:', error);
      // Revert UI state on failure
      setTripStatus(tripStatus);
    }
  };

  const handleStatusUpdate = (status: 'matched' | 'in_transit' | 'delivered') => {
    console.log('🔘 LiveTripTrackingScreen - Button pressed:');
    console.log('   Button action:', status);
    console.log('   Current tripStatus:', tripStatus);
    
    const statusMessages: Record<string, string> = {
      'matched': 'Trip Assigned',
      'in_transit': 'In Transit',
      'delivered': 'Trip Completed'
    };

    Alert.alert(
      t('liveTracking.updateStatusTitle'),
      t('liveTracking.updateStatusMessage'),
      [
        { text: t('liveTracking.cancel'), style: 'cancel' },
        { 
          text: t('liveTracking.confirm'), 
          onPress: () => {
            console.log('   User confirmed status update to:', status);
            updateTripStatus(status);
            if (status === 'delivered') {
              onCompleteTrip();
            }
          }
        }
      ]
    );
  };

  const callCustomer = () => {
    if (order.customerPhone) {
      Linking.openURL(`tel:${order.customerPhone}`);
    } else {
      Alert.alert(t('liveTracking.noContact'), t('liveTracking.customerPhoneNotAvailable'));
    }
  };

  const openNavigation = () => {
    if (customerLocation) {
      const url = `https://maps.google.com/maps?daddr=${customerLocation.latitude},${customerLocation.longitude}`;
      Linking.openURL(url);
    }
  };

  const fitMapToMarkers = () => {
    if (!driverLocation || !customerLocation || !mapRef.current) return;

    const coordinates = [
      {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
      },
      {
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
      },
    ];

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 100,
        right: 100,
        bottom: 100,
        left: 100,
      },
      animated: true,
    });
  };

  const cleanup = () => {
    driverLocationService.stopDriverTracking();
    if (trackingUpdateInterval.current) {
      clearInterval(trackingUpdateInterval.current);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('liveTracking.initializingTracking')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('liveTracking.tripNumber')}{order.id.slice(-6)}</Text>
          <Text style={styles.headerSubtitle}>{order.customerName}</Text>
        </View>
        <TouchableOpacity style={styles.phoneButton} onPress={callCustomer}>
          <Ionicons name="call" size={24} color={theme.accent} />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {driverLocation && customerLocation && (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: (driverLocation.latitude + customerLocation.latitude) / 2,
              longitude: (driverLocation.longitude + customerLocation.longitude) / 2,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onMapReady={fitMapToMarkers}
          >
            {/* Driver Marker */}
            <Marker
              coordinate={{
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
              }}
              title={t('liveTracking.yourLocation')}
              description={t('liveTracking.driver')}
            >
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={20} color={theme.secondary} />
              </View>
            </Marker>

            {/* Customer Marker */}
            <Marker
              coordinate={{
                latitude: customerLocation.latitude,
                longitude: customerLocation.longitude,
              }}
              title={t('liveTracking.customerLocation')}
              description={order.pickupLocation.address}
            >
              <View style={styles.customerMarker}>
                <Ionicons name="location" size={20} color={theme.secondary} />
              </View>
            </Marker>

            {/* Route Line */}
            <Polyline
              coordinates={[
                {
                  latitude: driverLocation.latitude,
                  longitude: driverLocation.longitude,
                },
                {
                  latitude: customerLocation.latitude,
                  longitude: customerLocation.longitude,
                },
              ]}
              strokeColor={theme.accent}
              strokeWidth={3}
            />
          </MapView>
        )}
      </View>

      {/* Trip Info */}
      <View style={styles.tripInfo}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Status and ETA */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>{t('liveTracking.status')}</Text>
              <Text style={[styles.statusValue, { color: theme.accent }]}>
                {tripStatus ? tripStatus.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
              </Text>
            </View>
            
            {etaMinutes && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t('liveTracking.eta')}</Text>
                <Text style={styles.statusValue}>{etaMinutes} {t('liveTracking.minutes')}</Text>
              </View>
            )}
            
            {distanceToCustomer && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t('liveTracking.distance')}</Text>
                <Text style={styles.statusValue}>
                  {(distanceToCustomer / 1000).toFixed(1)} km
                </Text>
              </View>
            )}
          </View>

          {/* Order Details */}
          <View style={styles.orderCard}>
            <Text style={styles.orderTitle}>{t('liveTracking.orderDetails')}</Text>
            <Text style={styles.orderAddress}>{order.pickupLocation.address}</Text>
            <Text style={styles.orderItems}>
              {order.materials?.map(m => `${m.quantity} ${m.description}`).join(', ') || 'Loading materials...'}
            </Text>
            <Text style={styles.orderAmount}>SAR {order.estimatedEarnings?.toFixed(2) || '0.00'}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {tripStatus === 'matched' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.accent }]}
                onPress={() => handleStatusUpdate('in_transit')}
              >
                <Text style={styles.actionButtonText}>{t('liveTracking.startTrip')}</Text>
              </TouchableOpacity>
            )}

            {tripStatus === 'in_transit' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.success }]}
                onPress={() => handleStatusUpdate('delivered')}
              >
                <Text style={styles.actionButtonText}>{t('liveTracking.completeDelivery')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={openNavigation}
            >
              <Text style={[styles.actionButtonText, { color: theme.text }]}>{t('liveTracking.openNavigation')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: responsive.fontSize(16),
    color: theme.lightText,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsive.padding(20),
    paddingVertical: responsive.padding(15),
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: responsive.padding(8),
    minHeight: deviceTypes.isAndroid ? 48 : 44,
    minWidth: deviceTypes.isAndroid ? 48 : 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: responsive.spacing(15),
  },
  headerTitle: {
    fontSize: responsive.fontSize(18),
    fontWeight: '600',
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: responsive.fontSize(14),
    color: theme.lightText,
    marginTop: responsive.spacing(2),
  },
  phoneButton: {
    padding: responsive.padding(8),
    minHeight: deviceTypes.isAndroid ? 48 : 44,
    minWidth: deviceTypes.isAndroid ? 48 : 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  driverMarker: {
    width: responsive.scale(40),
    height: responsive.scale(40),
    backgroundColor: theme.accent,
    borderRadius: responsive.scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.secondary,
  },
  customerMarker: {
    width: responsive.scale(40),
    height: responsive.scale(40),
    backgroundColor: theme.error,
    borderRadius: responsive.scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.secondary,
  },
  tripInfo: {
    backgroundColor: theme.background,
    borderTopLeftRadius: responsive.scale(20),
    borderTopRightRadius: responsive.scale(20),
    paddingHorizontal: responsive.padding(20),
    paddingTop: responsive.padding(20),
    maxHeight: height * 0.4,
    ...deviceTypes.isTablet && {
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
      borderRadius: responsive.scale(20),
      margin: responsive.spacing(20),
      maxHeight: height * 0.5,
    },
  },
  statusCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.scale(12),
    padding: responsive.padding(16),
    marginBottom: responsive.spacing(16),
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: responsive.spacing(8),
  },
  statusLabel: {
    fontSize: responsive.fontSize(14),
    color: theme.lightText,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: responsive.fontSize(14),
    color: theme.text,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.scale(12),
    padding: responsive.padding(16),
    marginBottom: responsive.spacing(16),
  },
  orderTitle: {
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: theme.text,
    marginBottom: responsive.spacing(8),
  },
  orderAddress: {
    fontSize: responsive.fontSize(14),
    color: theme.text,
    marginBottom: responsive.spacing(4),
  },
  orderItems: {
    fontSize: responsive.fontSize(14),
    color: theme.lightText,
    marginBottom: responsive.spacing(8),
  },
  orderAmount: {
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: theme.success,
  },
  actionButtons: {
    paddingBottom: responsive.padding(20),
    ...deviceTypes.isTablet && {
      paddingHorizontal: responsive.padding(40),
    },
  },
  actionButton: {
    backgroundColor: theme.accent,
    borderRadius: responsive.scale(12),
    paddingVertical: responsive.padding(16),
    alignItems: 'center',
    marginBottom: responsive.spacing(12),
    minHeight: deviceTypes.isAndroid ? 48 : 44,
  },
  secondaryButton: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  actionButtonText: {
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: theme.secondary,
  },
});

export default LiveTripTrackingScreen;
