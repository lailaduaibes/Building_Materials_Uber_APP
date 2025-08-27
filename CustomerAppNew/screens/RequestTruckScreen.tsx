/**
 * RequestTruckScreen - Uber-style truck request interface with map-first design
 * Main view is a full-screen map where users set pickup/delivery locations
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

// Import the TripService
import TripService, { TruckType, TripRequest } from '../services/TripService';

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

interface LocationMarker {
  latitude: number;
  longitude: number;
  address?: string;
}

interface RequestTruckScreenProps {
  onBack: () => void;
  onOrderCreated: (tripId: string) => void;
}

const RequestTruckScreen: React.FC<RequestTruckScreenProps> = ({
  onBack,
  onOrderCreated,
}) => {
  console.log('📱 Rendering RequestTruckScreen');

  // Map and Location State
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState({
    latitude: 25.276987, // Default Dubai coordinates
    longitude: 55.296249,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Location Selection State
  const [isSelectingPickup, setIsSelectingPickup] = useState(true);
  const [pickupMarker, setPickupMarker] = useState<LocationMarker | null>(null);
  const [deliveryMarker, setDeliveryMarker] = useState<LocationMarker | null>(null);

  // UI State for step flow
  const [currentStep, setCurrentStep] = useState<'map' | 'details'>('map');
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;

  // Form State
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
    getCurrentLocation();
    loadTruckTypes();
  }, []);

  useEffect(() => {
    // Calculate price when both locations are set
    if (pickupMarker && deliveryMarker && selectedTruckType) {
      calculatePrice();
    }
  }, [pickupMarker, deliveryMarker, selectedTruckType, estimatedWeight]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      setIsLocationLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      setIsLocationLoading(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const coordinate = event.nativeEvent.coordinate;
    
    try {
      // Get address for the coordinate
      const [address] = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });

      const formattedAddress = address 
        ? `${address.street || ''} ${address.city || ''}, ${address.region || ''}`.trim()
        : `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;

      if (isSelectingPickup) {
        setPickupMarker({
          ...coordinate,
          address: formattedAddress
        });
        // Auto switch to delivery selection
        setIsSelectingPickup(false);
      } else {
        setDeliveryMarker({
          ...coordinate,
          address: formattedAddress
        });
      }
    } catch (error) {
      console.error('Error getting address:', error);
      // Set marker anyway with coordinates
      if (isSelectingPickup) {
        setPickupMarker({
          ...coordinate,
          address: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`
        });
        setIsSelectingPickup(false);
      } else {
        setDeliveryMarker({
          ...coordinate,
          address: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`
        });
      }
    }
  };

  const proceedToDetails = () => {
    if (!pickupMarker || !deliveryMarker) {
      Alert.alert('Missing Locations', 'Please set both pickup and delivery locations');
      return;
    }
    setCurrentStep('details');
    // Animate bottom sheet up
    Animated.timing(bottomSheetAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const backToMap = () => {
    setCurrentStep('map');
    // Animate bottom sheet down
    Animated.timing(bottomSheetAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
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
    if (!pickupMarker || !deliveryMarker || !selectedTruckType) {
      return;
    }

    try {
      const price = await TripService.calculateTripPrice(
        pickupMarker.latitude,
        pickupMarker.longitude,
        deliveryMarker.latitude,
        deliveryMarker.longitude,
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

  const validateForm = (): boolean => {
    if (!pickupMarker || !deliveryMarker) {
      Alert.alert('Error', 'Please set both pickup and delivery locations');
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
        pickup_latitude: pickupMarker!.latitude,
        pickup_longitude: pickupMarker!.longitude,
        pickup_address: {
          street: pickupMarker!.address || '',
          city: '',
          state: '',
          postal_code: '',
          formatted_address: pickupMarker!.address || '',
        },
        delivery_latitude: deliveryMarker!.latitude,
        delivery_longitude: deliveryMarker!.longitude,
        delivery_address: {
          street: deliveryMarker!.address || '',
          city: '',
          state: '',
          postal_code: '',
          formatted_address: deliveryMarker!.address || '',
        },
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
        onOrderCreated(result.tripId);
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

  const renderMapView = () => (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Truck</Text>
        <View style={styles.backButton} />
      </SafeAreaView>

      {/* Map */}
      <MapView
        style={styles.map}
        region={mapRegion}
        provider={PROVIDER_GOOGLE}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {pickupMarker && (
          <Marker
            coordinate={pickupMarker}
            title="Pickup Location"
            description={pickupMarker.address}
            pinColor="#1E3A8A"
          />
        )}
        {deliveryMarker && (
          <Marker
            coordinate={deliveryMarker}
            title="Delivery Location"
            description={deliveryMarker.address}
            pinColor="#EF4444"
          />
        )}
      </MapView>

      {/* Location Selection UI */}
      <View style={styles.locationSelector}>
        <TouchableOpacity
          style={[styles.locationButton, isSelectingPickup && styles.locationButtonActive]}
          onPress={() => setIsSelectingPickup(true)}
        >
          <Text style={[styles.locationButtonText, isSelectingPickup && styles.locationButtonTextActive]}>
            📍 {pickupMarker ? 'Pickup Set' : 'Set Pickup'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.locationButton, !isSelectingPickup && styles.locationButtonActive]}
          onPress={() => setIsSelectingPickup(false)}
        >
          <Text style={[styles.locationButtonText, !isSelectingPickup && styles.locationButtonTextActive]}>
            🚛 {deliveryMarker ? 'Delivery Set' : 'Set Delivery'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Preview */}
      <View style={styles.bottomSheetPreview}>
        {pickupMarker && deliveryMarker ? (
          <TouchableOpacity style={styles.proceedButton} onPress={proceedToDetails}>
            <Text style={styles.proceedButtonText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.instructionText}>
            Tap on the map to set {isSelectingPickup ? 'pickup' : 'delivery'} location
          </Text>
        )}
      </View>
    </View>
  );

  const renderDetailsView = () => (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      
      {/* Header */}
      <LinearGradient colors={['#1E3A8A', '#3B82F6']} style={styles.detailsHeader}>
        <TouchableOpacity onPress={backToMap} style={styles.backButton}>
          <Text style={styles.backButtonTextWhite}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitleWhite}>Truck Details</Text>
        <View style={styles.backButton} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Locations Summary */}
        <View style={styles.locationSummary}>
          <View style={styles.locationItem}>
            <Text style={styles.locationLabel}>📍 Pickup</Text>
            <Text style={styles.locationAddress}>{pickupMarker?.address}</Text>
          </View>
          <View style={styles.locationItem}>
            <Text style={styles.locationLabel}>🚛 Delivery</Text>
            <Text style={styles.locationAddress}>{deliveryMarker?.address}</Text>
          </View>
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
              trackColor={{ false: '#ccc', true: '#3B82F6' }}
              thumbColor={requiresCrane ? '#1E3A8A' : '#fff'}
            />
          </View>

          <View style={styles.requirementRow}>
            <Text style={styles.requirementText}>Requires Hydraulic Lift</Text>
            <Switch
              value={requiresHydraulicLift}
              onValueChange={setRequiresHydraulicLift}
              trackColor={{ false: '#ccc', true: '#3B82F6' }}
              thumbColor={requiresHydraulicLift ? '#1E3A8A' : '#fff'}
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
    </View>
  );

  if (isLocationLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return currentStep === 'map' ? renderMapView() : renderDetailsView();
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 45,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#1E3A8A',
    fontSize: 24,
    fontWeight: 'bold',
  },
  backButtonTextWhite: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#1E3A8A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitleWhite: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
  },
  locationSelector: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  locationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  locationButtonActive: {
    backgroundColor: '#1E3A8A',
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  locationButtonTextActive: {
    color: '#fff',
  },
  bottomSheetPreview: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  proceedButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructionText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  locationSummary: {
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  locationItem: {
    marginBottom: 12,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 16,
    color: '#2d3748',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  pickerText: {
    fontSize: 16,
    color: '#2d3748',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#888',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  requirementText: {
    fontSize: 16,
    color: '#2d3748',
  },
  timingOptions: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timingOption: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  timingOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  timingOptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  timingOptionTextSelected: {
    color: '#fff',
  },
  datePickerButton: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  datePickerText: {
    fontSize: 16,
    color: '#2d3748',
  },
  priceSection: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  priceLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  priceAmount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  requestButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 30,
  },
  requestButtonDisabled: {
    backgroundColor: '#a0aec0',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2d3748',
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#2d3748',
  },
  modalItemSubtext: {
    fontSize: 14,
    color: '#718096',
    marginTop: 5,
  },
  modalCloseButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});

export default RequestTruckScreen;
