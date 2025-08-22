/**
 * PickupOrderScreen - Scheduled Pickup Service
 * Allows customers to schedule material pickup from suppliers with specific time slots
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

const PICKUP_TIME_SLOTS = [
  { value: 'morning', label: 'Morning (8AM - 12PM)', price: 0 },
  { value: 'afternoon', label: 'Afternoon (12PM - 5PM)', price: 0 },
  { value: 'evening', label: 'Evening (5PM - 8PM)', price: 10 },
  { value: 'scheduled', label: 'Schedule for specific time', price: 0 },
];

const SUPPLIERS = [
  { id: '1', name: 'Dubai Building Materials', address: 'Al Quoz Industrial Area', phone: '+971-4-123-4567' },
  { id: '2', name: 'Emirates Construction Supply', address: 'Jebel Ali Free Zone', phone: '+971-4-234-5678' },
  { id: '3', name: 'UAE Steel & Cement Co.', address: 'Sharjah Industrial City', phone: '+971-6-345-6789' },
  { id: '4', name: 'Custom Location', address: 'Set pickup location on map', phone: '' },
];

interface PickupOrderScreenProps {
  onBack: () => void;
  onOrderCreated: (tripId: string) => void;
}

const PickupOrderScreen: React.FC<PickupOrderScreenProps> = ({
  onBack,
  onOrderCreated,
}) => {
  // Location states
  const [pickupLocation, setPickupLocation] = useState<{latitude: number; longitude: number; address: string} | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<{latitude: number; longitude: number; address: string} | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [customPickupMode, setCustomPickupMode] = useState(false);

  // Order details states
  const [materialType, setMaterialType] = useState<string>('');
  const [loadDescription, setLoadDescription] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [supplierNotes, setSupplierNotes] = useState('');

  // Truck selection states
  const [availableTrucks, setAvailableTrucks] = useState<TruckType[]>([]);
  const [selectedTruckType, setSelectedTruckType] = useState<string>('');
  const [selectedTruck, setSelectedTruck] = useState<TruckType | null>(null);

  // UI states
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTruckTypePicker, setShowTruckTypePicker] = useState(false);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
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
      const currentLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(currentLoc);
      
      // Set delivery location to current location by default for pickup orders
      setDeliveryLocation({
        ...currentLoc,
        address: 'Your current location',
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

      const timeSlot = PICKUP_TIME_SLOTS.find(slot => slot.value === selectedTimeSlot);
      const timeCharge = timeSlot?.price || 0;
      
      setEstimatedPrice(price + timeCharge);
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  };

  const handleSupplierSelect = (supplierId: string) => {
    if (supplierId === '4') {
      // Custom location - enable map picking
      setCustomPickupMode(true);
      setSelectedSupplier(supplierId);
    } else {
      // Predefined supplier location
      const supplier = SUPPLIERS.find(s => s.id === supplierId);
      if (supplier) {
        setSelectedSupplier(supplierId);
        // For demo, using approximate coordinates for Dubai suppliers
        setPickupLocation({
          latitude: 25.1372 + (parseInt(supplierId) * 0.05),
          longitude: 55.1872 + (parseInt(supplierId) * 0.05),
          address: supplier.address,
        });
      }
      setCustomPickupMode(false);
    }
    setShowSupplierPicker(false);
  };

  const handleMapPress = (event: any) => {
    if (customPickupMode) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setPickupLocation({
        latitude,
        longitude,
        address: `Custom Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      });
    }
  };

  const handleCreatePickupOrder = async () => {
    if (!pickupLocation || !deliveryLocation || !materialType || !loadDescription.trim() || 
        !selectedTruckType || !selectedTimeSlot) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (selectedTimeSlot === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      Alert.alert('Missing Schedule', 'Please specify the pickup date and time');
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
        pickup_time_preference: 'scheduled',
        scheduled_pickup_time: selectedTimeSlot === 'scheduled' ? 
          `${scheduledDate} ${scheduledTime}` : 
          selectedTimeSlot,
        special_requirements: supplierNotes ? { 
          pickup_type: 'scheduled',
          supplier_notes: supplierNotes,
          supplier_id: selectedSupplier !== '4' ? selectedSupplier : undefined
        } : undefined,
        quoted_price: estimatedPrice,
      };

      const result = await TripService.createTripRequest(orderData);
      
      if (!result.success || !result.tripId) {
        throw new Error(result.error || 'Failed to create pickup order');
      }

      const tripId = result.tripId;
      
      Alert.alert(
        'Pickup Scheduled!',
        `Your pickup order #${tripId} has been scheduled successfully. Driver will arrive at the specified time.`,
        [
          {
            text: 'Track Order',
            onPress: () => onOrderCreated(tripId),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating pickup order:', error);
      Alert.alert('Error', 'Failed to create pickup order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scheduled Pickup</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: currentLocation?.latitude || 25.2048,
              longitude: currentLocation?.longitude || 55.2708,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {pickupLocation && (
              <Marker
                coordinate={pickupLocation}
                title="Pickup Location"
                description="Materials will be picked up here"
                pinColor={theme.secondary}
              />
            )}
            {deliveryLocation && (
              <Marker
                coordinate={deliveryLocation}
                title="Delivery Location"
                description="Your delivery address"
                pinColor={theme.primary}
              />
            )}
          </MapView>
          
          {customPickupMode && (
            <View style={styles.mapOverlay}>
              <View style={styles.mapInstruction}>
                <MaterialIcons name="location-on" size={24} color={theme.primary} />
                <Text style={styles.mapInstructionText}>Tap on map to set custom pickup location</Text>
              </View>
            </View>
          )}
        </View>

        {/* Order Form */}
        <View style={styles.formContent}>
          <Text style={styles.sectionTitle}>Pickup Details</Text>
          
          {/* Supplier Selection */}
          <TouchableOpacity 
            style={styles.selector}
            onPress={() => setShowSupplierPicker(true)}
          >
            <Text style={[styles.selectorText, !selectedSupplier && styles.placeholderText]}>
              {selectedSupplier ? 
                SUPPLIERS.find(s => s.id === selectedSupplier)?.name || 'Custom Location'
                : 'Select pickup location'
              }
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.lightText} />
          </TouchableOpacity>

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
            placeholder="Describe materials to pickup (e.g., 50 bags of cement, 2 tons of sand)"
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
                  PICKUP_TIME_SLOTS.find(t => t.value === selectedTimeSlot)?.label || 'Select time'
                  : 'Pickup time'
                }
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.lightText} />
            </TouchableOpacity>
          </View>

          {/* Scheduled Date and Time (if selected) */}
          {selectedTimeSlot === 'scheduled' && (
            <>
              <TextInput
                style={styles.textInput}
                placeholder="Pickup date (YYYY-MM-DD)"
                placeholderTextColor={theme.lightText}
                value={scheduledDate}
                onChangeText={setScheduledDate}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Pickup time (HH:MM)"
                placeholderTextColor={theme.lightText}
                value={scheduledTime}
                onChangeText={setScheduledTime}
              />
            </>
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

          {/* Supplier Notes */}
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Special notes for supplier (access codes, contact person, etc.)"
            placeholderTextColor={theme.lightText}
            multiline
            numberOfLines={2}
            value={supplierNotes}
            onChangeText={setSupplierNotes}
          />

          {/* Price Display */}
          {estimatedPrice > 0 && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Estimated Total</Text>
              <Text style={styles.priceValue}>${estimatedPrice.toFixed(2)}</Text>
            </View>
          )}

          {/* Schedule Pickup Button */}
          <TouchableOpacity 
            style={[
              styles.createOrderButton, 
              (!materialType || !loadDescription.trim() || !selectedTruckType || !selectedTimeSlot || !selectedSupplier) && styles.buttonDisabled
            ]}
            onPress={handleCreatePickupOrder}
            disabled={isLoading || !materialType || !loadDescription.trim() || !selectedTruckType || !selectedTimeSlot || !selectedSupplier}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createOrderButtonText}>Schedule Pickup</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Supplier Picker Modal */}
      <Modal visible={showSupplierPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Pickup Location</Text>
              <TouchableOpacity onPress={() => setShowSupplierPicker(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SUPPLIERS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSupplierSelect(item.id)}
                >
                  <View style={styles.supplierItem}>
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Text style={styles.supplierAddress}>{item.address}</Text>
                    {item.phone && <Text style={styles.supplierPhone}>{item.phone}</Text>}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
              <Text style={styles.modalTitle}>Select Pickup Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PICKUP_TIME_SLOTS}
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
  content: {
    flex: 1,
    backgroundColor: theme.background,
  },
  mapContainer: {
    height: height * 0.3,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  mapInstruction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapInstructionText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
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
    flex: 1,
  },
  selectorTextSmall: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
    flex: 1,
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
  supplierItem: {
    flex: 1,
  },
  supplierAddress: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 4,
  },
  supplierPhone: {
    fontSize: 14,
    color: theme.secondary,
    marginTop: 2,
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

export default PickupOrderScreen;
