/**
 * LiveTrackingScreenTrip - Uber-style Live Trip Tracking
 * Integrated with TripService for real-time trip tracking
 * Shows customer location, driver location, and real-time updates
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
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { 
  locationService, 
  LocationCoordinates,
  ETACalculation 
} from './LocationTrackingService';
import tripService, { TripRequest } from './services/TripService';
import { createClient } from '@supabase/supabase-js';
import { Theme } from './theme';
import { enhancedNotificationService } from './services/EnhancedNotificationService';
import NotificationTestPanel from './components/NotificationTestPanel';
import TripCommunicationPanel from './components/TripCommunicationPanel';

const { width, height } = Dimensions.get('window');

// YouMats Blue theme
const theme = {
  primary: Theme.colors.primary,
  secondary: Theme.colors.background.primary,
  accent: Theme.colors.secondary,
  success: Theme.colors.success,
  background: Theme.colors.background.primary,
  text: Theme.colors.text.primary,
  lightText: Theme.colors.text.secondary,
  border: Theme.colors.border.light,
};

// Supabase client for real-time subscriptions - CORRECTED URL
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';
const supabase = createClient(supabaseUrl, supabaseKey);

interface LiveTrackingScreenTripProps {
  tripId: string;
  onBack: () => void;
}

interface TripTracking {
  id: string;
  trip_request_id: string;
  driver_latitude: number;
  driver_longitude: number;
  customer_latitude: number;
  customer_longitude: number;
  status: 'assigned' | 'en_route_pickup' | 'at_pickup' | 'loaded' | 'en_route_delivery' | 'delivered';
  eta_minutes?: number;
  distance_remaining_km?: number;
  current_speed_kmh?: number;
  updated_at: string;
}

interface DriverInfo {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_image_url?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  rating?: number;
}

export const LiveTrackingScreenTrip: React.FC<LiveTrackingScreenTripProps> = ({
  tripId,
  onBack,
}) => {
  const [trip, setTrip] = useState<TripRequest | null>(null);
  const [tracking, setTracking] = useState<TripTracking | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [customerLocation, setCustomerLocation] = useState<LocationCoordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<ETACalculation | null>(null);
  const [showNotificationTest, setShowNotificationTest] = useState(false);
  const [showCommunication, setShowCommunication] = useState(false);
  const [communicationModalVisible, setCommunicationModalVisible] = useState(false);
  
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const trackingSubscription = useRef<any>(null);

  useEffect(() => {
    initializeTracking();
    
    // Fallback timeout to ensure loading doesn't stay stuck
    const fallbackTimeout = setTimeout(() => {
      console.log('⚠️ Fallback timeout reached, forcing loading to false');
      setLoading(false);
    }, 10000); // 10 seconds max loading time
    
    return () => {
      clearTimeout(fallbackTimeout);
      if (trackingSubscription.current) {
        trackingSubscription.current.unsubscribe();
      }
      
      // Cleanup notification subscriptions
      enhancedNotificationService.unsubscribe(`trip_${tripId}`);
    };
  }, [tripId]);

  const initializeTracking = async () => {
    try {
      console.log('🚀 Starting tracking initialization for trip:', tripId);
      setLoading(true);
      
      // Get trip details
      console.log('📊 Fetching trip data...');
      const tripData = await tripService.getTripById(tripId);
      if (tripData) {
        console.log('✅ Trip data loaded:', tripData);
        setTrip(tripData);
        
        // Get driver info if assigned
        if (tripData.assigned_driver_id) {
          console.log('👨‍✈️ Fetching driver info...');
          const driver = await getDriverInfo(tripData.assigned_driver_id);
          setDriverInfo(driver);
          console.log('✅ Driver info loaded:', driver);
        }
      } else {
        console.warn('⚠️ No trip data found for trip ID:', tripId);
      }

      // Initialize location tracking with proper permission handling
      try {
        console.log('� Initializing location tracking...');
        const initResult = await locationService.initializeForTripTracking();
        
        if (!initResult.success) {
          console.error('❌ Failed to initialize location tracking:', initResult.error);
          
          // Use pickup location as fallback
          if (tripData?.pickup_latitude && tripData?.pickup_longitude) {
            console.log('🔄 Using pickup location as fallback');
            setCustomerLocation({
              latitude: tripData.pickup_latitude,
              longitude: tripData.pickup_longitude,
              timestamp: Date.now(),
            });
          }
        } else {
          console.log('✅ Location tracking initialized successfully');
          // Get customer's current location
          const location = await locationService.getCurrentLocation();
          if (location) {
            setCustomerLocation(location);
            console.log('📍 Customer location obtained:', location);
          } else {
            // Use pickup location from trip as fallback
            if (tripData?.pickup_latitude && tripData?.pickup_longitude) {
              console.log('🔄 Using pickup location as customer location fallback');
              setCustomerLocation({
                latitude: tripData.pickup_latitude,
                longitude: tripData.pickup_longitude,
                timestamp: Date.now(),
              });
            }
          }
        }
      } catch (locationError) {
        console.error('❌ Location initialization error:', locationError);
        
        // Use pickup location as fallback
        if (tripData?.pickup_latitude && tripData?.pickup_longitude) {
          console.log('🔄 Using pickup location as error fallback');
          setCustomerLocation({
            latitude: tripData.pickup_latitude,
            longitude: tripData.pickup_longitude,
            timestamp: Date.now(),
          });
        }
      }

      // Subscribe to real-time tracking updates
      console.log('🔄 Setting up real-time subscriptions...');
      subscribeToTrackingUpdates();
      
      // Initialize and subscribe to enhanced notifications
      await initializeNotifications();
      
      // Start pulse animation
      startPulseAnimation();
      
      console.log('✅ Tracking initialization completed');
      setLoading(false);
    } catch (error) {
      console.error('❌ Error initializing tracking:', error);
      Alert.alert('Error', 'Failed to initialize tracking');
      setLoading(false);
    }
  };

  const getDriverInfo = async (driverId: string): Promise<DriverInfo | null> => {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          profile_image_url,
          vehicle_plate,
          vehicle_model,
          rating
        `)
        .eq('user_id', driverId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching driver info:', error);
      return null;
    }
  };

  const subscribeToTrackingUpdates = () => {
    trackingSubscription.current = supabase
      .channel(`trip_tracking:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_tracking',
          filter: `trip_request_id=eq.${tripId}`,
        },
        (payload) => {
          console.log('Real-time tracking update:', payload);
          if (payload.new) {
            setTracking(payload.new as TripTracking);
            calculateETA(payload.new as TripTracking);
          }
        }
      )
      .subscribe();
  };

  const initializeNotifications = async () => {
    try {
      console.log('🔔 Initializing notifications for trip:', tripId);
      
      // Initialize the notification service
      const initResult = await enhancedNotificationService.initialize();
      if (initResult.success) {
        console.log('✅ Notification service initialized');
        
        // Subscribe to trip-specific notifications
        enhancedNotificationService.subscribeToTripNotifications(
          tripId,
          (notification) => {
            console.log('📨 Trip notification received:', notification);
            
            // Handle different notification types
            switch (notification.type) {
              case 'status_update':
                // Refresh trip data when status changes
                refreshTripData();
                break;
              case 'eta_update':
                // Update ETA display
                if (notification.data?.new_eta) {
                  console.log('⏰ ETA updated to:', notification.data.new_eta);
                }
                break;
              case 'arrival':
                // Handle driver arrival
                console.log('🚛 Driver arrived at:', notification.data?.location);
                break;
            }
          }
        );
      } else {
        console.warn('⚠️ Failed to initialize notifications:', initResult.error);
      }
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
    }
  };

  const refreshTripData = async () => {
    try {
      const tripData = await tripService.getTripById(tripId);
      if (tripData) {
        setTrip(tripData);
        console.log('🔄 Trip data refreshed');
      }
    } catch (error) {
      console.error('❌ Error refreshing trip data:', error);
    }
  };

  const calculateETA = async (trackingData: TripTracking) => {
    if (!customerLocation) return;

    try {
      const driverLocation: LocationCoordinates = {
        latitude: trackingData.driver_latitude,
        longitude: trackingData.driver_longitude,
        timestamp: Date.now(),
      };

      const etaCalc = await locationService.calculateETA(
        driverLocation,
        customerLocation
      );
      
      setEta(etaCalc);
    } catch (error) {
      console.error('Error calculating ETA:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const fitMapToMarkers = () => {
    if (!tracking || !customerLocation || !mapRef.current) return;

    const coordinates = [
      {
        latitude: tracking.driver_latitude,
        longitude: tracking.driver_longitude,
      },
      customerLocation,
    ];

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
      animated: true,
    });
  };

  const callDriver = () => {
    if (driverInfo?.phone) {
      Linking.openURL(`tel:${driverInfo.phone}`);
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'Driver assigned to your trip';
      case 'en_route_pickup':
        return 'Driver is on the way to pickup location';
      case 'at_pickup':
        return 'Driver has arrived at pickup location';
      case 'loaded':
        return 'Materials loaded, heading to delivery';
      case 'en_route_delivery':
        return 'Driver is on the way to delivery location';
      case 'delivered':
        return 'Trip completed successfully';
      default:
        return 'Tracking your trip...';
    }
  };

  const getInitialRegion = (): Region => {
    // If we have both driver and customer locations, show both
    if (tracking && customerLocation) {
      const midLat = (tracking.driver_latitude + customerLocation.latitude) / 2;
      const midLng = (tracking.driver_longitude + customerLocation.longitude) / 2;
      
      const latDelta = Math.abs(tracking.driver_latitude - customerLocation.latitude) * 1.5;
      const lngDelta = Math.abs(tracking.driver_longitude - customerLocation.longitude) * 1.5;

      return {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: Math.max(latDelta, 0.01),
        longitudeDelta: Math.max(lngDelta, 0.01),
      };
    }
    
    // If we only have customer location, center on that
    if (customerLocation) {
      return {
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    // If we have trip pickup/delivery locations, use pickup
    if (trip?.pickup_latitude && trip?.pickup_longitude) {
      return {
        latitude: trip.pickup_latitude,
        longitude: trip.pickup_longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    // Default fallback region (Johannesburg, South Africa)
    return {
      latitude: -26.2041,
      longitude: 28.0473,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <View style={styles.backButton} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading trip tracking...</Text>
          <Text style={styles.loadingSubtext}>Setting up location services and driver info</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowNotificationTest(true)} style={styles.testButton}>
            <MaterialIcons name="notifications" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={fitMapToMarkers} style={styles.centerButton}>
            <MaterialIcons name="my-location" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={getInitialRegion()}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          onMapReady={fitMapToMarkers}
        >
          {/* Customer Location Marker */}
          {customerLocation && (
            <Marker
              coordinate={customerLocation}
              title="Your Location"
              description="You are here"
            >
              <Animated.View style={[
                styles.customerMarker,
                { transform: [{ scale: pulseAnim }] }
              ]}>
                <MaterialIcons name="person-pin" size={30} color="#007AFF" />
              </Animated.View>
            </Marker>
          )}

          {/* Driver Location Marker */}
          {tracking && (
            <Marker
              coordinate={{
                latitude: tracking.driver_latitude,
                longitude: tracking.driver_longitude,
              }}
              title={driverInfo ? `${driverInfo.first_name} ${driverInfo.last_name}` : "Driver"}
              description="Your driver"
            >
              <View style={styles.driverMarker}>
                <MaterialIcons name="local-shipping" size={30} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Route Polyline */}
          {tracking && customerLocation && (
            <Polyline
              coordinates={[
                {
                  latitude: tracking.driver_latitude,
                  longitude: tracking.driver_longitude,
                },
                customerLocation,
              ]}
              strokeWidth={4}
              strokeColor="#007AFF"
              lineDashPattern={[10, 5]}
            />
          )}
        </MapView>
      </View>

      {/* Bottom Info Panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.gradientPanel}>
          {/* Trip Status */}
          <View style={styles.statusContainer}>
            <View style={styles.statusIndicator} />
            <Text style={styles.statusText}>
              {tracking ? getStatusMessage(tracking.status) : 'Waiting for driver...'}
            </Text>
          </View>

          {/* Driver Info */}
          {driverInfo && (
            <View style={styles.driverInfoContainer}>
              <View style={styles.driverAvatar}>
                <MaterialIcons name="person" size={24} color="#666" />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>
                  {driverInfo.first_name} {driverInfo.last_name}
                </Text>
                <Text style={styles.vehicleInfo}>
                  {driverInfo.vehicle_model} • {driverInfo.vehicle_plate}
                </Text>
                {driverInfo.rating && (
                  <View style={styles.ratingContainer}>
                    <MaterialIcons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>{driverInfo.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity onPress={callDriver} style={styles.callButton}>
                  <MaterialIcons name="phone" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setCommunicationModalVisible(true)} 
                  style={styles.communicationButton}
                >
                  <MaterialIcons name="chat" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ETA and Distance */}
          {eta && (
            <View style={styles.etaContainer}>
              <View style={styles.etaItem}>
                <MaterialIcons name="access-time" size={20} color="#666" />
                <Text style={styles.etaText}>{Math.round(eta.durationSeconds / 60)} min</Text>
              </View>
              <View style={styles.etaItem}>
                <MaterialIcons name="straighten" size={20} color="#666" />
                <Text style={styles.etaText}>{(eta.distanceMeters / 1000).toFixed(1)} km</Text>
              </View>
            </View>
          )}

          {/* Trip Details */}
          {trip && (
            <View style={styles.tripDetailsContainer}>
              <View style={styles.tripDetail}>
                <Text style={styles.tripDetailLabel}>Pickup</Text>
                <Text style={styles.tripDetailValue} numberOfLines={2}>
                  {trip.pickup_address.formatted_address}
                </Text>
              </View>
              <View style={styles.tripDetail}>
                <Text style={styles.tripDetailLabel}>Delivery</Text>
                <Text style={styles.tripDetailValue} numberOfLines={2}>
                  {trip.delivery_address.formatted_address}
                </Text>
              </View>
              <View style={styles.tripDetail}>
                <Text style={styles.tripDetailLabel}>Material</Text>
                <Text style={styles.tripDetailValue}>
                  {trip.material_type}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Notification Test Panel (Development Only) */}
      {showNotificationTest && trip && (
        <NotificationTestPanel
          tripId={tripId}
          userId={trip.customer_id || 'test-user'}
          driverName={driverInfo ? `${driverInfo.first_name} ${driverInfo.last_name}` : undefined}
          onClose={() => setShowNotificationTest(false)}
        />
      )}

      {/* Trip Communication Panel */}
      {trip && communicationModalVisible && (
        <TripCommunicationPanel
          tripId={tripId}
          driverId={trip.assigned_driver_id}
          isVisible={communicationModalVisible}
          onClose={() => setCommunicationModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: theme.primary,
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: theme.primary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
    backgroundColor: theme.primary,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.primary,
  },
  centerButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testButton: {
    padding: 8,
    marginRight: 8,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 20,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  customerMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarker: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.5,
  },
  gradientPanel: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: theme.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.primary,
    flex: 1,
  },
  driverInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: theme.lightText,
    marginLeft: 4,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  etaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  tripDetailsContainer: {
    paddingTop: 16,
  },
  tripDetail: {
    marginBottom: 12,
  },
  tripDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tripDetailValue: {
    fontSize: 14,
    color: '#333',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  communicationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LiveTrackingScreenTrip;
