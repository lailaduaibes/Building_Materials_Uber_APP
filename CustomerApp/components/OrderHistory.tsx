/**
 * Order History - Professional Order Management Interface
 * Complete order history and management for customers
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface HistoricalOrder {
  id: string;
  status: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
  }>;
  deliveryAddress: string;
  deliveredAt?: string;
  driverName?: string;
  totalAmount: number;
  createdAt: string;
  rating?: number;
  feedback?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface OrderHistoryProps {
  user: User;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ user }) => {
  const [orders, setOrders] = useState<HistoricalOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<HistoricalOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrderHistory();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, selectedFilter]);

  const loadOrderHistory = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_URL}/api/v1/customer/orders/history`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      
      // Mock data for demonstration
      const mockOrders: HistoricalOrder[] = [
        {
          id: '1',
          status: 'delivered',
          items: [
            { name: 'Concrete Blocks', quantity: 50, unit: 'pieces', pricePerUnit: 2.50 },
            { name: 'Steel Rebar', quantity: 100, unit: 'kg', pricePerUnit: 1.20 }
          ],
          deliveryAddress: '123 Construction Site, Downtown',
          deliveredAt: '2025-08-10 15:30',
          driverName: 'Michael Johnson',
          totalAmount: 1250.00,
          createdAt: '2025-08-09 10:30',
          rating: 5,
          feedback: 'Excellent service, delivered on time!'
        },
        {
          id: '2',
          status: 'delivered',
          items: [
            { name: 'Cement Bags', quantity: 20, unit: 'bags', pricePerUnit: 24.00 }
          ],
          deliveryAddress: '456 Building Site, Uptown',
          deliveredAt: '2025-08-08 11:15',
          driverName: 'Sarah Wilson',
          totalAmount: 480.00,
          createdAt: '2025-08-07 14:20',
          rating: 4
        },
        {
          id: '3',
          status: 'cancelled',
          items: [
            { name: 'Sand', quantity: 5, unit: 'cubic meters', pricePerUnit: 35.00 }
          ],
          deliveryAddress: '789 Project Site, Suburbs',
          totalAmount: 175.00,
          createdAt: '2025-08-05 09:15'
        },
        {
          id: '4',
          status: 'delivered',
          items: [
            { name: 'Brick Red', quantity: 500, unit: 'pieces', pricePerUnit: 0.80 },
            { name: 'Roof Tiles', quantity: 100, unit: 'pieces', pricePerUnit: 3.20 }
          ],
          deliveryAddress: '321 House Build, Central',
          deliveredAt: '2025-08-03 16:45',
          driverName: 'David Chen',
          totalAmount: 720.00,
          createdAt: '2025-08-02 11:00',
          rating: 5,
          feedback: 'Professional driver, careful handling of materials'
        }
      ];

      setOrders(mockOrders);
    } catch (error) {
      Alert.alert('Error', 'Failed to load order history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(order => order.status === selectedFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchLower) ||
        order.deliveryAddress.toLowerCase().includes(searchLower) ||
        order.items.some(item => item.name.toLowerCase().includes(searchLower)) ||
        (order.driverName && order.driverName.toLowerCase().includes(searchLower))
      );
    }

    setFilteredOrders(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrderHistory();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'confirmed': return '#3498db';
      case 'picked_up': return '#9b59b6';
      case 'in_transit': return '#e74c3c';
      case 'delivered': return '#27ae60';
      case 'cancelled': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const reorderItems = (order: HistoricalOrder) => {
    Alert.alert(
      'Reorder Items',
      `Reorder the same items from Order #${order.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reorder', 
          onPress: () => {
            // TODO: Navigate to order placement with pre-filled items
            Alert.alert('Success', 'Items added to cart. Redirecting to order placement...');
          }
        }
      ]
    );
  };

  const rateOrder = (order: HistoricalOrder) => {
    // TODO: Implement rating modal
    Alert.alert('Rate Order', 'Rating feature coming soon!');
  };

  const filterOptions = [
    { key: 'all', label: 'All Orders' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'in_transit', label: 'In Transit' }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading order history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2c3e50', '#34495e']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Order History</Text>
        <Text style={styles.headerSubtitle}>View and manage your past orders</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search and Filter */}
        <View style={styles.section}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders, addresses, or materials..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterButton,
                  selectedFilter === option.key && styles.activeFilterButton
                ]}
                onPress={() => setSelectedFilter(option.key)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedFilter === option.key && styles.activeFilterButtonText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Order Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{orders.length}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {orders.filter(o => o.status === 'delivered').length}
              </Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                ${orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
          </View>
        </View>

        {/* Orders List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Orders ({filteredOrders.length})
          </Text>
          
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No orders found</Text>
              <Text style={styles.emptySubtext}>
                {searchTerm || selectedFilter !== 'all' 
                  ? 'Try adjusting your search or filter' 
                  : 'Start by placing your first order'
                }
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
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

                <Text style={styles.deliveryAddress}>📍 {order.deliveryAddress}</Text>

                {order.deliveredAt && (
                  <Text style={styles.deliveredAt}>
                    Delivered: {formatDate(order.deliveredAt)}
                  </Text>
                )}

                {order.driverName && (
                  <Text style={styles.driverName}>Driver: {order.driverName}</Text>
                )}

                {/* Rating Display */}
                {order.rating && (
                  <View style={styles.ratingContainer}>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={[
                          styles.star,
                          { color: star <= order.rating! ? '#f39c12' : '#e9ecef' }
                        ]}>
                          ★
                        </Text>
                      ))}
                    </View>
                    {order.feedback && (
                      <Text style={styles.feedback}>"{order.feedback}"</Text>
                    )}
                  </View>
                )}

                <View style={styles.orderFooter}>
                  <Text style={styles.totalAmount}>${order.totalAmount.toFixed(2)}</Text>
                  
                  <View style={styles.actionButtons}>
                    {order.status === 'delivered' && (
                      <>
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => reorderItems(order)}
                        >
                          <Text style={styles.actionButtonText}>Reorder</Text>
                        </TouchableOpacity>
                        {!order.rating && (
                          <TouchableOpacity 
                            style={[styles.actionButton, styles.rateButton]}
                            onPress={() => rateOrder(order)}
                          >
                            <Text style={styles.actionButtonText}>Rate</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
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
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ecf0f1',
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#495057',
    marginBottom: 16,
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  activeFilterButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
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
    marginBottom: 8,
  },
  orderItems: {
    marginBottom: 8,
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
  deliveryAddress: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  deliveredAt: {
    fontSize: 12,
    color: '#27ae60',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  ratingContainer: {
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  star: {
    fontSize: 16,
    marginRight: 2,
  },
  feedback: {
    fontSize: 12,
    color: '#495057',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rateButton: {
    backgroundColor: '#f39c12',
  },
  actionButtonText: {
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
    textAlign: 'center',
  },
});

export default OrderHistory;
