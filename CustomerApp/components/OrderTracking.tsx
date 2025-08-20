/**
 * Order Tracking - Professional Delivery Tracking Interface
 * Real-time tracking for customer orders
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface TrackingEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

interface DeliveryOrder {
  id: string;
  status: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered';
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  deliveryAddress: string;
  estimatedDelivery: string;
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: string;
  trackingEvents: TrackingEvent[];
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

interface OrderTrackingProps {
  user: User;
}

const OrderTracking: React.FC<OrderTrackingProps> = ({ user }) => {
  const [activeOrders, setActiveOrders] = useState<DeliveryOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActiveOrders();
  }, []);

  const loadActiveOrders = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_URL}/api/v1/customer/orders/active`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      
      // Mock data for demonstration
      const mockOrders: DeliveryOrder[] = [
        {
          id: '1',
          status: 'in_transit',
          items: [
            { name: 'Concrete Blocks', quantity: 50, unit: 'pieces' },
            { name: 'Steel Rebar', quantity: 100, unit: 'kg' }
          ],
          deliveryAddress: '123 Construction Site, Downtown',
          estimatedDelivery: '2025-08-15 14:00',
          driverName: 'Michael Johnson',
          driverPhone: '+1 (555) 123-4567',
          vehicleInfo: 'Truck - ABC 123',
          totalAmount: 1250.00,
          createdAt: '2025-08-14 10:30',
          trackingEvents: [
            {
              timestamp: '2025-08-14 10:30',
              status: 'Order Placed',
              description: 'Your order has been received and is being processed'
            },
            {
              timestamp: '2025-08-14 11:15',
              status: 'Order Confirmed',
              description: 'Order confirmed and assigned to warehouse'
            },
            {
              timestamp: '2025-08-14 12:30',
              status: 'Picked Up',
              description: 'Items picked up from warehouse',
              location: 'BuildMate Warehouse Central'
            },
            {
              timestamp: '2025-08-14 13:45',
              status: 'In Transit',
              description: 'Driver is en route to delivery location',
              location: 'Highway 101, 5 minutes away'
            }
          ]
        },
        {
          id: '2',
          status: 'confirmed',
          items: [
            { name: 'Cement Bags', quantity: 20, unit: 'bags' }
          ],
          deliveryAddress: '456 Building Site, Uptown',
          estimatedDelivery: '2025-08-16 09:00',
          totalAmount: 480.00,
          createdAt: '2025-08-14 11:45',
          trackingEvents: [
            {
              timestamp: '2025-08-14 11:45',
              status: 'Order Placed',
              description: 'Your order has been received and is being processed'
            },
            {
              timestamp: '2025-08-14 12:00',
              status: 'Order Confirmed',
              description: 'Order confirmed and scheduled for delivery'
            }
          ]
        }
      ];

      setActiveOrders(mockOrders);
      if (mockOrders.length > 0) {
        setSelectedOrder(mockOrders[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load tracking information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadActiveOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'confirmed': return '#3498db';
      case 'picked_up': return '#9b59b6';
      case 'in_transit': return '#e74c3c';
      case 'delivered': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'pending': return 0.2;
      case 'confirmed': return 0.4;
      case 'picked_up': return 0.6;
      case 'in_transit': return 0.8;
      case 'delivered': return 1.0;
      default: return 0;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const contactDriver = () => {
    if (selectedOrder?.driverPhone) {
      Alert.alert(
        'Contact Driver',
        `Call ${selectedOrder.driverName} at ${selectedOrder.driverPhone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => {/* Linking.openURL(`tel:${selectedOrder.driverPhone}`) */} }
        ]
      );
    } else {
      Alert.alert('Info', 'Driver contact information not available yet');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading tracking information...</Text>
      </View>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#2c3e50', '#34495e']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <Text style={styles.headerSubtitle}>Track your delivery status</Text>
        </LinearGradient>
        
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No Active Deliveries</Text>
          <Text style={styles.emptySubtext}>You don't have any orders in transit at the moment</Text>
        </View>
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
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <Text style={styles.headerSubtitle}>Track your delivery status</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Order Selector */}
        {activeOrders.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Orders</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {activeOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={[
                    styles.orderTab,
                    selectedOrder?.id === order.id && styles.selectedOrderTab
                  ]}
                  onPress={() => setSelectedOrder(order)}
                >
                  <Text style={[
                    styles.orderTabText,
                    selectedOrder?.id === order.id && styles.selectedOrderTabText
                  ]}>
                    Order #{order.id}
                  </Text>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(order.status) }
                  ]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {selectedOrder && (
          <>
            {/* Order Status Card */}
            <View style={styles.section}>
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <Text style={styles.orderNumber}>Order #{selectedOrder.id}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(selectedOrder.status) }
                  ]}>
                    <Text style={styles.statusText}>
                      {selectedOrder.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      { width: `${getStatusProgress(selectedOrder.status) * 100}%` }
                    ]} />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round(getStatusProgress(selectedOrder.status) * 100)}% Complete
                  </Text>
                </View>

                <Text style={styles.estimatedDelivery}>
                  Estimated Delivery: {formatDate(selectedOrder.estimatedDelivery)} at {formatTime(selectedOrder.estimatedDelivery)}
                </Text>
              </View>
            </View>

            {/* Driver Information */}
            {selectedOrder.driverName && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Driver Information</Text>
                <View style={styles.driverCard}>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{selectedOrder.driverName}</Text>
                    <Text style={styles.vehicleInfo}>{selectedOrder.vehicleInfo}</Text>
                    {selectedOrder.driverPhone && (
                      <Text style={styles.driverPhone}>{selectedOrder.driverPhone}</Text>
                    )}
                  </View>
                  <TouchableOpacity style={styles.contactButton} onPress={contactDriver}>
                    <Text style={styles.contactButtonText}>Contact</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Delivery Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Details</Text>
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.deliveryAddress}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Items:</Text>
                  <View style={styles.itemsList}>
                    {selectedOrder.items.map((item, index) => (
                      <Text key={index} style={styles.itemText}>
                        • {item.quantity} {item.unit} {item.name}
                      </Text>
                    ))}
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Amount:</Text>
                  <Text style={styles.totalAmount}>${selectedOrder.totalAmount.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Tracking Timeline */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tracking Timeline</Text>
              <View style={styles.timelineContainer}>
                {selectedOrder.trackingEvents.map((event, index) => (
                  <View key={index} style={styles.timelineItem}>
                    <View style={styles.timelineMarker}>
                      <View style={[
                        styles.timelineDot,
                        { backgroundColor: index === 0 ? getStatusColor(selectedOrder.status) : '#27ae60' }
                      ]} />
                      {index < selectedOrder.trackingEvents.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>
                    
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <Text style={styles.timelineStatus}>{event.status}</Text>
                        <Text style={styles.timelineTime}>
                          {formatDate(event.timestamp)} {formatTime(event.timestamp)}
                        </Text>
                      </View>
                      <Text style={styles.timelineDescription}>{event.description}</Text>
                      {event.location && (
                        <Text style={styles.timelineLocation}>📍 {event.location}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
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
  orderTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedOrderTab: {
    backgroundColor: '#3498db',
  },
  orderTabText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    marginRight: 8,
  },
  selectedOrderTabText: {
    color: '#ffffff',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  estimatedDelivery: {
    fontSize: 16,
    color: '#495057',
    textAlign: 'center',
    fontWeight: '500',
  },
  driverCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  driverPhone: {
    fontSize: 14,
    color: '#3498db',
  },
  contactButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  contactButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#2c3e50',
  },
  itemsList: {
    marginTop: 4,
  },
  itemText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  timelineContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineMarker: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e9ecef',
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  timelineTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  timelineDescription: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  timelineLocation: {
    fontSize: 12,
    color: '#3498db',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#adb5bd',
    textAlign: 'center',
  },
});

export default OrderTracking;
