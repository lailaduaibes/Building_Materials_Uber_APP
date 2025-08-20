/**
 * Test script for Enhanced LocationPicker with Country/City Selection
 * Run this in your React Native app to test the new functionality
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { LocationPickerEnhanced } from './components/LocationPickerEnhanced';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  formatted_address: string;
  country?: string;
  city?: string;
}

const TestLocationPicker: React.FC = () => {
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<LocationData | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Enhanced LocationPicker Test</Text>
      
      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Test Country/City Selection:</Text>
        
        <LocationPickerEnhanced
          label="Pickup Location"
          placeholder="Select pickup location with country/city"
          value={pickupLocation}
          onLocationSelect={setPickupLocation}
        />
        
        <LocationPickerEnhanced
          label="Delivery Location"
          placeholder="Select delivery location with country/city"
          value={deliveryLocation}
          onLocationSelect={setDeliveryLocation}
        />
        
        {pickupLocation && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Pickup Location Selected:</Text>
            <Text style={styles.resultText}>Address: {pickupLocation.address}</Text>
            <Text style={styles.resultText}>Country: {pickupLocation.country}</Text>
            <Text style={styles.resultText}>City: {pickupLocation.city}</Text>
            <Text style={styles.resultText}>Coordinates: {pickupLocation.latitude}, {pickupLocation.longitude}</Text>
          </View>
        )}
        
        {deliveryLocation && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Delivery Location Selected:</Text>
            <Text style={styles.resultText}>Address: {deliveryLocation.address}</Text>
            <Text style={styles.resultText}>Country: {deliveryLocation.country}</Text>
            <Text style={styles.resultText}>City: {deliveryLocation.city}</Text>
            <Text style={styles.resultText}>Coordinates: {deliveryLocation.latitude}, {deliveryLocation.longitude}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>Test Instructions:</Text>
        <Text style={styles.instructionsText}>1. Tap on a location picker</Text>
        <Text style={styles.instructionsText}>2. Try clicking the country selector (🇿🇦 South Africa)</Text>
        <Text style={styles.instructionsText}>3. Try clicking the city selector (🏙️ Johannesburg)</Text>
        <Text style={styles.instructionsText}>4. Test search functionality</Text>
        <Text style={styles.instructionsText}>5. Test map functionality</Text>
        <Text style={styles.instructionsText}>6. Verify country/city context appears in results</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  testSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 15,
  },
  resultBox: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C6C6C8',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  instructionsBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
});

export default TestLocationPicker;
