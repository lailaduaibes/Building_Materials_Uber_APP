/**
 * UberStyleLocationPicker - Modern Location Input Component
 * Matches Uber's clean design patterns with real Supabase integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { createClient } from '@supabase/supabase-js';
import { Theme } from '../theme';

// Supabase configuration (same as existing system)
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28'
);

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
}

interface UberLocationPickerProps {
  pickupLocation: string;
  destinationLocation: string;
  onPickupChange: (location: string) => void;
  onDestinationChange: (location: string) => void;
  onPickupLocationSelect?: (location: LocationData) => void;
  onDestinationLocationSelect?: (location: LocationData) => void;
  onConfirm: () => void;
  onBack?: () => void;
  title?: string;
}

const UberStyleLocationPicker: React.FC<UberLocationPickerProps> = ({
  pickupLocation,
  destinationLocation,
  onPickupChange,
  onDestinationChange,
  onPickupLocationSelect,
  onDestinationLocationSelect,
  onConfirm,
  onBack,
  title = "Plan your delivery"
}) => {
  const [pickupFocused, setPickupFocused] = useState(false);
  const [destinationFocused, setDestinationFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [activeInput, setActiveInput] = useState<'pickup' | 'destination' | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [recentLocations, setRecentLocations] = useState<LocationSuggestion[]>([]);

  useEffect(() => {
    loadRecentLocations();
  }, []);

  useEffect(() => {
    if (activeInput && (
      (activeInput === 'pickup' && pickupLocation.length > 2) ||
      (activeInput === 'destination' && destinationLocation.length > 2)
    )) {
      const query = activeInput === 'pickup' ? pickupLocation : destinationLocation;
      searchLocations(query);
    } else {
      setSuggestions([]);
    }
  }, [pickupLocation, destinationLocation, activeInput]);

  const loadRecentLocations = async () => {
    try {
      // Load recent addresses from Supabase
      const { data: addressResults, error } = await supabase
        .from('addresses')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(5);

      if (!error && addressResults) {
        const recent: LocationSuggestion[] = addressResults.map((address: any) => ({
          id: address.id,
          title: address.name || 'Saved Location',
          subtitle: address.formatted_address,
          coordinates: {
            latitude: parseFloat(address.latitude),
            longitude: parseFloat(address.longitude)
          },
          source: 'database',
          businessType: address.business_type,
          truckAccessible: address.truck_accessible,
          loadingDock: address.loading_dock,
          craneAvailable: address.crane_available,
        }));
        setRecentLocations(recent);
      }
    } catch (error) {
      console.error('Error loading recent locations:', error);
    }
  };

  const searchLocations = async (query: string) => {
    try {
      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      // Search the addresses table in Supabase database
      const { data: addressResults, error } = await supabase
        .from('addresses')
        .select('*')
        .or(`name.ilike.%${query}%,formatted_address.ilike.%${query}%,business_type.ilike.%${query}%`)
        .order('usage_count', { ascending: false })
        .limit(10);

      let allSuggestions: LocationSuggestion[] = [];

      if (!error && addressResults && addressResults.length > 0) {
        const databaseSuggestions: LocationSuggestion[] = addressResults.map((address: any) => ({
          id: address.id,
          title: address.name,
          subtitle: `${address.formatted_address}${address.truck_accessible ? ' 🚛' : ''}${address.loading_dock ? ' 🏭' : ''}${address.crane_available ? ' 🏗️' : ''}`,
          coordinates: {
            latitude: parseFloat(address.latitude),
            longitude: parseFloat(address.longitude)
          },
          source: 'database',
          businessType: address.business_type,
          truckAccessible: address.truck_accessible,
          loadingDock: address.loading_dock,
          craneAvailable: address.crane_available,
        }));
        allSuggestions = [...databaseSuggestions];
      }

      setSuggestions(allSuggestions);
    } catch (error) {
      console.error('Error searching locations:', error);
      // Show error suggestions
      const errorSuggestions: LocationSuggestion[] = [
        {
          id: 'error',
          title: 'Search temporarily unavailable',
          subtitle: 'Please try again or use current location',
          coordinates: { latitude: 24.7136, longitude: 46.6753 },
          source: 'error'
        }
      ];
      setSuggestions(errorSuggestions);
    }
  };

  const getCurrentLocation = async () => {
    if (isLoadingLocation) return;
    
    try {
      setIsLoadingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission denied. Please enable location services');
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
        const street = addr.street || '';
        const name = addr.name || '';
        const city = addr.city || '';
        const region = addr.region || '';
        const formattedAddress = `${street} ${name}, ${city}, ${region}`.trim();
        
        const locationData: LocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: formattedAddress,
          formatted_address: formattedAddress,
          city: city,
        };

        if (activeInput === 'pickup') {
          onPickupChange(formattedAddress);
          onPickupLocationSelect?.(locationData);
        } else {
          onDestinationChange(formattedAddress);
          onDestinationLocationSelect?.(locationData);
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your current location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleInputFocus = (input: 'pickup' | 'destination') => {
    setActiveInput(input);
    if (input === 'pickup') {
      setPickupFocused(true);
      setDestinationFocused(false);
    } else {
      setDestinationFocused(true);
      setPickupFocused(false);
    }
  };

  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    const locationData: LocationData = {
      latitude: suggestion.coordinates.latitude,
      longitude: suggestion.coordinates.longitude,
      address: suggestion.subtitle,
      formatted_address: suggestion.subtitle,
    };

    if (activeInput === 'pickup') {
      onPickupChange(suggestion.subtitle);
      onPickupLocationSelect?.(locationData);
    } else {
      onDestinationChange(suggestion.subtitle);
      onDestinationLocationSelect?.(locationData);
    }
    setSuggestions([]);
    setActiveInput(null);
    setPickupFocused(false);
    setDestinationFocused(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color={Theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* Time and Person Selection */}
      <View style={styles.optionsRow}>
        <TouchableOpacity style={styles.optionButton}>
          <MaterialIcons name="schedule" size={20} color={Theme.colors.text.primary} />
          <Text style={styles.optionText}>Pickup now</Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color={Theme.colors.text.secondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionButton}>
          <MaterialIcons name="person" size={20} color={Theme.colors.text.primary} />
          <Text style={styles.optionText}>For me</Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color={Theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Location Input Container */}
      <View style={styles.locationContainer}>
        {/* Pickup Location */}
        <View style={styles.locationRow}>
          <View style={styles.locationIcon}>
            <View style={styles.pickupDot} />
          </View>
          <TextInput
            style={[styles.locationInput, pickupFocused && styles.focusedInput]}
            placeholder="Pickup location"
            placeholderTextColor={Theme.colors.text.secondary}
            value={pickupLocation}
            onChangeText={onPickupChange}
            onFocus={() => handleInputFocus('pickup')}
          />
          {pickupLocation ? (
            <TouchableOpacity onPress={() => onPickupChange('')}>
              <MaterialIcons name="close" size={20} color={Theme.colors.text.secondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Delivery Location */}
        <View style={styles.locationRow}>
          <View style={styles.locationIcon}>
            <MaterialIcons name="location-on" size={16} color={Theme.colors.text.primary} />
          </View>
          <TextInput
            style={[styles.locationInput, destinationFocused && styles.focusedInput]}
            placeholder="Delivery location"
            placeholderTextColor={Theme.colors.text.secondary}
            value={destinationLocation}
            onChangeText={onDestinationChange}
            onFocus={() => handleInputFocus('destination')}
          />
          {destinationLocation ? (
            <TouchableOpacity onPress={() => onDestinationChange('')}>
              <MaterialIcons name="close" size={20} color={Theme.colors.text.secondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Suggestions or Recent Locations */}
      <ScrollView style={styles.suggestionsContainer}>
        {suggestions.length > 0 ? (
          // Show suggestions when typing
          suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionSelect(suggestion)}
            >
              <MaterialIcons name="location-on" size={20} color={Theme.colors.text.secondary} />
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionMain}>{suggestion.title}</Text>
                <Text style={styles.suggestionSecondary}>{suggestion.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          // Show recent/saved locations when not typing
          <>
            {/* Quick Options */}
            <TouchableOpacity style={styles.quickOption} onPress={getCurrentLocation}>
              <MaterialIcons name="my-location" size={20} color={Theme.colors.text.secondary} />
              <Text style={styles.quickOptionText}>
                {isLoadingLocation ? 'Getting current location...' : 'Use current location'}
              </Text>
              {isLoadingLocation && <ActivityIndicator size="small" color={Theme.colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickOption}>
              <MaterialIcons name="map" size={20} color={Theme.colors.text.secondary} />
              <Text style={styles.quickOptionText}>Set location on map</Text>
            </TouchableOpacity>

            {/* Recent Locations */}
            {recentLocations.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="star" size={20} color={Theme.colors.text.secondary} />
                  <Text style={styles.sectionTitle}>Saved places</Text>
                </View>

                {recentLocations.map((location) => (
                  <TouchableOpacity 
                    key={location.id} 
                    style={styles.recentItem}
                    onPress={() => handleSuggestionSelect(location)}
                  >
                    <MaterialIcons 
                      name={location.businessType === 'Construction' ? 'construction' : 'business'} 
                      size={20} 
                      color={Theme.colors.text.secondary} 
                    />
                    <View style={styles.recentText}>
                      <Text style={styles.recentName}>{location.title}</Text>
                      <Text style={styles.recentAddress}>{location.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Confirm Button */}
      {pickupLocation && destinationLocation && (
        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
          <Text style={styles.confirmButtonText}>Search materials</Text>
        </TouchableOpacity>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  optionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  optionText: {
    fontSize: 14,
    color: Theme.colors.text.primary,
    marginHorizontal: 4,
  },
  locationContainer: {
    margin: 16,
    backgroundColor: Theme.colors.background.primary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Theme.colors.border.light,
    overflow: 'hidden',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  locationIcon: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.text.primary,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: Theme.colors.text.primary,
    paddingVertical: 4,
  },
  focusedInput: {
    color: Theme.colors.primary,
  },
  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  suggestionText: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionMain: {
    fontSize: 16,
    color: Theme.colors.text.primary,
    fontWeight: '500',
  },
  suggestionSecondary: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  quickOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  quickOptionText: {
    fontSize: 16,
    color: Theme.colors.text.primary,
    marginLeft: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginLeft: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentText: {
    flex: 1,
    marginLeft: 12,
  },
  recentName: {
    fontSize: 16,
    color: Theme.colors.text.primary,
    fontWeight: '500',
  },
  recentAddress: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  confirmButton: {
    backgroundColor: Theme.colors.text.primary,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UberStyleLocationPicker;
