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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService, Driver, DriverStats, OrderAssignment, ApprovalStatus } from '../services/DriverService';
import { driverPushNotificationService } from '../services/DriverPushNotificationService';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';
import { Colors, Typography, Spacing, ComponentSizes, createShadow } from '../theme/colors';
import { PickupTimeDisplay } from '../components/PickupTimeDisplay';
import { ASAPTripModal } from '../components/ASAPTripModal';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

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
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: responsive.padding(20, 40),
    paddingTop: responsive.padding(10, 15),
    paddingBottom: responsive.padding(20, 25),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: responsive.fontSize(16, 18),
    color: Colors.text.secondary,
    fontWeight: '400',
  },
  userNameText: {
    fontSize: responsive.fontSize(24, 28),
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: responsive.spacing(2, 4),
  },
  profileButton: {
    width: responsive.spacing(40, 50),
    height: responsive.spacing(40, 50),
    borderRadius: responsive.spacing(20, 25),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: deviceTypes.isAndroid ? 48 : 40,
    minWidth: deviceTypes.isAndroid ? 48 : 40,
  },
  statusCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: responsive.margin(20, 40),
    marginTop: responsive.margin(20, 25),
    borderRadius: responsive.spacing(12, 16),
    padding: responsive.padding(20, 30),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsive.spacing(15, 20),
  },
  statusTitle: {
    fontSize: responsive.fontSize(18, 22),
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    marginLeft: responsive.spacing(10, 15),
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: responsive.fontSize(16, 18),
    fontWeight: '600',
    color: Colors.text.primary,
  },
  statusSubtext: {
    fontSize: responsive.fontSize(14, 16),
    color: Colors.text.secondary,
    marginTop: responsive.spacing(5, 8),
  },
  primaryActionButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: responsive.margin(20, 40),
    marginTop: responsive.margin(20, 25),
    paddingVertical: responsive.padding(16, 20),
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryActionText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    marginHorizontal: 5,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 5,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
  },
  statCard: {
    backgroundColor: Colors.background.primary,
    flex: 1,
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 5,
  },
  availableTripsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  tripCount: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 15,
  },
  tripCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripMaterial: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  tripEarnings: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.status.completed,
  },
  tripRoute: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  tripCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripDistance: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  tripTime: {
    fontSize: 14,
    color: Colors.text.secondary,
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
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  incompatibleBadgeText: {
    fontSize: 10,
    color: Colors.background.primary,
    fontWeight: '500',
  },
  incompatibleText: {
    fontSize: 12,
    color: Colors.status.cancelled,
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 30,
  },
  assignedTripCard: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.background.primary,
    marginVertical: 4,
  },
  statusBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
  },
  statusBadgeText: {
    color: Colors.background.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 2,
  },
  navigationButtonText: {
    color: Colors.background.primary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
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
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: Colors.primary,
  },
});

export default ModernDriverDashboard;
