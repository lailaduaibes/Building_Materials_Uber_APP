import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService, Driver, DriverStats, OrderAssignment, ApprovalStatus } from '../services/DriverService';
import { driverPushNotificationService } from '../services/DriverPushNotificationService';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';
import { Colors, Typography, Spacing, ComponentSizes, createShadow } from '../theme/colors';
import { PickupTimeDisplay } from '../components/PickupTimeDisplay';
import { ASAPTripModal } from '../components/ASAPTripModal';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const screenWidth = width;

// Enhanced responsive calculations for Android
const getResponsiveValue = (small: number, medium: number = small * 1.2, large: number = small * 1.5) => {
  if (screenWidth < 360) return small * 0.9; // Small Android phones
  if (screenWidth < 400) return small; // Standard Android phones
  if (screenWidth < 600) return medium; // Large phones/small tablets
  return large; // Tablets
};

interface ModernDriverDashboardProps {
  onNavigateToProfile: () => void;
  onNavigateToOrder: (order: OrderAssignment) => void;
  onNavigateToEarnings: () => void;
  onNavigateToTripHistory: () => void;
}

const ModernDriverDashboard: React.FC<ModernDriverDashboardProps> = ({
  onNavigateToProfile,
  onNavigateToOrder,
  onNavigateToEarnings,
  onNavigateToTripHistory,
}) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderAssignment | null>(null);
  const [nearbyOrders, setNearbyOrders] = useState<OrderAssignment[]>([]);
  const [assignedTrips, setAssignedTrips] = useState<any[]>([]);
  const [currentActiveTrip, setCurrentActiveTrip] = useState<any | null>(null);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [orderCompatibility, setOrderCompatibility] = useState<{ [orderId: string]: boolean }>({});
  // ✅ NEW: Add approval status state
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  
  // ✅ NEW: Professional ASAP system state
  const [currentASAPTrip, setCurrentASAPTrip] = useState<OrderAssignment | null>(null);
  const [showASAPModal, setShowASAPModal] = useState(false);

  useEffect(() => {
    loadDriverData();
    loadCurrentActiveTrip();
    loadApprovalStatus(); // ✅ NEW: Load approval status
    loadNearbyOrders();
    loadAssignedTrips();
    loadStats();
  }, []);

  // ✅ NEW: Initialize ASAP system when driver is available
  useEffect(() => {
    let subscription: any;
    
    const initASAPSystem = async () => {
      console.log('🚨🚨🚨 [ASAP DEBUG] INIT ASAP SYSTEM CALLED 🚨🚨🚨');
      console.log('[ASAP DEBUG] initASAPSystem called with:', {
        driverId: driver?.id,
        approvalStatus: approvalStatus?.isApproved,
        hasDriver: !!driver,
        hasApprovalStatus: !!approvalStatus
      });

      // TEMPORARILY BYPASS APPROVAL CHECK FOR TESTING
      if (driver?.id) {
        console.log('🚨 [ASAP DEBUG] Starting Professional ASAP system for driver:', driver.id);
        
        try {
          // Start monitoring for ASAP trips using DriverService
          await driverService.startASAPMonitoring(
            (trip: OrderAssignment) => {
              console.log('🔔 [ASAP DEBUG] NEW ASAP TRIP FOUND - TRIGGERING MODAL:', {
                tripId: trip.id,
                material: trip.materials[0]?.type || 'Unknown',
                customer: trip.customerName,
                distance: trip.distanceKm
              });
              setCurrentASAPTrip(trip);
              setShowASAPModal(true);
              
              // Show alert for immediate notification
              Alert.alert(
                '🚨 URGENT DELIVERY REQUEST',
                `New ASAP trip: ${trip.materials[0]?.type || 'Unknown material'}\nDistance: ${trip.distanceKm.toFixed(1)}km\nCustomer: ${trip.customerName}`,
                [
                  { text: 'View Details', onPress: () => {}, style: 'default' }
                ]
              );
            },
            (trip: OrderAssignment) => {
              console.log('📝 [ASAP DEBUG] ASAP TRIP UPDATED:', trip);
              // Handle trip updates if needed
            }
          );
          console.log('✅ [ASAP DEBUG] ASAP monitoring started successfully');
        } catch (error) {
          console.error('❌ [ASAP DEBUG] Failed to initialize ASAP system:', error);
        }
      } else {
        console.log('⚠️ [ASAP DEBUG] ASAP system not started - missing requirements:', {
          hasDriverId: !!driver?.id,
          isApproved: approvalStatus?.isApproved
        });
      }
    };

    initASAPSystem();

    return () => {
      // Cleanup ASAP system
      driverService.stopASAPMonitoring();
    };
  }, [driver?.id, approvalStatus?.isApproved]);

  const loadDriverData = async () => {
    try {
      console.log('🚗 Loading driver data...');
      // Get driver data from service
      const driverProfile = driverService.getCurrentDriver();
      if (driverProfile) {
        setDriver(driverProfile);
        console.log('✅ Driver data loaded:', driverProfile.fullName);
      } else {
        console.log('⚠️ No driver profile found, setting default');
        // Set a default driver to prevent infinite loading
        setDriver({
          id: 'default',
          user_id: 'default',
          firstName: 'Driver',
          lastName: 'User',
          fullName: 'Driver User',
          email: '',
          phone: '',
          years_experience: 0,
          specializations: {},
          // ✅ NEW: Add required approval fields
          is_approved: false,
          approval_status: 'pending',
          rating: 0,
          total_trips: 0,
          total_earnings: 0,
          is_available: true,
          preferred_truck_types: {},
          max_distance_km: 50,
          status: 'offline',
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
      // Set default driver on error
      setDriver({
        id: 'default',
        user_id: 'default',
        firstName: 'Driver',
        lastName: 'User',
        fullName: 'Driver User',
        email: '',
        phone: '',
        years_experience: 0,
        specializations: {},
        // ✅ NEW: Add required approval fields
        is_approved: false,
        approval_status: 'pending',
        rating: 0,
        total_trips: 0,
        total_earnings: 0,
        is_available: true,
        preferred_truck_types: {},
        max_distance_km: 50,
        status: 'offline',
        created_at: new Date().toISOString()
      });
    }
  };

  // ✅ NEW: Load driver approval status
  const loadApprovalStatus = async () => {
    try {
      console.log('🔍 Loading driver approval status...');
      const status = await driverService.checkDriverApprovalStatus();
      setApprovalStatus(status);
      console.log('✅ Approval status loaded:', status);
    } catch (error) {
      console.error('Error loading approval status:', error);
      // Set default approval status on error
      setApprovalStatus({
        canPickTrips: false,
        status: 'pending',
        message: 'Unable to check approval status',
        isApproved: false
      });
    }
  };

  const loadNearbyOrders = async () => {
    try {
      const orders = await driverService.getAvailableTrips();
      setNearbyOrders(orders);
      // Check truck type compatibility for each order
      await checkOrdersCompatibility(orders);
    } catch (error) {
      console.error('Error loading nearby orders:', error);
    }
  };

  const checkOrdersCompatibility = async (orders: OrderAssignment[]) => {
    try {
      const compatibilityMap: { [orderId: string]: boolean } = {};
      
      for (const order of orders) {
        const compatibility = await driverService.checkTruckTypeCompatibility(order.id);
        compatibilityMap[order.id] = compatibility.isCompatible;
      }
      
      setOrderCompatibility(compatibilityMap);
    } catch (error) {
      console.error('Error checking order compatibility:', error);
    }
  };

  const loadStats = async () => {
    try {
      const driverStats = await driverService.getDriverStats();
      setStats(driverStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadAssignedTrips = async () => {
    try {
      const trips = await driverService.getAssignedTrips();
      setAssignedTrips(trips);
    } catch (error) {
      console.error('Error loading assigned trips:', error);
    }
  };

  const loadCurrentActiveTrip = async () => {
    try {
      const activeTrip = await driverService.getCurrentActiveTrip();
      setCurrentActiveTrip(activeTrip);
      if (activeTrip) {
        console.log('🎯 Restored active trip:', { id: activeTrip.id.substring(0,8), status: activeTrip.status });
      }
    } catch (error) {
      console.error('Error loading current active trip:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDriverData(),
      loadCurrentActiveTrip(),
      loadNearbyOrders(),
      loadAssignedTrips(),
      loadStats(),
    ]);
    setRefreshing(false);
  };

  const handleAcceptOrder = async (order: OrderAssignment) => {
    try {
      // First check truck type compatibility
      const compatibility = await driverService.checkTruckTypeCompatibility(order.id);
      
      if (!compatibility.isCompatible) {
        const requiredTruck = compatibility.requiredTruckType || 'Unknown truck type';
        const material = compatibility.materialType || 'materials';
        const driverTrucks = compatibility.driverTruckTypes && compatibility.driverTruckTypes.length > 0 
          ? compatibility.driverTruckTypes.join(', ') 
          : 'No truck types configured';
        
        let errorMessage = `This delivery requires a ${requiredTruck} for ${material}.\n\nYour truck types: ${driverTrucks}`;
        
        if (compatibility.error) {
          errorMessage = `Cannot verify truck compatibility: ${compatibility.error}\n\nYour truck types: ${driverTrucks}`;
        }
        
        errorMessage += '\n\nPlease contact dispatch if you believe this is an error.';
        
        Alert.alert(
          'Truck Type Mismatch',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      const success = await driverService.acceptOrder(order.id);
      if (success) {
        setActiveOrder(order);
        setNearbyOrders(prev => prev.filter(o => o.id !== order.id));
        // Refresh assigned trips and current active trip
        await loadAssignedTrips();
        await loadCurrentActiveTrip();
        Alert.alert('Order Accepted!', 'Navigate to pickup location to start delivery.');
        onNavigateToOrder(order);
      } else {
        Alert.alert('Error', 'Failed to accept order. It may have been taken by another driver or there was a truck type compatibility issue.');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', 'Failed to accept order. Please try again.');
    }
  };

  const showAcceptOrderDialog = (order: OrderAssignment) => {
    Alert.alert(
      'Accept Order?',
      `Customer: ${order.customerName}\nDistance: ${order.distanceKm.toFixed(1)} km\nEarnings: $${order.estimatedEarnings}\nDuration: ~${order.estimatedDuration} mins`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept Order', onPress: () => handleAcceptOrder(order) }
      ]
    );
  };

  const handleViewOrderDetails = (order: OrderAssignment) => {
    Alert.alert(
      'Order Details',
      `Customer: ${order.customerName}\nPhone: ${order.customerPhone}\nPickup: ${order.pickupLocation.address}\nDelivery: ${order.deliveryLocation.address}\nMaterial: ${order.materials[0]?.type}\nWeight: ${order.materials[0]?.weight || 'N/A'} tons\nDistance: ${order.distanceKm.toFixed(1)} km\nDuration: ~${order.estimatedDuration} mins\nEarnings: $${order.estimatedEarnings}\n\nInstructions: ${order.specialInstructions || 'None'}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Accept Order', onPress: () => handleAcceptOrder(order) }
      ]
    );
  };

  // ✅ NEW: ASAP request handlers
  const handleAcceptASAPTrip = async (tripId: string) => {
    try {
      console.log('✅ Accepting ASAP trip:', tripId);
      
      const result = await driverService.acceptASAPTrip(tripId);
      
      if (result.success) {
        Alert.alert('Success!', result.message);
        setShowASAPModal(false);
        setCurrentASAPTrip(null);
        // Refresh trips to show the new accepted trip
        await loadAssignedTrips();
        await loadNearbyOrders();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('❌ Error accepting ASAP trip:', error);
      Alert.alert('Error', 'Failed to accept trip. Please try again.');
    }
  };

  const handleDeclineASAPTrip = async (tripId: string) => {
    try {
      console.log('❌ Declining ASAP trip:', tripId);
      
      const result = await driverService.declineASAPTrip(tripId);
      setShowASAPModal(false);
      setCurrentASAPTrip(null);
    } catch (error) {
      console.error('❌ Error declining ASAP trip:', error);
      setShowASAPModal(false);
      setCurrentASAPTrip(null);
    }
  };

  const handleCloseASAPModal = () => {
    setShowASAPModal(false);
    setCurrentASAPTrip(null);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Good {getGreeting()}</Text>
          <Text style={styles.userNameText}>
            {driver?.fullName || 'Driver'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onNavigateToProfile()} style={styles.profileButton}>
          <Ionicons name="person-circle-outline" size={24} color={Colors.background.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDriverStatusCard = () => (
    <View style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <Ionicons name="car" size={24} color={Colors.primary} />
        <Text style={styles.statusTitle}>Driver Info</Text>
      </View>
      <View style={styles.statusContent}>
        <View>
          <Text style={styles.statusText}>
            Ready for trips
          </Text>
          <Text style={styles.statusSubtext}>
            Available for delivery requests
          </Text>
        </View>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View>
      <TouchableOpacity 
        style={styles.primaryActionButton}
        onPress={() => loadNearbyOrders()}
      >
        <Text style={styles.primaryActionText}>
          Find Trips
        </Text>
      </TouchableOpacity>

      {/* Debug ASAP Test Button */}
      <TouchableOpacity 
        style={[styles.primaryActionButton, { backgroundColor: '#FF4444', marginTop: 10 }]}
        onPress={async () => {
          console.log('[ASAP DEBUG] Manual ASAP test triggered');
          if (driver?.id) {
            console.log('[ASAP DEBUG] Manually calling checkForNewASAPTrips');
            await (driverService as any).checkForNewASAPTrips();
          } else {
            console.log('[ASAP DEBUG] No driver found for manual test');
          }
        }}
      >
        <Text style={[styles.primaryActionText, { color: '#FFFFFF' }]}>
          🚨 Test ASAP System
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.primaryActionButton, { backgroundColor: '#e74c3c', marginTop: 10 }]}
        onPress={async () => {
          console.log('🚨🚨🚨 [FORCE ASAP] FORCE INITIALIZING ASAP SYSTEM 🚨🚨🚨');
          console.log('🚨🚨🚨 [FORCE ASAP] Driver ID:', driver?.id);
          
          try {
            await driverService.startASAPMonitoring(
              async (trip) => {
                console.log('🚨🚨🚨 [FORCE ASAP] NEW TRIP CALLBACK!', trip.id);
                
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
                console.log('🚨🚨🚨 [FORCE ASAP] TRIP UPDATE!', trip.id);
              }
            );
            console.log('🚨🚨🚨 [FORCE ASAP] MONITORING STARTED!');
            Alert.alert('✅ Success', 'ASAP system force started!');
          } catch (error) {
            console.error('🚨🚨🚨 [FORCE ASAP] ERROR:', error);
            Alert.alert('❌ Error', 'Failed to start ASAP system');
          }
        }}
      >
        <Text style={[styles.primaryActionText, { color: '#FFFFFF' }]}>
          🚨 FORCE ASAP INIT
        </Text>
      </TouchableOpacity>

      <View style={styles.secondaryActionsRow}>
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={onNavigateToTripHistory}
        >
          <Ionicons name="time-outline" size={20} color={Colors.primary} />
          <Text style={styles.secondaryActionText}>Trip History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={() => Alert.alert('Location', 'Update your location settings')}
        >
          <Ionicons name="location-outline" size={20} color={Colors.primary} />
          <Text style={styles.secondaryActionText}>My Location</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={onNavigateToProfile}
        >
          <Ionicons name="settings-outline" size={20} color={Colors.primary} />
          <Text style={styles.secondaryActionText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTodayStats = () => (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Today's Stats</Text>
        <TouchableOpacity onPress={onNavigateToEarnings}>
          <Text style={styles.seeAllText}>View details</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.today.deliveries || 0}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>${stats?.today.earnings || 0}</Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.today.hoursWorked || 0}h</Text>
          <Text style={styles.statLabel}>Hours</Text>
        </View>
      </View>
    </View>
  );

  const renderAvailableTrips = () => (
    <View style={styles.availableTripsContainer}>
      <Text style={styles.sectionHeader}>Available Trips</Text>
      {nearbyOrders.length > 0 ? (
        <View>
          <Text style={styles.tripCount}>{nearbyOrders.length} nearby</Text>
          {nearbyOrders.slice(0, 3).map((order) => {
            const isCompatible = orderCompatibility[order.id] !== false; // Default to true if not checked yet
            return (
              <TouchableOpacity
                key={order.id}
                style={[
                  styles.tripCard,
                  !isCompatible && styles.incompatibleTripCard
                ]}
                onPress={() => showAcceptOrderDialog(order)}
              >
                <View style={styles.tripCardHeader}>
                  <View style={styles.tripMaterialContainer}>
                    <Text style={styles.tripMaterial}>{order.materials[0]?.type || 'Building Materials'}</Text>
                    <PickupTimeDisplay 
                      pickupTimePreference={order.pickupTimePreference || 'asap'}
                      scheduledPickupTime={order.scheduledPickupTime}
                      size="small"
                    />
                    {!isCompatible && (
                      <View style={styles.incompatibleBadge}>
                        <Text style={styles.incompatibleBadgeText}>Wrong Truck Type</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.tripEarnings}>${order.estimatedEarnings}</Text>
                </View>
                <Text style={styles.tripRoute}>
                  {order.pickupLocation.address} → {order.deliveryLocation.address}
                </Text>
                <View style={styles.tripCardFooter}>
                  <Text style={styles.tripDistance}>{order.distanceKm} km away</Text>
                  <Text style={styles.tripTime}>{order.estimatedDuration} min</Text>
                  {!isCompatible && (
                    <Text style={styles.incompatibleText}>⚠️ Incompatible</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🚛</Text>
          <Text style={styles.emptyStateText}>No trips available</Text>
          <Text style={styles.emptyStateSubtext}>
            Check back soon or try going online in a different area
          </Text>
        </View>
      )}
    </View>
  );

  const renderAssignedTrips = () => (
    <View style={styles.availableTripsContainer}>
      <Text style={styles.sectionHeader}>Active Trips</Text>
      {assignedTrips.length > 0 ? (
        <View>
          <Text style={styles.tripCount}>{assignedTrips.length} in progress</Text>
          {assignedTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={[styles.tripCard, styles.assignedTripCard]}
              onPress={() => navigateToTrip(trip)}
            >
              <View style={styles.tripCardHeader}>
                <View style={styles.tripMaterialContainer}>
                  <Text style={styles.tripMaterial}>{trip.material_type || 'Building Materials'}</Text>
                  <PickupTimeDisplay 
                    pickupTimePreference={trip.pickup_time_preference || 'asap'}
                    scheduledPickupTime={trip.scheduled_pickup_time}
                    size="small"
                  />
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{trip.status}</Text>
                </View>
              </View>
              <Text style={styles.tripRoute}>
                {trip.pickup_address?.formatted_address} → {trip.delivery_address?.formatted_address}
              </Text>
              <View style={styles.tripCardFooter}>
                <TouchableOpacity style={[styles.navigationButton, styles.navigationSecondaryButton]} onPress={() => navigateToTrip(trip)}>
                  <Ionicons name="navigate" size={16} color={Colors.primary} />
                  <Text style={[styles.navigationButtonText, styles.navigationSecondaryButtonText]}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null
    }
    </View>
  );

  const navigateToTrip = async (trip: any) => {
    try {
      console.log('🔍 NavigateToTrip - Processing trip:', trip.id.substring(0, 8));
      console.log('   Trip status:', trip.status);
      console.log('   Trip customer data:', {
        customerId: trip.customer_id,
        users: trip.users,
        hasUsers: !!trip.users
      });
      
      // Check if this trip already has customer data (from assigned trips or nearby orders)
      let customerName = 'Customer';
      let customerPhone = '';
      
      if (trip.users) {
        const firstName = trip.users.first_name || '';
        const lastName = trip.users.last_name || '';
        customerName = `${firstName} ${lastName}`.trim() || 'Customer';
        customerPhone = trip.users.phone || '';
        console.log('✅ Using customer data from trip object:', { customerName, customerPhone });
      } else {
        // Try to find this trip in nearby orders (which have customer data)
        const existingOrder = nearbyOrders.find(order => order.id === trip.id);
        if (existingOrder) {
          customerName = existingOrder.customerName;
          customerPhone = existingOrder.customerPhone;
          console.log('✅ Found customer data in nearby orders:', { customerName, customerPhone });
        } else {
          console.log('⚠️ No customer data found for trip, will use fallback');
        }
      }

      // Create the order assignment with proper customer data
      const orderAssignment: OrderAssignment = {
        id: trip.id,
        orderId: trip.id,
        customerId: trip.customer_id,
        customerName,
        customerPhone,
        estimatedEarnings: trip.final_price || trip.quoted_price || 0,
        estimatedDuration: trip.estimated_duration_minutes || 30,
        distanceKm: trip.estimated_distance_km || 5,
        pickupLocation: {
          latitude: trip.pickup_latitude,
          longitude: trip.pickup_longitude,
          address: trip.pickup_address?.formatted_address || 'Pickup Location'
        },
        deliveryLocation: {
          latitude: trip.delivery_latitude,
          longitude: trip.delivery_longitude,
          address: trip.delivery_address?.formatted_address || 'Delivery Location'
        },
        materials: [{
          type: trip.material_type || 'building materials',
          quantity: trip.estimated_weight_tons || 1,
          description: trip.load_description || 'Building materials delivery'
        }],
        specialInstructions: trip.special_requirements,
        assignedAt: trip.matched_at || trip.created_at,
        acceptDeadline: trip.created_at,
        status: trip.status === 'matched' ? 'accepted' : trip.status
      };
      
      console.log('📱 Navigating to trip with customer info:', {
        customerName: orderAssignment.customerName,
        customerPhone: orderAssignment.customerPhone,
        status: orderAssignment.status
      });
      onNavigateToOrder(orderAssignment);
    } catch (error) {
      console.error('❌ Error in navigateToTrip:', error);
      // Fallback to original trip data
      const fallbackAssignment: OrderAssignment = {
        id: trip.id,
        orderId: trip.id,
        customerId: trip.customer_id,
        customerName: 'Customer',
        customerPhone: '',
        estimatedEarnings: trip.final_price || trip.quoted_price || 0,
        estimatedDuration: trip.estimated_duration_minutes || 30,
        distanceKm: trip.estimated_distance_km || 5,
        pickupLocation: {
          latitude: trip.pickup_latitude,
          longitude: trip.pickup_longitude,
          address: trip.pickup_address?.formatted_address || 'Pickup Location'
        },
        deliveryLocation: {
          latitude: trip.delivery_latitude,
          longitude: trip.delivery_longitude,
          address: trip.delivery_address?.formatted_address || 'Delivery Location'
        },
        materials: [{
          type: trip.material_type || 'building materials',
          quantity: trip.estimated_weight_tons || 1,
          description: trip.load_description || 'Building materials delivery'
        }],
        specialInstructions: trip.special_requirements,
        assignedAt: trip.matched_at || trip.created_at,
        acceptDeadline: trip.created_at,
        status: trip.status === 'matched' ? 'accepted' : trip.status
      };
      onNavigateToOrder(fallbackAssignment);
    }
  };

  const handleTripStatusUpdate = async (tripId: string, newStatus: string) => {
    try {
      const success = await driverService.updateTripStatus(tripId, newStatus);
      if (success) {
        // Refresh current active trip and assigned trips
        await loadCurrentActiveTrip();
        await loadAssignedTrips();
        
        // Show appropriate message
        const statusMessages: { [key: string]: string } = {
          'start_trip': 'Trip started!',
          'in_transit': 'In transit to delivery location.',
          'delivered': 'Trip completed successfully!'
        };
        
        const message = statusMessages[newStatus] || 'Trip status updated.';
        Alert.alert('Status Updated', message);
        
        // Clear active trip if completed
        if (newStatus === 'delivered' || newStatus === 'completed') {
          await driverService.clearActiveTrip();
          setCurrentActiveTrip(null);
        }
      } else {
        Alert.alert('Error', 'Failed to update trip status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating trip status:', error);
      Alert.alert('Error', 'Failed to update trip status. Please try again.');
    }
  };

  if (!driver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading driver data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.secondary} />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderHeader()}
        {renderDriverStatusCard()}
        {renderQuickActions()}
        {renderTodayStats()}
        {renderAssignedTrips()}
        {renderAvailableTrips()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* ✅ NEW: Professional ASAP Modal */}
      <ASAPTripModal
        visible={showASAPModal}
        trip={currentASAPTrip}
        onAccept={handleAcceptASAPTrip}
        onDecline={handleDeclineASAPTrip}
        onClose={handleCloseASAPModal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    maxWidth: isTablet ? Math.min(600, screenWidth * 0.9) : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: getResponsiveValue(16, 20, 24),
    paddingTop: getResponsiveValue(12, 15, 20),
    paddingBottom: getResponsiveValue(16, 20, 24),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: Platform.OS === 'android' ? 56 : 44, // Android design guidelines
  },
  greetingContainer: {
    flex: 1,
    paddingRight: getResponsiveValue(12, 16, 20),
  },
  greetingText: {
    fontSize: getResponsiveValue(14, 16, 18),
    color: Colors.text.secondary,
    fontWeight: '400',
    lineHeight: getResponsiveValue(20, 22, 24),
  },
  userNameText: {
    fontSize: getResponsiveValue(20, 24, 28),
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: getResponsiveValue(2, 4, 6),
    lineHeight: getResponsiveValue(24, 28, 32),
  },
  profileButton: {
    width: Platform.OS === 'android' ? 48 : getResponsiveValue(40, 44, 48),
    height: Platform.OS === 'android' ? 48 : getResponsiveValue(40, 44, 48),
    borderRadius: Platform.OS === 'android' ? 24 : getResponsiveValue(20, 22, 24),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },
  statusCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: getResponsiveValue(16, 20, 24),
    marginTop: getResponsiveValue(16, 20, 24),
    borderRadius: getResponsiveValue(12, 14, 16),
    padding: getResponsiveValue(16, 20, 24),
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
    }),
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(12, 16, 20),
    minHeight: Platform.OS === 'android' ? 40 : 36,
  },
  statusTitle: {
    fontSize: getResponsiveValue(16, 18, 20),
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    marginLeft: getResponsiveValue(8, 12, 16),
    lineHeight: getResponsiveValue(22, 24, 26),
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: Platform.OS === 'android' ? 48 : 40,
  },
  statusText: {
    fontSize: getResponsiveValue(14, 16, 18),
    fontWeight: '600',
    color: Colors.text.primary,
    lineHeight: getResponsiveValue(20, 22, 24),
  },
  statusSubtext: {
    fontSize: getResponsiveValue(12, 14, 16),
    color: Colors.text.secondary,
    marginTop: getResponsiveValue(4, 6, 8),
    lineHeight: getResponsiveValue(16, 18, 20),
  },
  primaryActionButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: getResponsiveValue(16, 20, 24),
    marginTop: getResponsiveValue(16, 20, 24),
    paddingVertical: Platform.OS === 'android' ? 16 : getResponsiveValue(14, 16, 18),
    paddingHorizontal: getResponsiveValue(20, 24, 28),
    borderRadius: getResponsiveValue(12, 14, 16),
    alignItems: 'center',
    minHeight: Platform.OS === 'android' ? 48 : 44, // Android Material Design guidelines
    justifyContent: 'center',
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
    }),
  },
  primaryActionText: {
    color: Colors.background.primary,
    fontSize: getResponsiveValue(14, 16, 18),
    fontWeight: '600',
    lineHeight: getResponsiveValue(20, 22, 24),
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: getResponsiveValue(16, 20, 24),
    marginTop: getResponsiveValue(12, 16, 20),
    flexWrap: screenWidth < 360 ? 'wrap' : 'nowrap', // Wrap on very small screens
  },
  secondaryActionButton: {
    flex: screenWidth < 360 ? 1 : 1,
    backgroundColor: Colors.background.primary,
    marginHorizontal: getResponsiveValue(4, 6, 8),
    paddingVertical: Platform.OS === 'android' ? 14 : getResponsiveValue(12, 14, 16),
    paddingHorizontal: getResponsiveValue(8, 12, 16),
    borderRadius: getResponsiveValue(10, 12, 14),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'android' ? 48 : 44,
    marginBottom: screenWidth < 360 ? 8 : 0, // Add margin bottom for wrapped items
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
    }),
  },
  secondaryActionText: {
    fontSize: getResponsiveValue(12, 14, 16),
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: getResponsiveValue(4, 5, 6),
    textAlign: 'center',
    lineHeight: getResponsiveValue(16, 18, 20),
  },
  sectionHeader: {
    fontSize: getResponsiveValue(18, 20, 22),
    fontWeight: '700',
    color: Colors.text.primary,
    marginHorizontal: getResponsiveValue(16, 20, 24),
    marginTop: getResponsiveValue(24, 28, 32),
    marginBottom: getResponsiveValue(12, 15, 18),
    lineHeight: getResponsiveValue(24, 26, 28),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: getResponsiveValue(16, 20, 24),
    marginTop: getResponsiveValue(24, 28, 32),
    marginBottom: getResponsiveValue(12, 15, 18),
    minHeight: Platform.OS === 'android' ? 32 : 28,
  },
  seeAllText: {
    fontSize: getResponsiveValue(12, 14, 16),
    color: Colors.primary,
    fontWeight: '600',
    lineHeight: getResponsiveValue(16, 18, 20),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: getResponsiveValue(16, 20, 24),
    flexWrap: screenWidth < 400 ? 'wrap' : 'nowrap', // Wrap stats on small screens
  },
  statCard: {
    backgroundColor: Colors.background.primary,
    flex: screenWidth < 400 ? 0.48 : 1, // Adjust flex for wrapping
    marginHorizontal: screenWidth < 400 ? 2 : getResponsiveValue(4, 6, 8),
    marginVertical: screenWidth < 400 ? 4 : 0,
    padding: getResponsiveValue(12, 16, 20),
    borderRadius: getResponsiveValue(10, 12, 14),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'android' ? 80 : 70,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
    }),
  },
  statNumber: {
    fontSize: getResponsiveValue(16, 18, 20),
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: getResponsiveValue(20, 22, 24),
  },
  statLabel: {
    fontSize: getResponsiveValue(10, 12, 14),
    color: Colors.text.secondary,
    marginTop: getResponsiveValue(4, 5, 6),
    textAlign: 'center',
    lineHeight: getResponsiveValue(14, 16, 18),
  },
  availableTripsContainer: {
    marginHorizontal: getResponsiveValue(16, 20, 24),
    marginTop: getResponsiveValue(16, 20, 24),
  },
  tripCount: {
    fontSize: getResponsiveValue(12, 14, 16),
    color: Colors.text.secondary,
    marginBottom: getResponsiveValue(12, 15, 18),
    lineHeight: getResponsiveValue(16, 18, 20),
  },
  tripCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: getResponsiveValue(10, 12, 14),
    padding: getResponsiveValue(14, 16, 20),
    marginBottom: getResponsiveValue(10, 12, 14),
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
    }),
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Changed to flex-start for better text wrapping
    marginBottom: getResponsiveValue(6, 8, 10),
    minHeight: Platform.OS === 'android' ? 24 : 20,
  },
  tripMaterial: {
    fontSize: getResponsiveValue(14, 16, 18),
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    marginRight: getResponsiveValue(8, 10, 12),
    lineHeight: getResponsiveValue(18, 20, 22),
  },
  tripEarnings: {
    fontSize: getResponsiveValue(14, 16, 18),
    fontWeight: '700',
    color: Colors.status.completed,
    lineHeight: getResponsiveValue(18, 20, 22),
  },
  tripRoute: {
    fontSize: getResponsiveValue(12, 14, 16),
    color: Colors.text.secondary,
    marginBottom: getResponsiveValue(6, 8, 10),
    lineHeight: getResponsiveValue(16, 18, 20),
  },
  tripCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: Platform.OS === 'android' ? 20 : 16,
  },
  tripDistance: {
    fontSize: getResponsiveValue(11, 12, 14),
    color: Colors.text.secondary,
    lineHeight: getResponsiveValue(14, 16, 18),
  },
  tripTime: {
    fontSize: getResponsiveValue(11, 12, 14),
    color: Colors.text.secondary,
    lineHeight: getResponsiveValue(14, 16, 18),
  },
  incompatibleTripCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
  },
  tripMaterialContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  incompatibleBadge: {
    backgroundColor: Colors.status.cancelled,
    borderRadius: getResponsiveValue(4, 5, 6),
    paddingHorizontal: getResponsiveValue(6, 8, 10),
    paddingVertical: getResponsiveValue(2, 3, 4),
    marginTop: getResponsiveValue(4, 5, 6),
    alignSelf: 'flex-start',
  },
  incompatibleBadgeText: {
    fontSize: getResponsiveValue(10, 11, 12),
    color: Colors.background.primary,
    fontWeight: '500',
    lineHeight: getResponsiveValue(12, 14, 16),
  },
  incompatibleText: {
    fontSize: getResponsiveValue(12, 13, 14),
    color: Colors.status.cancelled,
    fontWeight: '500',
    lineHeight: getResponsiveValue(16, 18, 20),
  },
  emptyState: {
    padding: getResponsiveValue(32, 40, 48),
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: getResponsiveValue(40, 48, 56),
    marginBottom: getResponsiveValue(10, 12, 16),
  },
  emptyStateText: {
    fontSize: getResponsiveValue(16, 18, 20),
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: getResponsiveValue(6, 8, 10),
    textAlign: 'center',
    lineHeight: getResponsiveValue(20, 22, 24),
  },
  emptyStateSubtext: {
    fontSize: getResponsiveValue(12, 14, 16),
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: getResponsiveValue(16, 18, 20),
    paddingHorizontal: getResponsiveValue(16, 20, 24),
  },
  bottomSpacing: {
    height: getResponsiveValue(24, 30, 40),
  },
  assignedTripCard: {
    borderLeftWidth: getResponsiveValue(2, 3, 4),
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.background.primary,
    marginVertical: getResponsiveValue(3, 4, 5),
  },
  statusBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: getResponsiveValue(6, 8, 10),
    paddingVertical: getResponsiveValue(2, 3, 4),
    borderRadius: getResponsiveValue(2, 3, 4),
  },
  statusBadgeText: {
    color: Colors.background.primary,
    fontSize: getResponsiveValue(9, 10, 11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: getResponsiveValue(12, 14, 16),
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: getResponsiveValue(12, 16, 20),
    paddingVertical: getResponsiveValue(6, 8, 10),
    borderRadius: getResponsiveValue(2, 3, 4),
    minHeight: Platform.OS === 'android' ? 40 : 32,
    justifyContent: 'center',
  },
  navigationButtonText: {
    color: Colors.background.primary,
    fontSize: getResponsiveValue(11, 13, 15),
    fontWeight: '600',
    marginLeft: getResponsiveValue(3, 4, 5),
    lineHeight: getResponsiveValue(14, 16, 18),
  },
  navigationSecondaryButton: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  navigationSecondaryButtonText: {
    color: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.border.light,
    marginLeft: getResponsiveValue(6, 8, 10),
  },
  secondaryButtonText: {
    color: Colors.primary,
  },
});

export default ModernDriverDashboard;
