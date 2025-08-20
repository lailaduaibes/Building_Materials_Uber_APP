/**
 * RequestTruckScreen - Uber-style truck request interface
 * Transform from e-commerce order to on-demand delivery request
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

// Import the TripService
import TripService, { TruckType, TripRequest } from '../services/TripService';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';
import { LocationPicker } from '../components/LocationPicker';

// Material Types for truck delivery
const MATERIAL_TYPES = [
  { value: 'steel', label: 'Steel & Metal', icon: '⚙️', truckType: 'Flatbed Truck' },
  { value: 'concrete', label: 'Concrete & Cement', icon: '🏗️', truckType: 'Concrete Mixer' },
  { value: 'sand', label: 'Sand & Gravel', icon: '🏖️', truckType: 'Dump Truck' },
  { value: 'lumber', label: 'Lumber & Wood', icon: '🪵', truckType: 'Flatbed Truck' },
  { value: 'bricks', label: 'Bricks & Blocks', icon: '🧱', truckType: 'Flatbed Truck' },
  { value: 'pipes', label: 'Pipes & Fittings', icon: '🔧', truckType: 'Flatbed Truck' },
  { value: 'hardware', label: 'Hardware & Tools', icon: '🔨', truckType: 'Box Truck' },
  { value: 'heavy_machinery', label: 'Heavy Machinery', icon: '🏗️', truckType: 'Crane Truck' },
  { value: 'other', label: 'Other Materials', icon: '📦', truckType: 'Small Truck' },
];

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
  onOrderCreated: (tripId: string) => void; // Keep interface compatible
}

const RequestTruckScreen: React.FC<RequestTruckScreenProps> = ({
  onBack,
  onOrderCreated,
}) => {
  // Location State
  const [pickupAddress, setPickupAddress] = useState<Address>({
    street: '',
    city: '',
    state: '',
    postal_code: '',
    formatted_address: '',
    latitude: 25.276987, // Default Dubai coordinates for testing
    longitude: 55.296249,
  });

  const [deliveryAddress, setDeliveryAddress] = useState<Address>({
    street: '',
    city: '',
    state: '',
    postal_code: '',
    formatted_address: '',
    latitude: 25.204849, // Default Dubai coordinates for testing
    longitude: 55.270783,
  });

  // Material and Load Details
  const [materialType, setMaterialType] = useState('');
  const [loadDescription, setLoadDescription] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [estimatedVolume, setEstimatedVolume] = useState('');

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
  }, []);

  useEffect(() => {
    // Calculate price when locations and requirements change
    if (pickupAddress.latitude && pickupAddress.longitude && 
        deliveryAddress.latitude && deliveryAddress.longitude && 
        selectedTruckType) {
      calculatePrice();
    }
  }, [pickupAddress, deliveryAddress, selectedTruckType, estimatedWeight]);

  const loadTruckTypes = async () => {
    try {
      const types = await TripService.getTruckTypes();
      setTruckTypes(types);
    } catch (error) {
      console.error('Error loading truck types:', error);
    }
  };

  const calculatePrice = async () => {
    if (!pickupAddress.latitude || !pickupAddress.longitude || 
        !deliveryAddress.latitude || !deliveryAddress.longitude || !selectedTruckType) {
      return;
    }

    try {
      const price = await TripService.calculateTripPrice(
        pickupAddress.latitude,
        pickupAddress.longitude,
        deliveryAddress.latitude,
        deliveryAddress.longitude,
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
    
    // Auto-suggest truck type based on material
    const suggestedTruck = truckTypes.find(truck => 
      truck.suitable_materials?.includes(material.label)
    );
    if (suggestedTruck) {
      setSelectedTruckType(suggestedTruck.id);
    }
  };

  const handleAddressChange = (type: 'pickup' | 'delivery', field: string, value: string) => {
    const setter = type === 'pickup' ? setPickupAddress : setDeliveryAddress;
    const currentAddress = type === 'pickup' ? pickupAddress : deliveryAddress;
    
    setter({
      ...currentAddress,
      [field]: value,
      formatted_address: field === 'street' || field === 'city' 
        ? `${field === 'street' ? value : currentAddress.street}, ${field === 'city' ? value : currentAddress.city}, ${currentAddress.state} ${currentAddress.postal_code}`.trim()
        : currentAddress.formatted_address
    });
  };

  const validateForm = (): boolean => {
    if (!pickupAddress.street || !pickupAddress.city) {
      Alert.alert('Error', 'Please enter pickup address');
      return false;
    }

    if (!deliveryAddress.street || !deliveryAddress.city) {
      Alert.alert('Error', 'Please enter delivery address');
      return false;
    }

    if (!pickupAddress.latitude || !pickupAddress.longitude) {
      Alert.alert('Error', 'Please enter valid pickup coordinates');
      return false;
    }

    if (!deliveryAddress.latitude || !deliveryAddress.longitude) {
      Alert.alert('Error', 'Please enter valid delivery coordinates');
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
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Create trip request
      const tripData: TripRequest = {
        pickup_latitude: pickupAddress.latitude!,
        pickup_longitude: pickupAddress.longitude!,
        pickup_address: pickupAddress,
        delivery_latitude: deliveryAddress.latitude!,
        delivery_longitude: deliveryAddress.longitude!,
        delivery_address: deliveryAddress,
        material_type: materialType,
        load_description: loadDescription,
        estimated_weight_tons: parseFloat(estimatedWeight) || undefined,
        estimated_volume_m3: parseFloat(estimatedVolume) || undefined,
        required_truck_type_id: selectedTruckType,
        requires_crane: requiresCrane,
        requires_hydraulic_lift: requiresHydraulicLift,
        pickup_time_preference: pickupTimePreference,
        scheduled_pickup_time: pickupTimePreference === 'scheduled' 
          ? scheduledPickupTime.toISOString() 
          : undefined,
      };

      const result = await TripService.createTripRequest(tripData);

      if (result.success && result.tripId) {
        onOrderCreated(result.tripId); // Use existing callback
      } else {
        Alert.alert('Error', result.error || 'Failed to request truck');
      }
    } catch (error) {
      console.error('Error requesting truck:', error);
      Alert.alert('Error', 'Failed to request truck. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMaterial = MATERIAL_TYPES.find(m => m.value === materialType);
  const selectedTruck = truckTypes.find(t => t.id === selectedTruckType);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
      
      {/* Header */}
      <LinearGradient colors={['#1a365d', '#2c5282']} style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Truck</Text>
        <View style={styles.backButton} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Pickup Location */}
        <View style={styles.section}>
          <LocationPicker
            label="📍 Pickup Location"
            placeholder="Select pickup location"
            value={pickupAddress}
            onLocationSelect={(location) => {
              setPickupAddress({
                street: location.address,
                city: '',
                state: '',
                postal_code: '',
                formatted_address: location.formatted_address,
                latitude: location.latitude,
                longitude: location.longitude,
              });
            }}
            currentLocation={pickupAddress}
          />
        </View>

        {/* Delivery Location */}
        <View style={styles.section}>
          <LocationPicker
            label="🚛 Delivery Location"
            placeholder="Select delivery location"
            value={deliveryAddress}
            onLocationSelect={(location) => {
              setDeliveryAddress({
                street: location.address,
                city: '',
                state: '',
                postal_code: '',
                formatted_address: location.formatted_address,
                latitude: location.latitude,
                longitude: location.longitude,
              });
            }}
            currentLocation={deliveryAddress}
          />
        </View>

        {/* Material Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Material Details</Text>
          
          <TouchableOpacity 
            style={styles.picker}
            onPress={() => setShowMaterialPicker(true)}
          >
            <Text style={styles.pickerText}>
              {selectedMaterial ? `${selectedMaterial.icon} ${selectedMaterial.label}` : 'Select Material Type'}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your load (e.g., 10 steel beams, 3 meters each)"
            placeholderTextColor="#888"
            multiline
            numberOfLines={3}
            value={loadDescription}
            onChangeText={setLoadDescription}
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Est. Weight (tons)"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={estimatedWeight}
              onChangeText={setEstimatedWeight}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Est. Volume (m³)"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={estimatedVolume}
              onChangeText={setEstimatedVolume}
            />
          </View>
        </View>

        {/* Truck Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚚 Truck Requirements</Text>
          
          <TouchableOpacity 
            style={styles.picker}
            onPress={() => setShowTruckTypePicker(true)}
          >
            <Text style={styles.pickerText}>
              {selectedTruck ? selectedTruck.name : 'Select Truck Type'}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>

          <View style={styles.requirementRow}>
            <Text style={styles.requirementText}>Requires Crane</Text>
            <Switch
              value={requiresCrane}
              onValueChange={setRequiresCrane}
              trackColor={{ false: '#ccc', true: '#4299e1' }}
              thumbColor={requiresCrane ? '#2c5282' : '#fff'}
            />
          </View>

          <View style={styles.requirementRow}>
            <Text style={styles.requirementText}>Requires Hydraulic Lift</Text>
            <Switch
              value={requiresHydraulicLift}
              onValueChange={setRequiresHydraulicLift}
              trackColor={{ false: '#ccc', true: '#4299e1' }}
              thumbColor={requiresHydraulicLift ? '#2c5282' : '#fff'}
            />
          </View>
        </View>

        {/* Timing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Pickup Time</Text>
          
          <View style={styles.timingOptions}>
            <TouchableOpacity
              style={[styles.timingOption, pickupTimePreference === 'asap' && styles.timingOptionSelected]}
              onPress={() => setPickupTimePreference('asap')}
            >
              <Text style={[styles.timingOptionText, pickupTimePreference === 'asap' && styles.timingOptionTextSelected]}>
                ASAP
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.timingOption, pickupTimePreference === 'scheduled' && styles.timingOptionSelected]}
              onPress={() => setPickupTimePreference('scheduled')}
            >
              <Text style={[styles.timingOptionText, pickupTimePreference === 'scheduled' && styles.timingOptionTextSelected]}>
                Schedule
              </Text>
            </TouchableOpacity>
          </View>

          {pickupTimePreference === 'scheduled' && (
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerText}>
                📅 {scheduledPickupTime.toLocaleString()}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Price Estimate */}
        {estimatedPrice > 0 && (
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Estimated Price</Text>
            <Text style={styles.priceAmount}>${estimatedPrice.toFixed(2)}</Text>
          </View>
        )}

        {/* Request Button */}
        <TouchableOpacity 
          style={[styles.requestButton, isLoading && styles.requestButtonDisabled]}
          onPress={handleRequestTruck}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.requestButtonText}>Request Truck</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Material Type Picker Modal */}
      <Modal visible={showMaterialPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Material Type</Text>
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
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowMaterialPicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Truck Type Picker Modal */}
      <Modal visible={showTruckTypePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Truck Type</Text>
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
                      {item.payload_capacity}t capacity • ${item.base_rate_per_km}/km
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowTruckTypePicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={scheduledPickupTime}
          mode="datetime"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setScheduledPickupTime(selectedDate);
            }
          }}
          minimumDate={new Date()}
        />
      )}

    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsive.padding(20, 40),
    paddingVertical: responsive.padding(15, 20),
    paddingTop: responsive.padding(45, 50),
  },
  backButton: {
    width: responsive.spacing(40, 50),
    height: responsive.spacing(40, 50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: responsive.fontSize(24, 28),
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: responsive.fontSize(20, 24),
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: responsive.padding(20, 40),
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  section: {
    marginBottom: responsive.spacing(25, 35),
  },
  sectionTitle: {
    fontSize: responsive.fontSize(18, 22),
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: responsive.spacing(15, 20),
  },
  addressContainer: {
    backgroundColor: '#fff',
    borderRadius: responsive.spacing(12, 16),
    padding: responsive.padding(15, 20),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: responsive.spacing(8, 10),
    padding: responsive.padding(12, 16),
    fontSize: responsive.fontSize(16, 18),
    backgroundColor: '#fff',
    marginBottom: responsive.spacing(10, 12),
    minHeight: deviceTypes.isAndroid ? 48 : 40,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  textArea: {
    height: responsive.spacing(80, 100),
    textAlignVertical: 'top',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: responsive.spacing(8, 10),
    padding: responsive.padding(15, 20),
    backgroundColor: '#fff',
    marginBottom: responsive.spacing(15, 20),
    minHeight: deviceTypes.isAndroid ? 48 : 40,
  },
  pickerText: {
    fontSize: responsive.fontSize(16, 18),
    color: '#2d3748',
  },
  pickerArrow: {
    fontSize: responsive.fontSize(12, 14),
    color: '#888',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: responsive.spacing(10, 14),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  requirementText: {
    fontSize: responsive.fontSize(16, 18),
    color: '#2d3748',
  },
  timingOptions: {
    flexDirection: 'row',
    marginBottom: responsive.spacing(15, 20),
  },
  timingOption: {
    flex: 1,
    padding: responsive.padding(15, 20),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: responsive.spacing(8, 10),
    alignItems: 'center',
    marginRight: responsive.spacing(10, 15),
    backgroundColor: '#fff',
    minHeight: deviceTypes.isAndroid ? 48 : 40,
  },
  timingOptionSelected: {
    backgroundColor: '#4299e1',
    borderColor: '#4299e1',
  },
  timingOptionText: {
    fontSize: responsive.fontSize(16, 18),
    fontWeight: 'bold',
    color: '#2d3748',
  },
  timingOptionTextSelected: {
    color: '#fff',
  },
  datePickerButton: {
    padding: responsive.padding(15, 20),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: responsive.spacing(8, 10),
    backgroundColor: '#fff',
    minHeight: deviceTypes.isAndroid ? 48 : 40,
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: responsive.fontSize(16, 18),
    color: '#2d3748',
  },
  priceSection: {
    backgroundColor: '#4299e1',
    borderRadius: responsive.spacing(12, 16),
    padding: responsive.padding(20, 30),
    alignItems: 'center',
    marginBottom: responsive.spacing(20, 30),
  },
  priceLabel: {
    color: '#fff',
    fontSize: responsive.fontSize(16, 18),
    marginBottom: responsive.spacing(5, 8),
  },
  priceAmount: {
    color: '#fff',
    fontSize: responsive.fontSize(28, 32),
    fontWeight: 'bold',
  },
  requestButton: {
    backgroundColor: '#2c5282',
    borderRadius: responsive.spacing(12, 16),
    padding: responsive.padding(18, 24),
    alignItems: 'center',
    marginBottom: responsive.spacing(30, 40),
    minHeight: deviceTypes.isAndroid ? 56 : 50,
    justifyContent: 'center',
  },
  requestButtonDisabled: {
    backgroundColor: '#a0aec0',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: responsive.fontSize(18, 20),
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: responsive.spacing(20, 24),
    borderTopRightRadius: responsive.spacing(20, 24),
    padding: responsive.padding(20, 30),
    maxHeight: '70%',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  modalTitle: {
    fontSize: responsive.fontSize(20, 24),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: responsive.spacing(20, 25),
    color: '#2d3748',
  },
  modalItem: {
    padding: responsive.padding(15, 20),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: deviceTypes.isAndroid ? 48 : 40,
    justifyContent: 'center',
  },
  modalItemText: {
    fontSize: responsive.fontSize(16, 18),
    color: '#2d3748',
  },
  modalItemSubtext: {
    fontSize: responsive.fontSize(14, 16),
    color: '#718096',
    marginTop: responsive.spacing(5, 6),
  },
  modalCloseButton: {
    padding: responsive.padding(15, 20),
    alignItems: 'center',
    marginTop: responsive.spacing(10, 15),
    minHeight: deviceTypes.isAndroid ? 48 : 40,
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: responsive.fontSize(16, 18),
    color: '#4299e1',
    fontWeight: 'bold',
  },
});

export default RequestTruckScreen;
