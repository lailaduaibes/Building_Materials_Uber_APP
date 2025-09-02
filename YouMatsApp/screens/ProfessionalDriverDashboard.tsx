import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  StatusBar,
  SafeAreaView,
  PanResponder,
  Animated,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { ProfessionalMapMarker } from '../components/ProfessionalMapMarker';
import { DriverLocationMarker } from '../components/DriverLocationMarker';
import { PickupTimeDisplay } from '../components/PickupTimeDisplay';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { driverService, Driver, OrderAssignment } from '../services/DriverService';
import { driverPushNotificationService } from '../services/DriverPushNotificationService';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';
import { DriverChatScreen } from '../components/DriverChatScreen';
import { ASAPTripModal } from '../components/ASAPTripModal';
import { Colors, Typography, Spacing, ComponentSizes } from '../theme/colors';

// Language support
import { useLanguage } from '../src/contexts/LanguageContext';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

// Helper functions for trip status
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'matched':
      return 'ACCEPTED';
    case 'driver_en_route':
      return 'EN ROUTE';
    case 'at_pickup':
      return 'AT PICKUP';
    case 'loaded':
      return 'LOADED';
    case 'in_transit':
      return 'IN TRANSIT';
    case 'at_delivery':
      return 'AT DELIVERY';
    case 'delivered':
      return 'DELIVERED';
    case 'completed':
      return 'COMPLETED';
    default:
      return status.toUpperCase();
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'matched':
      return Colors.driver.online; // Blue
    case 'driver_en_route':
      return Colors.primary; // Primary blue
    case 'at_pickup':
      return Colors.status.warning; // Orange
    case 'loaded':
      return Colors.primary; // Blue
    case 'in_transit':
      return Colors.status.warning; // Orange
    case 'at_delivery':
      return Colors.status.warning; // Orange
    case 'delivered':
      return Colors.status.success; // Green
    case 'completed':
      return Colors.status.success; // Green
    default:
      return Colors.text.secondary; // Gray
  }
};

interface ProfessionalDriverDashboardProps {
  onNavigateToProfile: () => void;
  onNavigateToOrder: (order: OrderAssignment) => void;
  onNavigateToEarnings: () => void;
  onNavigateToTripHistory: () => void;
  onNavigateToRouteOptimization?: () => void;
}

const ProfessionalDriverDashboard: React.FC<ProfessionalDriverDashboardProps> = ({
  onNavigateToProfile,
  onNavigateToOrder,
  onNavigateToEarnings,
  onNavigateToTripHistory,
  onNavigateToRouteOptimization,
}) => {
  // Language support
  const { t, isRTL } = useLanguage();
  const { t: i18nT } = useTranslation();
  
  const [driver, setDriver] = useState<Driver | null>(null);
  const [nearbyOrders, setNearbyOrders] = useState<OrderAssignment[]>([]);
  const [acceptedTrips, setAcceptedTrips] = useState<OrderAssignment[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderAssignment | null>(null);
  const [orderCompatibility, setOrderCompatibility] = useState<{[key: string]: {isCompatible: boolean, reason?: string}}>({});
  const [isOnline, setIsOnline] = useState(false);
  const [lastToggleTime, setLastToggleTime] = useState(0); // Track when user manually toggles
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null); // Start with null to force immediate location fetch
  const [driverLocation, setDriverLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [earnings, setEarnings] = useState({ today: 0, thisWeek: 0 });
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [showOrdersList, setShowOrdersList] = useState(false);
  const [mapZoomLevel, setMapZoomLevel] = useState(0.0922);
  
  // Communication modal state
  const [showChatScreen, setShowChatScreen] = useState(false);
  const [selectedTripForChat, setSelectedTripForChat] = useState<OrderAssignment | null>(null);
  
  // ASAP Trip System
  const [showASAPModal, setShowASAPModal] = useState(false);
  const [currentASAPTrip, setCurrentASAPTrip] = useState<OrderAssignment | null>(null);
  
  // Bottom sheet animation
  const bottomSheetHeight = useRef(new Animated.Value(140)).current; // Increased default height
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);
  const [bottomSheetState, setBottomSheetState] = useState<'collapsed' | 'list' | 'detail' | 'mytrips'>('collapsed');
  
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    console.log('🚀 Dashboard initializing...');
    initializeDriver();
    requestLocationPermission();
    
    // Get location immediately on startup
    getCurrentLocation();
    
    // Load trips immediately when component loads
    loadAcceptedTrips();
    
    // Load nearby orders immediately when going online
    if (isOnline) {
      console.log('📱 Component loaded with online status, loading orders...');
      loadNearbyOrders();
      loadAcceptedTrips();
    }
    
    // Auto-refresh nearby orders every 15 seconds when online (reduced interval)
    const interval = setInterval(() => {
      if (isOnline && locationPermission) {
        console.log('🔄 Auto-refreshing nearby orders...');
        loadNearbyOrders();
        loadAcceptedTrips();
      }
    }, 15000); // Changed from 30000 to 15000

    return () => clearInterval(interval);
  }, [isOnline, locationPermission]);

  // ✅ ASAP System Integration 
  useEffect(() => {
    const initASAPSystem = async () => {
      console.log('⚡ [ASAP] Initializing ASAP monitoring system');
      console.log('⚡ [ASAP] Driver:', driver?.id, '| Online:', isOnline);
      
      if (driver?.id && isOnline) {
        console.log('⚡ [ASAP] Starting monitoring for driver:', driver.id.substring(0, 8));
        
        try {
          await driverService.startASAPMonitoring(
            async (trip) => {
              console.log('⚡ [ASAP] New trip available:', trip.id.substring(0, 8));
              
              // Prevent duplicate modal for same trip
              if (currentASAPTrip?.id === trip.id || showASAPModal) {
                console.log('⚡ [ASAP] Modal already showing for this trip, skipping');
                return;
              }
              
              // Use push notification instead of Alert.alert
              await driverPushNotificationService.showASAPTripNotification(
                trip.id,
                trip.pickupLocation.address,
                trip.estimatedEarnings
              );
              setCurrentASAPTrip(trip);
              setShowASAPModal(true);
            },
            (trip) => {
              console.log('🚨🚨🚨 [PROFESSIONAL ASAP] TRIP UPDATE!', trip.id);
            }
          );
          console.log('✅ [ASAP] Monitoring system started successfully');
        } catch (error) {
          console.error('❌ [ASAP] Failed to initialize ASAP system:', error);
        }
      } else {
        console.log('⚠️ [ASAP] System not started - requirements not met');
      }
    };

    initASAPSystem();

    return () => {
      // Cleanup ASAP system
      driverService.stopASAPMonitoring();
    };
  }, [driver?.id, isOnline]);

  const requestLocationPermission = async () => {
    try {
      console.log('🗺️ Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log(`📍 Location permission status: ${status}`);
      
      if (status === 'granted') {
        setLocationPermission(true);
        console.log('✅ Location permission granted');
        getCurrentLocation();
      } else {
        setLocationPermission(false);
        console.log('❌ Location permission denied');
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to use the driver app and receive nearby orders.',
          [
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
    }
  };

  const initializeDriver = async () => {
    try {
      const driverProfile = driverService.getCurrentDriver();
      if (driverProfile) {
        setDriver(driverProfile);
        // Only update isOnline if we're not currently in a toggle operation
        // AND it's been more than 5 seconds since the last manual toggle
        const timeSinceLastToggle = Date.now() - lastToggleTime;
        if (!isToggling && timeSinceLastToggle > 5000) {
          console.log(`🔄 Initializing driver with status: ${driverProfile.is_available ? 'online' : 'offline'}`);
          setIsOnline(driverProfile.is_available || false);
        } else if (timeSinceLastToggle <= 5000) {
          console.log(`⏰ Skipping status update - recent manual toggle (${timeSinceLastToggle}ms ago)`);
        }
      }
      
      // Load earnings
      const earnings = await driverService.getDriverEarnings();
      setEarnings({
        today: earnings?.today || 0,
        thisWeek: earnings?.thisWeek || 0,
      });
    } catch (error) {
      console.error('Error initializing driver:', error);
    }
  };

  const loadNearbyOrders = async (forceOnline = false) => {
    try {
      // Allow forcing online state (useful during toggle operations)
      const checkOnline = forceOnline || isOnline;
      
      if (!checkOnline || !locationPermission) {
        console.log(`❌ Not loading orders - ${!checkOnline ? 'offline' : 'no location permission'} (isOnline: ${isOnline}, forceOnline: ${forceOnline}, locationPermission: ${locationPermission})`);
        setNearbyOrders([]);
        return;
      }

      console.log('🗺️ Loading nearby orders...');
      
      // Force refresh - don't rely on cache
      const orders = await driverService.getAvailableTrips();
      console.log(`📊 Raw orders from service: ${orders.length}`);
      
      if (!orders || orders.length === 0) {
        console.log('📭 No orders returned from service');
        setNearbyOrders([]);
        return;
      }

      // Filter and add coordinates - only show trips with real coordinates
      const ordersWithCoords = orders.map((order, index) => {
        // First try to get coordinates from pickupLocation object
        let lat = order.pickupLocation?.latitude;
        let lng = order.pickupLocation?.longitude;
        
        // Fallback to string fields if object values aren't available
        if (!lat || !lng) {
          lat = parseFloat(order.pickup_latitude || '0');
          lng = parseFloat(order.pickup_longitude || '0');
        }
        
        // Check if we have valid real coordinates
        const hasRealCoordinates = lat && !isNaN(lat) && lng && !isNaN(lng) && lat !== 0 && lng !== 0;
        
        if (hasRealCoordinates) {
          // Use real coordinates from database
          const coordinate = { latitude: lat, longitude: lng };
          console.log(`📍 Order ${index + 1} (REAL): ${lat}, ${lng} - ${order.pickup_address || order.pickupLocation?.address || 'Unknown address'}`);
          
          return {
            ...order,
            coordinate,
            hasRealCoordinates: true
          };
        } else {
          console.log(`⚠️ Order ${index + 1} (NO COORDS): Skipping - no valid coordinates available`);
          return null; // Will be filtered out
        }
      }).filter(order => order !== null); // Remove orders without coordinates

      setNearbyOrders(ordersWithCoords as OrderAssignment[]);
      console.log(`✅ Set ${ordersWithCoords.length} orders with real coordinates`);
      
      // Check truck compatibility for all orders
      await checkOrdersCompatibility(ordersWithCoords as OrderAssignment[]);
      
      // Debug logging
      if (ordersWithCoords.length !== orders.length) {
        console.log(`⚠️ Filtered out ${orders.length - ordersWithCoords.length} orders without valid coordinates`);
      }
      
    } catch (error) {
      console.error('❌ Error loading nearby orders:', error);
      setNearbyOrders([]);
    }
  };

  const loadAcceptedTrips = async () => {
    try {
      console.log('🚛 Loading accepted trips...');
      
      // Debug current driver info
      const currentDriver = driverService.getCurrentDriver();
      console.log('🔍 Current driver:', {
        id: currentDriver?.id,
        user_id: currentDriver?.user_id,
        fullName: currentDriver?.fullName
      });
      
      const trips = await driverService.getAcceptedTrips();
      console.log(`✅ Loaded ${trips.length} accepted trips`);
      console.log('🔍 Accepted trips:', trips.map(t => ({
        id: t.id,
        status: t.status,
        pickup: t.pickup_address
      })));
      
      setAcceptedTrips(trips);
    } catch (error) {
      console.error('Error loading accepted trips:', error);
      setAcceptedTrips([]);
    }
  };

  // Check truck compatibility for orders
  const checkOrdersCompatibility = async (orders: OrderAssignment[]) => {
    const compatibilityResults: {[key: string]: {isCompatible: boolean, reason?: string}} = {};
    
    for (const order of orders) {
      try {
        const compatibility = await driverService.checkTruckTypeCompatibility(order.id);
        compatibilityResults[order.id] = {
          isCompatible: compatibility.isCompatible,
          reason: compatibility.error || (compatibility.isCompatible ? undefined : 
            `Requires ${compatibility.requiredTruckType || 'different vehicle type'}`)
        };
      } catch (error) {
        console.error(`❌ Error checking compatibility for order ${order.id}:`, error);
        compatibilityResults[order.id] = {
          isCompatible: true, // Default to compatible if check fails
          reason: undefined
        };
      }
    }
    
    setOrderCompatibility(compatibilityResults);
    console.log('🔍 Compatibility results:', compatibilityResults);
  };

  const getCurrentLocation = async () => {
    try {
      if (!locationPermission) {
        console.log('❌ Location permission not granted');
        return;
      }

      console.log('📍 Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      console.log(`✅ Current location: ${latitude}, ${longitude}`);

      // Update driver location
      setDriverLocation({ latitude, longitude });

      // Update map region to center on driver location
      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setCurrentRegion(region);

      // Start location tracking if online
      if (isOnline) {
        startLocationTracking();
      }

    } catch (error) {
      console.error('❌ Error getting location:', error);
      
      // Only use fallback coordinates if absolutely necessary
      console.log('⚠️ Using fallback location - GPS might be disabled');
      const fallbackRegion = {
        latitude: 25.276987,
        longitude: 55.296249,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setCurrentRegion(fallbackRegion);
      setDriverLocation({ latitude: 25.276987, longitude: 55.296249 });

      Alert.alert(
        'Location Error',
        'Could not get your current location. Please enable GPS for accurate positioning.',
        [{ text: 'OK' }]
      );
    }
  };

  const startLocationTracking = async () => {
    try {
      if (!locationPermission) return;

      // Watch location changes while driver is online
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 100, // Update if moved 100 meters
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          console.log(`📍 Location updated: ${latitude}, ${longitude}`);
          
          setDriverLocation({ latitude, longitude });
          
          // Update map region smoothly
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude,
              longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }, 1000);
          }
        }
      );

      // Store subscription to clean up later
      return subscription;
    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
    }
  };

  const [isToggling, setIsToggling] = useState(false);

  const toggleOnlineStatus = async () => {
    try {
      // Prevent multiple rapid clicks
      if (isToggling) {
        console.log('⚠️ Toggle already in progress, ignoring click');
        return;
      }

      setIsToggling(true);

      if (!locationPermission) {
        Alert.alert(
          t('dashboard.location.enableLocationTitle'),
          t('dashboard.location.enableLocationMessage'),
          [
            { text: 'Enable', onPress: () => requestLocationPermission() },
            { text: t('common.cancel'), style: 'cancel' }
          ]
        );
        setIsToggling(false);
        return;
      }

      const currentStatus = isOnline;
      const newStatus = !currentStatus;
      
      console.log(`🔄 Toggling status: ${currentStatus} → ${newStatus} (locationPermission: ${locationPermission})`);
      
      // Track manual toggle time to prevent initializeDriver from overriding
      setLastToggleTime(Date.now());
      
      // Update UI state immediately for responsiveness
      setIsOnline(newStatus);
      
      // Update driver availability in backend
      const success = await driverService.updateDriverAvailability(newStatus);
      
      if (!success) {
        // Revert if backend update failed
        console.error('❌ Backend update failed, reverting status');
        setIsOnline(currentStatus);
        Alert.alert('Error', 'Failed to update your status. Please try again.');
        setIsToggling(false);
        return;
      }

      // Update local driver cache to prevent initializeDriver from reverting the state
      const currentDriver = driverService.getCurrentDriver();
      if (currentDriver) {
        const updatedDriver: Driver = {
          ...currentDriver,
          is_available: newStatus,
          status: newStatus ? 'online' : 'offline'
        };
        await AsyncStorage.setItem('currentDriver', JSON.stringify(updatedDriver));
        setDriver(updatedDriver);
      }
      
      if (newStatus) {
        // Going online - get current location and start tracking
        console.log('✅ Going online - starting location tracking');
        await getCurrentLocation();
        // Force immediate refresh of nearby orders with explicit online state
        console.log('🔄 Force refreshing orders after going online...');
        await loadNearbyOrders(true); // Force online state for initial load
        await loadAcceptedTrips();
        Alert.alert('You\'re Online!', 'You\'ll now receive trip requests in your area.');
      } else {
        // Going offline - stop tracking and clear orders
        console.log('🛑 Going offline - stopping services');
        setNearbyOrders([]);
        setAcceptedTrips([]);
        setSelectedOrder(null);
        collapseBottomSheet();
        Alert.alert('You\'re Offline', 'You won\'t receive new trip requests.');
      }
      
      console.log(`✅ Status toggle completed: ${newStatus ? 'ONLINE' : 'OFFLINE'}`);
      
    } catch (error) {
      console.error('❌ Error toggling status:', error);
      Alert.alert('Error', 'Failed to update your status');
      // Revert the status change on error
      setIsOnline(!isOnline);
    } finally {
      setIsToggling(false);
    }
  };

  const handleOrderPress = (order: OrderAssignment) => {
    setSelectedOrder(order);
    setBottomSheetState('detail');
    setShowOrdersList(false);
    expandBottomSheet();
    
    // Center map on selected order
    if (mapRef.current && order.coordinate) {
      mapRef.current.animateToRegion({
        ...order.coordinate,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const expandBottomSheet = () => {
    setBottomSheetExpanded(true);
    Animated.spring(bottomSheetHeight, {
      toValue: height * 0.6, // Increased to 60% of screen height
      useNativeDriver: false,
      tension: 80,
      friction: 8,
    }).start();
  };

  const collapseBottomSheet = () => {
    setBottomSheetExpanded(false);
    setSelectedOrder(null);
    setShowOrdersList(false);
    setBottomSheetState('collapsed');
    Animated.spring(bottomSheetHeight, {
      toValue: 140, // Increased collapsed height
      useNativeDriver: false,
      tension: 80,
      friction: 8,
    }).start();
  };

  const showOrdersListView = () => {
    setBottomSheetState('list');
    setSelectedOrder(null);
    setShowOrdersList(true);
    expandBottomSheet();
  };

  const showMyTripsView = () => {
    setBottomSheetState('mytrips');
    setSelectedOrder(null);
    setShowOrdersList(false);
    expandBottomSheet();
    loadAcceptedTrips(); // Refresh when showing
  };

  const acceptOrder = async (order: OrderAssignment) => {
    try {
      // Check compatibility before accepting
      const compatibility = orderCompatibility[order.id];
      if (compatibility && !compatibility.isCompatible) {
        Alert.alert(
          'Vehicle Incompatible', 
          compatibility.reason || 'This trip requires a different vehicle type than yours',
          [{ text: 'OK' }]
        );
        return;
      }
      
      const success = await driverService.acceptTrip(order.id);
      if (success) {
        // Refresh both nearby orders and accepted trips
        loadNearbyOrders();
        loadAcceptedTrips();
        
        Alert.alert('Trip Accepted!', 'Navigate to pickup location', [
          { text: 'OK', onPress: () => onNavigateToOrder(order) }
        ]);
        collapseBottomSheet();
      } else {
        Alert.alert('Error', 'Failed to accept trip');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept trip');
    }
  };

  const centerOnDriver = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...driverLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const zoomToShowAllOrders = () => {
    if (nearbyOrders.length === 0 || !mapRef.current) return;

    const coordinates = nearbyOrders
      .filter(order => order.coordinate)
      .map(order => order.coordinate!);
    
    if (driverLocation) {
      coordinates.push(driverLocation);
    }

    if (coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
        animated: true,
      });
    }
  };

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={onNavigateToProfile}
        >
          <Ionicons name="menu" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { 
            backgroundColor: isOnline ? Colors.driver.online : Colors.text.secondary 
          }]} />
          <Text style={styles.statusText}>
            {isOnline ? 'You\'re online' : 'You\'re offline'}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.onlineButton, { 
          backgroundColor: isToggling ? Colors.text.secondary : (isOnline ? Colors.driver.online : Colors.text.secondary),
          opacity: isToggling ? 0.7 : 1.0
        }]}
        onPress={toggleOnlineStatus}
        disabled={isToggling}
      >
        <Text style={styles.onlineButtonText}>
          {isToggling ? t('dashboard.status.updating') : (isOnline ? t('dashboard.quickActions.goOffline') : t('dashboard.quickActions.goOnline'))}
        </Text>
      </TouchableOpacity>
    </View>
  );  const renderEarningsCard = () => (
    <View style={styles.earningsCard}>
      <View style={styles.earningsItem}>
        <Text style={styles.earningsLabel}>{t('dashboard.earnings.today')}</Text>
        <Text style={styles.earningsValue}>AED {earnings.today.toFixed(2)}</Text>
      </View>
      <View style={styles.earningsDivider} />
      <View style={styles.earningsItem}>
        <Text style={styles.earningsLabel}>{t('dashboard.earnings.thisWeek')}</Text>
        <Text style={styles.earningsValue}>AED {earnings.thisWeek.toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderBottomSheet = () => (
    <Animated.View style={[styles.bottomSheet, { height: bottomSheetHeight }]}>
      {bottomSheetState === 'detail' && selectedOrder ? (
        <View style={styles.orderDetails}>
          <View style={styles.orderHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={collapseBottomSheet}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.orderTitle}>Trip Request</Text>
            <Text style={styles.orderPrice}>AED {selectedOrder.estimated_fare}</Text>
          </View>
          
          <ScrollView style={styles.orderScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.orderInfo}>
              <View style={styles.orderRoute}>
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, { backgroundColor: Colors.status.completed }]} />
                  <Text style={styles.routeText} numberOfLines={2}>
                    {selectedOrder.pickup_address || 'Pickup Location'}
                  </Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, { backgroundColor: Colors.status.cancelled }]} />
                  <Text style={styles.routeText} numberOfLines={2}>
                    {selectedOrder.delivery_address || 'Delivery Location'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.orderMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time" size={16} color={Colors.text.secondary} />
                  <Text style={styles.metaText}>{selectedOrder.estimated_duration || '30'} min</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="car" size={16} color={Colors.text.secondary} />
                  <Text style={styles.metaText}>{selectedOrder.material_type || 'General'}</Text>
                </View>
              </View>
            </View>
          </ScrollView>
          
          {(() => {
            const compatibility = selectedOrder ? orderCompatibility[selectedOrder.id] : null;
            const isIncompatible = compatibility && !compatibility.isCompatible;
            
            return (
              <View>
                {isIncompatible && (
                  <View style={{ backgroundColor: Colors.status.cancelled + '20', marginBottom: 10, padding: 12, borderRadius: 8 }}>
                    <Text style={{ color: Colors.status.cancelled, fontSize: 14 }}>
                      ⚠️ {compatibility.reason || 'This trip requires a different vehicle type than yours'}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={[
                    styles.acceptButton, 
                    isIncompatible && { backgroundColor: Colors.text.secondary, opacity: 0.5 }
                  ]}
                  onPress={() => acceptOrder(selectedOrder)}
                  disabled={!!isIncompatible}
                >
                  <Text style={styles.acceptButtonText}>
                    {isIncompatible ? 'INCOMPATIBLE VEHICLE' : 'ACCEPT'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>
      ) : bottomSheetState === 'mytrips' ? (
        <View style={styles.ordersListContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>My Trips ({acceptedTrips.length})</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={collapseBottomSheet}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.ordersList} showsVerticalScrollIndicator={false}>
            {acceptedTrips.map((trip, index) => (
              <View key={trip.id || index} style={[styles.orderListItem, { backgroundColor: Colors.driver.online + '10' }]}>
                <TouchableOpacity
                  style={styles.tripMainContent}
                  onPress={() => {
                    onNavigateToOrder(trip);
                  }}
                >
                  <View style={styles.orderListHeader}>
                    <Text style={styles.orderListPrice}>AED {trip.estimated_fare}</Text>
                    <Text style={[styles.orderListDistance, { 
                      color: getStatusColor(trip.status),
                      fontWeight: 'bold'
                    }]}>
                      {getStatusLabel(trip.status)}
                    </Text>
                  </View>
                  <Text style={styles.orderListAddress} numberOfLines={1}>
                    📍 {trip.pickup_address || 'Pickup Location'}
                  </Text>
                  <Text style={styles.orderListMaterial}>
                    🚛 {trip.material_type || 'General Materials'}
                  </Text>
                  <Text style={styles.orderListMaterial}>
                    📦 {trip.materials?.[0]?.description || 'Materials delivery'}
                  </Text>
                </TouchableOpacity>
                
                {/* Chat Button */}
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => {
                    setSelectedTripForChat(trip);
                    setShowChatScreen(true);
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
                  <Text style={styles.chatButtonText}>Chat with Customer</Text>
                </TouchableOpacity>
              </View>
            ))}
            {acceptedTrips.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={Colors.text.secondary} />
                <Text style={styles.emptyStateText}>No accepted trips</Text>
                <Text style={styles.emptyStateSubtext}>
                  Accept trips from the nearby list to see them here
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : bottomSheetState === 'list' ? (
        <View style={styles.ordersListContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Nearby Trips ({nearbyOrders.length})</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={collapseBottomSheet}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.ordersList} showsVerticalScrollIndicator={false}>
            {nearbyOrders.map((order, index) => {
              const compatibility = orderCompatibility[order.id];
              const isIncompatible = compatibility && !compatibility.isCompatible;
              
              return (
              <TouchableOpacity
                key={order.id || index}
                style={[
                  styles.orderListItem,
                  isIncompatible && { opacity: 0.6, borderLeftWidth: 3, borderLeftColor: Colors.status.cancelled }
                ]}
                onPress={() => {
                  handleOrderPress(order);
                }}
              >
                <View style={styles.orderListHeader}>
                  <Text style={styles.orderListPrice}>AED {order.estimated_fare || order.estimatedEarnings || 0}</Text>
                  <Text style={styles.orderListDistance}>{order.estimated_duration || order.estimatedDuration || '30'} min</Text>
                </View>
                <Text style={styles.orderListAddress} numberOfLines={1}>
                  📍 {order.pickup_address || order.pickupLocation?.address || 'Pickup Location'}
                </Text>
                <Text style={styles.orderListMaterial}>
                  🚛 {order.material_type || order.materials?.[0]?.type || 'General Materials'}
                </Text>
                <View style={styles.orderListTimeContainer}>
                  <PickupTimeDisplay 
                    pickupTimePreference={order.pickupTimePreference || 'asap'}
                    scheduledPickupTime={order.scheduledPickupTime}
                    size="small"
                    showIcon={true}
                  />
                </View>
                {isIncompatible && (
                  <Text style={[styles.orderListMaterial, { color: Colors.status.cancelled, fontSize: 12, marginTop: 4 }]}>
                    ⚠️ {compatibility.reason || 'Vehicle incompatible'}
                  </Text>
                )}
              </TouchableOpacity>
              );
            })}
            {nearbyOrders.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={48} color={Colors.text.secondary} />
                <Text style={styles.emptyStateText}>No trips available</Text>
                <Text style={styles.emptyStateSubtext}>
                  {isOnline ? t('dashboard.noTrips.online') : t('dashboard.noTrips.offline')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.dashboardSummary}>
          {renderEarningsCard()}
          
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={onNavigateToEarnings}>
              <Ionicons name="wallet" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={showMyTripsView}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.status.completed} />
              <Text style={styles.actionText}>
                My Trips {acceptedTrips.length > 0 && `(${acceptedTrips.length})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={showOrdersListView}>
              <Ionicons name="list" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Available</Text>
            </TouchableOpacity>
            {onNavigateToRouteOptimization && (
              <TouchableOpacity style={styles.actionButton} onPress={onNavigateToRouteOptimization}>
                <Ionicons name="flash" size={20} color={Colors.warning} />
                <Text style={styles.actionText}>AI Routes</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionButton} onPress={onNavigateToProfile}>
              <Ionicons name="person" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      
      {renderTopBar()}
      
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={currentRegion || undefined}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onRegionChangeComplete={setCurrentRegion}
      >
        {/* Driver's current location marker */}
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title="Your Location"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <DriverLocationMarker isActive={isOnline} size="medium" />
          </Marker>
        )}
        
        {/* Nearby order markers with enhanced visibility */}
        {nearbyOrders.map((order, index) => {
          const compatibility = orderCompatibility[order.id];
          const isIncompatible = compatibility && !compatibility.isCompatible;
          
          return order.coordinate && (
            <Marker
              key={order.id || index}
              coordinate={order.coordinate}
              onPress={() => handleOrderPress(order)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <ProfessionalMapMarker
                price={order.estimated_fare || 0}
                materialType={order.material_type || 'General'}
                isSelected={selectedOrder?.id === order.id}
                isIncompatible={isIncompatible}
                isPriority={(order.estimated_fare || 0) > 100} // Consider high-value orders as priority
                pickupTimePreference={order.pickupTimePreference || 'asap'}
                scheduledPickupTime={order.scheduledPickupTime}
              />
            </Marker>
          );
        })}
      </MapView>
      
      {/* Orders count overlay with map controls */}
      {isOnline && (
        <View style={styles.ordersOverlay}>
          <View style={styles.ordersInfo}>
            <Text style={styles.ordersCount}>
              {nearbyOrders.length} {nearbyOrders.length === 1 ? 'trip' : 'trips'} nearby
            </Text>
          </View>
          
          <View style={styles.mapControls}>
            <TouchableOpacity 
              style={[styles.mapControlButton, bottomSheetState === 'list' && styles.activeControl]}
              onPress={() => bottomSheetState === 'list' ? collapseBottomSheet() : showOrdersListView()}
            >
              <Ionicons 
                name={bottomSheetState === 'list' ? "map" : "list"} 
                size={20} 
                color={bottomSheetState === 'list' ? Colors.background.primary : Colors.text.primary} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mapControlButton}
              onPress={() => {
                console.log('🔄 Manual refresh triggered');
                loadNearbyOrders();
              }}
            >
              <Ionicons name="refresh" size={20} color={Colors.text.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mapControlButton}
              onPress={zoomToShowAllOrders}
            >
              <Ionicons name="scan" size={20} color={Colors.text.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mapControlButton}
              onPress={centerOnDriver}
            >
              <Ionicons name="locate" size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {renderBottomSheet()}
      
      {/* Customer Chat Screen */}
      {selectedTripForChat && (
        <DriverChatScreen
          trip={selectedTripForChat}
          isVisible={showChatScreen}
          onClose={() => {
            setShowChatScreen(false);
            setSelectedTripForChat(null);
          }}
        />
      )}

      {/* ASAP Trip Modal */}
      {currentASAPTrip && (
        <ASAPTripModal
          trip={currentASAPTrip}
          visible={showASAPModal}
          onAccept={async (tripId: string) => {
            console.log('✅ [ASAP] Accepting trip:', tripId.substring(0, 8));
            try {
              const result = await driverService.acceptASAPTrip(tripId);
              if (result.success) {
                Alert.alert('✅ Success', 'ASAP trip accepted!');
                setShowASAPModal(false);
                setCurrentASAPTrip(null);
                // Refresh nearby orders to update the list
                loadNearbyOrders();
                loadAcceptedTrips();
              } else {
                Alert.alert('❌ Error', result.message);
              }
            } catch (error) {
              console.error('❌ [ASAP] Accept error:', error);
              Alert.alert('❌ Error', 'Failed to accept trip. Please try again.');
            }
          }}
          onDecline={(tripId: string) => {
            console.log('❌ [ASAP] Declining trip:', tripId.substring(0, 8));
            // Remove from seen list so other drivers can get this trip
            driverService.declineASAPTrip(tripId);
            setShowASAPModal(false);
            setCurrentASAPTrip(null);
          }}
          onClose={() => {
            console.log('⚡ [ASAP] Modal closed');
            setShowASAPModal(false);
            setCurrentASAPTrip(null);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow.color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  onlineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  onlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background.primary,
  },
  map: {
    flex: 1,
  },
  orderMarkerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  ordersOverlay: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ordersInfo: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow.color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  mapControls: {
    flexDirection: 'row',
    gap: 8,
  },
  mapControlButton: {
    backgroundColor: Colors.background.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow.color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  activeControl: {
    backgroundColor: Colors.primary,
  },
  ordersCount: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Account for iOS safe area
    minHeight: 140,
    maxHeight: height * 0.8, // Maximum 80% of screen height
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow.color,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  orderScrollContent: {
    flex: 1,
    marginVertical: 10,
  },
  dashboardSummary: {
    height: 100, // Fixed height for collapsed state
  },
  earningsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 12, // Reduced padding
    marginBottom: 12, // Reduced margin
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow.color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningsDivider: {
    width: 1,
    backgroundColor: Colors.border.light,
    marginHorizontal: 16,
  },
  earningsLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
    minWidth: '18%',
    maxWidth: '20%',
  },
  actionText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  orderDetails: {
    flex: 1,
    minHeight: height * 0.5, // Minimum height for better visibility
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  closeButton: {
    padding: 4,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.status.completed,
  },
  orderInfo: {
    marginBottom: 16,
  },
  orderRoute: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border.light,
    marginLeft: 5,
    marginVertical: 4,
  },
  routeText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 4,
  },
  acceptButton: {
    backgroundColor: Colors.status.completed,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background.primary,
  },
  // Orders List Styles
  ordersListContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  ordersList: {
    flex: 1,
  },
  orderListItem: {
    backgroundColor: Colors.background.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow.color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  orderListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderListPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.status.completed,
  },
  orderListDistance: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  orderListAddress: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  orderListMaterial: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  orderListTimeContainer: {
    marginTop: 4,
    marginBottom: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  tripMainContent: {
    flex: 1,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    gap: 5,
  },
  chatButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
  },
});

export default ProfessionalDriverDashboard;
