import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SimplifiedASAPService, SimpleASAPTrip } from '../services/SimplifiedASAPService';
import { SimplifiedASAPModal } from '../components/SimplifiedASAPModal';

export const ForceASAPTest: React.FC = () => {
  const [currentTrip, setCurrentTrip] = useState<SimpleASAPTrip | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startASAPTest = () => {
    console.log('🚨 FORCE STARTING ASAP TEST');
    
    // Hardcoded test driver ID from your logs
    const testDriverId = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';
    const testLocation = { latitude: 32.38882269537229, longitude: 35.321972744900584 };

    SimplifiedASAPService.startMonitoring(
      testDriverId,
      testLocation,
      (trip: SimpleASAPTrip) => {
        console.log('🔔 ASAP TRIP FOUND IN TEST:', trip);
        setCurrentTrip(trip);
        setShowModal(true);
        Alert.alert('ASAP Trip Found!', `Trip: ${trip.material_type}`);
      },
      (trip: SimpleASAPTrip) => {
        console.log('📝 ASAP TRIP UPDATED IN TEST:', trip);
      }
    );

    setIsMonitoring(true);
  };

  const stopASAPTest = () => {
    console.log('🛑 STOPPING ASAP TEST');
    SimplifiedASAPService.stopMonitoring();
    setIsMonitoring(false);
  };

  const handleAccept = (tripId: string) => {
    console.log('✅ ACCEPTING TRIP:', tripId);
    setShowModal(false);
    setCurrentTrip(null);
  };

  const handleDecline = (tripId: string) => {
    console.log('❌ DECLINING TRIP:', tripId);
    setShowModal(false);
    setCurrentTrip(null);
  };

  const handleClose = () => {
    setShowModal(false);
    setCurrentTrip(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 ASAP System Test</Text>
      
      <TouchableOpacity
        style={[styles.button, isMonitoring ? styles.stopButton : styles.startButton]}
        onPress={isMonitoring ? stopASAPTest : startASAPTest}
      >
        <Text style={styles.buttonText}>
          {isMonitoring ? '🛑 Stop ASAP Test' : '🚨 Start ASAP Test'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.status}>
        Status: {isMonitoring ? '✅ Monitoring ASAP trips' : '⏸️ Not monitoring'}
      </Text>

      <SimplifiedASAPModal
        visible={showModal}
        trip={currentTrip}
        driverId="test-driver"
        onAccept={handleAccept}
        onDecline={handleDecline}
        onClose={handleClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#FF4444',
  },
  stopButton: {
    backgroundColor: '#666666',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 16,
    color: '#666666',
  },
});
