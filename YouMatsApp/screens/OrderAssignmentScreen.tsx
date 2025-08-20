/**
 * OrderAssignmentScreen - Uber-style Order Assignment Interface
 * Enhanced with distance calculation, route preview, and smart analytics
 * Shows incoming order assignments with accept/decline functionality
 * Black & White Theme
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderAssignment, driverService } from '../services/DriverService';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

// Black & White Theme (matching customer app)
const theme = {
  primary: '#000000',
  secondary: '#333333',
  accent: '#666666',
  background: '#FFFFFF',
  white: '#FFFFFF',
  text: '#000000',
  lightText: '#666666',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  border: '#E0E0E0',
};

interface Props {
  order: OrderAssignment;
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

const OrderAssignmentScreen: React.FC<Props> = ({
  order,
  visible,
  onAccept,
  onDecline,
  onClose,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(30); // 30 seconds to accept
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [estimatedPickupTime, setEstimatedPickupTime] = useState('5-8 min');
  const [routeDistance, setRouteDistance] = useState('0.8 mi');
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);

  useEffect(() => {
    if (visible) {
      // Calculate route details
      calculateRouteDetails();
      
      // Start animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Start countdown timer
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoDecline();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [visible]);

  const calculateRouteDetails = () => {
    // Calculate estimated pickup time and route distance
    // In a real app, this would use Google Maps API or similar
    const distance = order.distanceKm || 2.5;
    setRouteDistance(`${distance.toFixed(1)} km`);
    
    const estimatedTime = Math.round(distance * 2 + 3); // rough calculation
    setEstimatedPickupTime(`${estimatedTime} min`);
    
    // Simple surge calculation
    const currentHour = new Date().getHours();
    const isPeakHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
    setSurgeMultiplier(isPeakHour ? 1.5 : 1.0);
  };

  const handleAutoDecline = () => {
    Alert.alert(
      'Order Expired',
      'You did not respond in time. The order has been reassigned.',
      [{ text: 'OK', onPress: onClose }]
    );
  };

  const handleAccept = async () => {
    try {
      const success = await driverService.acceptOrder(order.id);
      if (success) {
        onAccept();
      } else {
        Alert.alert('Error', 'Failed to accept order. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleDecline = async () => {
    try {
      const success = await driverService.declineOrder(order.id, 'Driver declined');
      if (success) {
        onDecline();
      } else {
        Alert.alert('Error', 'Failed to decline order. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header with Timer */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🚚 New Delivery Request</Text>
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{timeRemaining}s</Text>
            </View>
            {surgeMultiplier > 1.0 && (
              <View style={styles.surgeIndicator}>
                <Text style={styles.surgeText}>⚡ {surgeMultiplier}x</Text>
              </View>
            )}
          </View>

          {/* Quick Stats Row */}
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{estimatedPickupTime}</Text>
              <Text style={styles.statLabel}>Pickup</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{routeDistance}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${(order.estimatedEarnings * surgeMultiplier).toFixed(2)}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
          </View>

          {/* Order Details */}
          <View style={styles.content}>
            {/* Customer Info */}
            <View style={styles.customerSection}>
              <View style={styles.customerRow}>
                <Ionicons name="person-circle" size={24} color={theme.primary} />
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{order.customerName}</Text>
                  <Text style={styles.customerPhone}>{order.customerPhone}</Text>
                </View>
              </View>
            </View>

            {/* Route Info */}
            <View style={styles.routeSection}>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={20} color={theme.success} />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Pickup</Text>
                  <Text style={styles.locationAddress}>
                    {order.pickupLocation.address}
                  </Text>
                </View>
              </View>
              
              <View style={styles.routeLine} />
              
              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>🏠</Text>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Delivery</Text>
                  <Text style={styles.locationAddress}>
                    {order.deliveryLocation.address}
                  </Text>
                </View>
              </View>
            </View>

            {/* Trip Details */}
            <View style={styles.tripDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>💰</Text>
                <Text style={styles.detailText}>Earnings: ${order.estimatedEarnings}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🛣️</Text>
                <Text style={styles.detailText}>Distance: {formatDistance(order.distanceKm)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>⏱️</Text>
                <Text style={styles.detailText}>Duration: {formatDuration(order.estimatedDuration)}</Text>
              </View>
            </View>

            {/* Materials */}
            <View style={styles.materialsSection}>
              <Text style={styles.materialsTitle}>📦 Materials</Text>
              {order.materials.slice(0, 2).map((material, index) => (
                <Text key={index} style={styles.materialItem}>
                  • {material.quantity} {material.description}
                </Text>
              ))}
              {order.materials.length > 2 && (
                <Text style={styles.materialMore}>
                  +{order.materials.length - 2} more items
                </Text>
              )}
            </View>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <View style={styles.instructionsSection}>
                <Text style={styles.instructionsTitle}>📝 Special Instructions</Text>
                <Text style={styles.instructionsText}>{order.specialInstructions}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
              <View style={styles.acceptButtonGradient}>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: theme.background,
    borderRadius: 20,
    width: width - 40,
    maxHeight: height - 100,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  header: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: theme.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerContainer: {
    backgroundColor: theme.secondary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timerText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  customerSection: {
    marginBottom: 20,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 5,
  },
  customerPhone: {
    fontSize: 16,
    color: theme.lightText,
  },
  routeSection: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 15,
    marginTop: 2,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: theme.lightText,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  locationAddress: {
    fontSize: 16,
    color: theme.text,
    marginTop: 2,
    lineHeight: 20,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: theme.border,
    marginLeft: 9,
    marginBottom: 10,
  },
  tripDetails: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
  },
  detailText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
  },
  materialsSection: {
    marginBottom: 20,
  },
  materialsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 10,
  },
  materialItem: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 5,
    paddingLeft: 10,
  },
  materialMore: {
    fontSize: 14,
    color: theme.lightText,
    fontStyle: 'italic',
    paddingLeft: 10,
  },
  instructionsSection: {
    backgroundColor: theme.warning + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.warning,
    marginBottom: 5,
  },
  instructionsText: {
    fontSize: 14,
    color: theme.warning,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
  },
  declineButton: {
    flex: 1,
    backgroundColor: theme.background,
    borderRadius: 12,
    paddingVertical: 15,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.lightText,
  },
  acceptButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 10,
  },
  acceptButtonGradient: {
    backgroundColor: theme.success,
    paddingVertical: 15,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.white,
  },
  // New Uber-style elements
  surgeIndicator: {
    position: 'absolute',
    top: 10,
    right: 60,
    backgroundColor: theme.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  surgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.white,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: theme.lightText,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerInfo: {
    marginLeft: 10,
    flex: 1,
  },
});

export default OrderAssignmentScreen;
