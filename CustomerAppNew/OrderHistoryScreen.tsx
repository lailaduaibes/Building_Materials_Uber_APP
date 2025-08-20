/**
 * OrderHistoryScreen - Modern Trip History Interface
 * View past trips with Uber-style black/white design
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import TripService, { TripOrder } from './services/TripService';

interface OrderHistoryScreenProps {
  onBack: () => void;
  onOrderSelect: (orderId: string) => void;
}

export const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({
  onBack,
  onOrderSelect,
}) => {
  const [orders, setOrders] = useState<TripOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const tripHistory = await TripService.getTripHistory();
      setOrders(tripHistory);
    } catch (error) {
      Alert.alert('Error', 'Failed to load trip history');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#f39c12';
      case 'confirmed':
        return '#3498db';
      case 'assigned':
        return '#9b59b6';
      case 'picked_up':
        return '#e67e22';
      case 'in_transit':
        return '#2980b9';
      case 'delivered':
        return '#27ae60';
      case 'cancelled':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'assigned':
        return 'Assigned';
      case 'picked_up':
        return 'Picked Up';
      case 'in_transit':
        return 'In Transit';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrderItem = ({ item }: { item: TripOrder }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => onOrderSelect(item.id)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderNumberContainer}>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(item.orderDate)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.itemCount}>
          {item.items.length} item{item.items.length > 1 ? 's' : ''}
        </Text>
        <Text style={styles.orderAmount}>${item.finalAmount.toFixed(2)}</Text>
      </View>

      <View style={styles.orderSummary}>
        <Text style={styles.summaryText} numberOfLines={2}>
          {item.items.map((orderItem: any) => orderItem.materialName).join(', ')}
        </Text>
      </View>

      <View style={styles.deliveryInfo}>
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.deliveryText}>
            {item.deliveryAddress.city}, {item.deliveryAddress.state}
          </Text>
        </View>
        {item.estimatedDelivery && (
          <View style={styles.timeRow}>
            <MaterialIcons name="access-time" size={16} color="#666" />
            <Text style={styles.estimatedDelivery}>
              Est. delivery: {formatDate(item.estimatedDelivery)}
            </Text>
          </View>
        )}
      </View>

      {item.driverName && (
        <View style={styles.driverInfo}>
          <MaterialIcons name="local-shipping" size={16} color="#666" />
          <Text style={styles.driverText}>Driver: {item.driverName}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading your trips...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyText}>
              When you book your first delivery, it will appear here.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Your Trips</Text>
              <Text style={styles.summarySubtitle}>
                {orders.length} trip{orders.length > 1 ? 's' : ''} total
              </Text>
            </View>

            <FlatList
              data={orders}
              keyExtractor={(item) => item.id}
              renderItem={renderOrderItem}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#000']}
                  tintColor="#000"
                />
              }
              contentContainerStyle={styles.listContainer}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  summaryContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumberContainer: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  orderSummary: {
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  deliveryInfo: {
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deliveryText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estimatedDelivery: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  driverText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default OrderHistoryScreen;
