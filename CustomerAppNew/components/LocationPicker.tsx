/**
 * Enhanced LocationPicker Component
 * Smart location detection, map interface, and address suggestions
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

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  formatted_address: string;
}

interface LocationSuggestion {
  id: string;
  title: string;
  subtitle: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  source?: string; // 'database', 'places_api', 'no-results', 'error'
  placeId?: string; // For Google Places results
  businessType?: string;
  truckAccessible?: boolean;
  loadingDock?: boolean;
  craneAvailable?: boolean;
  areaType?: string;
}

interface LocationPickerProps {
  label: string;
  placeholder: string;
  value: LocationData | null;
  onLocationSelect: (location: LocationData) => void;
  currentLocation?: LocationData | null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
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

  useEffect(() => {
    if (searchText.length > 2) {
      searchLocations(searchText);
    } else {
      setSuggestions([]);
    }
  }, [searchText]);

  const getCurrentLocation = async () => {
    if (isLoadingLocation) return; // Prevent double calls
    
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
        
        const formattedAddress = `${street} ${name}, ${city}, ${region} ${postalCode}`.trim();
        
        const locationData: LocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: formattedAddress,
          formatted_address: formattedAddress,
        };

        onLocationSelect(locationData);
        // Don't call setShowPicker(false) here since we already closed it in the button handler
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

      // Step 1: Search the addresses table in Supabase database first
      const { data: addressResults, error } = await supabase
        .from('addresses')
        .select('*')
        .or(`name.ilike.%${query}%,formatted_address.ilike.%${query}%,city.ilike.%${query}%,business_type.ilike.%${query}%`)
        .order('usage_count', { ascending: false })
        .limit(3); // Limit database results to make room for Google Places

      let allSuggestions: LocationSuggestion[] = [];

      if (!error && addressResults && addressResults.length > 0) {
        // Convert database results to LocationSuggestion format
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

        // Update usage count for database results (fire and forget)
        databaseSuggestions.forEach(async (suggestion) => {
          try {
            const { data: currentData } = await supabase
              .from('addresses')
              .select('usage_count')
              .eq('id', suggestion.id)
              .single();
            
            if (currentData) {
              await supabase
                .from('addresses')
                .update({ usage_count: (currentData.usage_count || 0) + 1 })
                .eq('id', suggestion.id);
            }
          } catch (err) {
            console.log('Usage count update error:', err);
          }
        });
      }

      // Step 2: Search Google Places API for additional results (if functions are deployed)
      try {
        const googleResults = await searchGooglePlaces(query);
        if (googleResults && googleResults.length > 0) {
          allSuggestions = [...allSuggestions, ...googleResults];
        }
      } catch (googleError) {
        console.log('Google Places search failed (functions may not be deployed yet):', googleError);
        // Continue with database results only - this is expected if Google Places functions aren't deployed
      }

      // Step 3: Set suggestions or show no results message
      if (allSuggestions.length > 0) {
        setSuggestions(allSuggestions.slice(0, 5)); // Limit to top 5 results
      } else {
        const noResultsSuggestion: LocationSuggestion[] = [
          {
            id: 'no-results',
            title: `No results found for "${query}"`,
            subtitle: 'Try searching for building suppliers, warehouses, or industrial areas',
            coordinates: { latitude: -26.2041, longitude: 28.0473 },
            source: 'no-results'
          }
        ];
        setSuggestions(noResultsSuggestion);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      // Fallback to helpful error message
      const errorSuggestions: LocationSuggestion[] = [
        {
          id: 'error',
          title: 'Search temporarily unavailable',
          subtitle: 'Please try again or use current location',
          coordinates: { latitude: -26.2041, longitude: 28.0473 },
          source: 'error'
        }
      ];
      setSuggestions(errorSuggestions);
    }
  };

  const searchGooglePlaces = async (query: string): Promise<LocationSuggestion[]> => {
    // Google Places API configuration
    const SUPABASE_URL = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';
    
    try {
      // For now, using a Supabase Edge Function to proxy Google Places API
      // This avoids CORS issues and keeps your API key secure
      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-places-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ 
          query,
          location: '-26.2041,28.0473', // Johannesburg coordinates for bias
          radius: 50000, // 50km radius
          types: 'establishment|point_of_interest' // Focus on businesses and POIs
        })
      });

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.predictions && data.predictions.length > 0) {
        const googleSuggestions: LocationSuggestion[] = await Promise.all(
          data.predictions.slice(0, 2).map(async (prediction: any) => {
            // Get place details to retrieve coordinates
            const placeDetails = await getGooglePlaceDetails(prediction.place_id);
            
            return {
              id: `google-${prediction.place_id}`,
              title: prediction.structured_formatting?.main_text || prediction.description,
              subtitle: `${prediction.structured_formatting?.secondary_text || prediction.description} [Google Places]`,
              coordinates: placeDetails.coordinates || { latitude: -26.2041, longitude: 28.0473 },
              source: 'google_places',
              placeId: prediction.place_id,
              businessType: prediction.types?.[0] || 'establishment'
            };
          })
        );
        
        return googleSuggestions;
      }
      
      return [];
    } catch (error) {
      console.error('Google Places search error:', error);
      return [];
    }
  };

  const getGooglePlaceDetails = async (placeId: string): Promise<{ coordinates: { latitude: number; longitude: number } }> => {
    const SUPABASE_URL = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-place-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ placeId })
      });

      if (!response.ok) {
        throw new Error(`Place details error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.result?.geometry?.location) {
        return {
          coordinates: {
            latitude: data.result.geometry.location.lat,
            longitude: data.result.geometry.location.lng
          }
        };
      }
      
      // Fallback coordinates if place details fail
      return { coordinates: { latitude: -26.2041, longitude: 28.0473 } };
    } catch (error) {
      console.error('Place details error:', error);
      return { coordinates: { latitude: -26.2041, longitude: 28.0473 } };
    }
  };

  const handleSuggestionSelect = async (suggestion: LocationSuggestion) => {
    // Don't process special cases (no-results, error)
    if (suggestion.source === 'no-results' || suggestion.source === 'error') {
      return;
    }

    const locationData: LocationData = {
      latitude: suggestion.coordinates.latitude,
      longitude: suggestion.coordinates.longitude,
      address: suggestion.title,
      formatted_address: `${suggestion.title}, ${suggestion.subtitle}`,
    };

    // Update last used timestamp for database addresses
    if (suggestion.source === 'database') {
      try {
        await supabase
          .from('addresses')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', suggestion.id);
      } catch (err) {
        console.log('Last used update error:', err);
      }
    }

    // Optional: Save Google Places results to database for future use
    if (suggestion.source === 'google_places' && suggestion.placeId) {
      try {
        // Check if this place already exists in our database
        const { data: existingAddress } = await supabase
          .from('addresses')
          .select('id')
          .eq('name', suggestion.title)
          .eq('latitude', suggestion.coordinates.latitude)
          .eq('longitude', suggestion.coordinates.longitude)
          .single();

        if (!existingAddress) {
          // Save new Google Places result to database
          await supabase
            .from('addresses')
            .insert({
              name: suggestion.title,
              formatted_address: suggestion.subtitle.replace(' [Google Places]', ''),
              latitude: suggestion.coordinates.latitude,
              longitude: suggestion.coordinates.longitude,
              city: 'Johannesburg', // You could extract this from Google Places data
              area_type: 'commercial', // Default, could be improved with Google Places types
              business_type: suggestion.businessType || 'establishment',
              truck_accessible: true, // Default assumption
              loading_dock: false, // Default assumption
              crane_available: false, // Default assumption
              usage_count: 1,
              is_verified: false, // Mark as unverified since it's from Google Places
              search_tags: [suggestion.title.toLowerCase(), suggestion.businessType || 'establishment']
            });
          
          console.log('Saved Google Places result to database for future searches');
        }
      } catch (err) {
        console.log('Error saving Google Places result to database:', err);
        // Continue anyway, this is just an optimization
      }
    }

    onLocationSelect(locationData);
    setShowPicker(false);
    // Clean up search state
    setSuggestions([]);
    setSearchText('');
  };

  const handleMapPress = async (event: any) => {
    const coordinate = event.nativeEvent.coordinate;
    console.log('🗺️ Map pressed at:', coordinate);
    
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
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
        
        const locationData: LocationData = {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          address: formattedAddress,
          formatted_address: formattedAddress,
        };

        console.log('🗺️ Location data created:', locationData);
        setTempMarker(locationData);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      const locationData: LocationData = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        address: `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`,
        formatted_address: `Lat: ${coordinate.latitude.toFixed(4)}, Lng: ${coordinate.longitude.toFixed(4)}`,
      };
      console.log('🗺️ Fallback location data:', locationData);
      setTempMarker(locationData);
    }
  };

  const confirmMapSelection = () => {
    console.log('🗺️ Confirming map selection:', tempMarker);
    if (tempMarker) {
      onLocationSelect(tempMarker);
      setShowMap(false);
      setTempMarker(null);
      // Ensure picker stays closed after map selection
      setShowPicker(false);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.locationButton} 
        onPress={() => {
          // Clear any previous search state before opening
          setSearchText('');
          setSuggestions([]);
          setShowPicker(true);
        }}
      >
        <View style={styles.locationIcon}>
          <MaterialIcons name="location-on" size={16} color={theme.accent} />
        </View>
        <View style={styles.locationContent}>
          <Text style={styles.locationLabel}>{label}</Text>
          <Text style={[styles.locationText, !value && styles.placeholderText]}>
            {value?.address || placeholder}
          </Text>
        </View>
        <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.lightText} />
      </TouchableOpacity>

      {/* Location Picker Modal */}
      <Modal visible={showPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set {label.toLowerCase()}</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={async () => {
                  // Immediate close modal to prevent animation conflicts
                  setShowPicker(false);
                  // Directly get location without timeout
                  if (!isLoadingLocation) {
                    setIsLoadingLocation(true);
                    try {
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
                        
                        const formattedAddress = `${street} ${name}, ${city}, ${region} ${postalCode}`.trim();
                        
                        const locationData: LocationData = {
                          latitude: location.coords.latitude,
                          longitude: location.coords.longitude,
                          address: formattedAddress,
                          formatted_address: formattedAddress,
                        };
                
                        onLocationSelect(locationData);
                      }
                    } catch (error) {
                      console.error('Error getting location:', error);
                      Alert.alert('Error', 'Unable to get your current location');
                    } finally {
                      setIsLoadingLocation(false);
                    }
                  }
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
                  // Immediate close and open map
                  setShowPicker(false);
                  setShowMap(true);
                  setMapRegion({
                    latitude: currentLocation?.latitude || -26.2041,
                    longitude: currentLocation?.longitude || 28.0473,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
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
                placeholder="Search for an address..."
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
                      'location-on'
                    } 
                    size={20} 
                    color={
                      (item.source === 'no-results' || item.source === 'error') ? 
                      theme.lightText : 
                      theme.accent
                    } 
                  />
                  <View style={styles.suggestionContent}>
                    <Text style={[
                      styles.suggestionTitle,
                      (item.source === 'no-results' || item.source === 'error') && styles.suggestionTitleDisabled
                    ]}>
                      {item.title}
                    </Text>
                    <Text style={[
                      styles.suggestionSubtitle,
                      (item.source === 'no-results' || item.source === 'error') && styles.suggestionSubtitleDisabled
                    ]}>
                      {item.subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Map Modal */}
      {showMap && console.log('🗺️ Map modal should be showing')}
      <Modal visible={showMap} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalContent}>
            <View style={styles.mapHeader}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => {
                  console.log('🗺️ Back button pressed, closing map');
                  setShowMap(false);
                  setTempMarker(null);
                }}
              >
                <MaterialIcons name="arrow-back" size={24} color={theme.text} />
                <Text style={styles.headerButtonText}>Back</Text>
              </TouchableOpacity>
              
              <Text style={styles.mapTitle}>Choose location</Text>
              
              <TouchableOpacity 
                onPress={confirmMapSelection}
                disabled={!tempMarker}
                style={[styles.headerButton, styles.confirmButton, !tempMarker && styles.confirmButtonDisabled]}
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
              customMapStyle={darkMapStyle}
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

// Dark map style configuration
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8ec3b9"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1a3646"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#4b6878"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#64779f"
      }
    ]
  },
  {
    "featureType": "administrative.province",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#4b6878"
      }
    ]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#334e87"
      }
    ]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#023e58"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#283d6a"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#6f9ba5"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#023e58"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3C7680"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#304a7d"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#98a5be"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#2c6675"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#255763"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#b0d5ce"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#023e58"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#98a5be"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#283d6a"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3a4762"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#0e1626"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#4e6d70"
      }
    ]
  }
];

const styles = StyleSheet.create({
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: theme.inputBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: 60,
  },
  locationIcon: {
    width: 24,
    alignItems: 'center',
  },
  locationContent: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: theme.lightText,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 16,
    color: theme.text,
  },
  placeholderText: {
    color: theme.lightText,
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
    minHeight: '70%',
    maxHeight: '90%',
    paddingBottom: 40,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
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
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    paddingTop: 60, // Account for status bar
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    elevation: 4,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.inputBackground,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  selectedLocationText: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
    marginLeft: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 16,
    color: theme.text,
    marginLeft: 8,
    fontWeight: '600',
  },
  // New styles for disabled suggestions
  suggestionItemDisabled: {
    opacity: 0.6,
    backgroundColor: theme.inputBackground,
  },
  suggestionTitleDisabled: {
    color: theme.lightText,
    fontStyle: 'italic',
  },
  suggestionSubtitleDisabled: {
    color: theme.lightText,
    fontStyle: 'italic',
  },
});

export default LocationPicker;
