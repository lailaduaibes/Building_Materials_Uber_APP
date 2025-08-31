/**
 * Route Optimization Screen - AI Multi-Stop Route Planning
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
  const [routeStats, setRouteStats] = useState(aiRouteOptimizationService.getOptimizationStats());

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

  const renderOrderSelectionCard = (order: OrderAssignment) => {
    const isSelected = selectedOrders.find(o => o.id === order.id);
    const isPriority = order.pickupTimePreference === 'asap';

    return (
      <TouchableOpacity
        key={order.id}
        style={[
          styles.orderCard,
          isSelected && styles.selectedOrderCard,
          isPriority && styles.priorityOrderCard
        ]}
        onPress={() => toggleOrderSelection(order)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderTitle, isSelected && styles.selectedText]}>
              Order #{order.id.slice(-4)}
            </Text>
            {isPriority && (
              <View style={styles.priorityBadge}>
                <Ionicons name="flash" size={12} color="white" />
                <Text style={styles.priorityText}>ASAP</Text>
              </View>
            )}
          </View>
          <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
        </View>
        
        <View style={styles.orderDetails}>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={Colors.text.secondary} />
            <Text style={styles.addressText} numberOfLines={1}>
              {order.pickupLocation?.address || order.pickup_address || 'Pickup location'}
            </Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="navigate-outline" size={14} color={Colors.text.secondary} />
            <Text style={styles.addressText} numberOfLines={1}>
              {order.deliveryLocation?.address || order.delivery_address || 'Delivery location'}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.priceText}>₪{order.estimatedEarnings || order.estimated_fare || 0}</Text>
          <Text style={styles.materialsText}>
            {order.materials?.map(m => m.type || m.description).join(', ') || order.material_type || 'Building materials'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOptimizedRouteCard = () => {
    if (!optimizedRoute) return null;

    return (
      <View style={styles.routeCard}>
        <View style={styles.routeHeader}>
          <View style={styles.routeTitle}>
            <Ionicons name="map" size={24} color={Colors.primary} />
            <Text style={styles.routeTitleText}>Optimized Route</Text>
          </View>
          <View style={[
            styles.statusBadge, 
            optimizedRoute.status === 'pending' && styles.pendingBadge,
            optimizedRoute.status === 'accepted' && styles.acceptedBadge,
            optimizedRoute.status === 'in_progress' && styles.in_progressBadge,
          ]}>
            <Text style={styles.statusText}>{optimizedRoute.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.metricValue}>{optimizedRoute.stops.length}</Text>
            <Text style={styles.metricLabel}>Stops</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="speedometer" size={20} color={Colors.primary} />
            <Text style={styles.metricValue}>{optimizedRoute.totalDistance}km</Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="time" size={20} color={Colors.primary} />
            <Text style={styles.metricValue}>
              {Math.floor(optimizedRoute.totalDuration/60)}h {optimizedRoute.totalDuration%60}m
            </Text>
            <Text style={styles.metricLabel}>Duration</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="leaf" size={20} color={Colors.success} />
            <Text style={[styles.metricValue, {color: Colors.success}]}>
              {optimizedRoute.fuelSavings}%
            </Text>
            <Text style={styles.metricLabel}>Savings</Text>
          </View>
        </View>

        <View style={styles.routeActions}>
          {optimizedRoute.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.routeButton, styles.acceptButton]}
                onPress={acceptOptimizedRoute}
              >
                <Ionicons name="checkmark-circle" size={18} color="white" />
                <Text style={styles.acceptButtonText}>Accept Route</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.routeButton, styles.clearButton]}
                onPress={clearRoute}
              >
                <Ionicons name="trash" size={18} color={Colors.error} />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </>
          )}
          {optimizedRoute.status === 'accepted' && (
            <TouchableOpacity
              style={[styles.routeButton, styles.startButton]}
              onPress={startNavigation}
            >
              <Ionicons name="navigate" size={18} color="white" />
              <Text style={styles.startButtonText}>Start Navigation</Text>
            </TouchableOpacity>
          )}
          {optimizedRoute.status === 'in_progress' && (
            <View style={styles.inProgressIndicator}>
              <Ionicons name="car" size={18} color={Colors.primary} />
              <Text style={styles.inProgressText}>Route in progress...</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <View style={styles.statsHeader}>
        <Ionicons name="analytics" size={20} color={Colors.primary} />
        <Text style={styles.statsTitle}>Optimization Stats</Text>
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{routeStats.totalRoutesOptimized}</Text>
          <Text style={styles.statLabel}>Routes Optimized</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{routeStats.averageFuelSavings}%</Text>
          <Text style={styles.statLabel}>Avg Fuel Savings</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{routeStats.averageTimeSavings}min</Text>
          <Text style={styles.statLabel}>Avg Time Saved</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{routeStats.averageOptimizationScore}/100</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Route Optimization</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Card */}
        {renderStatsCard()}

        {/* Optimized Route Card */}
        {renderOptimizedRouteCard()}

        {/* Order Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Select Orders for Optimization ({selectedOrders.length} selected)
          </Text>
          {availableOrders.length > 0 ? (
            availableOrders.map(renderOrderSelectionCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={Colors.text.secondary} />
              <Text style={styles.emptyStateText}>No available orders</Text>
              <Text style={styles.emptyStateSubText}>
                New orders will appear here when they're assigned to you
              </Text>
            </View>
          )}
        </View>

        {/* Optimization Button */}
        {selectedOrders.length > 0 && !optimizedRoute && (
          <TouchableOpacity
            style={[styles.optimizeButton, isOptimizing && styles.disabledButton]}
            onPress={optimizeRoute}
            disabled={isOptimizing}
          >
            {isOptimizing ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.optimizeButtonText}>Optimizing Route...</Text>
              </>
            ) : (
              <>
                <Ionicons name="flash" size={20} color="white" />
                <Text style={styles.optimizeButtonText}>
                  Optimize Route ({selectedOrders.length} orders)
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
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
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsCard: {
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
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: Colors.warning + '20',
  },
  acceptedBadge: {
    backgroundColor: Colors.success + '20',
  },
  in_progressBadge: {
    backgroundColor: Colors.primary + '20',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  routeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  routeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  clearButtonText: {
    color: Colors.error,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: Colors.primary,
  },
  startButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  inProgressIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    gap: 6,
  },
  inProgressText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
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
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  priorityOrderCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  selectedText: {
    color: Colors.primary,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  orderDetails: {
    marginBottom: 12,
    gap: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  materialsText: {
    fontSize: 12,
    color: Colors.text.secondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  optimizeButton: {
    backgroundColor: Colors.primary,
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
  optimizeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 12,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default RouteOptimizationScreen;
