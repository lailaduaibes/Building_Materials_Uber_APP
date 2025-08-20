/**
 * RequestTruckScreen - Minimal Black & White Theme
 * Clean, minimal design with smart location features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Switch,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import TripService, { TruckType, TripRequest } from '../services/TripService';
import { LocationPickerEnhanced } from '../components/LocationPickerEnhanced';
import { authService } from '../AuthServiceSupabase';

// Minimal theme - black, white, subtle accents
const theme = {
  primary: '#000000',
  secondary: '#FFFFFF',
  accent: '#007AFF',
  success: '#34C759',
  background: '#FFFFFF',
  text: '#000000',
  lightText: '#8E8E93',
  border: '#C6C6C8',
  inputBackground: '#F2F2F7',
};

// Material Types for truck delivery
const MATERIAL_TYPES = [
  { value: 'steel', label: 'Steel & Metal', icon: '⚙️' },
  { value: 'concrete', label: 'Concrete & Cement', icon: '🏗️' },
  { value: 'sand', label: 'Sand & Gravel', icon: '🏖️' },
  { value: 'lumber', label: 'Lumber & Wood', icon: '🪵' },
  { value: 'bricks', label: 'Bricks & Blocks', icon: '🧱' },
  { value: 'pipes', label: 'Pipes & Fittings', icon: '🔧' },
  { value: 'hardware', label: 'Hardware & Tools', icon: '🔨' },
  { value: 'heavy_machinery', label: 'Heavy Machinery', icon: '🏗️' },
  { value: 'other', label: 'Other Materials', icon: '📦' },
];

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  formatted_address: string;
}

interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  formatted_address: string;
  latitude?: number;
  longitude?: number;
}

interface RequestTruckScreenProps {
  onBack: () => void;
  onOrderCreated: (tripId: string) => void;
}

const RequestTruckScreen: React.FC<RequestTruckScreenProps> = ({
  onBack,
  onOrderCreated,
}) => {
  // Smart Location State
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<LocationData | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

  // Material and Load Details
  const [materialType, setMaterialType] = useState('');
  const [loadDescription, setLoadDescription] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');

  // Truck Requirements
  const [truckTypes, setTruckTypes] = useState<TruckType[]>([]);
  const [selectedTruckType, setSelectedTruckType] = useState<string>('');
  const [requiresCrane, setRequiresCrane] = useState(false);
  const [requiresHydraulicLift, setRequiresHydraulicLift] = useState(false);

  // Timing
  const [pickupTimePreference, setPickupTimePreference] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledPickupTime, setScheduledPickupTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Pricing
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showTruckTypePicker, setShowTruckTypePicker] = useState(false);

  useEffect(() => {
    loadTruckTypes();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (pickupLocation && deliveryLocation && selectedTruckType) {
      calculatePrice();
    }
  }, [pickupLocation, deliveryLocation, selectedTruckType, estimatedWeight]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address.length > 0) {
        const addr = address[0];
        // Safely handle null/undefined values to prevent Android NullPointerException
        const street = addr.street || '';
        const name = addr.name || '';
        const city = addr.city || '';
        const region = addr.region || '';
        const postalCode = addr.postalCode || '';
        
        const formattedAddress = `${street} ${name}, ${city}, ${region} ${postalCode}`.trim();
        
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: formattedAddress,
          formatted_address: formattedAddress,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadTruckTypes = async () => {
    try {
      const types = await TripService.getTruckTypes();
      setTruckTypes(types);
    } catch (error) {
      console.error('Error loading truck types:', error);
    }
  };

  const calculatePrice = async () => {
    if (!pickupLocation || !deliveryLocation || !selectedTruckType) {
      return;
    }

    try {
      const price = await TripService.calculateTripPrice(
        pickupLocation.latitude,
        pickupLocation.longitude,
        deliveryLocation.latitude,
        deliveryLocation.longitude,
        selectedTruckType,
        parseFloat(estimatedWeight) || undefined
      );
      setEstimatedPrice(price);
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  };

  const handleMaterialTypeSelect = (material: any) => {
    setMaterialType(material.value);
    setShowMaterialPicker(false);
    
    const suggestedTruck = truckTypes.find(truck => 
      truck.suitable_materials?.includes(material.label)
    );
    if (suggestedTruck) {
      setSelectedTruckType(suggestedTruck.id);
    }
  };

  const validateForm = (): boolean => {
    if (!pickupLocation) {
      Alert.alert('Error', 'Please set pickup location');
      return false;
    }

    if (!deliveryLocation) {
      Alert.alert('Error', 'Please set delivery location');
      return false;
    }

    if (!materialType) {
      Alert.alert('Error', 'Please select material type');
      return false;
    }

    if (!loadDescription.trim()) {
      Alert.alert('Error', 'Please describe your load');
      return false;
    }

    if (!selectedTruckType) {
      Alert.alert('Error', 'Please select truck type');
      return false;
    }

    return true;
  };

  const handleRequestTruck = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // First check if user is authenticated
      console.log('🔐 Checking user authentication...');
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        console.error('❌ No authenticated user found');
        Alert.alert(
          'Authentication Required', 
          'Please log in to place an order.',
          [
            { text: 'OK', onPress: () => {
              // You might want to navigate back to login screen here
            }}
          ]
        );
        return;
      }

      console.log('✅ User authenticated:', currentUser.email);

      const tripData: TripRequest = {
        pickup_latitude: pickupLocation!.latitude,
        pickup_longitude: pickupLocation!.longitude,
        pickup_address: {
          formatted_address: pickupLocation!.address,
          street: pickupLocation!.address.split(',')[0] || '',
          city: pickupLocation!.address.split(',')[1]?.trim() || '',
          state: '',
          postal_code: ''
        },
        delivery_latitude: deliveryLocation!.latitude,
        delivery_longitude: deliveryLocation!.longitude,
        delivery_address: {
          formatted_address: deliveryLocation!.address,
          street: deliveryLocation!.address.split(',')[0] || '',
          city: deliveryLocation!.address.split(',')[1]?.trim() || '',
          state: '',
          postal_code: ''
        },
        material_type: materialType,
        load_description: loadDescription,
        estimated_weight_tons: parseFloat(estimatedWeight) || undefined,
        required_truck_type_id: selectedTruckType,
        requires_crane: requiresCrane,
        requires_hydraulic_lift: requiresHydraulicLift,
        pickup_time_preference: pickupTimePreference,
        scheduled_pickup_time: pickupTimePreference === 'scheduled' 
          ? scheduledPickupTime.toISOString() 
          : undefined,
      };

      console.log('🚛 Submitting trip request...');
      const result = await TripService.createTripRequest(tripData);

      if (result.success && result.tripId) {
        console.log('✅ Trip created successfully:', result.tripId);
        onOrderCreated(result.tripId);
      } else {
        console.error('❌ Trip creation failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to request truck');
      }
    } catch (error) {
      console.error('❌ Error requesting truck:', error);
      Alert.alert('Error', 'Failed to request truck. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMaterial = MATERIAL_TYPES.find(m => m.value === materialType);
  const selectedTruck = truckTypes.find(t => t.id === selectedTruckType);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Truck</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Smart Location Selection */}
        <View style={styles.section}>
          <LocationPickerEnhanced
            label="Pickup Location"
            placeholder="Where should we pick up?"
            value={pickupLocation}
            onLocationSelect={setPickupLocation}
            currentLocation={currentLocation}
          />
          
          <View style={styles.locationDivider} />
          
          <LocationPickerEnhanced
            label="Delivery Location"
            placeholder="Where should we deliver?"
            value={deliveryLocation}
            onLocationSelect={setDeliveryLocation}
            currentLocation={currentLocation}
          />
        </View>

        {/* Material Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What are you shipping?</Text>
          
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

          <TextInput
            style={styles.textInput}
            placeholder="Describe your load (e.g., 10 steel beams, 3 meters each)"
            placeholderTextColor={theme.lightText}
            multiline
            numberOfLines={3}
            value={loadDescription}
            onChangeText={setLoadDescription}
          />

          <TextInput
            style={styles.textInput}
            placeholder="Estimated weight (tons)"
            placeholderTextColor={theme.lightText}
            keyboardType="numeric"
            value={estimatedWeight}
            onChangeText={setEstimatedWeight}
          />
        </View>

        {/* Truck Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle type</Text>
          
          <TouchableOpacity 
            style={styles.selector}
            onPress={() => setShowTruckTypePicker(true)}
          >
            <Text style={[styles.selectorText, !selectedTruck && styles.placeholderText]}>
              {selectedTruck ? selectedTruck.name : 'Select truck type'}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.lightText} />
          </TouchableOpacity>
        </View>

        {/* Special Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special requirements</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Requires crane</Text>
            <Switch
              value={requiresCrane}
              onValueChange={setRequiresCrane}
              trackColor={{ false: '#E5E5EA', true: theme.accent }}
              thumbColor={theme.background}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Requires hydraulic lift</Text>
            <Switch
              value={requiresHydraulicLift}
              onValueChange={setRequiresHydraulicLift}
              trackColor={{ false: '#E5E5EA', true: theme.accent }}
              thumbColor={theme.background}
            />
          </View>
        </View>

        {/* Timing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>When do you need pickup?</Text>
          
          <View style={styles.timingRow}>
            <TouchableOpacity
              style={[styles.timingOption, pickupTimePreference === 'asap' && styles.timingSelected]}
              onPress={() => setPickupTimePreference('asap')}
            >
              <Text style={[styles.timingText, pickupTimePreference === 'asap' && styles.timingTextSelected]}>
                Now
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.timingOption, pickupTimePreference === 'scheduled' && styles.timingSelected]}
              onPress={() => setPickupTimePreference('scheduled')}
            >
              <Text style={[styles.timingText, pickupTimePreference === 'scheduled' && styles.timingTextSelected]}>
                Schedule
              </Text>
            </TouchableOpacity>
          </View>

          {pickupTimePreference === 'scheduled' && (
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dateButtonContent}>
                <MaterialIcons name="schedule" size={20} color={theme.lightText} />
                <Text style={styles.dateText}>
                  {scheduledPickupTime.toLocaleDateString()} at {scheduledPickupTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </View>
              <MaterialIcons name="keyboard-arrow-right" size={20} color={theme.lightText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Price Estimate */}
        {estimatedPrice > 0 && (
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Estimated fare</Text>
              <Text style={styles.priceAmount}>R{estimatedPrice.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Request Button */}
        <TouchableOpacity 
          style={[styles.requestButton, isLoading && styles.requestButtonDisabled]}
          onPress={handleRequestTruck}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.background} size="small" />
          ) : (
            <Text style={styles.requestButtonText}>Request Truck</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Material Picker Modal */}
      <Modal visible={showMaterialPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select material type</Text>
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
                  onPress={() => handleMaterialTypeSelect(item)}
                >
                  <Text style={styles.modalItemText}>{item.icon} {item.label}</Text>
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
              <Text style={styles.modalTitle}>Select vehicle type</Text>
              <TouchableOpacity onPress={() => setShowTruckTypePicker(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={truckTypes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedTruckType(item.id);
                    setShowTruckTypePicker(false);
                  }}
                >
                  <View>
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Text style={styles.modalItemSubtext}>
                      {item.payload_capacity}t capacity • R{item.base_rate_per_km}/km
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Date & Time Picker Modal */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date & Time</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={scheduledPickupTime}
                mode="datetime"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setScheduledPickupTime(selectedDate);
                  }
                }}
                minimumDate={new Date()}
                textColor={theme.text}
                themeVariant="light"
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  locationIcon: {
    width: 24,
    alignItems: 'center',
    paddingTop: 12,
  },
  locationContent: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 4,
  },
  locationInput: {
    fontSize: 16,
    color: theme.text,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  locationDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.border,
    marginLeft: 12,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.inputBackground,
    borderRadius: 12,
    marginBottom: 12,
  },
  selectorText: {
    fontSize: 16,
    color: theme.text,
  },
  placeholderText: {
    color: theme.lightText,
  },
  textInput: {
    backgroundColor: theme.inputBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.text,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: theme.text,
  },
  timingRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timingOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: theme.background,
  },
  timingSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  timingText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  timingTextSelected: {
    color: theme.background,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: theme.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: 60,
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    marginLeft: 12,
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
    flex: 1,
  },
  priceContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 16,
    color: theme.text,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  requestButton: {
    backgroundColor: theme.primary,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  requestButtonDisabled: {
    opacity: 0.5,
  },
  requestButtonText: {
    color: theme.background,
    fontSize: 18,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalItemText: {
    fontSize: 16,
    color: theme.text,
  },
  modalItemSubtext: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 4,
  },
  datePickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: theme.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  datePickerCancel: {
    fontSize: 16,
    color: theme.lightText,
  },
  datePickerDone: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '600',
  },
});

export default RequestTruckScreen;
