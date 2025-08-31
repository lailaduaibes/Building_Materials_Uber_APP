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
import { Theme } from './theme';

interface OrderHistoryScreenProps {
  onBack: () => void;
  onOrderSelect: (orderId: string) => void;
  orderTypeFilter?: string;
  onNavigateToRating?: (ratingData: any) => void;
}

export const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({
  onBack,
  onOrderSelect,
  orderTypeFilter,
  onNavigateToRating,
}) => {
  const [orders, setOrders] = useState<TripOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    initializeScreen();
  }, [orderTypeFilter]);

  const initializeScreen = async () => {
    await getCurrentUser();
    await loadOrders();
  };

  const getCurrentUser = async () => {
    try {
      const user = await TripService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const tripHistory = await TripService.getTripHistory(orderTypeFilter);
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
    setRefreshTrigger(prev => prev + 1); // Trigger pending ratings refresh
    setRefreshing(false);
  };

  const handleRateTrip = (ratingData: any) => {
    if (onNavigateToRating) {
      onNavigateToRating(ratingData);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#f39c12';
      case 'confirmed':
        return '#3498db';
      case 'assigned':
        return '#9b59b6';
      case 'matched':
        return '#8e44ad';
      case 'picked_up':
        return '#e67e22';
      case 'in_transit':
        return '#2980b9';
      case 'delivered':
        return '#27ae60';
      case 'cancelled':
        return '#e74c3c';
      case 'expired':
        return '#95a5a6';
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
      case 'matched':
        return 'Driver Matched';
      case 'picked_up':
        return 'Picked Up';
      case 'in_transit':
        return 'In Transit';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
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
        {/* Show primary location - delivery for most orders */}
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={16} color={Theme.colors.text.secondary} />
          <Text style={styles.deliveryText}>
            {item.deliveryAddress.city !== 'Unknown' 
              ? `${item.deliveryAddress.city}, ${item.deliveryAddress.state}`
              : item.deliveryAddress.street
            }
          </Text>
        </View>
        
        {/* Show pickup location if different and available */}
        {item.pickupAddress && 
         item.pickupAddress.city !== 'Unknown' && 
         item.pickupAddress.city !== item.deliveryAddress.city && (
          <View style={styles.locationRow}>
            <MaterialIcons name="my-location" size={16} color={Theme.colors.text.secondary} />
            <Text style={styles.deliveryText}>
              From: {item.pickupAddress.city}, {item.pickupAddress.state}
            </Text>
          </View>
        )}
        
        {item.estimatedDelivery && (
          <View style={styles.timeRow}>
            <MaterialIcons name="access-time" size={16} color={Theme.colors.text.secondary} />
            <Text style={styles.estimatedDelivery}>
              Est. delivery: {formatDate(item.estimatedDelivery)}
            </Text>
          </View>
        )}
      </View>

      {item.driverName && (
        <View style={styles.driverInfo}>
          <MaterialIcons name="local-shipping" size={16} color={Theme.colors.text.secondary} />
          <Text style={styles.driverText}>Driver: {item.driverName}</Text>
        </View>
      )}

      {/* Rating Button for Delivered Trips */}
      {item.status === 'delivered' && !item.customer_rating && item.assigned_driver_id && (
        <TouchableOpacity
          style={styles.rateButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent triggering the card press
            handleRateTrip({
              tripId: item.id,
              driverName: item.driverName || 'Driver',
              pickupLocation: item.pickupAddress?.city || 'Pickup Location',
              deliveryLocation: item.deliveryAddress?.city || 'Delivery Location',
              completedAt: item.orderDate
            });
          }}
        >
          <MaterialIcons name="star-outline" size={16} color="#fff" />
          <Text style={styles.rateButtonText}>Rate Driver</Text>
        </TouchableOpacity>
      )}

      {/* Show Rating if Already Rated */}
      {item.status === 'delivered' && item.customer_rating && (
        <View style={styles.ratedContainer}>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <MaterialIcons
                key={star}
                name="star"
                size={14}
                color={star <= (item.customer_rating || 0) ? '#FFD700' : '#E0E0E0'}
              />
            ))}
          </View>
          <Text style={styles.ratedText}>You rated this trip</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color={Theme.colors.text.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {orderTypeFilter === 'active' 
            ? 'Active Orders' 
            : orderTypeFilter 
              ? `${orderTypeFilter.charAt(0).toUpperCase() + orderTypeFilter.slice(1)} Orders` 
              : 'Order History'
          }
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.text.white} />
            <Text style={styles.loadingText}>Loading your trips...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={80} color={Theme.colors.text.light} />
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
                  colors={[Theme.colors.primary]}
                  tintColor={Theme.colors.text.white}
                />
              }
              contentContainerStyle={styles.listContainer}
            />
          </>
        )}
      </View>

      {/* Floating Action Button for filtered views */}
      {orderTypeFilter && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => onBack()} // Navigate back to create new order
        >
          <MaterialIcons name="add" size={24} color="white" />
        </TouchableOpacity>
      )}
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
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: Theme.colors.primary,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.primary,
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
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Theme.colors.primary,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.primary,
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    color: Theme.colors.text.primary,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary,
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
    color: Theme.colors.text.secondary,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  orderSummary: {
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
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
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  ratedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  ratingStars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratedText: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    fontWeight: '500',
  },
});

export default OrderHistoryScreen;
