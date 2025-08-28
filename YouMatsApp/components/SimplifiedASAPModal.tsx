import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { SimpleASAPTrip, SimplifiedASAPService } from '../services/SimplifiedASAPService';

const { width } = Dimensions.get('window');

interface SimplifiedASAPModalProps {
  visible: boolean;
  trip: SimpleASAPTrip | null;
  driverId: string;
  onAccept: (tripId: string) => void;
  onDecline: (tripId: string) => void;
  onClose: () => void;
}

export const SimplifiedASAPModal: React.FC<SimplifiedASAPModalProps> = ({
  visible,
  trip,
  driverId,
  onAccept,
  onDecline,
  onClose,
}) => {
  const [countdown, setCountdown] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (visible && trip) {
      setCountdown(15);
      setIsProcessing(false);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleDecline(); // Auto-decline when timer reaches 0
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [visible, trip]);

  const handleAccept = async () => {
    if (!trip || isProcessing) return;

    setIsProcessing(true);
    console.log('🚚 Driver accepting ASAP trip:', trip.id.substring(0, 8));

    try {
      const result = await SimplifiedASAPService.acceptTrip(trip.id, driverId);
      
      if (result.success) {
        Alert.alert('Success!', 'Trip accepted successfully!', [
          { text: 'OK', onPress: () => onAccept(trip.id) }
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to accept trip');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Accept trip error:', error);
      Alert.alert('Error', 'Failed to accept trip');
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!trip || isProcessing) return;

    setIsProcessing(true);
    console.log('❌ Driver declining ASAP trip:', trip.id.substring(0, 8));

    try {
      await SimplifiedASAPService.declineTrip(trip.id);
      onDecline(trip.id);
    } catch (error) {
      console.error('Decline trip error:', error);
      onDecline(trip.id);
    }
  };

  if (!visible || !trip) {
    return null;
  }

  const formatAddress = (address: any): string => {
    if (typeof address === 'string') return address;
    if (address?.formatted_address) return address.formatted_address;
    if (address?.street && address?.city) {
      return `${address.street}, ${address.city}`;
    }
    return 'Address not available';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🚨 URGENT DELIVERY</Text>
            <View style={styles.timerContainer}>
              <Text style={styles.timer}>{countdown}s</Text>
            </View>
          </View>

          {/* Trip Details */}
          <View style={styles.content}>
            <View style={styles.row}>
              <Text style={styles.label}>Customer:</Text>
              <Text style={styles.value}>{trip.customer_name || 'Unknown'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Distance:</Text>
              <Text style={styles.value}>{trip.distance_km?.toFixed(1)}km away</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Material:</Text>
              <Text style={styles.value}>{trip.material_type}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Weight:</Text>
              <Text style={styles.value}>{trip.estimated_weight_tons || 'N/A'} tons</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Price:</Text>
              <Text style={styles.priceValue}>₪{trip.quoted_price}</Text>
            </View>

            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>📍 Pickup:</Text>
              <Text style={styles.addressText}>
                {formatAddress(trip.pickup_address)}
              </Text>
            </View>

            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>📍 Delivery:</Text>
              <Text style={styles.addressText}>
                {formatAddress(trip.delivery_address)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
              disabled={isProcessing}
            >
              <Text style={styles.declineButtonText}>
                {isProcessing ? 'Processing...' : 'Decline'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={isProcessing}
            >
              <Text style={styles.acceptButtonText}>
                {isProcessing ? 'Processing...' : 'Accept Trip'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: width * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    maxHeight: '80%',
  },
  header: {
    backgroundColor: '#FF4444',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF4444',
  },
  content: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333333',
    fontWeight: 'bold',
  },
  priceValue: {
    fontSize: 16,
    color: '#00AA44',
    fontWeight: 'bold',
  },
  addressContainer: {
    marginBottom: 15,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#00AA44',
  },
  declineButton: {
    backgroundColor: '#DDDDDD',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  declineButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
