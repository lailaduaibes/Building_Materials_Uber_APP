/**
 * Enhanced LocationPicker Component with Country/City Selection
 * Smart location detection, map interface, country/city selection, and address suggestions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { createClient } from '@supabase/supabase-js';

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

// Supabase configuration
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28'
);

// Country and city data for better user experience
const COUNTRIES_DATA = [
  {
    code: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    cities: [
      { name: 'Johannesburg', coordinates: { latitude: -26.2041, longitude: 28.0473 } },
      { name: 'Cape Town', coordinates: { latitude: -33.9249, longitude: 18.4241 } },
      { name: 'Durban', coordinates: { latitude: -29.8587, longitude: 31.0218 } },
      { name: 'Pretoria', coordinates: { latitude: -25.7479, longitude: 28.2293 } },
      { name: 'Port Elizabeth', coordinates: { latitude: -33.9608, longitude: 25.6022 } },
      { name: 'Bloemfontein', coordinates: { latitude: -29.0852, longitude: 26.1596 } },
    ]
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    cities: [
      { name: 'New York', coordinates: { latitude: 40.7128, longitude: -74.0060 } },
      { name: 'Los Angeles', coordinates: { latitude: 34.0522, longitude: -118.2437 } },
      { name: 'Chicago', coordinates: { latitude: 41.8781, longitude: -87.6298 } },
      { name: 'Houston', coordinates: { latitude: 29.7604, longitude: -95.3698 } },
      { name: 'Miami', coordinates: { latitude: 25.7617, longitude: -80.1918 } },
      { name: 'Atlanta', coordinates: { latitude: 33.7490, longitude: -84.3880 } },
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    cities: [
      { name: 'London', coordinates: { latitude: 51.5074, longitude: -0.1278 } },
      { name: 'Manchester', coordinates: { latitude: 53.4808, longitude: -2.2426 } },
      { name: 'Birmingham', coordinates: { latitude: 52.4862, longitude: -1.8904 } },
      { name: 'Liverpool', coordinates: { latitude: 53.4084, longitude: -2.9916 } },
      { name: 'Edinburgh', coordinates: { latitude: 55.9533, longitude: -3.1883 } },
      { name: 'Glasgow', coordinates: { latitude: 55.8642, longitude: -4.2518 } },
    ]
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    cities: [
      { name: 'Sydney', coordinates: { latitude: -33.8688, longitude: 151.2093 } },
      { name: 'Melbourne', coordinates: { latitude: -37.8136, longitude: 144.9631 } },
      { name: 'Brisbane', coordinates: { latitude: -27.4698, longitude: 153.0251 } },
      { name: 'Perth', coordinates: { latitude: -31.9505, longitude: 115.8605 } },
      { name: 'Adelaide', coordinates: { latitude: -34.9285, longitude: 138.6007 } },
      { name: 'Canberra', coordinates: { latitude: -35.2809, longitude: 149.1300 } },
    ]
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    cities: [
      { name: 'Riyadh', coordinates: { latitude: 24.7136, longitude: 46.6753 } },
      { name: 'Jeddah', coordinates: { latitude: 21.4858, longitude: 39.1925 } },
      { name: 'Mecca', coordinates: { latitude: 21.3891, longitude: 39.8579 } },
      { name: 'Medina', coordinates: { latitude: 24.5247, longitude: 39.5692 } },
      { name: 'Dammam', coordinates: { latitude: 26.4367, longitude: 50.1040 } },
      { name: 'Al Khobar', coordinates: { latitude: 26.2794, longitude: 50.2080 } },
      { name: 'Tabuk', coordinates: { latitude: 28.3838, longitude: 36.5550 } },
      { name: 'Abha', coordinates: { latitude: 18.2164, longitude: 42.5053 } },
      { name: 'Buraidah', coordinates: { latitude: 26.3260, longitude: 43.9750 } },
      { name: 'Khamis Mushait', coordinates: { latitude: 18.3000, longitude: 42.7333 } },
    ]
  },
];

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  formatted_address: string;
  country?: string;
  city?: string;
}

interface LocationSuggestion {
  id: string;
  title: string;
  subtitle: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  source?: string;
  placeId?: string;
  businessType?: string;
  truckAccessible?: boolean;
  loadingDock?: boolean;
  craneAvailable?: boolean;
  areaType?: string;
}

interface Country {
  code: string;
  name: string;
  flag: string;
  cities: Array<{
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
}

interface LocationPickerProps {
  label: string;
  placeholder: string;
  value: LocationData | null;
  onLocationSelect: (location: LocationData) => void;
  currentLocation?: LocationData | null;
}

export const LocationPickerEnhanced: React.FC<LocationPickerProps> = ({
  label,
  placeholder,
  value,
  onLocationSelect,
  currentLocation,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: currentLocation?.latitude || -26.2041,
    longitude: currentLocation?.longitude || 28.0473,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [tempMarker, setTempMarker] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Country/City selection states
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(COUNTRIES_DATA[0]); // Default to South Africa
  const [selectedCity, setSelectedCity] = useState<typeof COUNTRIES_DATA[0]['cities'][0] | null>(COUNTRIES_DATA[0].cities[0]); // Default to Johannesburg
  const [pickerMode, setPickerMode] = useState<'main' | 'country' | 'city'>('main');

  useEffect(() => {
    if (searchText.length > 2) {
      searchLocations(searchText);
    } else {
      setSuggestions([]);
    }
  }, [searchText, selectedCountry, selectedCity]);

  // Update map region when country/city changes
  useEffect(() => {
    if (selectedCity) {
      setMapRegion({
        latitude: selectedCity.coordinates.latitude,
        longitude: selectedCity.coordinates.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    }
  }, [selectedCity]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setSelectedCity(country.cities[0]); // Auto-select first city
    setPickerMode('main'); // Go back to main picker
  };

  const handleCitySelect = (city: typeof COUNTRIES_DATA[0]['cities'][0]) => {
    setSelectedCity(city);
    setPickerMode('main'); // Go back to main picker
  };

  const getCurrentLocation = async () => {
    if (isLoadingLocation) return;
    
    try {
      setIsLoadingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please enable location services');
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
        const country = addr.country || selectedCountry?.name || 'Unknown';
        
        const formattedAddress = `${street} ${name}, ${city}, ${region} ${postalCode}`.trim();
        
        const locationData: LocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: formattedAddress,
          formatted_address: formattedAddress,
          country: country,
          city: city || selectedCity?.name || 'Unknown',
        };

        onLocationSelect(locationData);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Unable to get your current location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const searchLocations = async (query: string) => {
    try {
      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      // Add country/city context to search
      const searchQuery = `${query} ${selectedCity?.name} ${selectedCountry?.name}`;

      // Step 1: Search the addresses table in Supabase database first
      const { data: addressResults, error } = await supabase
        .from('addresses')
        .select('*')
        .or(`name.ilike.%${query}%,formatted_address.ilike.%${query}%,city.ilike.%${selectedCity?.name}%,business_type.ilike.%${query}%`)
        .order('usage_count', { ascending: false })
        .limit(3);

      let allSuggestions: LocationSuggestion[] = [];

      if (!error && addressResults && addressResults.length > 0) {
        const databaseSuggestions: LocationSuggestion[] = addressResults.map((address: any) => ({
          id: address.id,
          title: address.name,
          subtitle: `${address.formatted_address}${address.truck_accessible ? ' 🚛' : ''}${address.loading_dock ? ' 🏭' : ''}${address.crane_available ? ' 🏗️' : ''} [Saved]`,
          coordinates: {
            latitude: parseFloat(address.latitude),
            longitude: parseFloat(address.longitude)
          },
          source: 'database',
          businessType: address.business_type,
          truckAccessible: address.truck_accessible,
          loadingDock: address.loading_dock,
          craneAvailable: address.crane_available,
          areaType: address.area_type
        }));
        
        allSuggestions = [...databaseSuggestions];
      }

      // Step 2: Add popular building materials locations for selected city
      if (selectedCity && selectedCountry) {
        const popularLocations = getPopularBuildingMaterialsLocations(selectedCity.name, selectedCountry.code);
        const popularSuggestions: LocationSuggestion[] = popularLocations
          .filter(loc => loc.name.toLowerCase().includes(query.toLowerCase()))
          .map(loc => ({
            id: `popular-${loc.id}`,
            title: loc.name,
            subtitle: `${loc.address} 🚛🏭 [Popular in ${selectedCity.name}]`,
            coordinates: loc.coordinates,
            source: 'popular',
            businessType: loc.type,
            truckAccessible: true,
            loadingDock: true,
            craneAvailable: loc.crane,
          }));
        
        allSuggestions = [...allSuggestions, ...popularSuggestions];
      }

      // Step 3: Set suggestions or show no results message
      if (allSuggestions.length > 0) {
        setSuggestions(allSuggestions.slice(0, 5));
      } else {
        const noResultsSuggestion: LocationSuggestion[] = [
          {
            id: 'no-results',
            title: `No results found for "${query}" in ${selectedCity?.name}`,
            subtitle: 'Try searching for building suppliers, warehouses, or industrial areas',
            coordinates: selectedCity?.coordinates || { latitude: -26.2041, longitude: 28.0473 },
            source: 'no-results'
          }
        ];
        setSuggestions(noResultsSuggestion);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      const errorSuggestions: LocationSuggestion[] = [
        {
          id: 'error',
          title: 'Search temporarily unavailable',
          subtitle: 'Please try again or use current location',
          coordinates: selectedCity?.coordinates || { latitude: -26.2041, longitude: 28.0473 },
          source: 'error'
        }
      ];
      setSuggestions(errorSuggestions);
    }
  };

  const getPopularBuildingMaterialsLocations = (cityName: string, countryCode: string) => {
    // Popular building materials locations by city
    const locations: Record<string, any[]> = {
      'Johannesburg': [
        {
          id: 1,
          name: 'BuildCorp Industrial Suppliers',
          address: '123 Industrial Road, Germiston',
          coordinates: { latitude: -26.2309, longitude: 28.1405 },
          type: 'Building Supplies',
          crane: true
        },
        {
          id: 2,
          name: 'Mega Build Warehouse',
          address: '456 Construction Ave, Sandton',
          coordinates: { latitude: -26.1076, longitude: 28.0567 },
          type: 'Hardware Store',
          crane: false
        },
        {
          id: 3,
          name: 'Steel & Cement Depot',
          address: '789 Heavy Materials St, Boksburg',
          coordinates: { latitude: -26.2078, longitude: 28.2618 },
          type: 'Metal & Steel',
          crane: true
        }
      ],
      'Cape Town': [
        {
          id: 4,
          name: 'Cape Build Supplies',
          address: '321 Industrial Park, Bellville',
          coordinates: { latitude: -33.8903, longitude: 18.6292 },
          type: 'Building Supplies',
          crane: true
        },
        {
          id: 5,
          name: 'Atlantic Hardware',
          address: '654 Warehouse District, Parow',
          coordinates: { latitude: -33.8758, longitude: 18.6371 },
          type: 'Hardware Store',
          crane: false
        }
      ],
      'Durban': [
        {
          id: 6,
          name: 'KZN Building Materials',
          address: '987 Port Road, Pinetown',
          coordinates: { latitude: -29.8214, longitude: 30.8731 },
          type: 'Building Supplies',
          crane: true
        }
      ],
      // Saudi Arabia Cities
      'Riyadh': [
        {
          id: 7,
          name: 'Riyadh Building Materials Company',
          address: 'King Fahd Industrial City, Riyadh',
          coordinates: { latitude: 24.7136, longitude: 46.6753 },
          type: 'Building Supplies',
          crane: true
        },
        {
          id: 8,
          name: 'Al-Rajhi Building Materials',
          address: 'Al Olaya District, Riyadh',
          coordinates: { latitude: 24.7000, longitude: 46.6700 },
          type: 'Hardware Store',
          crane: false
        },
        {
          id: 9,
          name: 'Saudi Steel & Cement Co.',
          address: 'Industrial Zone, Riyadh',
          coordinates: { latitude: 24.7200, longitude: 46.6800 },
          type: 'Metal & Steel',
          crane: true
        }
      ],
      'Jeddah': [
        {
          id: 10,
          name: 'Jeddah Construction Materials',
          address: 'Al-Haramain Road, Jeddah',
          coordinates: { latitude: 21.4858, longitude: 39.1925 },
          type: 'Building Supplies',
          crane: true
        },
        {
          id: 11,
          name: 'Red Sea Building Supplies',
          address: 'King Abdulaziz Road, Jeddah',
          coordinates: { latitude: 21.4900, longitude: 39.1900 },
          type: 'Hardware Store',
          crane: false
        }
      ],
      'Dammam': [
        {
          id: 12,
          name: 'Eastern Province Building Materials',
          address: 'King Saud Road, Dammam',
          coordinates: { latitude: 26.4367, longitude: 50.1040 },
          type: 'Building Supplies',
          crane: true
        },
        {
          id: 13,
          name: 'Gulf Coast Construction Supplies',
          address: 'Industrial Area, Dammam',
          coordinates: { latitude: 26.4400, longitude: 50.1100 },
          type: 'Hardware Store',
          crane: false
        }
      ],
      'Mecca': [
        {
          id: 14,
          name: 'Holy City Building Materials',
          address: 'Aziziyah District, Mecca',
          coordinates: { latitude: 21.3891, longitude: 39.8579 },
          type: 'Building Supplies',
          crane: false
        }
      ],
      'Medina': [
        {
          id: 15,
          name: 'Prophet\'s City Construction Co.',
          address: 'Al Haram Road, Medina',
          coordinates: { latitude: 24.5247, longitude: 39.5692 },
          type: 'Building Supplies',
          crane: false
        }
      ],
      'Al Khobar': [
        {
          id: 16,
          name: 'Khobar Industrial Supplies',
          address: 'Corniche Road, Al Khobar',
          coordinates: { latitude: 26.2794, longitude: 50.2080 },
          type: 'Building Supplies',
          crane: true
        }
      ]
    };

    return locations[cityName] || [];
  };

  const handleSuggestionSelect = async (suggestion: LocationSuggestion) => {
    if (suggestion.source === 'no-results' || suggestion.source === 'error') {
      return;
    }

    const locationData: LocationData = {
      latitude: suggestion.coordinates.latitude,
      longitude: suggestion.coordinates.longitude,
      address: suggestion.title,
      formatted_address: suggestion.subtitle.replace(/\s*\[.*?\]\s*/g, ''), // Remove tags like [Saved], [Popular]
      country: selectedCountry?.name,
      city: selectedCity?.name,
    };

    onLocationSelect(locationData);
    setShowPicker(false);
    setSearchText('');
    setSuggestions([]);
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      let formattedAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      if (address.length > 0) {
        const addr = address[0];
        // Safely handle null/undefined values to prevent Android NullPointerException
        const street = addr.street || '';
        const name = addr.name || '';
        const city = addr.city || selectedCity?.name || 'Unknown';
        const region = addr.region || '';
        const postalCode = addr.postalCode || '';
        
        formattedAddress = `${street} ${name}, ${city}, ${region} ${postalCode}`.trim();
      }

      const locationData: LocationData = {
        latitude,
        longitude,
        address: formattedAddress,
        formatted_address: formattedAddress,
        country: selectedCountry?.name || 'Unknown',
        city: selectedCity?.name || 'Unknown',
      };

      setTempMarker(locationData);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      const locationData: LocationData = {
        latitude,
        longitude,
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        formatted_address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        country: selectedCountry?.name,
        city: selectedCity?.name,
      };
      setTempMarker(locationData);
    }
  };

  const confirmMapSelection = () => {
    if (tempMarker) {
      onLocationSelect(tempMarker);
      setShowMap(false);
      setTempMarker(null);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
          <MaterialIcons name="location-on" size={20} color={theme.lightText} />
          <Text style={[styles.inputText, value ? styles.inputTextFilled : null]}>
            {value ? value.address : placeholder}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.lightText} />
        </TouchableOpacity>
      </View>

      {/* Enhanced Location Picker Modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={styles.title}>Select Location</Text>
              <View style={{ width: 24 }} />
            </View>

            {pickerMode === 'main' && (
              <>
                {/* Country/City Selection */}
                <View style={styles.selectionContainer}>
                  <Text style={styles.sectionTitle}>Select Country & City</Text>
                  
                  <View style={styles.countrycityRow}>
                    {/* Country Picker */}
                    <TouchableOpacity 
                      style={[styles.pickerButton, { flex: 1, marginRight: 8 }]}
                      onPress={() => {
                        console.log('Country picker pressed');
                        setPickerMode('country');
                      }}
                    >
                      <Text style={styles.pickerButtonText}>
                        {selectedCountry?.flag} {selectedCountry?.name}
                      </Text>
                      <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.lightText} />
                    </TouchableOpacity>

                    {/* City Picker */}
                    <TouchableOpacity 
                      style={[styles.pickerButton, { flex: 1, marginLeft: 8 }]}
                      onPress={() => {
                        console.log('City picker pressed');
                        setPickerMode('city');
                      }}
                    >
                      <Text style={styles.pickerButtonText}>
                        🏙️ {selectedCity?.name}
                      </Text>
                      <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.lightText} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={() => {
                      setShowPicker(false);
                      getCurrentLocation();
                    }}
                    disabled={isLoadingLocation}
                  >
                    {isLoadingLocation ? (
                      <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                      <MaterialIcons name="my-location" size={20} color={theme.accent} />
                    )}
                    <Text style={styles.quickActionText}>Use current location</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={() => {
                      setShowPicker(false);
                      setShowMap(true);
                    }}
                  >
                    <MaterialIcons name="map" size={20} color={theme.accent} />
                    <Text style={styles.quickActionText}>Set on map</Text>
                  </TouchableOpacity>
                </View>

                {/* Search Input */}
                <View style={styles.searchContainer}>
                  <MaterialIcons name="search" size={20} color={theme.lightText} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Search in ${selectedCity?.name}...`}
                    placeholderTextColor={theme.lightText}
                    value={searchText}
                    onChangeText={setSearchText}
                    autoFocus={false}
                  />
                </View>

                {/* Suggestions */}
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={[
                        styles.suggestionItem,
                        (item.source === 'no-results' || item.source === 'error') && styles.suggestionItemDisabled
                      ]}
                      onPress={() => handleSuggestionSelect(item)}
                      disabled={item.source === 'no-results' || item.source === 'error'}
                    >
                      <MaterialIcons 
                        name={
                          item.source === 'error' ? 'error-outline' :
                          item.source === 'no-results' ? 'search-off' :
                          item.source === 'popular' ? 'star' :
                          'location-on'
                        } 
                        size={20} 
                        color={
                          item.source === 'error' ? '#FF3B30' :
                          item.source === 'no-results' ? theme.lightText :
                          item.source === 'popular' ? '#FF9500' :
                          theme.accent
                        } 
                      />
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionTitle}>{item.title}</Text>
                        <Text style={styles.suggestionSubtitle}>{item.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}

            {pickerMode === 'country' && (
              <>
                <View style={styles.header}>
                  <TouchableOpacity onPress={() => setPickerMode('main')}>
                    <MaterialIcons name="arrow-back" size={24} color={theme.text} />
                  </TouchableOpacity>
                  <Text style={styles.title}>Select Country</Text>
                  <View style={{ width: 24 }} />
                </View>
                
                <FlatList
                  data={COUNTRIES_DATA}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.countryItem}
                      onPress={() => handleCountrySelect(item)}
                    >
                      <Text style={styles.countryFlag}>{item.flag}</Text>
                      <Text style={styles.countryName}>{item.name}</Text>
                      {selectedCountry?.code === item.code && (
                        <MaterialIcons name="check" size={20} color={theme.success} />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </>
            )}

            {pickerMode === 'city' && (
              <>
                <View style={styles.header}>
                  <TouchableOpacity onPress={() => setPickerMode('main')}>
                    <MaterialIcons name="arrow-back" size={24} color={theme.text} />
                  </TouchableOpacity>
                  <Text style={styles.title}>Select City in {selectedCountry?.name}</Text>
                  <View style={{ width: 24 }} />
                </View>
                
                <FlatList
                  data={selectedCountry?.cities || []}
                  keyExtractor={(item) => item.name}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.cityItem}
                      onPress={() => handleCitySelect(item)}
                    >
                      <Text style={styles.cityIcon}>🏙️</Text>
                      <Text style={styles.cityName}>{item.name}</Text>
                      {selectedCity?.name === item.name && (
                        <MaterialIcons name="check" size={20} color={theme.success} />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Enhanced Map Modal */}
      <Modal visible={showMap} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalContent}>
            {/* Map Header with Country/City Context */}
            <View style={styles.mapHeader}>
              <TouchableOpacity onPress={() => setShowMap(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <View style={styles.mapTitleContainer}>
                <Text style={styles.mapTitle}>Set Location</Text>
                <Text style={styles.mapSubtitle}>
                  {selectedCountry?.flag} {selectedCity?.name}, {selectedCountry?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={confirmMapSelection}
                disabled={!tempMarker}
                style={[styles.confirmButton, !tempMarker && styles.confirmButtonDisabled]}
              >
                <Text style={[styles.confirmText, !tempMarker && styles.confirmTextDisabled]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={false}
              mapType="standard"
            >
              {tempMarker && (
                <Marker
                  coordinate={{
                    latitude: tempMarker.latitude,
                    longitude: tempMarker.longitude,
                  }}
                  title="Selected Location"
                  description={tempMarker.address}
                />
              )}
            </MapView>

            {tempMarker && (
              <View style={styles.selectedLocationInfo}>
                <MaterialIcons name="location-on" size={20} color={theme.accent} />
                <Text style={styles.selectedLocationText} numberOfLines={2}>
                  {tempMarker.address}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: theme.lightText,
    marginLeft: 12,
  },
  inputTextFilled: {
    color: theme.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.background,
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 60,
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
    textAlign: 'center',
  },
  selectionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: '#FAFAFA',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  countrycityRow: {
    flexDirection: 'row',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pickerButtonText: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 14,
    color: theme.accent,
    marginLeft: 8,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.inputBackground,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
    marginLeft: 12,
    paddingVertical: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  suggestionItemDisabled: {
    opacity: 0.6,
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionTitle: {
    fontSize: 16,
    color: theme.text,
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 14,
    color: theme.lightText,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cityIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  cityName: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
  },
  mapModalOverlay: {
    flex: 1,
    backgroundColor: theme.background,
  },
  mapModalContent: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 60,
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    elevation: 4,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  mapTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  mapSubtitle: {
    fontSize: 12,
    color: theme.lightText,
    marginTop: 2,
  },
  confirmButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.accent,
    borderRadius: 12,
    minWidth: 80,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
    backgroundColor: theme.border,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.secondary,
    textAlign: 'center',
  },
  confirmTextDisabled: {
    color: theme.lightText,
  },
  map: {
    flex: 1,
  },
  selectedLocationInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.background,
    borderRadius: 12,
    elevation: 8,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  selectedLocationText: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
    marginLeft: 8,
  },
});

export default LocationPickerEnhanced;
