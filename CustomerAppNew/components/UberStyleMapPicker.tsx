/**
 * UberStyleMapPicker - Interactive Map for Location Selection
 * Matches Uber's map interface design with real map integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Theme } from '../theme';

const { width, height } = Dimensions.get('window');

interface UberMapPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  onBack: () => void;
  initialLocation?: { latitude: number; longitude: number };
}

const UberStyleMapPicker: React.FC<UberMapPickerProps> = ({
  onLocationSelect,
  onBack,
  initialLocation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [mapRegion, setMapRegion] = useState({
    latitude: initialLocation?.latitude || 24.7136,
    longitude: initialLocation?.longitude || 46.6753,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [markerCoordinate, setMarkerCoordinate] = useState({
    latitude: initialLocation?.latitude || 24.7136,
    longitude: initialLocation?.longitude || 46.6753,
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

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
      setMarkerCoordinate({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const onMapPress = async (event: any) => {
    const coordinate = event.nativeEvent.coordinate;
    setMarkerCoordinate(coordinate);
    
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });

      if (address.length > 0) {
        const addr = address[0];
        const formattedAddress = `${addr.street || ''} ${addr.name || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        setSelectedLocation(formattedAddress);
        setSearchQuery(formattedAddress);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const handleConfirmLocation = () => {
    const locationData = {
      latitude: markerCoordinate.latitude,
      longitude: markerCoordinate.longitude,
      address: selectedLocation || searchQuery || 'Selected Location'
    };
    onLocationSelect(locationData);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <View style={styles.backButtonCircle}>
            <MaterialIcons name="arrow-back" size={24} color={Theme.colors.text.primary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        onPress={onMapPress}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        <Marker
          coordinate={markerCoordinate}
          title="Selected Location"
          description={selectedLocation || 'Drag to adjust location'}
        />
      </MapView>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />
        
        <Text style={styles.bottomSheetTitle}>Set your destination</Text>
        <Text style={styles.bottomSheetSubtitle}>Drag map to move pin</Text>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="location-on" size={20} color={Theme.colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to?"
            placeholderTextColor={Theme.colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <MaterialIcons name="search" size={20} color={Theme.colors.text.secondary} />
        </View>

        {/* Confirm Button */}
        <TouchableOpacity 
          style={[styles.confirmButton, searchQuery && styles.confirmButtonActive]} 
          onPress={handleConfirmLocation}
          disabled={!searchQuery}
        >
          <Text style={[styles.confirmButtonText, searchQuery && styles.confirmButtonTextActive]}>
            Search destination
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.primary,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
  },
  backButton: {
    // No additional styling needed, just the circle
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: Theme.colors.background.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  bottomSheetSubtitle: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 24,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Theme.colors.text.primary,
  },
  confirmButton: {
    backgroundColor: Theme.colors.background.secondary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonActive: {
    backgroundColor: Theme.colors.text.primary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.secondary,
  },
  confirmButtonTextActive: {
    color: '#ffffff',
  },
});

export default UberStyleMapPicker;
