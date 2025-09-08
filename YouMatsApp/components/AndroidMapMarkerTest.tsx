/**
 * Android Map Marker Test Component
 * Tests the fixed map markers specifically for Android devices
 */

import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { ProfessionalMapMarker } from './ProfessionalMapMarker';
import { Colors } from '../theme/colors';

const { width: screenWidth } = Dimensions.get('window');

interface AndroidMapMarkerTestProps {
  testScenario?: 'normal' | 'selected' | 'incompatible' | 'priority';
}

export const AndroidMapMarkerTest: React.FC<AndroidMapMarkerTestProps> = ({
  testScenario = 'normal'
}) => {
  const getTestProps = () => {
    switch (testScenario) {
      case 'selected':
        return {
          price: 150,
          materialType: 'CONCRETE',
          isSelected: true,
          isPriority: false,
          isIncompatible: false,
        };
      case 'incompatible':
        return {
          price: 75,
          materialType: 'STEEL',
          isSelected: false,
          isPriority: false,
          isIncompatible: true,
        };
      case 'priority':
        return {
          price: 250,
          materialType: 'LUMBER',
          isSelected: false,
          isPriority: true,
          isIncompatible: false,
        };
      default:
        return {
          price: 100,
          materialType: 'BRICKS',
          isSelected: false,
          isPriority: false,
          isIncompatible: false,
        };
    }
  };

  const testProps = getTestProps();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Android Map Marker Test - {testScenario.toUpperCase()}
      </Text>
      <Text style={styles.info}>
        Screen Width: {screenWidth}px | Platform: {Platform.OS}
      </Text>
      
      <View style={styles.markerTestArea}>
        <ProfessionalMapMarker
          {...testProps}
          pickupTimePreference="asap"
          scheduledPickupTime={undefined}
        />
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>Price: AED {testProps.price}</Text>
        <Text style={styles.detailText}>Material: {testProps.materialType}</Text>
        <Text style={styles.detailText}>Selected: {testProps.isSelected ? 'Yes' : 'No'}</Text>
        <Text style={styles.detailText}>Priority: {testProps.isPriority ? 'Yes' : 'No'}</Text>
        <Text style={styles.detailText}>Incompatible: {testProps.isIncompatible ? 'Yes' : 'No'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 30,
    textAlign: 'center',
  },
  markerTestArea: {
    width: 200,
    height: 150,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 30,
    // Simulate map background
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  details: {
    backgroundColor: Colors.background.secondary,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 5,
  },
});
