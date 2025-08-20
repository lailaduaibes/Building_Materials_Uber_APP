import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { orderService } from '../OrderService'; // Old service - replaced with TripService
import TripService from '../services/TripService'; // New Uber-style service
import { authService } from '../AuthServiceSupabase';

// Theme colors
const theme = {
  primary: '#1B365D',
  secondary: '#FF6B35',
  accent: '#4A90E2',
  background: '#F5F7FA',
  white: '#FFFFFF',
  text: '#2C3E50',
  lightText: '#7F8C8D',
  success: '#27AE60',
  warning: '#F39C12',
  error: '#E74C3C',
  border: '#E1E8ED',
};

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
  materials: string[];
  deliveryDate: string;
  totalAmount: number;
}

interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate, onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
    loadRecentOrders();
  }, []);

  const loadUserData = async () => {
    try {
      // Use Supabase auth service to get current user (CORRECT ARCHITECTURE)
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email,
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          phone: currentUser.phone || ''
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadRecentOrders = async () => {
    try {
      setIsLoading(true);
      
      // Use TripService to get recent trips (UBER-STYLE ARCHITECTURE)
      const trips = await TripService.getUserTrips();
      const recentTrips = trips.slice(0, 5); // Get last 5 trips
      
      const formattedOrders: RecentOrder[] = recentTrips.map((trip: any) => ({
        id: trip.id,
        orderNumber: trip.id.substring(0, 8), // Use trip ID as order number
        status: (trip.status as 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered'),
        materials: [trip.material_type || 'Building Materials'],
        deliveryDate: trip.created_at ? 
          new Date(trip.created_at).toLocaleDateString() : 
          new Date().toLocaleDateString(),
        totalAmount: trip.quoted_price || 0,
      }));
      
      setRecentOrders(formattedOrders);
    } catch (error) {
      console.error('Error loading recent orders:', error);
      Alert.alert('Error', 'Failed to load recent orders');
      setRecentOrders([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRecentOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return theme.warning;
      case 'assigned': return theme.accent;
      case 'picked_up': return theme.secondary;
      case 'in_transit': return theme.primary;
      case 'delivered': return theme.success;
      default: return theme.lightText;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'assigned': return 'Assigned';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      default: return 'Unknown';
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['token', 'user']);
              onLogout();
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Welcome Message */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>
                Welcome back
              </Text>
              {user && user.firstName ? (
                <Text style={styles.subtitleText}>
                  {`${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`}
                </Text>
              ) : (
                <Text style={[styles.subtitleText, { color: '#E74C3C' }]}>
                  Debug: No user data loaded
                </Text>
              )}
            </View>
            
            {/* Account Menu Button */}
            <TouchableOpacity
              style={styles.accountButton}
              onPress={() => onNavigate('AccountSettings')}
            >
              <View style={styles.profileIconContainer}>
                <Ionicons name="person" size={20} color={theme.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Uber-Style Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>What do you need?</Text>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.newOrderButton]}
              onPress={() => onNavigate('RequestTruck')}
            >
              <View style={styles.actionButtonContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="car" size={28} color={theme.secondary} />
                </View>
                <Text style={styles.actionButtonText}>Request Truck</Text>
                <Text style={styles.actionButtonSubtext}>Get a truck delivered</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.historyButton]}
              onPress={() => onNavigate('TrackTrip')}
            >
              <View style={styles.actionButtonContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="location" size={28} color={theme.accent} />
                </View>
                <Text style={styles.actionButtonText}>Track Trip</Text>
                <Text style={styles.actionButtonSubtext}>Live delivery tracking</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.newOrderButton]}
              onPress={() => onNavigate('TripHistory')}
            >
              <View style={styles.actionButtonContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="time" size={28} color={theme.success} />
                </View>
                <Text style={styles.actionButtonText}>Trip History</Text>
                <Text style={styles.actionButtonSubtext}>Past deliveries</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.historyButton]}
              onPress={() => onNavigate('Support')}
            >
              <View style={styles.actionButtonContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="help-circle" size={28} color={theme.warning} />
                </View>
                <Text style={styles.actionButtonText}>Support</Text>
                <Text style={styles.actionButtonSubtext}>Get help</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Trips Summary */}
        <View style={styles.recentOrdersContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <TouchableOpacity onPress={() => onNavigate('TripHistory')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading trips...</Text>
            </View>
          ) : recentOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={48} color={theme.lightText} />
              <Text style={styles.emptyText}>No recent trips</Text>
              <Text style={styles.emptySubtext}>Your trip history will appear here</Text>
            </View>
          ) : (
            recentOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <TouchableOpacity
                  style={styles.orderContent}
                  onPress={() => onNavigate(`TrackTrip:${order.id}`)}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>Trip #{order.orderNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.materialsText}>
                    {order.materials.join(', ')}
                  </Text>
                  
                  <View style={styles.orderFooter}>
                    <View style={styles.orderInfo}>
                      <Ionicons name="calendar-outline" size={16} color={theme.lightText} />
                      <Text style={styles.orderDate}>{formatDate(order.deliveryDate)}</Text>
                    </View>
                    <Text style={styles.orderAmount}>{formatCurrency(order.totalAmount)}</Text>
                  </View>
                </TouchableOpacity>
                
                {/* Track button for trackable orders */}
                {(order.status === 'assigned' || order.status === 'picked_up' || order.status === 'in_transit') && (
                  <TouchableOpacity
                    style={styles.trackButton}
                    onPress={() => onNavigate(`TrackOrder:${order.id}`)}
                  >
                    <Ionicons name="location" size={16} color={theme.white} />
                    <Text style={styles.trackButtonText}>Track Live</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        {/* Additional Quick Links */}
        <View style={styles.quickLinksContainer}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => onNavigate('OrderHistory')}
          >
            <Ionicons name="time-outline" size={24} color={theme.primary} />
            <Text style={styles.quickLinkText}>Order History</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.lightText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => onNavigate('CustomerSupport')}
          >
            <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
            <Text style={styles.quickLinkText}>Customer Support</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.lightText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => onNavigate('AccountSettings')}
          >
            <Ionicons name="settings-outline" size={24} color={theme.primary} />
            <Text style={styles.quickLinkText}>Account Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.lightText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickLink, styles.logoutLink]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color={theme.error} />
            <Text style={[styles.quickLinkText, { color: theme.error }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.lightText} />
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: theme.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#1B365D',
    fontWeight: '600',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: theme.primary,
    opacity: 0.8,
  },
  accountButton: {
    padding: 4,
  },
  profileIconContainer: {
    backgroundColor: theme.background,
    borderRadius: 50,
    padding: 8,
    borderWidth: 2,
    borderColor: theme.primary,
  },
  quickActionsContainer: {
    padding: 20,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: theme.white,
    borderWidth: 2,
    borderColor: theme.border,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  newOrderButton: {
    borderColor: theme.secondary,
  },
  historyButton: {
    borderColor: theme.accent,
  },
  actionButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
  },
  iconContainer: {
    backgroundColor: theme.background,
    borderRadius: 50,
    padding: 12,
    marginBottom: 8,
    alignSelf: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
  },
  actionButtonSubtext: {
    fontSize: 13,
    color: theme.lightText,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
    width: '100%',
  },
  recentOrdersContainer: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.lightText,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 8,
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.white,
  },
  materialsText: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderDate: {
    fontSize: 12,
    color: theme.lightText,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
  },
  quickLinksContainer: {
    padding: 20,
    paddingTop: 10,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  logoutLink: {
    marginTop: 8,
  },
  quickLinkText: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
    marginLeft: 12,
  },
  orderContent: {
    flex: 1,
  },
  trackButton: {
    backgroundColor: theme.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    marginTop: 8,
  },
  trackButtonText: {
    color: theme.white,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default DashboardScreen;
