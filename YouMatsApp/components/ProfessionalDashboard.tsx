import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Order {
  id: string;
  orderType: string;
  status: string;
  items: Array<{
    materialType: string;
    description: string;
    quantity: number;
    unit: string;
  }>;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
  };
  scheduledDeliveryTime?: string;
  estimatedDistance?: number;
  estimatedDuration?: number;
  createdAt: string;
}

interface DriverStats {
  todayDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  totalDistance: number;
}

const ProfessionalDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'today' | 'pending' | 'completed'>('today');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DriverStats>({
    todayDeliveries: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0,
    totalDistance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders from backend
      const ordersResponse = await fetch('http://localhost:3000/api/v1/orders', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.data || []);
        
        // Calculate stats from orders
        const today = new Date().toDateString();
        const todayOrders = ordersData.data?.filter((order: Order) => 
          new Date(order.createdAt).toDateString() === today
        ) || [];
        
        const completed = ordersData.data?.filter((order: Order) => 
          order.status === 'delivered'
        ) || [];
        
        const pending = ordersData.data?.filter((order: Order) => 
          ['pending', 'assigned', 'picked_up', 'in_transit'].includes(order.status)
        ) || [];
        
        const totalDistance = ordersData.data?.reduce((sum: number, order: Order) => 
          sum + (order.estimatedDistance || 0), 0
        ) || 0;
        
        setStats({
          todayDeliveries: todayOrders.length,
          completedDeliveries: completed.length,
          pendingDeliveries: pending.length,
          totalDistance: Math.round(totalDistance),
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    // This should get the actual auth token from your auth service
    // For now, returning empty string
    return '';
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return '#3498db';
      case 'assigned': return '#f39c12';
      case 'picked_up': return '#e67e22';
      case 'in_transit': return '#9b59b6';
      case 'delivered': return '#2ecc71';
      case 'cancelled': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  const getStatusText = (status: string): string => {
    return status.replace('_', ' ').toUpperCase();
  };

  const formatMaterials = (items: Order['items']): string => {
    if (!items || items.length === 0) return 'No items';
    
    const summary = items.slice(0, 2).map(item => 
      `${item.quantity} ${item.unit} ${item.materialType.replace('_', ' ')}`
    ).join(', ');
    
    return items.length > 2 ? `${summary} +${items.length - 2} more` : summary;
  };

  const formatAddress = (address: Order['deliveryAddress']): string => {
    return `${address.street}, ${address.city}`;
  };

  const formatDuration = (minutes?: number): string => {
    if (!minutes) return 'TBD';
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  };

  const filteredOrders = orders.filter(order => {
    switch (activeTab) {
      case 'today':
        return new Date(order.createdAt).toDateString() === new Date().toDateString();
      case 'pending':
        return ['pending', 'assigned', 'picked_up', 'in_transit'].includes(order.status);
      case 'completed':
        return order.status === 'delivered';
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <Text style={styles.headerSubtitle}>Delivery Management System</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{stats.todayDeliveries}</Text>
            <Text style={styles.statsLabel}>Today</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{stats.pendingDeliveries}</Text>
            <Text style={styles.statsLabel}>Pending</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{stats.completedDeliveries}</Text>
            <Text style={styles.statsLabel}>Completed</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{stats.totalDistance}</Text>
            <Text style={styles.statsLabel}>Total KM</Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {(['today', 'pending', 'completed'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Orders List */}
        <View style={styles.ordersContainer}>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No orders found</Text>
              <Text style={styles.emptyStateSubtext}>
                {activeTab === 'today' && 'No deliveries scheduled for today'}
                {activeTab === 'pending' && 'No pending deliveries'}
                {activeTab === 'completed' && 'No completed deliveries'}
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>Order #{order.id.slice(-8)}</Text>
                    <Text style={styles.orderType}>{order.orderType.replace('_', ' ')}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
                  </View>
                </View>

                <Text style={styles.orderAddress}>{formatAddress(order.deliveryAddress)}</Text>
                <Text style={styles.orderMaterials}>{formatMaterials(order.items)}</Text>

                <View style={styles.orderFooter}>
                  <Text style={styles.orderDuration}>
                    Duration: {formatDuration(order.estimatedDuration)}
                  </Text>
                  {order.estimatedDistance && (
                    <Text style={styles.orderDistance}>
                      {order.estimatedDistance.toFixed(1)} km
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#b3b3b3',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -20,
    marginBottom: 30,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#ffffff',
  },
  ordersContainer: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  orderType: {
    fontSize: 12,
    color: '#7f8c8d',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  orderAddress: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    fontWeight: '500',
  },
  orderMaterials: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDuration: {
    fontSize: 12,
    color: '#95a5a6',
  },
  orderDistance: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '500',
  },
});

export default ProfessionalDashboard;
