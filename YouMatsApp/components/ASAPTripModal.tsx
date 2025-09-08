import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { OrderAssignment } from '../services/DriverService';
import { Colors } from '../theme/colors';
import { responsive, deviceTypes, responsiveStyles } from '../utils/ResponsiveUtils';
import RTLUtils, { useRTL } from '../utils/RTLUtils';

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoDeclineRef = useRef<boolean>(false);

  // RTL utilities for professional RTL handling
  const rtl = useRTL();

  useEffect(() => {
    if (visible && trip) {
      setCountdown(15);
      setIsProcessing(false);
      autoDeclineRef.current = false;

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            autoDeclineRef.current = true;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [visible, trip]);

  // Handle auto-decline when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && autoDeclineRef.current && !isProcessing) {
      // Use setTimeout to defer the state update to the next tick
      const timeoutId = setTimeout(() => {
        handleDecline();
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [countdown, isProcessing]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleAccept = async () => {
    if (!trip || isProcessing) return;

    // Clear timer immediately to prevent auto-decline
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

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

    // Clear timer immediately to prevent duplicate calls
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

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

          {/* Trip Details - Scrollable content */}
          <ScrollView 
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={styles.label}>Customer:</Text>
                <Text style={styles.value} numberOfLines={1}>{trip.customerName || 'Unknown'}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value} numberOfLines={1}>{trip.customerPhone || 'N/A'}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Distance:</Text>
                <Text style={styles.value}>{trip.distanceKm.toFixed(1)}km away</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Material:</Text>
                <Text style={styles.value} numberOfLines={1}>{material?.type || 'Unknown'}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Weight:</Text>
                <Text style={styles.value}>{material?.weight || 'N/A'} tons</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Earnings:</Text>
                <Text style={[styles.priceValue, trip.isPremiumTrip && styles.premiumPrice]}>
                  ₪{trip.estimatedEarnings}
                  {trip.isPremiumTrip && <Text style={styles.premiumBadge}> 🔥 PREMIUM</Text>}
                </Text>
              </View>

              {trip.earningsSummary && (
                <View style={styles.row}>
                  <Text style={styles.label}>Breakdown:</Text>
                  <Text style={styles.summaryText} numberOfLines={2}>{trip.earningsSummary}</Text>
                </View>
              )}

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
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <Text style={styles.declineButtonText}>
                {isProcessing ? 'Processing...' : 'Decline'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={isProcessing}
              activeOpacity={0.7}
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
    paddingHorizontal: responsive.padding(16, 24),
    paddingVertical: responsive.padding(20, 30),
  },
  modal: {
    width: deviceTypes.isTablet ? Math.min(width * 0.7, 600) : width * 0.92,
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.spacing(16, 20),
    maxHeight: deviceTypes.isTablet ? '80%' : '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
    ...(deviceTypes.isTablet && {
      alignSelf: 'center',
    }),
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: responsive.padding(20, 28),
    paddingVertical: responsive.padding(20, 24),
    borderTopLeftRadius: responsive.spacing(16, 20),
    borderTopRightRadius: responsive.spacing(16, 20),
    // RTL-aware flex direction
    flexDirection: responsive.rtl.flexDirection(true),
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: deviceTypes.isAndroid ? 56 : 52,
  },
  title: {
    fontSize: responsive.fontSize(18, 22),
    fontWeight: '600',
    color: '#1E3A8A',
    flex: 1,
    // RTL-aware text alignment
    textAlign: responsive.rtl.textAlign(),
    // RTL-aware spacing (logical properties)
    ...responsive.rtl.spacing(0, responsive.spacing(12, 16)),
  },
  timerContainer: {
    backgroundColor: '#1E3A8A',
    borderRadius: responsive.spacing(12, 14),
    paddingHorizontal: responsive.padding(12, 16),
    paddingVertical: responsive.padding(6, 8),
    minWidth: deviceTypes.isAndroid ? 48 : 44,
    minHeight: deviceTypes.isAndroid ? 36 : 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timer: {
    fontSize: responsive.fontSize(14, 16),
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    maxHeight: deviceTypes.isTablet ? '70%' : '65%',
  },
  content: {
    paddingHorizontal: responsive.padding(20, 28),
    paddingVertical: responsive.padding(16, 20),
    paddingBottom: responsive.padding(8, 12),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: responsive.spacing(12, 16),
    minHeight: deviceTypes.isAndroid ? 28 : 24,
  },
  label: {
    fontSize: responsive.fontSize(13, 15),
    color: '#64748B',
    fontWeight: '500',
    flex: 0.4,
    marginRight: responsive.spacing(8, 12),
  },
  value: {
    fontSize: responsive.fontSize(14, 16),
    color: '#334155',
    fontWeight: '600',
    flex: 0.6,
    textAlign: 'right',
    lineHeight: responsive.fontSize(18, 20),
  },
  priceValue: {
    fontSize: responsive.fontSize(16, 18),
    color: '#1E3A8A',
    fontWeight: '700',
    flex: 0.6,
    textAlign: 'right',
    lineHeight: responsive.fontSize(20, 22),
  },
  premiumPrice: {
    color: '#DC2626',
    fontWeight: '800',
  },
  premiumBadge: {
    fontSize: responsive.fontSize(12, 14),
    fontWeight: 'bold',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: responsive.padding(6, 8),
    paddingVertical: responsive.padding(2, 3),
    borderRadius: responsive.spacing(4, 6),
    overflow: 'hidden',
  },
  summaryText: {
    fontSize: responsive.fontSize(13, 15),
    color: '#6B7280',
    fontStyle: 'italic',
    flex: 0.6,
    textAlign: 'right',
    lineHeight: responsive.fontSize(16, 18),
  },
  addressContainer: {
    marginBottom: responsive.spacing(14, 18),
    backgroundColor: '#F8FAFC',
    paddingHorizontal: responsive.padding(14, 18),
    paddingVertical: responsive.padding(14, 16),
    borderRadius: responsive.spacing(8, 10),
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    ...Platform.select({
      android: {
        elevation: 1,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  addressLabel: {
    fontSize: responsive.fontSize(13, 15),
    fontWeight: '600',
    color: '#334155',
    marginBottom: responsive.spacing(4, 6),
    lineHeight: responsive.fontSize(16, 18),
  },
  addressText: {
    fontSize: responsive.fontSize(13, 15),
    color: '#64748B',
    lineHeight: responsive.fontSize(18, 20),
    marginTop: responsive.spacing(2, 3),
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: responsive.padding(20, 28),
    paddingVertical: responsive.padding(16, 20),
    paddingBottom: responsive.padding(20, 24),
    gap: responsive.spacing(12, 16),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: responsive.spacing(16, 20),
    borderBottomRightRadius: responsive.spacing(16, 20),
  },
  button: {
    flex: 1,
    paddingVertical: responsive.padding(14, 16),
    paddingHorizontal: responsive.padding(12, 16),
    borderRadius: responsive.spacing(8, 10),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: deviceTypes.isAndroid ? 48 : 44,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  acceptButton: {
    backgroundColor: '#1E3A8A',
  },
  declineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Platform.select({
      android: {
        elevation: 1,
      },
    }),
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize(15, 17),
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: responsive.fontSize(18, 20),
  },
  declineButtonText: {
    color: '#64748B',
    fontSize: responsive.fontSize(15, 17),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: responsive.fontSize(18, 20),
  },
});