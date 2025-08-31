/**
 * Route Optimization Screen - AI Multi-Stop Route Planning (Fixed)
 * Professional route optimization interface for YouMats drivers
 * Integrates with existing app theme and navigation
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, theme } from '../theme/colors';
import { 
  aiRouteOptimizationService, 
  OptimizedRoute, 
  DeliveryStop 
} from '../services/AIRouteOptimizationService';
import { OrderAssignment, driverService } from '../services/DriverService';

const { width, height } = Dimensions.get('window');

interface Props {
  onBack: () => void;
  onNavigateToOrder: (order: OrderAssignment) => void;
  availableOrders: OrderAssignment[];
  driverId: string;
}

const RouteOptimizationScreen: React.FC<Props> = ({
  onBack,
  onNavigateToOrder,
  availableOrders,
  driverId,
}) => {
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<OrderAssignment[]>([]);

  useEffect(() => {
    // Load any existing optimized route
    const activeRoute = aiRouteOptimizationService.getActiveRoute();
    if (activeRoute) {
      setOptimizedRoute(activeRoute);
    }
  }, []);

  const toggleOrderSelection = (order: OrderAssignment) => {
    setSelectedOrders(prev => {
      const isSelected = prev.find(o => o.id === order.id);
      if (isSelected) {
        return prev.filter(o => o.id !== order.id);
      } else {
        return [...prev, order];
      }
    });
  };

  const optimizeRoute = async () => {
    if (selectedOrders.length < 2) {
      Alert.alert('Minimum Orders Required', 'Please select at least 2 orders for route optimization.');
      return;
    }

    setIsOptimizing(true);
    try {
      const optimized = await aiRouteOptimizationService.optimizeMultiStopRoute(
        selectedOrders,
        driverId
      );
      setOptimizedRoute(optimized);
      
      Alert.alert(
        '🤖 Route Optimized!',
        `Optimized ${optimized.stops.length} stops\n` +
        `Distance: ${optimized.totalDistance}km\n` +
        `Est. Duration: ${Math.floor(optimized.totalDuration/60)}h ${optimized.totalDuration%60}m\n` +
        `Fuel Savings: ${optimized.fuelSavings}%\n` +
        `Time Savings: ${optimized.timeSavings} minutes`,
        [{ text: 'Great!', style: 'default' }]
      );
    } catch (error) {
      Alert.alert('Optimization Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsOptimizing(false);
    }
  };

  const acceptOptimizedRoute = async () => {
    if (!optimizedRoute) return;

    const success = await aiRouteOptimizationService.acceptRoute(optimizedRoute.id);
    if (success) {
      Alert.alert(
        'Route Accepted!',
        'Your optimized route is ready. Start navigation to begin your delivery sequence.',
        [
          { text: 'Start Later', style: 'cancel' },
          { 
            text: 'Start Navigation', 
            style: 'default',
            onPress: startNavigation
          }
        ]
      );
    }
  };

  const startNavigation = async () => {
    if (!optimizedRoute) return;

    const success = await aiRouteOptimizationService.startRoute();
    if (success) {
      const nextStop = aiRouteOptimizationService.getNextStop();
      if (nextStop) {
        // Find the corresponding order for the next stop
        const order = selectedOrders.find(o => o.id === nextStop.orderId);
        if (order) {
          onNavigateToOrder(order);
        }
      }
    }
  };

  const clearRoute = async () => {
    Alert.alert(
      'Clear Route?',
      'This will remove your current optimized route. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await aiRouteOptimizationService.clearRoute();
            setOptimizedRoute(null);
            setSelectedOrders([]);
          }
        }
      ]
    );
  };

  const renderOrderCard = (order: OrderAssignment) => {
    const isSelected = selectedOrders.find(o => o.id === order.id);
    const isPriority = order.pickupTimePreference === 'asap';

    return (
      <TouchableOpacity
        key={order.id}
        style={[
          styles.orderCard,
          isSelected && styles.selectedOrderCard,
        ]}
        onPress={() => toggleOrderSelection(order)}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderTitle}>Order #{order.id.slice(-4)}</Text>
          {isPriority && (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>ASAP</Text>
            </View>
          )}
          <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
        </View>
        
        <View style={styles.orderDetails}>
          <Text style={styles.addressText} numberOfLines={1}>
            📍 {order.pickupLocation?.address || order.pickup_address || 'Pickup location'}
          </Text>
          <Text style={styles.addressText} numberOfLines={1}>
            🏠 {order.deliveryLocation?.address || order.delivery_address || 'Delivery location'}
          </Text>
          <Text style={styles.priceText}>₪{order.estimatedEarnings || order.estimated_fare || 0}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Route Optimization</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Optimized Route Display */}
        {optimizedRoute && (
          <View style={styles.routeCard}>
            <Text style={styles.routeTitle}>Optimized Route Ready!</Text>
            <View style={styles.routeStats}>
              <Text style={styles.statText}>🎯 {optimizedRoute.stops.length} stops</Text>
              <Text style={styles.statText}>📏 {optimizedRoute.totalDistance}km</Text>
              <Text style={styles.statText}>⏱️ {Math.floor(optimizedRoute.totalDuration/60)}h {optimizedRoute.totalDuration%60}m</Text>
              <Text style={styles.statText}>💰 {optimizedRoute.fuelSavings}% savings</Text>
            </View>
            
            <View style={styles.routeActions}>
              {optimizedRoute.status === 'pending' && (
                <>
                  <TouchableOpacity style={styles.acceptButton} onPress={acceptOptimizedRoute}>
                    <Text style={styles.buttonText}>Accept Route</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.clearButton} onPress={clearRoute}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                </>
              )}
              {optimizedRoute.status === 'accepted' && (
                <TouchableOpacity style={styles.startButton} onPress={startNavigation}>
                  <Text style={styles.buttonText}>Start Navigation</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Order Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Select Orders ({selectedOrders.length} selected)
          </Text>
          {availableOrders.length > 0 ? (
            availableOrders.map(renderOrderCard)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No available orders</Text>
            </View>
          )}
        </View>

        {/* Optimize Button */}
        {selectedOrders.length > 1 && !optimizedRoute && (
          <TouchableOpacity
            style={[styles.optimizeButton, isOptimizing && styles.disabledButton]}
            onPress={optimizeRoute}
            disabled={isOptimizing}
          >
            {isOptimizing ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.buttonText}>Optimizing...</Text>
              </>
            ) : (
              <Text style={styles.buttonText}>
                🤖 Optimize Route ({selectedOrders.length} orders)
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A8A',
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  routeStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  routeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#1D4ED8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  clearButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  startButton: {
    flex: 1,
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOrderCard: {
    borderColor: '#1E3A8A',
    backgroundColor: '#F0F4FF',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  priorityBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  orderDetails: {
    gap: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#64748B',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D4ED8',
    marginTop: 8,
  },
  optimizeButton: {
    backgroundColor: '#1E3A8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 20,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
  },
});

export default RouteOptimizationScreen;
