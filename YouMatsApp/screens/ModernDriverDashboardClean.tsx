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
import AsyncStorage from '@react-native-async-storage/async-storage';
import DriverService from '../services/DriverService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Uber-style theme matching customer app
const theme = {
  primary: '#000000',
  secondary: '#FFFFFF', 
  background: '#F5F5F5',
  text: '#000000',
  textSecondary: '#6B6B6B',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  accent: '#007AFF',
  border: '#E5E5EA',
  cardBackground: '#FFFFFF',
  shadow: '#000000',
  lightText: '#8E8E93',
};

interface Driver {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  rating: number;
  total_trips: number;
  total_earnings: number;
  vehicleType: string;
  vehiclePlateNumber: string;
}

interface OrderAssignment {
  id: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  deliveryLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  materials: Array<{
    type: string;
    quantity: number;
    weight?: number;
  }>;
  estimatedEarnings: number;
  distanceKm: number;
  estimatedDuration: number;
  specialInstructions?: string;
  status: string;
}

interface DriverStats {
  today: {
    deliveries: number;
    earnings: number;
    hoursWorked: number;
    averageRating: number;
  };
  thisWeek: {
    deliveries: number;
    earnings: number;
    hoursWorked: number;
  };
}

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
  const navigation = useNavigation<NavigationProp>();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderAssignment | null>(null);
  const [nearbyOrders, setNearbyOrders] = useState<OrderAssignment[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);
  const [todayEarnings, setTodayEarnings] = useState(0);

  const driverService = new DriverService();

  useEffect(() => {
    loadDriverData();
    loadNearbyOrders();
    loadStats();
  }, []);

  const loadDriverData = async () => {
    try {
      const driverData = await AsyncStorage.getItem('driverData');
      if (driverData) {
        setDriver(JSON.parse(driverData));
      }
      
      const onlineStatus = await AsyncStorage.getItem('driverOnlineStatus');
      setIsOnline(onlineStatus === 'true');
    } catch (error) {
      console.error('Error loading driver data:', error);
    }
  };

  const loadNearbyOrders = async () => {
    try {
      const orders = await driverService.getNearbyOrders();
      setNearbyOrders(orders);
    } catch (error) {
      console.error('Error loading nearby orders:', error);
    }
  };

  const loadStats = async () => {
    try {
      const driverStats = await driverService.getDriverStats();
      setStats(driverStats);
      setTodayEarnings(driverStats?.today.earnings || 0);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      await AsyncStorage.setItem('driverOnlineStatus', newStatus.toString());
      
      if (newStatus) {
        await loadNearbyOrders();
      }
    } catch (error) {
      console.error('Error toggling online status:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDriverData(),
      loadNearbyOrders(),
      loadStats(),
    ]);
    setRefreshing(false);
  };

  const handleAcceptOrder = async (order: OrderAssignment) => {
    try {
      const success = await driverService.acceptOrder(order.id);
      if (success) {
        setActiveOrder(order);
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
          <Ionicons name="person-circle-outline" size={24} color={theme.secondary} />
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
          thumbColor={isOnline ? theme.secondary : theme.lightText}
        />
      </View>
      <View style={styles.statusContent}>
        <View>
          <Text style={styles.statusText}>
            {isOnline ? '🟢 Online - Ready for trips' : '🔴 Offline'}
          </Text>
          <Text style={styles.statusSubtext}>
            {isOnline ? 'You will receive trip requests' : 'Turn on to start receiving trips'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View>
      <TouchableOpacity 
        style={[styles.primaryActionButton, !isOnline && styles.disabledButton]}
        disabled={!isOnline}
        onPress={() => loadNearbyOrders()}
      >
        <Text style={styles.primaryActionText}>
          {isOnline ? 'Find Trips' : 'Go Online to Find Trips'}
        </Text>
      </TouchableOpacity>

      <View style={styles.secondaryActionsRow}>
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={onNavigateToTripHistory}
        >
          <Ionicons name="time-outline" size={20} color={theme.primary} />
          <Text style={styles.secondaryActionText}>Trip History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={() => Alert.alert('Location', 'Update your location settings')}
        >
          <Ionicons name="location-outline" size={20} color={theme.primary} />
          <Text style={styles.secondaryActionText}>My Location</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={onNavigateToProfile}
        >
          <Ionicons name="settings-outline" size={20} color={theme.primary} />
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
          <Text style={styles.statLabel}>Online</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>⭐ {stats?.today.averageRating || 0}</Text>
          <Text style={styles.statLabel}>Rating</Text>
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
          {nearbyOrders.slice(0, 3).map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.tripCard}
              onPress={() => showAcceptOrderDialog(order)}
            >
              <View style={styles.tripCardHeader}>
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
          ))}
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
    color: theme.textSecondary,
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
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
    marginLeft: 10,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  statusSubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 5,
  },
  primaryActionButton: {
    backgroundColor: theme.primary,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
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
  disabledButton: {
    backgroundColor: theme.lightText,
  },
  primaryActionText: {
    color: theme.secondary,
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
    marginTop: 5,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
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
    color: theme.accent,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
  },
  statCard: {
    backgroundColor: theme.secondary,
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
    color: theme.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 5,
  },
  availableTripsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  tripCount: {
    fontSize: 14,
    color: theme.textSecondary,
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
    color: theme.textSecondary,
    marginBottom: 8,
  },
  tripCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripDistance: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  tripTime: {
    fontSize: 14,
    color: theme.textSecondary,
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
    color: theme.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 30,
  },
});

export default ModernDriverDashboard;
