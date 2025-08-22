/**
 * Fleet Status Indicator Component
 * Shows real-time availability of trucks to prevent customers from selecting unavailable options
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import TripService from '../services/TripService';
import { Theme } from '../theme';

interface FleetStatusProps {
  onFleetStatusChange?: (hasAvailableTrucks: boolean) => void;
}

export const FleetStatusIndicator: React.FC<FleetStatusProps> = ({
  onFleetStatusChange
}) => {
  const [availableTruckCount, setAvailableTruckCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFleetStatus();
    
    // Check fleet status every 30 seconds
    const interval = setInterval(checkFleetStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkFleetStatus = async () => {
    try {
      const availableTrucks = await TripService.getAvailableTruckTypes();
      const count = availableTrucks.length;
      
      setAvailableTruckCount(count);
      onFleetStatusChange?.(count > 0);
      
      if (count === 0) {
        Alert.alert(
          '⚠️ No Trucks Available',
          'All trucks are currently busy. Please check back in a few minutes.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error checking fleet status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Checking fleet availability...</Text>
      </View>
    );
  }

  const getStatusColor = () => {
    if (availableTruckCount === null) return Theme.colors.text.secondary;
    if (availableTruckCount === 0) return '#F44336';
    if (availableTruckCount < 3) return '#FF9800';
    return '#4CAF50';
  };

  const getStatusText = () => {
    if (availableTruckCount === null) return 'Unknown';
    if (availableTruckCount === 0) return 'No trucks available';
    if (availableTruckCount === 1) return '1 truck type available';
    return `${availableTruckCount} truck types available`;
  };

  const getIcon = () => {
    if (availableTruckCount === null) return 'help-outline';
    if (availableTruckCount === 0) return 'warning';
    if (availableTruckCount < 3) return 'error-outline';
    return 'check-circle';
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() + '10' }]}>
      <MaterialIcons 
        name={getIcon()} 
        size={20} 
        color={getStatusColor()} 
      />
      <Text style={[styles.statusText, { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginLeft: 8,
  },
});

export default FleetStatusIndicator;
