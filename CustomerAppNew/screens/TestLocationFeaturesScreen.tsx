/**
 * TEST: Enhanced Location Features
 * Quick test for smart location detection and map-based address selection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LocationPicker from '../components/LocationPicker';

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

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  formatted_address: string;
}

export const TestLocationFeaturesScreen: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<LocationData | null>(null);
  const [isLocationReady, setIsLocationReady] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      console.log('🗺️ Testing location services...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Please enable location services to test');
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

        setCurrentLocation(locationData);
        setIsLocationReady(true);
        
        console.log('✅ Location detected:', formattedAddress);
        Alert.alert(
          'Location Test Success!', 
          `Current location: ${formattedAddress.substring(0, 50)}...`
        );
      }
    } catch (error) {
      console.error('❌ Location error:', error);
      Alert.alert('Location Error', 'Unable to get your current location');
    }
  };

  const testLocationSelection = () => {
    if (!pickupLocation || !deliveryLocation) {
      Alert.alert('Test Result', 'Please select both pickup and delivery locations');
      return;
    }

    const distance = calculateDistance(
      pickupLocation.latitude,
      pickupLocation.longitude,
      deliveryLocation.latitude,
      deliveryLocation.longitude
    );

    Alert.alert(
      'Location Test Complete!',
      `✅ Pickup: ${pickupLocation.address.substring(0, 30)}...\n` +
      `✅ Delivery: ${deliveryLocation.address.substring(0, 30)}...\n` +
      `📏 Distance: ${distance.toFixed(2)} km\n\n` +
      `This proves the location system is working perfectly for your ride-sharing style truck delivery app!`
    );
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Location Features Test</Text>
        <Text style={styles.subtitle}>Testing smart location detection and map-based selection</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Current Location Status */}
        <View style={styles.section}>
          <View style={styles.statusCard}>
            <MaterialIcons 
              name={isLocationReady ? "gps-fixed" : "gps-off"} 
              size={24} 
              color={isLocationReady ? theme.success : theme.lightText} 
            />
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>GPS Status</Text>
              <Text style={[styles.statusText, { color: isLocationReady ? theme.success : theme.lightText }]}>
                {isLocationReady ? 'Location detected successfully' : 'Getting your location...'}
              </Text>
              {currentLocation && (
                <Text style={styles.statusDetail} numberOfLines={2}>
                  {currentLocation.address}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Smart Location Pickers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Location Selection</Text>
          
          <LocationPicker
            label="Pickup Location"
            placeholder="Where should we pick up? (Test current location detection)"
            value={pickupLocation}
            onLocationSelect={setPickupLocation}
            currentLocation={currentLocation}
          />
          
          <View style={styles.locationDivider} />
          
          <LocationPicker
            label="Delivery Location"
            placeholder="Where should we deliver? (Test map-based selection)"
            value={deliveryLocation}
            onLocationSelect={setDeliveryLocation}
            currentLocation={currentLocation}
          />
        </View>

        {/* Test Results */}
        {(pickupLocation || deliveryLocation) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected Locations</Text>
            
            {pickupLocation && (
              <View style={styles.resultCard}>
                <MaterialIcons name="radio-button-checked" size={16} color={theme.success} />
                <View style={styles.resultContent}>
                  <Text style={styles.resultLabel}>Pickup</Text>
                  <Text style={styles.resultText} numberOfLines={2}>{pickupLocation.address}</Text>
                  <Text style={styles.resultCoords}>
                    {pickupLocation.latitude.toFixed(4)}, {pickupLocation.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
            )}

            {deliveryLocation && (
              <View style={styles.resultCard}>
                <MaterialIcons name="location-on" size={16} color={theme.accent} />
                <View style={styles.resultContent}>
                  <Text style={styles.resultLabel}>Delivery</Text>
                  <Text style={styles.resultText} numberOfLines={2}>{deliveryLocation.address}</Text>
                  <Text style={styles.resultCoords}>
                    {deliveryLocation.latitude.toFixed(4)}, {deliveryLocation.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Test Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.testButton} onPress={testLocationSelection}>
          <Text style={styles.testButtonText}>Test Location System</Text>
          <MaterialIcons name="check-circle" size={20} color={theme.secondary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.lightText,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.inputBackground,
    borderRadius: 12,
  },
  statusContent: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
  },
  statusDetail: {
    fontSize: 12,
    color: theme.lightText,
  },
  locationDivider: {
    height: 12,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: theme.inputBackground,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultContent: {
    flex: 1,
    marginLeft: 12,
  },
  resultLabel: {
    fontSize: 12,
    color: theme.lightText,
    marginBottom: 2,
  },
  resultText: {
    fontSize: 16,
    color: theme.text,
    marginBottom: 4,
  },
  resultCoords: {
    fontSize: 12,
    color: theme.lightText,
    fontFamily: 'monospace',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.secondary,
    marginRight: 8,
  },
});

export default TestLocationFeaturesScreen;
