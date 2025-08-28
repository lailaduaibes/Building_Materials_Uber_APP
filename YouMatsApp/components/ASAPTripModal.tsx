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
import { OrderAssignment } from '../services/DriverService';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface ASAPTripModalProps {
  visible: boolean;
  trip: OrderAssignment | null;
  onAccept: (tripId: string) => void;
  onDecline: (tripId: string) => void;
  onClose: () => void;
}

export const ASAPTripModal: React.FC<ASAPTripModalProps> = ({
  visible,
  trip,
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
      onAccept(trip.id);
    } catch (error) {
      console.error('Accept trip error:', error);
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!trip || isProcessing) return;

    setIsProcessing(true);
    console.log('❌ Driver declining ASAP trip:', trip.id.substring(0, 8));

    try {
      onDecline(trip.id);
    } catch (error) {
      console.error('Decline trip error:', error);
      onDecline(trip.id);
    }
  };

  if (!visible || !trip) {
    return null;
  }

  const material = trip.materials[0];
  const pickup = trip.pickupLocation;
  const delivery = trip.deliveryLocation;

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
            <Text style={styles.title}>New Delivery Request</Text>
            <View style={styles.timerContainer}>
              <Text style={styles.timer}>{countdown}s</Text>
            </View>
          </View>

          {/* Trip Details */}
          <View style={styles.content}>
            <View style={styles.row}>
              <Text style={styles.label}>Customer:</Text>
              <Text style={styles.value}>{trip.customerName || 'Unknown'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{trip.customerPhone || 'N/A'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Distance:</Text>
              <Text style={styles.value}>{trip.distanceKm.toFixed(1)}km away</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Material:</Text>
              <Text style={styles.value}>{material?.type || 'Unknown'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Weight:</Text>
              <Text style={styles.value}>{material?.weight || 'N/A'} tons</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Earnings:</Text>
              <Text style={styles.priceValue}>₪{trip.estimatedEarnings}</Text>
            </View>

            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>📍 Pickup:</Text>
              <Text style={styles.addressText}>{pickup.address}</Text>
            </View>

            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>📍 Delivery:</Text>
              <Text style={styles.addressText}>{delivery.address}</Text>
            </View>

            {trip.specialInstructions && (
              <View style={styles.addressContainer}>
                <Text style={styles.addressLabel}>📝 Instructions:</Text>
                <Text style={styles.addressText}>{trip.specialInstructions}</Text>
              </View>
            )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: width * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  timerContainer: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timer: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '700',
  },
  addressContainer: {
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#1E3A8A',
  },
  declineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  declineButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
});
