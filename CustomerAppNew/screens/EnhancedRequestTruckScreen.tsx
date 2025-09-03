/**
 * Enhanced RequestTruckScreen - Multi-Step Order Process
 * Step-by-step delivery request with location search and time scheduling
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
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import TripService, { TruckType, TripRequest } from '../services/TripService';
import { authService } from '../AuthServiceSupabase';
import { Theme } from '../theme';
import DateTimePicker from '../components/DateTimePicker';
import { GOOGLE_PLACES_CONFIG, useExpoGeocoding } from '../config/GooglePlacesConfig';
import SmartTruckSelector from '../components/SmartTruckSelector';
import FleetStatusIndicator from '../components/FleetStatusIndicator';
import PaymentSelectionScreen from './PaymentSelectionScreen';
import paymentService from '../services/PaymentService';

const { width, height } = Dimensions.get('window');

// Enhanced Material Categories with subcategories and images
const MATERIAL_CATEGORIES = {
  construction: {
    name: 'Construction Materials',
    icon: '🏗️',
    color: '#f59e0b',
    materials: [
      { value: 'steel', label: 'Steel & Metal Beams', icon: '⚙️', description: 'Steel beams, rebar, metal sheets', weight: 'heavy' },
      { value: 'concrete', label: 'Concrete & Cement', icon: '🏗️', description: 'Ready mix concrete, cement bags', weight: 'heavy' },
      { value: 'bricks', label: 'Bricks & Blocks', icon: '🧱', description: 'Clay bricks, concrete blocks', weight: 'medium' },
      { value: 'lumber', label: 'Lumber & Wood', icon: '🪵', description: 'Timber, plywood, wooden beams', weight: 'medium' },
    ]
  },
  aggregates: {
    name: 'Aggregates & Fill',
    icon: '🏖️',
    color: '#8b5cf6',
    materials: [
      { value: 'sand', label: 'Sand & Gravel', icon: '🏖️', description: 'Construction sand, gravel, crushed stone', weight: 'heavy' },
      { value: 'soil', label: 'Soil & Fill Dirt', icon: '🌱', description: 'Topsoil, fill dirt, clay', weight: 'heavy' },
      { value: 'stone', label: 'Decorative Stone', icon: '🪨', description: 'River rock, landscape stones', weight: 'medium' },
    ]
  },
  plumbing: {
    name: 'Plumbing & Electrical',
    icon: '🔧',
    color: '#06b6d4',
    materials: [
      { value: 'pipes', label: 'Pipes & Fittings', icon: '🔧', description: 'PVC pipes, copper pipes, fittings', weight: 'light' },
      { value: 'electrical', label: 'Electrical Supplies', icon: '⚡', description: 'Cables, conduits, electrical panels', weight: 'light' },
      { value: 'fixtures', label: 'Fixtures & Hardware', icon: '🚿', description: 'Bathroom fixtures, lighting', weight: 'medium' },
    ]
  },
  tools: {
    name: 'Tools & Equipment',
    icon: '🔨',
    color: '#ef4444',
    materials: [
      { value: 'hardware', label: 'Hardware & Tools', icon: '🔨', description: 'Hand tools, fasteners, hardware', weight: 'light' },
      { value: 'heavy_machinery', label: 'Heavy Equipment', icon: '🚜', description: 'Construction equipment, generators', weight: 'heavy' },
      { value: 'safety', label: 'Safety Equipment', icon: '🦺', description: 'Safety gear, protective equipment', weight: 'light' },
    ]
  },
  specialty: {
    name: 'Specialty Items',
    icon: '📦',
    color: '#10b981',
    materials: [
      { value: 'insulation', label: 'Insulation Materials', icon: '🧊', description: 'Foam insulation, fiberglass', weight: 'light' },
      { value: 'roofing', label: 'Roofing Materials', icon: '�', description: 'Shingles, roofing sheets, gutters', weight: 'medium' },
      { value: 'other', label: 'Other Materials', icon: '📦', description: 'Custom or unlisted materials', weight: 'medium' },
    ]
  }
};

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  formatted_address: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

interface RequestTruckScreenProps {
  onBack: () => void;
  onOrderCreated: (tripId: string) => void;
}

const EnhancedRequestTruckScreen: React.FC<RequestTruckScreenProps> = ({
  onBack,
  onOrderCreated,
}) => {
  // Step Management
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(5); // Added payment step

  // Location State
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<LocationData | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

  // Location Search
  const [pickupSearchText, setPickupSearchText] = useState('');
  const [deliverySearchText, setDeliverySearchText] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationPickerType, setLocationPickerType] = useState<'pickup' | 'delivery'>('pickup');
  
  // Panel state for Uber-style behavior
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [panelPosition, setPanelPosition] = useState(height * 0.45); // Start more visible at 45% from top
  
  // Uber-style panel constants
  const PANEL_MIN_HEIGHT = 180; // Increased for better initial visibility
  const PANEL_MAX_HEIGHT = height * 0.9; // Allow almost full screen expansion
  const PANEL_SNAP_THRESHOLD = 50;
  const MINIMIZED_BOTTOM_OFFSET = 40; // Keep more visible when minimized

  // Pan responder for drag handle
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      // User started dragging
    },
    onPanResponderMove: (evt, gestureState) => {
      const newPosition = Math.max(
        height * 0.1, // Allow dragging to 10% from top (90% panel height)
        Math.min(
          height - PANEL_MIN_HEIGHT - MINIMIZED_BOTTOM_OFFSET, // Keep panel visible at bottom
          panelPosition + gestureState.dy
        )
      );
      setPanelPosition(newPosition);
    },
    onPanResponderRelease: (evt, gestureState) => {
      const velocity = gestureState.vy;
      const finalPosition = panelPosition + gestureState.dy;
      
      // Determine snap position based on velocity and position
      if (velocity > 0.5 || finalPosition > height * 0.55) {
        // Snap to minimized - ensure it stays visible with bottom offset
        const minimizedPosition = height - PANEL_MIN_HEIGHT - MINIMIZED_BOTTOM_OFFSET;
        setPanelPosition(minimizedPosition);
        setIsPanelMinimized(true);
      } else if (velocity < -0.5 || finalPosition < height * 0.35) {
        // Snap to fully expanded (10% from top)
        setPanelPosition(height * 0.1);
        setIsPanelMinimized(false);
      } else {
        // Snap to medium position
        setPanelPosition(height * 0.45);
        setIsPanelMinimized(false);
      }
    },
  });
  
  // Search optimization
  const [searchCache, setSearchCache] = useState<Map<string, LocationData[]>>(new Map());
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Map State
  const [mapRegion, setMapRegion] = useState({
    latitude: 24.7136,
    longitude: 46.6753,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Material Details
  const [materialType, setMaterialType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [materialSearchText, setMaterialSearchText] = useState('');

  // Helper function to get all materials
  const getAllMaterials = () => {
    const allMaterials: any[] = [];
    Object.values(MATERIAL_CATEGORIES).forEach(category => {
      allMaterials.push(...category.materials);
    });
    return allMaterials;
  };

  // Helper function to get material label
  const getMaterialLabel = (materialValue: string) => {
    const allMaterials = getAllMaterials();
    return allMaterials.find(m => m.value === materialValue)?.label || 'Select material type';
  };
  const [loadDescription, setLoadDescription] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [estimatedVolume, setEstimatedVolume] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState({
    requiresCrane: false,
    requiresHydraulicLift: false,
  });

  // Time Scheduling
  const [pickupTimePreference, setPickupTimePreference] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);

  // Truck and Pricing
  const [truckTypes, setTruckTypes] = useState<TruckType[]>([]);
  const [selectedTruckType, setSelectedTruckType] = useState<string>('');
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);

  // UI State
  const [loading, setLoading] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showTruckModal, setShowTruckModal] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);

  // Payment State
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
  const [createdTripId, setCreatedTripId] = useState<string>('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    initializeLocation();
    loadTruckTypes();
  }, []);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address.length > 0) {
        const addr = address[0];
        const currentLoc: LocationData = {
          latitude,
          longitude,
          address: `${addr.street || ''} ${addr.name || ''}`.trim(),
          formatted_address: `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`,
          city: addr.city || '',
          state: addr.region || '',
          postal_code: addr.postalCode || '',
        };

        setCurrentLocation(currentLoc);
        setMapRegion(prev => ({ ...prev, latitude, longitude }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadTruckTypes = async () => {
    try {
      // Get ALL truck types so users can see complete list in modal
      const types = await TripService.getTruckTypes();
      setTruckTypes(types);
      
      if (types.length === 0) {
        Alert.alert(
          'No Truck Types Available',
          'No truck types are configured in the system. Please contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error loading truck types:', error);
      Alert.alert(
        'Error Loading Trucks',
        'Failed to load truck types. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Location Search Functions - Optimized with debouncing and caching
  const searchLocationsDebounced = (query: string) => {
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debouncing
    const newTimeout = setTimeout(() => {
      performSearch(query);
    }, 500); // Wait 500ms after user stops typing

    setSearchTimeout(newTimeout);
  };

  const performSearch = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    // Check cache first
    if (searchCache.has(query)) {
      setSearchResults(searchCache.get(query) || []);
      return;
    }

    setIsSearching(true);
    try {
      // Use Google Places API directly - more reliable for mobile apps
      const response = await fetch(GOOGLE_PLACES_CONFIG.getAutocompleteUrl(query));
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.predictions && data.predictions.length > 0) {
          const results: LocationData[] = await Promise.all(
            data.predictions.slice(0, GOOGLE_PLACES_CONFIG.RESULT_LIMIT).map(async (prediction: any) => {
              // Get detailed place information
              try {
                const detailResponse = await fetch(GOOGLE_PLACES_CONFIG.getPlaceDetailsUrl(prediction.place_id));
                
                if (detailResponse.ok) {
                  const detailData = await detailResponse.json();
                  const place = detailData.result;
                  
                  // Extract city, state, postal code from address components
                  let city = '';
                  let state = '';
                  let postal_code = '';
                  
                  if (place.address_components) {
                    place.address_components.forEach((component: any) => {
                      if (component.types.includes('locality')) {
                        city = component.long_name;
                      }
                      if (component.types.includes('administrative_area_level_1')) {
                        state = component.long_name;
                      }
                      if (component.types.includes('postal_code')) {
                        postal_code = component.long_name;
                      }
                    });
                  }
                  
                  return {
                    latitude: place.geometry.location.lat,
                    longitude: place.geometry.location.lng,
                    address: prediction.structured_formatting.main_text || prediction.description,
                    formatted_address: place.formatted_address,
                    city,
                    state,
                    postal_code,
                  };
                }
              } catch (detailError) {
                console.log('Detail fetch failed, using basic info');
              }
              
              // Fallback if details fail - use prediction data
              return {
                latitude: 24.7136,
                longitude: 46.6753,
                address: prediction.structured_formatting?.main_text || prediction.description,
                formatted_address: prediction.description,
                city: 'Riyadh',
                state: 'Riyadh Region',
                postal_code: '',
              };
            })
          );
          
          console.log('✅ Google Places API success:', results.length, 'results');
          
          // Cache the results
          setSearchCache(prev => new Map(prev.set(query, results)));
          setSearchResults(results);
          return;
        }
      } else {
        console.log('Google Places API response not OK:', response.status);
      }
      
    } catch (googleError) {
      console.error('Places search error:', googleError);
      
      // Enhanced fallback with realistic Saudi locations
      const saudiLocations = [
        { name: 'Al Olaya', lat: 24.6944, lng: 46.6846, postal: '12213' },
        { name: 'King Fahd District', lat: 24.6877, lng: 46.7219, postal: '12271' },
        { name: 'Al Malaz', lat: 24.6408, lng: 46.7127, postal: '11439' },
        { name: 'Diplomatic Quarter', lat: 24.6945, lng: 46.6157, postal: '11693' },
        { name: 'Al Murabba', lat: 24.6565, lng: 46.7077, postal: '12611' },
        { name: 'Al Rawdah', lat: 24.7291, lng: 46.5704, postal: '13213' },
      ];
      
      const fallbackResults: LocationData[] = saudiLocations.slice(0, 3).map((location, index) => ({
        latitude: location.lat + (Math.random() - 0.5) * 0.005, // Small variation
        longitude: location.lng + (Math.random() - 0.5) * 0.005,
        address: `${query}`,
        formatted_address: `${query}, ${location.name}, Riyadh, Saudi Arabia`,
        city: 'Riyadh',
        state: 'Riyadh Region',
        postal_code: location.postal,
      }));
      
      console.log('🔄 Using fallback locations:', fallbackResults.length);
      
      // Cache the fallback results
      setSearchCache(prev => new Map(prev.set(query, fallbackResults)));
      setSearchResults(fallbackResults);
    } finally {
      setIsSearching(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const selectLocationFromSearch = (location: LocationData) => {
    if (locationPickerType === 'pickup') {
      setPickupLocation(location);
      setPickupSearchText(location.formatted_address);
    } else {
      setDeliveryLocation(location);
      setDeliverySearchText(location.formatted_address);
    }
    setSearchResults([]);
    setShowLocationPicker(false);
  };

  const openMapPicker = (type: 'pickup' | 'delivery') => {
    setLocationPickerType(type);
    // Set initial map region to current selection or user location
    const initialLocation = type === 'pickup' ? pickupLocation : deliveryLocation;
    if (initialLocation) {
      setMapRegion({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else if (currentLocation) {
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
    setShowLocationPicker(true);
  };

  // Uber-style map interaction - confirm center location
  const confirmMapLocation = async () => {
    console.log('Confirm location button pressed');
    console.log('Current map region:', mapRegion);
    console.log('Location picker type:', locationPickerType);
    
    try {
      const centerCoordinate = {
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
      };
      
      console.log('Getting address for coordinates:', centerCoordinate);
      const address = await Location.reverseGeocodeAsync(centerCoordinate);
      console.log('Reverse geocode result:', address);
      
      if (address.length > 0) {
        const addr = address[0];
        const location: LocationData = {
          latitude: centerCoordinate.latitude,
          longitude: centerCoordinate.longitude,
          address: `${addr.street || ''} ${addr.name || ''}`.trim(),
          formatted_address: `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`,
          city: addr.city || '',
          state: addr.region || '',
          postal_code: addr.postalCode || '',
        };

        console.log('Created location object:', location);

        if (locationPickerType === 'pickup') {
          setPickupLocation(location);
          setPickupSearchText(location.formatted_address);
          console.log('Set pickup location');
          
          // Close location picker
          setShowLocationPicker(false);
          console.log('Closed location picker');
          
          // If delivery location is not set, automatically prompt for it
          if (!deliveryLocation) {
            setTimeout(() => {
              setLocationPickerType('delivery');
              setShowLocationPicker(true);
              console.log('Auto-opening delivery location picker');
            }, 300);
          }
        } else {
          setDeliveryLocation(location);
          setDeliverySearchText(location.formatted_address);
          console.log('Set delivery location');
          
          // Close location picker
          setShowLocationPicker(false);
          console.log('Closed location picker');
        }
      } else {
        console.log('No address found for coordinates');
        Alert.alert('Error', 'Could not find address for this location');
      }
    } catch (error) {
      console.error('Error getting address:', error);
      Alert.alert('Error', 'Could not get address for this location');
    }
  };

  // Handle map region change (when user moves map)
  const onMapRegionChange = (region: any) => {
    setMapRegion(region);
  };

  // Step Validation
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return pickupLocation && deliveryLocation;
      case 2:
        return materialType && loadDescription && parseFloat(estimatedWeight) > 0;
      case 3:
        return selectedTruckType;
      case 4:
        return pickupTimePreference === 'asap' || scheduledTime;
      case 5:
        return selectedPaymentMethodId; // Payment method selected
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceedToNextStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 🧮 Professional Price Calculation with ASAP Logic
  const calculatePrice = async () => {
    if (!pickupLocation || !deliveryLocation || !selectedTruckType) {
      console.log('⚠️ [EnhancedRequestTruckScreen] Missing required data for price calculation');
      return;
    }

    try {
      console.log('💰 [EnhancedRequestTruckScreen] Calculating professional price...');

      const price = await TripService.calculateTripPrice(
        pickupLocation.latitude,
        pickupLocation.longitude,
        deliveryLocation.latitude,
        deliveryLocation.longitude,
        selectedTruckType,
        parseFloat(estimatedWeight) || undefined,
        pickupTimePreference,
        scheduledTime || undefined
      );

      setEstimatedPrice(price);
      console.log(`✅ [EnhancedRequestTruckScreen] Price calculated: ₪${price.toFixed(2)}`);
      console.log(`   ASAP: ${pickupTimePreference === 'asap' ? 'Yes' : 'No'}`);
      console.log(`   Peak Hours: ${new Date().getHours()}`);

    } catch (error) {
      console.error('❌ [EnhancedRequestTruckScreen] Price calculation error:', error);
      // Set fallback price
      const fallbackPrice = pickupTimePreference === 'asap' ? 97.50 : 75.00;
      setEstimatedPrice(fallbackPrice);
    }
  };

  // Auto-calculate price when key parameters change
  useEffect(() => {
    calculatePrice();
  }, [pickupLocation, deliveryLocation, selectedTruckType, estimatedWeight, pickupTimePreference, scheduledTime]);

  // Submit Order
  const submitOrder = async () => {
    if (!pickupLocation || !deliveryLocation) {
      Alert.alert('Error', 'Please select both pickup and delivery locations');
      return;
    }

    setLoading(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const tripRequest: TripRequest = {
        customer_id: user.id,
        pickup_latitude: pickupLocation.latitude,
        pickup_longitude: pickupLocation.longitude,
        pickup_address: {
          street: pickupLocation.address,
          city: pickupLocation.city || '',
          state: pickupLocation.state || '',
          postal_code: pickupLocation.postal_code || '',
          formatted_address: pickupLocation.formatted_address,
        },
        delivery_latitude: deliveryLocation.latitude,
        delivery_longitude: deliveryLocation.longitude,
        delivery_address: {
          street: deliveryLocation.address,
          city: deliveryLocation.city || '',
          state: deliveryLocation.state || '',
          postal_code: deliveryLocation.postal_code || '',
          formatted_address: deliveryLocation.formatted_address,
        },
        material_type: materialType,
        estimated_weight_tons: parseFloat(estimatedWeight) || undefined,
        load_description: loadDescription,
        special_requirements: specialRequirements,
        required_truck_type_id: selectedTruckType || undefined,
        requires_crane: specialRequirements.requiresCrane,
        requires_hydraulic_lift: specialRequirements.requiresHydraulicLift,
        pickup_time_preference: pickupTimePreference,
        scheduled_pickup_time: scheduledTime?.toISOString() || undefined,
        quoted_price: estimatedPrice,
      };

      // Create trip request first (without payment)
      const result = await TripService.createTripRequest(tripRequest);
      setCreatedTripId(result.tripId || 'new');
      
      // Move to payment step
      setCurrentStep(5);
    } catch (error) {
      console.error('Error creating trip:', error);
      Alert.alert('Error', 'Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle payment method selection and process payment
  const handlePaymentMethodSelected = async (paymentMethodId: string, amount: number) => {
    try {
      setPaymentProcessing(true);
      
      // Process payment
      const paymentResult = await paymentService.processPayment(createdTripId, amount, paymentMethodId);
      
      if (paymentResult.success) {
        Alert.alert(
          'Payment Successful! 🎉',
          'Your delivery request has been submitted and paid for successfully. Finding available drivers...',
          [{ text: 'OK', onPress: () => onOrderCreated(createdTripId) }]
        );
      } else {
        Alert.alert(
          'Payment Failed',
          paymentResult.message || 'Payment could not be processed. Please try again.',
          [
            {
              text: 'Try Again',
              onPress: () => setShowPaymentSelection(true)
            },
            {
              text: 'Cancel',
              onPress: () => onBack(),
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Payment processing failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Step Render Functions
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <View key={i} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: i + 1 <= currentStep ? Theme.colors.primary : Theme.colors.border.light }
          ]}>
            <Text style={[
              styles.stepNumber,
              { color: i + 1 <= currentStep ? 'white' : Theme.colors.text.secondary }
            ]}>
              {i + 1}
            </Text>
          </View>
          {i < totalSteps - 1 && (
            <View style={[
              styles.stepLine,
              { backgroundColor: i + 1 < currentStep ? Theme.colors.primary : Theme.colors.border.light }
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderLocationStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Pickup & Delivery Locations</Text>
      <Text style={styles.stepDescription}>
        Set your pickup and delivery locations to continue
      </Text>

      {/* Location Cards */}
      <View style={styles.locationCards}>
        {/* Pickup Location Card */}
        <TouchableOpacity
          style={[
            styles.locationCard,
            { borderColor: pickupLocation ? '#4CAF50' : '#E0E0E0' }
          ]}
          onPress={() => openMapPicker('pickup')}
        >
          <View style={styles.locationCardContent}>
            <View style={[styles.locationIcon, { backgroundColor: pickupLocation ? '#4CAF50' : '#E0E0E0' }]}>
              <MaterialIcons 
                name="radio-button-checked" 
                size={24} 
                color={pickupLocation ? 'white' : '#9E9E9E'} 
              />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationCardLabel}>Pickup Location</Text>
              <Text style={[
                styles.locationAddress,
                { color: pickupLocation ? Theme.colors.text.primary : Theme.colors.text.secondary }
              ]}>
                {pickupLocation ? pickupLocation.formatted_address : 'Tap to set pickup location'}
              </Text>
            </View>
          </View>
          {pickupLocation && (
            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
          )}
        </TouchableOpacity>

        {/* Delivery Location Card */}
        <TouchableOpacity
          style={[
            styles.locationCard,
            { borderColor: deliveryLocation ? Theme.colors.primary : '#E0E0E0' }
          ]}
          onPress={() => openMapPicker('delivery')}
        >
          <View style={styles.locationCardContent}>
            <View style={[styles.locationIcon, { backgroundColor: deliveryLocation ? Theme.colors.primary : '#E0E0E0' }]}>
              <MaterialIcons 
                name="location-on" 
                size={24} 
                color={deliveryLocation ? 'white' : '#9E9E9E'} 
              />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationCardLabel}>Delivery Location</Text>
              <Text style={[
                styles.locationAddress,
                { color: deliveryLocation ? Theme.colors.text.primary : Theme.colors.text.secondary }
              ]}>
                {deliveryLocation ? deliveryLocation.formatted_address : 'Tap to set delivery location'}
              </Text>
            </View>
          </View>
          {deliveryLocation && (
            <MaterialIcons name="check-circle" size={24} color={Theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <View style={styles.locationProgress}>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { 
              width: `${((pickupLocation ? 50 : 0) + (deliveryLocation ? 50 : 0))}%`,
              backgroundColor: pickupLocation && deliveryLocation ? '#4CAF50' : Theme.colors.primary
            }
          ]} />
        </View>
        <Text style={styles.progressText}>
          {pickupLocation && deliveryLocation 
            ? 'Both locations set! You can proceed to next step.' 
            : `${(pickupLocation ? 1 : 0) + (deliveryLocation ? 1 : 0)} of 2 locations set`
          }
        </Text>
      </View>

      {/* Map View Button */}
      <TouchableOpacity 
        style={styles.mapViewButton}
        onPress={() => openMapPicker(pickupLocation && !deliveryLocation ? 'delivery' : 'pickup')}
      >
        <MaterialIcons name="map" size={24} color={Theme.colors.primary} />
        <Text style={styles.mapViewText}>Open Map View</Text>
        <MaterialIcons name="arrow-forward" size={20} color={Theme.colors.primary} />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderLocationStepOLD = () => (
    <View style={styles.locationStepContainer}>
      {/* Full Screen Background Map */}
      <MapView
        style={styles.fullScreenMap}
        region={mapRegion}
        onRegionChangeComplete={onMapRegionChange}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={true}
        scrollEnabled={true}
        zoomEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
        mapPadding={{ top: 0, right: 0, bottom: 100, left: 0 }} // Reserve space for Google attribution
      >
        {/* Show markers for selected locations */}
        {pickupLocation && (
          <Marker
            coordinate={{
              latitude: pickupLocation.latitude,
              longitude: pickupLocation.longitude,
            }}
            title="Pickup Location"
            description={pickupLocation.formatted_address}
            pinColor="#4CAF50"
          />
        )}
        {deliveryLocation && (
          <Marker
            coordinate={{
              latitude: deliveryLocation.latitude,
              longitude: deliveryLocation.longitude,
            }}
            title="Delivery Location"
            description={deliveryLocation.formatted_address}
            pinColor={Theme.colors.primary}
          />
        )}
      </MapView>
      
      {/* Center Pin for setting current location */}
      <View style={styles.centerPinContainer}>
        <View style={styles.centerPin}>
          <MaterialIcons 
            name="location-on" 
            size={40} 
            color={locationPickerType === 'pickup' ? '#4CAF50' : Theme.colors.primary} 
          />
        </View>
        <View style={styles.pinShadow} />
      </View>

      {/* Draggable Uber-Style Panel */}
      <View 
        style={[
          styles.draggablePanel, 
          { 
            top: panelPosition,
            height: height - panelPosition,
          }
        ]}
        pointerEvents="box-none"
      >
        {/* Drag Handle - Only this area responds to drag gestures */}
        <View 
          style={styles.dragHandleArea}
          {...panResponder.panHandlers}
        >
          <View style={isPanelMinimized ? styles.dragHandleMinimized : styles.dragHandle} />
          {isPanelMinimized && (
            <View style={styles.minimizedIndicator}>
              <MaterialIcons 
                name={locationPickerType === 'pickup' ? 'radio-button-checked' : 'location-on'} 
                size={20} 
                color={locationPickerType === 'pickup' ? '#4CAF50' : Theme.colors.primary} 
              />
              <Text style={styles.minimizedText}>
                {locationPickerType === 'pickup' ? 'Set Pickup Location' : 'Set Delivery Location'}
              </Text>
              <MaterialIcons name="keyboard-arrow-up" size={20} color={Theme.colors.text.secondary} />
            </View>
          )}
        </View>
        
        {/* Panel Content */}
        <ScrollView
          style={styles.panelScrollView}
          contentContainerStyle={styles.panelScrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          bounces={false}
        >
          {/* Minimal Content - Always Visible */}
          <View style={styles.minimalLocationContent}>
            <Text style={styles.panelTitle}>Set Location</Text>
            
            {/* Active Location Display */}
            <TouchableOpacity 
              style={styles.uberLocationDisplay}
              onPress={() => {
                setLocationPickerType(locationPickerType === 'pickup' ? 'delivery' : 'pickup');
              }}
            >
              <View style={styles.locationIcon}>
                <MaterialIcons 
                  name={locationPickerType === 'pickup' ? 'radio-button-checked' : 'location-on'} 
                  size={24} 
                  color={locationPickerType === 'pickup' ? '#4CAF50' : Theme.colors.primary} 
                />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationTypeText}>
                  {locationPickerType === 'pickup' ? 'Pickup Location' : 'Delivery Location'}
                </Text>
                <Text style={styles.locationAddressText}>
                  {locationPickerType === 'pickup' 
                    ? (pickupLocation?.formatted_address || 'Tap to set pickup location')
                    : (deliveryLocation?.formatted_address || 'Tap to set delivery location')
                  }
                </Text>
              </View>
            </TouchableOpacity>

            {/* Confirm Pin Button */}
            <TouchableOpacity
              style={styles.confirmLocationBtn}
              onPress={confirmMapLocation}
            >
              <Text style={styles.confirmLocationText}>
                Confirm {locationPickerType === 'pickup' ? 'Pickup' : 'Delivery'} Location
              </Text>
            </TouchableOpacity>
          </View>

          {/* Extended Content - Visible When Panel is Expanded */}
          {!isPanelMinimized && (
            <View style={styles.extendedContent}>
              <View style={styles.separator} />
              
              <Text style={styles.sectionTitle}>Search Locations</Text>
              
              {/* Current Location Helper */}
              {currentLocation && (
                <TouchableOpacity 
                  style={styles.currentLocationBtn}
                  onPress={() => {
                    if (locationPickerType === 'pickup') {
                      setPickupLocation(currentLocation);
                      setPickupSearchText(currentLocation.formatted_address);
                    } else {
                      setDeliveryLocation(currentLocation);
                      setDeliverySearchText(currentLocation.formatted_address);
                    }
                  }}
                >
                  <MaterialIcons name="my-location" size={20} color={Theme.colors.primary} />
                  <Text style={styles.currentLocationText}>Use current location</Text>
                </TouchableOpacity>
              )}

              {/* Search Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>
                  {locationPickerType === 'pickup' ? '📍 Search Pickup Location' : '🎯 Search Delivery Location'}
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.addressInput}
                    placeholder={`Search ${locationPickerType} address...`}
                    value={locationPickerType === 'pickup' ? pickupSearchText : deliverySearchText}
                    onChangeText={(text) => {
                      if (locationPickerType === 'pickup') {
                        setPickupSearchText(text);
                      } else {
                        setDeliverySearchText(text);
                      }
                      searchLocationsDebounced(text);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.mapPinBtn}
                    onPress={() => {
                      setShowLocationPicker(true);
                    }}
                  >
                    <MaterialIcons name="place" size={20} color={Theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <View style={styles.searchResultsContainer}>
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item, index) => `${item.latitude}-${item.longitude}-${index}`}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.searchResultItem}
                        onPress={() => selectLocationFromSearch(item)}
                      >
                        <MaterialIcons name="place" size={20} color={Theme.colors.text.secondary} />
                        <View style={styles.searchResultContent}>
                          <Text style={styles.searchResultMainText}>{item.address}</Text>
                          <Text style={styles.searchResultSubText}>{item.formatted_address}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    style={styles.searchResultsList}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );

  const renderMaterialStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Material Details</Text>
      <Text style={styles.stepDescription}>
        Tell us what you need to transport
      </Text>

      {/* Material Type */}
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setShowMaterialModal(true)}
      >
        <Text style={styles.inputLabel}>Material Type</Text>
        <View style={styles.selectButton}>
          <Text style={materialType ? styles.selectButtonText : styles.selectButtonPlaceholder}>
            {materialType ? getMaterialLabel(materialType) : 'Select material type'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color={Theme.colors.text.secondary} />
        </View>
      </TouchableOpacity>

      {/* Load Description */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Load Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe what needs to be transported..."
          value={loadDescription}
          onChangeText={setLoadDescription}
          multiline={true}
          numberOfLines={3}
        />
      </View>

      {/* Estimated Weight */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Estimated Weight (tons)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter weight in tons"
          value={estimatedWeight}
          onChangeText={setEstimatedWeight}
          keyboardType="numeric"
        />
      </View>

      {/* Estimated Volume */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Estimated Volume (m³)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter volume in cubic meters"
          value={estimatedVolume}
          onChangeText={setEstimatedVolume}
          keyboardType="numeric"
        />
        <Text style={styles.inputHint}>
          💡 If unsure, our AI will estimate based on material type and weight
        </Text>
      </View>

      {/* Special Requirements */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Special Requirements</Text>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setSpecialRequirements(prev => ({ ...prev, requiresCrane: !prev.requiresCrane }))}
        >
          <MaterialIcons
            name={specialRequirements.requiresCrane ? "check-box" : "check-box-outline-blank"}
            size={24}
            color={Theme.colors.primary}
          />
          <Text style={styles.checkboxLabel}>Requires Crane</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setSpecialRequirements(prev => ({ ...prev, requiresHydraulicLift: !prev.requiresHydraulicLift }))}
        >
          <MaterialIcons
            name={specialRequirements.requiresHydraulicLift ? "check-box" : "check-box-outline-blank"}
            size={24}
            color={Theme.colors.primary}
          />
          <Text style={styles.checkboxLabel}>Requires Hydraulic Lift</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderTruckStep = () => {
    // Check if we have enough information for smart recommendations
    const weightNum = parseFloat(estimatedWeight) || 0;
    const canShowSmartRecommendations = materialType && weightNum > 0;

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Select Truck Type</Text>
        <Text style={styles.stepDescription}>
          {canShowSmartRecommendations 
            ? 'AI-powered recommendations based on your material and weight'
            : 'Choose the right truck for your delivery'
          }
        </Text>

        {/* Fleet Status Indicator */}
        <FleetStatusIndicator />

        {canShowSmartRecommendations ? (
          // Smart Recommendation Interface
          <SmartTruckSelector
            materialType={materialType}
            estimatedWeight={weightNum}
            estimatedVolume={parseFloat(estimatedVolume) || undefined}
            loadDescription={loadDescription}
            requiresCrane={specialRequirements.requiresCrane}
            requiresHydraulicLift={specialRequirements.requiresHydraulicLift}
            availableTrucks={truckTypes}
            selectedTruckId={selectedTruckType}
            onTruckSelect={(truckId) => setSelectedTruckType(truckId)}
            onShowAllTrucks={() => setShowTruckModal(true)}
          />
        ) : (
          // Improved: Modern truck list
          <ScrollView style={styles.fallbackContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.modernInfoBox}>
              <MaterialIcons name="lightbulb" size={22} color={Theme.colors.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Pro Tip</Text>
                <Text style={styles.infoText}>
                  Complete material type and weight in step 2 for AI-powered truck recommendations
                </Text>
              </View>
            </View>
            
            <View style={styles.trucksGrid}>
              {truckTypes.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.modernTruckCard,
                    { 
                      borderColor: selectedTruckType === item.id ? Theme.colors.primary : Theme.colors.border.light,
                      backgroundColor: selectedTruckType === item.id ? Theme.colors.background.section : Theme.colors.background.card,
                      borderWidth: selectedTruckType === item.id ? 2 : 1
                    }
                  ]}
                  onPress={() => setSelectedTruckType(item.id)}
                >
                  <View style={styles.truckCardContent}>
                    <View style={styles.truckHeader}>
                      <View style={[
                        styles.truckIconContainer,
                        { backgroundColor: selectedTruckType === item.id ? Theme.colors.primary + '20' : Theme.colors.background.secondary }
                      ]}>
                        <MaterialIcons 
                          name="local-shipping" 
                          size={32} 
                          color={selectedTruckType === item.id ? Theme.colors.primary : Theme.colors.text.secondary} 
                        />
                      </View>
                      {selectedTruckType === item.id && (
                        <View style={styles.selectedBadge}>
                          <MaterialIcons name="check-circle" size={24} color={Theme.colors.success} />
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.truckMainInfo}>
                      <Text style={[
                        styles.modernTruckName, 
                        { color: selectedTruckType === item.id ? Theme.colors.primary : Theme.colors.text.primary }
                      ]}>
                        {item.name}
                      </Text>
                      <Text style={styles.modernTruckDescription}>{item.description}</Text>
                    </View>
                    
                    <View style={styles.truckSpecs}>
                      <View style={styles.specItem}>
                        <MaterialIcons name="fitness-center" size={16} color={Theme.colors.text.secondary} />
                        <Text style={styles.specText}>{item.payload_capacity}kg</Text>
                      </View>
                      <View style={styles.specDivider} />
                      <View style={styles.specItem}>
                        <MaterialIcons name="inventory" size={16} color={Theme.colors.text.secondary} />
                        <Text style={styles.specText}>{item.volume_capacity}m³</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  const renderTimeStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Schedule Pickup</Text>
      <Text style={styles.stepDescription}>
        When would you like the pickup to happen?
      </Text>

      {/* Time Preference */}
      <View style={styles.timeOptions}>
        <TouchableOpacity
          style={[
            styles.timeOption,
            { backgroundColor: pickupTimePreference === 'asap' ? Theme.colors.primary : 'transparent' }
          ]}
          onPress={() => setPickupTimePreference('asap')}
        >
          <MaterialIcons
            name="flash-on"
            size={24}
            color={pickupTimePreference === 'asap' ? 'white' : Theme.colors.text.secondary}
          />
          <Text style={[
            styles.timeOptionText,
            { color: pickupTimePreference === 'asap' ? 'white' : Theme.colors.text.primary }
          ]}>
            As Soon As Possible
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.timeOption,
            { backgroundColor: pickupTimePreference === 'scheduled' ? Theme.colors.primary : 'transparent' }
          ]}
          onPress={() => setPickupTimePreference('scheduled')}
        >
          <MaterialIcons
            name="schedule"
            size={24}
            color={pickupTimePreference === 'scheduled' ? 'white' : Theme.colors.text.secondary}
          />
          <Text style={[
            styles.timeOptionText,
            { color: pickupTimePreference === 'scheduled' ? 'white' : Theme.colors.text.primary }
          ]}>
            Schedule for Later
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scheduled Time Picker */}
      {pickupTimePreference === 'scheduled' && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Pickup Date & Time</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDateTimePicker(true)}
          >
            <MaterialIcons name="date-range" size={24} color={Theme.colors.primary} />
            <Text style={styles.dateTimeText}>
              {scheduledTime ? scheduledTime.toLocaleString() : 'Select date and time'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Price Estimate */}
      <View style={styles.priceEstimate}>
        <Text style={styles.priceLabel}>Estimated Cost</Text>
        <Text style={styles.priceAmount}>SAR {estimatedPrice.toFixed(2)}</Text>
      </View>
    </ScrollView>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderLocationStep();
      case 2:
        return renderMaterialStep();
      case 3:
        return renderTruckStep();
      case 4:
        return renderTimeStep();
      case 5:
        return renderPaymentStep();
      default:
        return null;
    }
  };

  // Render payment step
  const renderPaymentStep = () => (
    <PaymentSelectionScreen
      onBack={() => setCurrentStep(4)}
      onPaymentMethodSelected={handlePaymentMethodSelected}
      tripAmount={estimatedPrice}
      tripDetails={{
        pickupAddress: pickupLocation?.formatted_address || pickupLocation?.address || '',
        deliveryAddress: deliveryLocation?.formatted_address || deliveryLocation?.address || '',
        truckType: truckTypes.find(t => t.id === selectedTruckType)?.name || 'Standard Truck'
      }}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Delivery</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Content */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderStepContent()}
      </KeyboardAvoidingView>

      {/* Navigation Buttons - Hide on payment step */}
      {currentStep !== 5 && (
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backStepButton} onPress={prevStep}>
              <Text style={styles.backStepText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              { opacity: canProceedToNextStep() ? 1 : 0.5 }
            ]}
            onPress={currentStep === 4 ? submitOrder : nextStep}
            disabled={!canProceedToNextStep() || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.nextButtonText}>
                {currentStep === 4 ? 'Continue to Payment' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Location Picker Modal - Uber Style */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <MaterialIcons name="close" size={24} color={Theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Set {locationPickerType === 'pickup' ? 'Pickup' : 'Delivery'} Location
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          
          {/* Search Bar */}
          <View style={styles.mapSearchContainer}>
            <TextInput
              style={styles.mapSearchInput}
              placeholder={`Search for ${locationPickerType} location...`}
              value={locationPickerType === 'pickup' ? pickupSearchText : deliverySearchText}
              onChangeText={(text) => {
                if (locationPickerType === 'pickup') {
                  setPickupSearchText(text);
                } else {
                  setDeliverySearchText(text);
                }
                searchLocationsDebounced(text);
              }}
            />
            {isSearching && (
              <ActivityIndicator 
                style={styles.searchLoader} 
                color={Theme.colors.primary} 
                size="small" 
              />
            )}
          </View>

          {/* Search Results Overlay */}
          {searchResults.length > 0 && (
            <View style={styles.searchResultsOverlay}>
              <ScrollView style={styles.searchResultsList}>
                {searchResults.map((result, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.searchResultRow}
                    onPress={() => {
                      selectLocationFromSearch(result);
                      setMapRegion({
                        latitude: result.latitude,
                        longitude: result.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      });
                    }}
                  >
                    <MaterialIcons name="location-on" size={20} color={Theme.colors.text.secondary} />
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultMainText}>{result.address}</Text>
                      <Text style={styles.searchResultSubText}>{result.formatted_address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Map with Center Pin */}
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={mapRegion}
              onRegionChangeComplete={onMapRegionChange}
              provider={PROVIDER_GOOGLE}
              showsUserLocation={true}
              showsMyLocationButton={true}
              mapPadding={{ top: 0, right: 0, bottom: 100, left: 0 }} // Reserve space for Google attribution
            />
            
            {/* Center Pin - Uber Style */}
            <View style={styles.centerPinContainer}>
              <View style={styles.centerPin}>
                <MaterialIcons 
                  name="location-on" 
                  size={40} 
                  color={locationPickerType === 'pickup' ? '#4CAF50' : Theme.colors.primary} 
                />
              </View>
              <View style={styles.pinShadow} />
            </View>
          </View>
          
          {/* Confirm Button */}
          <View style={styles.mapConfirmContainer}>
            <TouchableOpacity
              style={styles.confirmLocationButton}
              onPress={confirmMapLocation}
            >
              <Text style={styles.confirmLocationText}>
                Confirm {locationPickerType === 'pickup' ? 'Pickup' : 'Delivery'} Location
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Material Type Modal */}
      <Modal
        visible={showMaterialModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMaterialModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.materialModal}>
            <Text style={styles.modalTitle}>Select Material Type</Text>
            <FlatList
              data={getAllMaterials()}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.materialOption}
                  onPress={() => {
                    setMaterialType(item.value);
                    setShowMaterialModal(false);
                  }}
                >
                  <Text style={styles.materialIcon}>{item.icon}</Text>
                  <Text style={styles.materialLabel}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMaterialModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Enhanced Truck Selection Modal */}
      <Modal
        visible={showTruckModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowTruckModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTruckModal(false)}>
              <MaterialIcons name="close" size={24} color={Theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>All Available Trucks</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={20} color={Theme.colors.primary} />
              <Text style={styles.infoText}>
                Select any truck type from the complete list below
              </Text>
            </View>
            
            <FlatList
              data={truckTypes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.truckOption,
                    { borderColor: selectedTruckType === item.id ? Theme.colors.primary : Theme.colors.border.light }
                  ]}
                  onPress={() => {
                    setSelectedTruckType(item.id);
                    setShowTruckModal(false);
                  }}
                >
                  <View style={styles.truckInfo}>
                    <Text style={styles.truckName}>{item.name}</Text>
                    <Text style={styles.truckDescription}>{item.description}</Text>
                    <Text style={styles.truckCapacity}>
                      Capacity: {item.payload_capacity}kg | Volume: {item.volume_capacity}m³
                    </Text>
                  </View>
                  {selectedTruckType === item.id && (
                    <MaterialIcons name="check-circle" size={24} color={Theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date Time Picker */}
      <DateTimePicker
        visible={showDateTimePicker}
        value={scheduledTime || undefined}
        onDateTimeChange={(date) => {
          setScheduledTime(date);
          setShowDateTimePicker(false);
        }}
        onCancel={() => setShowDateTimePicker(false)}
        minimumDate={new Date()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Theme.colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Theme.colors.text.primary,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    marginBottom: 24,
  },
  locationSection: {
    marginBottom: 24,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 8,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  mapButton: {
    marginLeft: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  // Uber-style location selection layout
  locationStepContainer: {
    flex: 1,
  },
  fullScreenMap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.9,
  },
  bottomPanelContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    minHeight: height * 0.9, // Allow scrolling up
  },
  scrollSpacer: {
    height: height * 0.3, // Creates space to scroll up and see more map
  },
  panelCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: height * 0.4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#CCC',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
    opacity: 0.8,
  },
  dragHandleMinimized: {
    width: 50,
    height: 6,
    backgroundColor: Theme.colors.primary,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
    opacity: 1,
  },
  minimalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  locationIcon: {
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  locationAddressText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  confirmLocationBtn: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmLocationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  extendedContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  currentLocationText: {
    marginLeft: 8,
    fontSize: 14,
    color: Theme.colors.primary,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  mapPinBtn: {
    marginLeft: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  selectedLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0F8F0',
    borderRadius: 6,
  },
  selectedLocationText: {
    marginLeft: 8,
    color: '#333',
    fontSize: 14,
    flex: 1,
  },
  searchResultsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  searchResultText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  // Add back essential missing styles
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    alignItems: 'center',
  },
  centerPin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinShadow: {
    width: 4,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    marginTop: -8,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  selectButtonText: {
    fontSize: 16,
    color: Theme.colors.text.primary,
  },
  selectButtonPlaceholder: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: Theme.colors.text.primary,
  },
  truckOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  truckInfo: {
    flex: 1,
  },
  truckName: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 4,
  },
  truckDescription: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginBottom: 4,
  },
  truckCapacity: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
  },
  timeOptions: {
    marginBottom: 24,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    marginBottom: 12,
  },
  timeOptionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  dateTimeText: {
    marginLeft: 8,
    fontSize: 16,
    color: Theme.colors.text.primary,
  },
  priceEstimate: {
    backgroundColor: Theme.colors.background.secondary,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  priceLabel: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  backStepButton: {
    flex: 1,
    padding: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    alignItems: 'center',
  },
  backStepText: {
    fontSize: 16,
    color: Theme.colors.text.primary,
    fontWeight: '500',
  },
  nextButton: {
    flex: 2,
    backgroundColor: Theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    textAlign: 'center',
  },
  mapSearchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  mapSearchInput: {
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  searchLoader: {
    position: 'absolute',
    right: 28,
    top: 28,
  },
  searchResultsOverlay: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultContent: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultMainText: {
    fontSize: 16,
    color: Theme.colors.text.primary,
    fontWeight: '500',
  },
  searchResultSubText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapConfirmContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  confirmLocationButton: {
    backgroundColor: Theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  materialModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.7,
  },
  materialOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  materialIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  materialLabel: {
    fontSize: 16,
    color: Theme.colors.text.primary,
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
  },
  // Draggable Uber-style panel styles
  draggablePanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    minHeight: 140, // Ensure minimum visible height
  },
  dragHandleArea: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    // Add visual indication this is draggable
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  panelScrollView: {
    flex: 1,
  },
  panelScrollContent: {
    flexGrow: 1,
  },
  uberBottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.9,
    // Allow map interaction when panel is minimized
    pointerEvents: 'box-none', // Only capture events on child components
  },
  uberPanelContent: {
    flexGrow: 1,
  },
  mapSpacer: {
    height: height * 0.6, // Shows map initially, scroll up to reveal panel
    // Disable pointer events on spacer to allow map interaction
    pointerEvents: 'none',
  },
  uberPanelCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: height * 0.4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    // Ensure panel captures touch events
    pointerEvents: 'auto',
  },
  minimalLocationContent: {
    padding: 20,
  },
  separator: {
    height: 1,
    backgroundColor: Theme.colors.border.light,
    marginVertical: 16,
  },
  uberLocationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: 12,
    marginTop: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  // Minimized panel styles
  minimizedPanel: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  minimizedPanelContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  minimizedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  minimizedText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  minimizedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  // New location card styles
  locationCards: {
    marginVertical: 20,
  },
  locationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationCardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    lineHeight: 20,
  },
  locationProgress: {
    marginVertical: 20,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  mapViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    marginTop: 12,
  },
  mapViewText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginLeft: 8,
    marginRight: 8,
  },
  // Smart truck recommendation styles
  fallbackContainer: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputHint: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Modern truck selection styles
  modernInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 4,
  },
  trucksGrid: {
    gap: 12,
  },
  modernTruckCard: {
    backgroundColor: Theme.colors.background.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
    marginBottom: 12,
  },
  truckCardContent: {
    flex: 1,
  },
  truckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  truckIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Theme.colors.background.card,
    borderRadius: 16,
    padding: 4,
  },
  truckMainInfo: {
    flex: 1,
  },
  modernTruckName: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 4,
  },
  modernTruckDescription: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    lineHeight: 18,
  },
  truckSpecs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specText: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  specDivider: {
    width: 1,
    height: 12,
    backgroundColor: Theme.colors.border.light,
    marginHorizontal: 12,
  },
});

export default EnhancedRequestTruckScreen;
