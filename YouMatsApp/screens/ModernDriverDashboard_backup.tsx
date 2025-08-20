/**
 * ModernDriverDashboard - Uber-style Driver Dashboard
 * Real-time order assignments, earnings tracking, and driver status management
 * Advanced features: Heat map, surge pricing, driver performance analytics
 * Black & White Theme
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Switch,
  RefreshControl,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverService, Driver, DriverStats, OrderAssignment } from '../services/DriverService';
import { driverLocationService } from '../services/DriverLocationService';

const { width, height } = Dimensions.get('window');

// Professional minimal theme - matching customer app exactly
const theme = {
  primary: '#000000',        // Pure black
  secondary: '#FFFFFF',      // Pure white
  accent: '#007AFF',         // iOS blue for interactive elements
  success: '#34C759',        // iOS green for success states
  warning: '#FF9500',        // iOS orange for warnings
  error: '#FF3B30',          // iOS red for errors
  background: '#FFFFFF',     // White background
  cardBackground: '#FFFFFF', // White cards
  text: '#000000',          // Black text
  lightText: '#8E8E93',     // iOS light gray for secondary text
  border: '#C6C6C8',        // iOS light border
  shadow: 'rgba(0,0,0,0.04)', // Very subtle shadow
};

interface Props {
  driver: Driver;
  onOrderReceived: (order: OrderAssignment) => void;
  onNavigateToOrder: (order: OrderAssignment) => void;
  onNavigateToEarnings: () => void;
  onNavigateToTripHistory: () => void;
  onNavigateToProfile: () => void;
}

const ModernDriverDashboard: React.FC<Props> = ({ 
  driver, 
  onOrderReceived, 
  onNavigateToOrder,
  onNavigateToEarnings,
  onNavigateToTripHistory,
  onNavigateToProfile,
}) => {
  const [isOnline, setIsOnline] = useState(driver.status === 'online');
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderAssignment | null>(null);
  const [nearbyOrders, setNearbyOrders] = useState<OrderAssignment[]>([]);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);
  const [todayEarnings, setTodayEarnings] = useState(0);

  useEffect(() => {
    console.log('🚗 Loading dashboard data...');
    loadDriverStats();
    checkActiveOrder();
    loadNearbyOrders();
    calculateTodayEarnings();
    
    if (isOnline) {
      startListeningForOrders();
      startLocationTracking();
    }

    return () => {
      // Cleanup
    };
  }, [isOnline]);

  const loadDriverStats = async () => {
    try {
      console.log('📊 Loading driver stats from database...');
      const driverStats = await driverService.getDriverStats();
      if (driverStats) {
        setStats(driverStats);
        console.log('✅ Driver stats loaded');
      }
    } catch (error) {
      console.error('❌ Error loading driver stats:', error);
    }
  };

  const checkActiveOrder = () => {
    const order = driverService.getActiveOrder();
    setActiveOrder(order);
  };

  const loadNearbyOrders = async () => {
    try {
      console.log('🔍 Loading available trips from database...');
      const trips = await driverService.getAvailableTrips();
      setNearbyOrders(trips);
      console.log(`✅ Found ${trips.length} available trips`);
    } catch (error) {
      console.error('❌ Error loading nearby orders:', error);
      setNearbyOrders([]);
    }
  };

  const calculateTodayEarnings = async () => {
    try {
      console.log('💰 Calculating today\'s earnings...');
      const earningsData = await driverService.getEarningsData('today');
      if (earningsData) {
        setTodayEarnings(earningsData.totalEarnings);
        console.log('✅ Today\'s earnings:', earningsData.totalEarnings);
      }
    } catch (error) {
      console.error('❌ Error calculating today\'s earnings:', error);
    }
  };

  const startLocationTracking = async () => {
    await driverLocationService.startDriverTracking((location) => {
      console.log('Driver location updated:', location);
      // Update surge pricing based on location
      updateSurgeMultiplier(location);
    });
  };

  const updateSurgeMultiplier = (location: any) => {
    // Simple surge calculation - in real app this would come from backend
    const currentHour = new Date().getHours();
    const isPeakHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
    setSurgeMultiplier(isPeakHour ? 1.5 : 1.0);
  };

  const startListeningForOrders = async () => {
    await driverService.startListeningForOrders((order) => {
      onOrderReceived(order);
    });
  };

  const toggleOnlineStatus = async () => {
    const newStatus = isOnline ? 'offline' : 'online';
    const success = await driverService.updateDriverStatus(newStatus);
    
    if (success) {
      setIsOnline(!isOnline);
      
      if (newStatus === 'online') {
        // Start location tracking when going online
        await driverLocationService.startDriverTracking((location) => {
          console.log('Driver location updated:', location);
        });
      } else {
        // Stop location tracking when going offline
        driverLocationService.stopDriverTracking();
      }
    } else {
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDriverStats();
    checkActiveOrder();
    setRefreshing(false);
  };

  const handleActiveOrderPress = () => {
    if (activeOrder) {
      onNavigateToOrder(activeOrder);
    }
  };

  const handleOrderPress = (order: OrderAssignment) => {
    // Show order details modal or navigate to details screen
    Alert.alert(
      'Order Details',
      `Customer: ${order.customerName}\nMaterial: ${order.materials[0]?.type}\nDistance: ${order.distanceKm.toFixed(1)} km\nEarnings: $${order.estimatedEarnings}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept Order', onPress: () => handleAcceptOrder(order) }
      ]
    );
  };

  const handleAcceptOrder = async (order: OrderAssignment) => {
    try {
      const success = await driverService.acceptOrder(order.id);
      if (success) {
        setActiveOrder(order);
        // Remove from nearby orders
        setNearbyOrders(prev => prev.filter(o => o.id !== order.id));
        Alert.alert('Order Accepted!', 'Navigate to pickup location to start delivery.');
        onNavigateToOrder(order);
      } else {
        Alert.alert('Error', 'Failed to accept order. It may have been taken by another driver.');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', 'Failed to accept order. Please try again.');
    }
  };

  const handleViewOrderDetails = (order: OrderAssignment) => {
    // Show detailed order information
    Alert.alert(
      'Order Details',
      `Customer: ${order.customerName}\nPhone: ${order.customerPhone}\nPickup: ${order.pickupLocation.address}\nDelivery: ${order.deliveryLocation.address}\nMaterial: ${order.materials[0]?.type}\nWeight: ${order.materials[0]?.weight || 'N/A'} tons\nDistance: ${order.distanceKm.toFixed(1)} km\nDuration: ~${order.estimatedDuration} mins\nEarnings: $${order.estimatedEarnings}\n\nInstructions: ${order.specialInstructions || 'None'}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Accept Order', onPress: () => handleAcceptOrder(order) }
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Good {getGreeting()}</Text>
          <Text style={styles.userNameText}>
            {driver.fullName}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onNavigateToProfile()} style={styles.profileButton}>
          <Ionicons name="person-circle-outline" size={36} color={theme.lightText} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDriverStatusCard = () => (
    <View style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <Ionicons name="car" size={24} color={theme.primary} />
        <Text style={styles.statusTitle}>Driver Status</Text>
        <Switch
          value={isOnline}
          onValueChange={toggleOnlineStatus}
          trackColor={{ false: theme.border, true: theme.success }}
          thumbColor={theme.secondary}
        />
      </View>
      
      <View style={styles.statusContent}>
        <Text style={styles.statusText}>
          {isOnline ? '🟢 You are online and ready for trips' : '🔴 You are offline'}
        </Text>
        {isOnline && surgeMultiplier > 1.0 && (
          <Text style={styles.surgeText}>
            ⚡ {surgeMultiplier}x Surge Pricing Active
          </Text>
        )}
        <Text style={styles.statusSubtext}>
          {isOnline ? 'New trips will appear below' : 'Go online to start receiving trips'}
        </Text>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <TouchableOpacity 
        style={styles.primaryActionButton}
        onPress={() => onNavigateToEarnings()}
      >
        <View style={styles.primaryActionGradient}>
          <Ionicons name="wallet" size={28} color={theme.secondary} />
          <View style={styles.primaryActionText}>
            <Text style={styles.primaryActionTitle}>Today's Earnings</Text>
            <Text style={styles.primaryActionSubtitle}>${todayEarnings.toFixed(2)} earned today</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.secondary} />
        </View>
      </TouchableOpacity>

      <View style={styles.secondaryActionsRow}>
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={() => onNavigateToTripHistory()}
        >
          <Ionicons name="time" size={24} color={theme.primary} />
          <Text style={styles.secondaryActionText}>Trip History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={() => {}}
        >
          <Ionicons name="location" size={24} color={theme.primary} />
          <Text style={styles.secondaryActionText}>My Location</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={() => onNavigateToProfile()}
        >
          <Ionicons name="settings" size={24} color={theme.primary} />
          <Text style={styles.secondaryActionText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTodayStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Performance</Text>
        <TouchableOpacity onPress={() => onNavigateToEarnings()}>
          <Text style={styles.seeAllText}>View details</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.today.deliveries || 0}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.today.hoursWorked || 0}h</Text>
          <Text style={styles.statLabel}>Online</Text>
        </View>
      </View>
    </View>
  );

  const renderAvailableTrips = () => (
    <View style={styles.availableTripsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Trips</Text>
        <Text style={styles.tripCount}>{nearbyOrders.length} nearby</Text>
      </View>
      
      {nearbyOrders.length > 0 ? (
        nearbyOrders.map((order) => (
          <TouchableOpacity 
            key={order.id} 
            style={styles.tripCard}
            onPress={() => handleOrderPress(order)}
          >
            <View style={styles.tripCardHeader}>
              <Ionicons name="location" size={20} color={theme.primary} />
              <Text style={styles.tripMaterial}>{order.materials[0]?.type || 'Building Materials'}</Text>
              <Text style={styles.tripEarnings}>${order.estimatedEarnings}</Text>
            </View>
            <Text style={styles.tripRoute}>
              {order.pickupLocation.address} → {order.deliveryLocation.address}
            </Text>
            <View style={styles.tripCardFooter}>
              <Text style={styles.tripDistance}>{order.distanceKm} km away</Text>
              <Text style={styles.tripTime}>{order.estimatedDuration} min</Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="car-outline" size={48} color={theme.lightText} />
          <Text style={styles.emptyStateText}>No trips available</Text>
          <Text style={styles.emptyStateSubtext}>
            {isOnline ? 'Stay online to receive new trips' : 'Go online to start receiving trips'}
          </Text>
        </View>
      )}
    </View>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.background} />
      
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
        {renderAvailableTrips()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
      {/* Status Header */}
      <View style={styles.statusHeader}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.driverName}>{driver.fullName}</Text>
            <Text style={styles.statusText}>
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </Text>
            {isOnline && surgeMultiplier > 1.0 && (
              <Text style={styles.surgeText}>
                ⚡ {surgeMultiplier}x Surge Pricing
              </Text>
            )}
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: theme.lightText, true: theme.success }}
            thumbColor={isOnline ? theme.secondary : theme.secondary}
          />
        </View>
      </View>

      {/* Today's Earnings Quick View */}
      <View style={styles.earningsQuickView}>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsAmount}>${todayEarnings.toFixed(2)}</Text>
          <Text style={styles.earningsLabel}>Today's Earnings</Text>
        </View>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsAmount}>{stats?.today.deliveries || 0}</Text>
          <Text style={styles.earningsLabel}>Deliveries</Text>
        </View>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsAmount}>⭐ {driver.rating.toFixed(1)}</Text>
          <Text style={styles.earningsLabel}>Rating</Text>
        </View>
      </View>

      {/* Active Order Card */}
      {activeOrder && (
        <TouchableOpacity style={styles.activeOrderCard} onPress={handleActiveOrderPress}>
          <View style={styles.activeOrderGradient}>
            <Text style={styles.activeOrderTitle}>🚛 Active Delivery</Text>
            <Text style={styles.activeOrderCustomer}>{activeOrder?.customerName}</Text>
            <Text style={styles.activeOrderAddress}>
              📍 {activeOrder?.deliveryLocation.address}
            </Text>
            <Text style={styles.activeOrderEarnings}>
              💰 ${activeOrder?.estimatedEarnings}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Available Orders Section */}
      {isOnline && nearbyOrders.length > 0 && (
        <View style={styles.availableOrdersContainer}>
          <Text style={styles.sectionTitle}>🔥 Available Orders</Text>
          {nearbyOrders.slice(0, 3).map((order, index) => (
            <TouchableOpacity 
              key={order.id} 
              style={styles.orderCard}
              onPress={() => handleOrderPress(order)}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderTitle}>
                  {order.materials[0]?.type || 'Building Materials'}
                </Text>
                <Text style={styles.orderEarnings}>${order.estimatedEarnings}</Text>
              </View>
              <Text style={styles.orderCustomer}>👤 {order.customerName}</Text>
              <Text style={styles.orderDistance}>📍 {order.distanceKm.toFixed(1)} km away</Text>
              <Text style={styles.orderDuration}>⏱️ ~{order.estimatedDuration} mins</Text>
              <View style={styles.orderActions}>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => handleAcceptOrder(order)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.detailsButton}
                  onPress={() => handleViewOrderDetails(order)}
                >
                  <Text style={styles.detailsButtonText}>Details</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* No Orders Available Message */}
      {isOnline && nearbyOrders.length === 0 && (
        <View style={styles.noOrdersContainer}>
          <Text style={styles.noOrdersIcon}>📦</Text>
          <Text style={styles.noOrdersTitle}>No Orders Available</Text>
          <Text style={styles.noOrdersMessage}>
            You're online and ready! Orders will appear here when customers make requests in your area.
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={loadNearbyOrders}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Today's Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats?.today.deliveries || 0}</Text>
              <Text style={styles.statLabel}>Deliveries</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>${stats?.today.earnings || 0}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats?.today.hoursWorked || 0}h</Text>
              <Text style={styles.statLabel}>Hours</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>⭐ {stats?.today.averageRating || 0}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>View Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📍</Text>
            <Text style={styles.actionText}>Set Location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>🚗</Text>
            <Text style={styles.actionText}>Vehicle Info</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>Support</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekly Summary */}
      {stats && (
        <View style={styles.weeklySummary}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Deliveries:</Text>
            <Text style={styles.summaryValue}>{stats?.thisWeek.deliveries || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Earnings:</Text>
            <Text style={styles.summaryValue}>${stats?.thisWeek.earnings || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Hours Worked:</Text>
            <Text style={styles.summaryValue}>{stats?.thisWeek.hoursWorked || 0}h</Text>
          </View>
        </View>
      )}

      {/* Driver Rating & Performance */}
      <View style={styles.performanceCard}>
        <Text style={styles.sectionTitle}>Your Performance</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingLabel}>Overall Rating:</Text>
          <Text style={styles.ratingValue}>⭐ {driver.rating}/5.0</Text>
        </View>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingLabel}>Total Deliveries:</Text>
          <Text style={styles.ratingValue}>{driver.total_trips}</Text>
        </View>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingLabel}>Total Earnings:</Text>
          <Text style={styles.ratingValue}>${driver.total_earnings}</Text>
        </View>
      </View>

      {/* Quick Action Menu - Uber Style */}
      <View style={styles.quickActionMenu}>
        <TouchableOpacity style={styles.actionButton} onPress={onNavigateToEarnings}>
          <Ionicons name="card-outline" size={24} color={theme.primary} />
          <Text style={styles.actionButtonText}>Earnings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={onNavigateToTripHistory}>
          <Ionicons name="bar-chart-outline" size={24} color={theme.primary} />
          <Text style={styles.actionButtonText}>Activity</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={onNavigateToProfile}>
          <Ionicons name="person-outline" size={24} color={theme.primary} />
          <Text style={styles.actionButtonText}>Account</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Help', 'Get support and assistance')}>
          <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
          <Text style={styles.actionButtonText}>Help</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  statusHeader: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    color: theme.secondary,
    fontSize: 16,
    opacity: 0.8,
    fontWeight: '400',
  },
  driverName: {
    color: theme.secondary,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  statusText: {
    color: theme.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  activeOrderCard: {
    backgroundColor: theme.cardBackground,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activeOrderGradient: {
    backgroundColor: theme.secondary,
    padding: 20,
  },
  activeOrderTitle: {
    color: theme.secondary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  activeOrderCustomer: {
    color: theme.secondary,
    fontSize: 16,
    marginBottom: 4,
  },
  activeOrderAddress: {
    color: theme.secondary,
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  activeOrderEarnings: {
    color: theme.secondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: theme.cardBackground,
    width: (width - 60) / 2,
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: theme.lightText,
    textAlign: 'center',
  },
  quickActionsContainer: {
    margin: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: theme.cardBackground,
    width: (width - 60) / 2,
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: theme.text,
    textAlign: 'center',
  },
  weeklySummary: {
    backgroundColor: theme.secondary,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2.22,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: theme.lightText,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
  },
  performanceCard: {
    backgroundColor: theme.cardBackground,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ratingLabel: {
    fontSize: 16,
    color: theme.lightText,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.success,
  },
  // New Uber-style elements
  surgeText: {
    fontSize: 12,
    color: theme.warning,
    fontWeight: 'bold',
    marginTop: 2,
  },
  earningsQuickView: {
    flexDirection: 'row',
    backgroundColor: theme.secondary,
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2.22,
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 12,
    color: theme.lightText,
    textAlign: 'center',
  },
  quickActionMenu: {
    flexDirection: 'row',
    backgroundColor: theme.secondary,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2.22,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  primaryActionButton: {
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.primary,
  },
  primaryActionText: {
    flex: 1,
    marginLeft: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  primaryActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.secondary,
    marginBottom: 4,
    textAlign: 'left',
  },
  primaryActionSubtitle: {
    fontSize: 14,
    color: theme.secondary,
    opacity: 0.8,
    fontWeight: '400',
    textAlign: 'left',
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  // Available Orders Styles
  availableOrdersContainer: {
    margin: 20,
  },
  orderCard: {
    backgroundColor: theme.cardBackground,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    flex: 1,
  },
  orderEarnings: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.success,
  },
  orderCustomer: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 4,
  },
  orderDistance: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 4,
  },
  orderDuration: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 12,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: theme.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: theme.secondary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: theme.background,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  detailsButtonText: {
    color: theme.text,
    fontWeight: '500',
    fontSize: 14,
  },
  // No Orders Styles
  noOrdersContainer: {
    backgroundColor: theme.secondary,
    margin: 20,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  noOrdersIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noOrdersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },
  noOrdersMessage: {
    fontSize: 14,
    color: theme.lightText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: theme.secondary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomSpacing: {
    height: 30,
  },
  // New Uber-style Dashboard Styles
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: theme.secondary,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
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
    fontSize: 16,
    color: theme.lightText,
    fontWeight: '400',
  },
  userNameText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    marginTop: 2,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: theme.secondary,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 15,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusSubtext: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 5,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: theme.secondary,
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
    color: theme.text,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '600',
  },
  availableTripsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  tripCount: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 15,
  },
  tripCard: {
    backgroundColor: theme.secondary,
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
    color: theme.text,
    flex: 1,
  },
  tripEarnings: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.success,
  },
  tripRoute: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 8,
  },
  tripCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripDistance: {
    fontSize: 14,
    color: theme.lightText,
  },
  tripTime: {
    fontSize: 14,
    color: theme.lightText,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.lightText,
    textAlign: 'center',
  },
});

export default ModernDriverDashboard;
