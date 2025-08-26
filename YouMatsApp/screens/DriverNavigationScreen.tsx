/**
 * DriverNavigationScreen - Uber-style Navigation and Trip Management
 * Real-time navigation with turn-by-turn directions, customer communication, and trip tracking
 * Black & White Theme
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderAssignment, driverService } from '../services/DriverService';
import { driverLocationService } from '../services/DriverLocationService';

const { width, height } = Dimensions.get('window');

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
  onBack: () => void;
  onCompleteDelivery: () => void;
}

const DriverNavigationScreen: React.FC<Props> = ({
  order,
  onBack,
  onCompleteDelivery,
}) => {
  const [currentStep, setCurrentStep] = useState<'heading_to_pickup' | 'arrived_at_pickup' | 'heading_to_delivery' | 'arrived_at_delivery'>('heading_to_pickup');
  const [estimatedArrival, setEstimatedArrival] = useState('8 min');
  const [distanceRemaining, setDistanceRemaining] = useState('2.1 km');
  const [trafficDelay, setTrafficDelay] = useState(0);

  useEffect(() => {
    updateNavigationInfo();
    startLocationTracking();
  }, [currentStep]);

  // Initialize currentStep based on trip status from database
  useEffect(() => {
    const initializeStepFromTripStatus = async () => {
      try {
        console.log('🗺️ Initializing navigation for trip:', order.id.substring(0, 8));
        // Get the current active trip from database to check its real status
        const activeTrip = await driverService.getCurrentActiveTrip();
        if (activeTrip && activeTrip.id === order.id) {
          console.log('📍 Trip status from DB:', activeTrip.status, 'Pickup completed:', !!activeTrip.pickup_completed_at);
          // Map database status to UI step
          switch (activeTrip.status) {
            case 'matched':
              console.log('➡️ Setting step: heading_to_pickup (trip matched)');
              setCurrentStep('heading_to_pickup');
              break;
            case 'in_transit':
              // If pickup is already completed, go to delivery
              if (activeTrip.pickup_completed_at) {
                console.log('➡️ Setting step: heading_to_delivery (pickup completed)');
                setCurrentStep('heading_to_delivery');
              } else {
                console.log('➡️ Setting step: arrived_at_pickup (trip started, waiting for pickup)');
                // Trip started but pickup not completed yet - show pickup confirmation screen
                setCurrentStep('arrived_at_pickup');
              }
              break;
            case 'delivered':
              console.log('➡️ Setting step: arrived_at_delivery (trip completed)');
              setCurrentStep('arrived_at_delivery');
              break;
            default:
              console.log('➡️ Setting step: heading_to_pickup (default)');
              setCurrentStep('heading_to_pickup');
              break;
          }
        } else {
          console.log('⚠️ No matching active trip found, defaulting to heading_to_pickup');
          setCurrentStep('heading_to_pickup');
        }
      } catch (error) {
        console.error('❌ Error initializing trip step:', error);
        // Default to heading_to_pickup if error
        setCurrentStep('heading_to_pickup');
      }
    };

    initializeStepFromTripStatus();
  }, [order.id]); // Re-run if order changes

  const updateNavigationInfo = () => {
    // In a real app, this would integrate with Google Maps or Apple Maps
    // For now, we'll simulate the data
    switch (currentStep) {
      case 'heading_to_pickup':
        setEstimatedArrival('8 min');
        setDistanceRemaining('2.1 km');
        break;
      case 'heading_to_delivery':
        setEstimatedArrival('12 min');
        setDistanceRemaining('3.5 km');
        break;
      default:
        setEstimatedArrival('Arrived');
        setDistanceRemaining('0 km');
    }
  };

  const startLocationTracking = () => {
    driverLocationService.startDriverTracking((location) => {
      // Update location and recalculate route
      console.log('Driver location updated:', location);
    });
  };

  const handleCallCustomer = () => {
    const phoneNumber = order.customerPhone.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleTextCustomer = () => {
    const phoneNumber = order.customerPhone.replace(/[^0-9]/g, '');
    Linking.openURL(`sms:${phoneNumber}`);
  };

  const handleOpenMaps = () => {
    const destination = currentStep === 'heading_to_pickup' 
      ? order.pickupLocation 
      : order.deliveryLocation;
    
    const url = `https://maps.google.com/maps?daddr=${destination.latitude},${destination.longitude}`;
    Linking.openURL(url);
  };

  const handleArrivedAtPickup = async () => {
    setCurrentStep('arrived_at_pickup');
    
    // Send arrival notification to customer
    try {
      await driverService.sendArrivalNotification(order.id, 'pickup');
      console.log('📍 Pickup arrival notification sent to customer');
    } catch (error) {
      console.error('⚠️ Failed to send pickup arrival notification:', error);
    }
    
    // First, update database to "in_transit" status when starting the trip
    try {
      const success = await driverService.updateTripStatus(order.id, 'start_trip');
      if (!success) {
        Alert.alert('Error', 'Failed to update trip status. Please try again.');
        setCurrentStep('heading_to_pickup'); // Revert on error
        return;
      }
    } catch (error) {
      console.error('Error updating trip status to in_transit:', error);
      Alert.alert('Error', 'Failed to update trip status. Please try again.');
      setCurrentStep('heading_to_pickup'); // Revert on error
      return;
    }

    Alert.alert(
      'Pickup Confirmation',
      'Have you picked up the materials?',
      [
        { text: 'Not Yet', style: 'cancel' },
        { 
          text: 'Picked Up', 
          onPress: async () => {
            try {
              // Update database to mark pickup as completed
              const success = await driverService.updateTripStatus(order.id, 'picked_up');
              if (success) {
                setCurrentStep('heading_to_delivery');
                updateNavigationInfo();
              } else {
                Alert.alert('Error', 'Failed to update pickup status. Please try again.');
              }
            } catch (error) {
              console.error('Error updating pickup status:', error);
              Alert.alert('Error', 'Failed to update pickup status. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleArrivedAtDelivery = () => {
    setCurrentStep('arrived_at_delivery');
    
    // Send arrival notification to customer
    driverService.sendArrivalNotification(order.id, 'delivery')
      .then(() => console.log('📍 Delivery arrival notification sent to customer'))
      .catch(error => console.error('⚠️ Failed to send delivery arrival notification:', error));
    
    Alert.alert(
      'Delivery Confirmation',
      'Have you completed the delivery?',
      [
        { text: 'Not Yet', style: 'cancel' },
        { 
          text: 'Delivered', 
          onPress: async () => {
            try {
              // Update trip status to delivered in the database
              await driverService.updateTripStatus(order.id, 'delivered');
              onCompleteDelivery();
            } catch (error) {
              console.error('Error completing delivery:', error);
              Alert.alert('Error', 'Failed to complete delivery. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getCurrentDestination = () => {
    switch (currentStep) {
      case 'heading_to_pickup':
      case 'arrived_at_pickup':
        return {
          title: 'Pickup Location',
          address: order.pickupLocation.address,
          action: handleArrivedAtPickup,
          actionText: 'Arrived at Pickup'
        };
      case 'heading_to_delivery':
      case 'arrived_at_delivery':
        return {
          title: 'Delivery Location',
          address: order.deliveryLocation.address,
          action: handleArrivedAtDelivery,
          actionText: 'Delivered'
        };
    }
  };

  const destination = getCurrentDestination();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <TouchableOpacity style={styles.menuButton} onPress={handleOpenMaps}>
          <Ionicons name="map" size={24} color={theme.white} />
        </TouchableOpacity>
      </View>

      {/* Navigation Info */}
      <View style={styles.navigationInfo}>
        <View style={styles.destinationCard}>
          <Text style={styles.destinationTitle}>{destination.title}</Text>
          <Text style={styles.destinationAddress}>{destination.address}</Text>
          
          <View style={styles.estimatesRow}>
            <View style={styles.estimateItem}>
              <Text style={styles.estimateValue}>{estimatedArrival}</Text>
              <Text style={styles.estimateLabel}>ETA</Text>
            </View>
            <View style={styles.estimateItem}>
              <Text style={styles.estimateValue}>{distanceRemaining}</Text>
              <Text style={styles.estimateLabel}>Distance</Text>
            </View>
            {trafficDelay > 0 && (
              <View style={styles.estimateItem}>
                <Text style={[styles.estimateValue, { color: theme.warning }]}>+{trafficDelay} min</Text>
                <Text style={styles.estimateLabel}>Traffic</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Customer Info & Actions */}
      <View style={styles.customerSection}>
        <View style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <Ionicons name="person-circle" size={32} color={theme.primary} />
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{order.customerName}</Text>
              <Text style={styles.customerPhone}>{order.customerPhone}</Text>
            </View>
          </View>
          
          <View style={styles.communicationButtons}>
            <TouchableOpacity style={styles.commButton} onPress={handleCallCustomer}>
              <Ionicons name="call" size={20} color={theme.success} />
              <Text style={styles.commButtonText}>Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.commButton} onPress={handleTextCustomer}>
              <Ionicons name="chatbubble" size={20} color={theme.primary} />
              <Text style={styles.commButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Materials Info */}
      <View style={styles.materialsSection}>
        <Text style={styles.sectionTitle}>Materials to Deliver</Text>
        <ScrollView style={styles.materialsList}>
          {order.materials.map((material, index) => (
            <View key={index} style={styles.materialItem}>
              <Text style={styles.materialType}>{material.type}</Text>
              <Text style={styles.materialDescription}>{material.description}</Text>
              <View style={styles.materialDetails}>
                <Text style={styles.materialQuantity}>Qty: {material.quantity}</Text>
                {material.weight && (
                  <Text style={styles.materialWeight}>Weight: {material.weight}kg</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Special Instructions */}
      {order.specialInstructions && (
        <View style={styles.instructionsSection}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <Text style={styles.instructionsText}>{order.specialInstructions}</Text>
        </View>
      )}

      {/* Action Button */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={destination.action}
        >
          <Text style={styles.actionButtonText}>{destination.actionText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.white,
  },
  menuButton: {
    padding: 8,
  },
  navigationInfo: {
    backgroundColor: theme.white,
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  destinationCard: {
    padding: 16,
  },
  destinationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 4,
  },
  destinationAddress: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 16,
  },
  estimatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  estimateItem: {
    alignItems: 'center',
  },
  estimateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 4,
  },
  estimateLabel: {
    fontSize: 12,
    color: theme.lightText,
  },
  customerSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  customerCard: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: theme.lightText,
  },
  communicationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  commButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  commButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: theme.primary,
  },
  materialsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 12,
  },
  materialsList: {
    backgroundColor: theme.white,
    borderRadius: 12,
    maxHeight: 120,
  },
  materialItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  materialType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 4,
  },
  materialDescription: {
    fontSize: 13,
    color: theme.lightText,
    marginBottom: 6,
  },
  materialDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  materialQuantity: {
    fontSize: 12,
    color: theme.accent,
  },
  materialWeight: {
    fontSize: 12,
    color: theme.accent,
  },
  instructionsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  instructionsText: {
    fontSize: 14,
    color: theme.warning,
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.warning,
  },
  actionSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    backgroundColor: theme.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: theme.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.white,
  },
});

export default DriverNavigationScreen;
