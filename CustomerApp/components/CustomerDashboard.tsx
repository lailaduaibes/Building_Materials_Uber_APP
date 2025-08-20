/**
 * Customer Dashboard - Professional Building Materials Order Management
 * Clean, business-focused interface for customer order management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Order {
  id: string;
  status: 'pending' | 'confirmed' | 'in_transit' | 'delivered';
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  deliveryAddress: string;
  estimatedDelivery: string;
  totalAmount: number;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface CustomerDashboardProps {
  user: User;
  onNavigate: (screen: string) => void;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user, onNavigate }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_URL}/api/v1/customer/orders`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      
      // Mock data for now
      const mockOrders: Order[] = [
        {
          id: '1',
          status: 'in_transit',
          items: [
            { name: 'Concrete Blocks', quantity: 50, unit: 'pieces' },
            { name: 'Steel Rebar', quantity: 100, unit: 'kg' }
          ],
          deliveryAddress: '123 Construction Site, City',
          estimatedDelivery: '2025-08-15 14:00',
          totalAmount: 1250.00,
          createdAt: '2025-08-14 10:30'
        },
        {
          id: '2',
          status: 'pending',
          items: [
            { name: 'Cement Bags', quantity: 20, unit: 'bags' }
          ],
          deliveryAddress: '456 Building Site, City',
          estimatedDelivery: '2025-08-16 09:00',
          totalAmount: 480.00,
          createdAt: '2025-08-14 11:45'
        }
      ];

      setOrders(mockOrders);
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'confirmed': return '#3498db';
      case 'in_transit': return '#9b59b6';
      case 'delivered': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={['#2c3e50', '#34495e']}
        style={styles.header}
      >
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{user.firstName} {user.lastName}</Text>
        <Text style={styles.subtitleText}>Manage your building material orders</Text>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => onNavigate('place-order')}
          >
            <Text style={styles.actionTitle}>New Order</Text>
            <Text style={styles.actionSubtitle}>Place building materials order</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => onNavigate('track-order')}
          >
            <Text style={styles.actionTitle}>Track Delivery</Text>
            <Text style={styles.actionSubtitle}>Monitor active deliveries</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={() => onNavigate('history')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>Start by placing your first order</Text>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => onNavigate('place-order')}
            >
              <Text style={styles.primaryButtonText}>Place Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>Order #{order.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
              
              <View style={styles.orderItems}>
                {order.items.slice(0, 2).map((item, index) => (
                  <Text key={index} style={styles.itemText}>
                    • {item.quantity} {item.unit} {item.name}
                  </Text>
                ))}
                {order.items.length > 2 && (
                  <Text style={styles.moreItemsText}>
                    +{order.items.length - 2} more items
                  </Text>
                )}
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.totalAmount}>${order.totalAmount.toFixed(2)}</Text>
                <TouchableOpacity 
                  style={styles.trackButton}
                  onPress={() => onNavigate('track-order')}
                >
                  <Text style={styles.trackButtonText}>Track</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Order Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Month</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{orders.length}</Text>
            <Text style={styles.statLabel}>Orders Placed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              ${orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  welcomeText: {
    fontSize: 16,
    color: '#ecf0f1',
    opacity: 0.8,
  },
  nameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: '#ecf0f1',
    opacity: 0.7,
    marginTop: 8,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6c757d',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
  },
  orderItems: {
    marginBottom: 12,
  },
  itemText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 2,
  },
  moreItemsText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27ae60',
  },
  trackButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  trackButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default CustomerDashboard;
