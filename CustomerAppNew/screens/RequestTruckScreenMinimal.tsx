/**
 * RequestTruckScreen - Uber-style Truck Delivery Interface
 * Main view with map integration like Uber
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
import { Theme } from '../theme';

const { width, height } = Dimensions.get('window');

// YouMats Blue theme
const theme = {
  primary: Theme.colors.primary,     // '#1E3A8A'
  secondary: Theme.colors.secondary, // '#FFFFFF'
  accent: Theme.colors.secondary,    // '#3B82F6'
  success: Theme.colors.success,     // '#10B981'
  background: Theme.colors.background.primary,
  text: Theme.colors.text.primary,
  lightText: Theme.colors.text.secondary,
  border: Theme.colors.border.light,
  inputBackground: Theme.colors.background.secondary,
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

  // Map State
  const [mapRegion, setMapRegion] = useState({
    latitude: 24.7136,
    longitude: 46.6753,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [selectedMapLocation, setSelectedMapLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isSelectingPickup, setIsSelectingPickup] = useState(true);

  // Material and Load Details
  const [materialType, setMaterialType] = useState('');
  const [loadDescription, setLoadDescription] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');

  // Truck Requirements
  const [truckTypes, setTruckTypes] = useState<TruckType[]>([]);
  const [selectedTruckType, setSelectedTruckType] = useState<string>('');

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

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setMapRegion(newRegion);

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address.length > 0) {
        const addr = address[0];
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

  const onMapPress = async (event: any) => {
    const coordinate = event.nativeEvent.coordinate;
    setSelectedMapLocation(coordinate);
    
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });

      if (address.length > 0) {
        const addr = address[0];
        const formattedAddress = `${addr.street || ''} ${addr.name || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        
        const locationData = {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          address: formattedAddress,
          formatted_address: formattedAddress,
        };

        if (isSelectingPickup) {
          setPickupLocation(locationData);
        } else {
          setDeliveryLocation(locationData);
        }
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const handleLocationTypeSelect = (isPickup: boolean) => {
    setIsSelectingPickup(isPickup);
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
      Alert.alert('Error', 'Please set pickup location by tapping on the map');
      return false;
    }

    if (!deliveryLocation) {
      Alert.alert('Error', 'Please set delivery location by tapping on the map');
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
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        Alert.alert(
          'Authentication Required', 
          'Please log in to place an order.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      const tripRequest: TripRequest = {
        customer_id: currentUser.id,
        pickup_latitude: pickupLocation!.latitude,
        pickup_longitude: pickupLocation!.longitude,
        pickup_address: {
          street: '',
          city: '',
          state: '',
          postal_code: '',
          formatted_address: pickupLocation!.address,
        },
        delivery_latitude: deliveryLocation!.latitude,
        delivery_longitude: deliveryLocation!.longitude,
        delivery_address: {
          street: '',
          city: '',
          state: '',
          postal_code: '',
          formatted_address: deliveryLocation!.address,
        },
        material_type: materialType,
        load_description: loadDescription,
        estimated_weight_tons: parseFloat(estimatedWeight) || 0,
        required_truck_type_id: selectedTruckType,
        quoted_price: estimatedPrice,
        pickup_time_preference: 'asap',
        scheduled_pickup_time: new Date().toISOString(),
      };

      const result = await TripService.createTripRequest(tripRequest);
      
      if (result.success && result.tripId) {
        Alert.alert(
          'Success!',
          'Your truck request has been submitted. You will be notified when a driver accepts.',
          [
            {
              text: 'OK',
              onPress: () => onOrderCreated(result.tripId!),
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Failed to create trip request');
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
      <StatusBar barStyle="dark-content" backgroundColor={theme.background} />
      
      {/* Map as main view */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        onPress={onMapPress}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {/* Pickup location marker */}
        {pickupLocation && (
          <Marker
            coordinate={{
              latitude: pickupLocation.latitude,
              longitude: pickupLocation.longitude,
            }}
            title="Pickup Location"
            description={pickupLocation.address}
            pinColor="green"
          />
        )}
        
        {/* Delivery location marker */}
        {deliveryLocation && (
          <Marker
            coordinate={{
              latitude: deliveryLocation.latitude,
              longitude: deliveryLocation.longitude,
            }}
            title="Delivery Location"
            description={deliveryLocation.address}
            pinColor="red"
          />
        )}
        
        {/* Selected location marker */}
        {selectedMapLocation && (
          <Marker
            coordinate={selectedMapLocation}
            title={isSelectingPickup ? "Pickup Location" : "Delivery Location"}
            pinColor={isSelectingPickup ? "green" : "red"}
          />
        )}
      </MapView>

      {/* Header overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Truck</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Location selection cards overlay */}
      <View style={styles.locationOverlay}>
        <TouchableOpacity 
          style={[styles.locationCard, isSelectingPickup && styles.locationCardActive]}
          onPress={() => handleLocationTypeSelect(true)}
        >
          <MaterialIcons 
            name="radio-button-unchecked" 
            size={20} 
            color={isSelectingPickup ? theme.primary : theme.lightText} 
          />
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>From</Text>
            <Text style={styles.locationAddress}>
              {pickupLocation?.address || 'Tap on map to set pickup location'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.locationDivider} />
        
        <TouchableOpacity 
          style={[styles.locationCard, !isSelectingPickup && styles.locationCardActive]}
          onPress={() => handleLocationTypeSelect(false)}
        >
          <MaterialIcons 
            name="location-on" 
            size={20} 
            color={!isSelectingPickup ? theme.primary : theme.lightText} 
          />
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>To</Text>
            <Text style={styles.locationAddress}>
              {deliveryLocation?.address || 'Tap on map to set delivery location'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Current location button */}
      <TouchableOpacity 
        style={styles.currentLocationButton}
        onPress={getCurrentLocation}
      >
        <MaterialIcons name="my-location" size={24} color={theme.primary} />
      </TouchableOpacity>

      {/* Bottom sheet with truck details */}
      {(pickupLocation && deliveryLocation) && (
        <View style={styles.bottomSheet}>
          <View style={styles.dragHandle} />
          
          <ScrollView 
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Material Selection */}
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
            style={styles.textInputCompact}
            placeholder="Describe your load"
            placeholderTextColor={theme.lightText}
            multiline
            numberOfLines={2}
            value={loadDescription}
            onChangeText={setLoadDescription}
          />

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInputCompact, styles.inputHalf]}
              placeholder="Weight (tons)"
              placeholderTextColor={theme.lightText}
              keyboardType="numeric"
              value={estimatedWeight}
              onChangeText={setEstimatedWeight}
            />
            
            <TouchableOpacity 
              style={[styles.selector, styles.inputHalf, { marginLeft: 8 }]}
              onPress={() => setShowTruckTypePicker(true)}
            >
              <Text style={[styles.selectorTextSmall, !selectedTruck && styles.placeholderText]}>
                {selectedTruck ? selectedTruck.name : 'Truck type'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.lightText} />
            </TouchableOpacity>
          </View>

          {/* Price and Request Button */}
          {estimatedPrice > 0 && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>Estimated Price: ${estimatedPrice}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.requestButton, (!materialType || !loadDescription.trim() || !selectedTruckType) && styles.requestButtonDisabled]}
            onPress={handleRequestTruck}
            disabled={isLoading || !materialType || !loadDescription.trim() || !selectedTruckType}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.requestButtonText}>Request Truck</Text>
            )}
          </TouchableOpacity>
          </ScrollView>
        </View>
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
                  onPress={() => handleMaterialTypeSelect(item)}
                >
                  <Text style={styles.modalItemIcon}>{item.icon}</Text>
                  <Text style={styles.modalItemText}>{item.label}</Text>
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
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  <Text style={styles.modalItemSubtext}>
                    Capacity: {item.payload_capacity}t | Rate: ${item.base_rate_per_km}/km
                  </Text>
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
    backgroundColor: '#FFFFFF',
  },
  map: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: StatusBar.currentHeight || 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerPlaceholder: {
    width: 40,
  },
  locationOverlay: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 44) + 70,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 90,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  locationCardActive: {
    backgroundColor: '#F8F9FA',
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 16,
    color: '#000',
  },
  locationDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 240,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 15,
    minHeight: height * 0.45,
    maxHeight: height * 0.75,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
    marginTop: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  selectorTextSmall: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  textInputCompact: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputHalf: {
    flex: 1,
    marginBottom: 0,
  },
  priceContainer: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  requestButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  requestButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  requestButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  modalItemText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  modalItemSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default RequestTruckScreen;
