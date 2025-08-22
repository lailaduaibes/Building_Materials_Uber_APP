/**
 * DeliveryOrderScreen - Standard Building Materials Delivery
 * Full-featured delivery order with material selection, scheduling, and pricing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import TripService, { TruckType, TripRequest } from '../services/TripService';
import { authService } from '../AuthServiceSupabase';

const { width, height } = Dimensions.get('window');

const theme = {
  primary: '#1E3A8A',
  secondary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  lightText: '#9CA3AF',
  text: '#111827',
  background: '#F9FAFB',
  white: '#FFFFFF',
};

const MATERIAL_TYPES = [
  { value: 'cement', label: 'Cement & Mortar', icon: '🏗️' },
  { value: 'steel', label: 'Steel & Rebar', icon: '🔩' },
  { value: 'bricks', label: 'Bricks & Blocks', icon: '🧱' },
  { value: 'sand', label: 'Sand & Aggregates', icon: '🏖️' },
  { value: 'lumber', label: 'Lumber & Wood', icon: '🪵' },
  { value: 'pipes', label: 'Pipes & Fittings', icon: '🚰' },
  { value: 'tiles', label: 'Tiles & Flooring', icon: '🔲' },
  { value: 'other', label: 'Other Materials', icon: '📦' },
];

const TIME_SLOTS = [
  { value: 'asap', label: 'ASAP (Next 2 hours)', price: 15 },
  { value: 'morning', label: 'Morning (8AM - 12PM)', price: 0 },
  { value: 'afternoon', label: 'Afternoon (12PM - 5PM)', price: 0 },
  { value: 'evening', label: 'Evening (5PM - 8PM)', price: 5 },
  { value: 'scheduled', label: 'Schedule for later', price: 0 },
];

interface DeliveryOrderScreenProps {
  onBack: () => void;
  onOrderCreated: (tripId: string) => void;
}

const DeliveryOrderScreen: React.FC<DeliveryOrderScreenProps> = ({
  onBack,
  onOrderCreated,
}) => {
  // Location states
  const [pickupLocation, setPickupLocation] = useState<{latitude: number; longitude: number; address: string} | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<{latitude: number; longitude: number; address: string} | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [locationStep, setLocationStep] = useState<'pickup' | 'delivery' | 'complete'>('pickup');

  // Order details states
  const [materialType, setMaterialType] = useState<string>('');
  const [loadDescription, setLoadDescription] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Truck selection states
  const [availableTrucks, setAvailableTrucks] = useState<TruckType[]>([]);
  const [selectedTruckType, setSelectedTruckType] = useState<string>('');
  const [selectedTruck, setSelectedTruck] = useState<TruckType | null>(null);

  // UI states
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTruckTypePicker, setShowTruckTypePicker] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    loadAvailableTrucks();
  }, []);

  useEffect(() => {
    if (pickupLocation && deliveryLocation && estimatedWeight && selectedTruckType) {
      calculatePrice();
    }
  }, [pickupLocation, deliveryLocation, estimatedWeight, selectedTruckType, selectedTimeSlot]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const loadAvailableTrucks = async () => {
    try {
      const trucks = await TripService.getTruckTypes();
      setAvailableTrucks(trucks);
    } catch (error) {
      console.error('Error loading truck types:', error);
    }
  };

  const calculatePrice = async () => {
    if (!pickupLocation || !deliveryLocation || !estimatedWeight || !selectedTruckType) return;

    try {
      const price = await TripService.calculateTripPrice(
        pickupLocation.latitude,
        pickupLocation.longitude,
        deliveryLocation.latitude,
        deliveryLocation.longitude,
        selectedTruckType,
        parseFloat(estimatedWeight)
      );

      const timeSlot = TIME_SLOTS.find(slot => slot.value === selectedTimeSlot);
      const timeCharge = timeSlot?.price || 0;
      
      setEstimatedPrice(price + timeCharge);
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    if (locationStep === 'pickup') {
      setPickupLocation({
        latitude,
        longitude,
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      });
      setLocationStep('delivery');
    } else if (locationStep === 'delivery') {
      setDeliveryLocation({
        latitude,
        longitude,
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      });
      setLocationStep('complete');
    }
  };

  const handleCreateOrder = async () => {
    if (!pickupLocation || !deliveryLocation || !materialType || !loadDescription.trim() || 
        !selectedTruckType || !selectedTimeSlot) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const orderData: TripRequest = {
        customer_id: user.id,
        pickup_latitude: pickupLocation.latitude,
        pickup_longitude: pickupLocation.longitude,
        pickup_address: {
          street: pickupLocation.address,
          city: '',
          state: '',
          postal_code: '',
          formatted_address: pickupLocation.address,
        },
        delivery_latitude: deliveryLocation.latitude,
        delivery_longitude: deliveryLocation.longitude,
        delivery_address: {
          street: deliveryLocation.address,
          city: '',
          state: '',
          postal_code: '',
          formatted_address: deliveryLocation.address,
        },
        material_type: materialType,
        load_description: loadDescription,
        estimated_weight_tons: parseFloat(estimatedWeight) || 0,
        required_truck_type_id: selectedTruckType,
        pickup_time_preference: selectedTimeSlot === 'scheduled' ? 'scheduled' : 'asap',
        scheduled_pickup_time: selectedTimeSlot === 'scheduled' ? scheduledDate : undefined,
        special_requirements: specialInstructions ? { notes: specialInstructions } : undefined,
        quoted_price: estimatedPrice,
      };

      const result = await TripService.createTripRequest(orderData);
      
      if (!result.success || !result.tripId) {
        throw new Error(result.error || 'Failed to create trip');
      }

      const tripId = result.tripId;
      
      Alert.alert(
        'Order Created!',
        `Your delivery order #${tripId} has been created successfully. We're finding the best driver for you.`,
        [
          {
            text: 'Track Order',
            onPress: () => onOrderCreated(tripId),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'Failed to create order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderLocationStep = () => {
    if (locationStep === 'complete') return null;

    return (
      <View style={styles.locationOverlay}>
        <View style={styles.locationInstruction}>
          <MaterialIcons 
            name={locationStep === 'pickup' ? 'location-on' : 'place'} 
            size={24} 
            color={theme.primary} 
          />
          <Text style={styles.locationInstructionText}>
            {locationStep === 'pickup' ? 'Tap to set pickup location' : 'Tap to set delivery location'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Standard Delivery</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: currentLocation?.latitude || 25.2048,
            longitude: currentLocation?.longitude || 55.2708,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {pickupLocation && (
            <Marker
              coordinate={pickupLocation}
              title="Pickup Location"
              pinColor={theme.primary}
            />
          )}
          {deliveryLocation && (
            <Marker
              coordinate={deliveryLocation}
              title="Delivery Location"
              pinColor={theme.secondary}
            />
          )}
        </MapView>
        
        {renderLocationStep()}
      </View>

      {/* Order Details Form */}
      {locationStep === 'complete' && (
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.formContent}>
            <Text style={styles.sectionTitle}>Delivery Details</Text>
            
            {/* Material Type */}
            <TouchableOpacity 
              style={styles.selector}
              onPress={() => setShowMaterialPicker(true)}
            >
              <Text style={[styles.selectorText, !materialType && styles.placeholderText]}>
                {materialType ? 
                  MATERIAL_TYPES.find(m => m.value === materialType)?.label || 'Select material type'
                  : 'Select material type'
                }
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.lightText} />
            </TouchableOpacity>

            {/* Load Description */}
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe your materials (e.g., 50 bags of cement, 2 tons of sand)"
              placeholderTextColor={theme.lightText}
              multiline
              numberOfLines={3}
              value={loadDescription}
              onChangeText={setLoadDescription}
            />

            {/* Weight and Time Slot */}
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, styles.inputHalf]}
                placeholder="Weight (tons)"
                placeholderTextColor={theme.lightText}
                keyboardType="numeric"
                value={estimatedWeight}
                onChangeText={setEstimatedWeight}
              />
              
              <TouchableOpacity 
                style={[styles.selector, styles.inputHalf, { marginLeft: 12 }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={[styles.selectorTextSmall, !selectedTimeSlot && styles.placeholderText]}>
                  {selectedTimeSlot ? 
                    TIME_SLOTS.find(t => t.value === selectedTimeSlot)?.label || 'Select time'
                    : 'Select delivery time'
                  }
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.lightText} />
              </TouchableOpacity>
            </View>

            {/* Scheduled Date (if selected) */}
            {selectedTimeSlot === 'scheduled' && (
              <TextInput
                style={styles.textInput}
                placeholder="Select date (YYYY-MM-DD)"
                placeholderTextColor={theme.lightText}
                value={scheduledDate}
                onChangeText={setScheduledDate}
              />
            )}

            {/* Truck Type */}
            <TouchableOpacity 
              style={styles.selector}
              onPress={() => setShowTruckTypePicker(true)}
            >
              <Text style={[styles.selectorText, !selectedTruck && styles.placeholderText]}>
                {selectedTruck ? selectedTruck.name : 'Select truck type'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.lightText} />
            </TouchableOpacity>

            {/* Special Instructions */}
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Special instructions (access codes, contact person, etc.)"
              placeholderTextColor={theme.lightText}
              multiline
              numberOfLines={2}
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
            />

            {/* Price Display */}
            {estimatedPrice > 0 && (
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Estimated Total</Text>
                <Text style={styles.priceValue}>${estimatedPrice.toFixed(2)}</Text>
              </View>
            )}

            {/* Create Order Button */}
            <TouchableOpacity 
              style={[
                styles.createOrderButton, 
                (!materialType || !loadDescription.trim() || !selectedTruckType || !selectedTimeSlot) && styles.buttonDisabled
              ]}
              onPress={handleCreateOrder}
              disabled={isLoading || !materialType || !loadDescription.trim() || !selectedTruckType || !selectedTimeSlot}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createOrderButtonText}>Create Delivery Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Material Type Picker Modal */}
      <Modal visible={showMaterialPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Material Type</Text>
              <TouchableOpacity onPress={() => setShowMaterialPicker(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={MATERIAL_TYPES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setMaterialType(item.value);
                    setShowMaterialPicker(false);
                  }}
                >
                  <Text style={styles.modalItemIcon}>{item.icon}</Text>
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Time Slot Picker Modal */}
      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TIME_SLOTS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedTimeSlot(item.value);
                    setShowTimePicker(false);
                  }}
                >
                  <View style={styles.timeSlotItem}>
                    <Text style={styles.modalItemText}>{item.label}</Text>
                    {item.price > 0 && (
                      <Text style={styles.timeSlotPrice}>+${item.price}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Truck Type Picker Modal */}
      <Modal visible={showTruckTypePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Truck Type</Text>
              <TouchableOpacity onPress={() => setShowTruckTypePicker(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableTrucks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedTruckType(item.id);
                    setSelectedTruck(item);
                    setShowTruckTypePicker(false);
                  }}
                >
                  <View style={styles.truckItem}>
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Text style={styles.truckCapacity}>
                      {item.payload_capacity}kg • ${item.base_rate_per_hour}/hour
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  headerRight: {
    width: 40,
  },
  mapContainer: {
    height: height * 0.4,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  locationOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  locationInstruction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInstructionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  formContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  formContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 20,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.white,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
  },
  selectorTextSmall: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  placeholderText: {
    color: theme.lightText,
    fontWeight: '400',
  },
  textInput: {
    backgroundColor: theme.white,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputHalf: {
    flex: 1,
    marginBottom: 0,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.secondary,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.primary,
  },
  createOrderButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  createOrderButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  modalItemText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSlotPrice: {
    fontSize: 14,
    color: theme.secondary,
    fontWeight: '600',
  },
  truckItem: {
    flex: 1,
  },
  truckCapacity: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 4,
  },
});

export default DeliveryOrderScreen;
