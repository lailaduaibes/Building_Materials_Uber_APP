/**
 * Trip Request Modal - Uber-style trip request popup for drivers
 * Shows incoming ASAP trip requests with countdown timer
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface TripRequestData {
  requestId: string;
  tripId: string;
  pickupAddress: string;
  deliveryAddress: string;
  materialType: string;
  estimatedEarnings: number;
  estimatedDuration: number;
  timeToAccept: number; // seconds
}

interface TripRequestModalProps {
  visible: boolean;
  tripRequest: TripRequestData | null;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onTimeout: (requestId: string) => void;
}

export const TripRequestModal: React.FC<TripRequestModalProps> = ({
  visible,
  tripRequest,
  onAccept,
  onDecline,
  onTimeout,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible && tripRequest) {
      setTimeRemaining(tripRequest.timeToAccept);
      
      // Start countdown animation
      Animated.timing(countdownAnimation, {
        toValue: 0,
        duration: tripRequest.timeToAccept * 1000,
        useNativeDriver: false,
      }).start();

      // Countdown timer
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onTimeout(tripRequest.requestId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [visible, tripRequest]);

  const handleAccept = () => {
    if (tripRequest) {
      onAccept(tripRequest.requestId);
    }
  };

  const handleDecline = () => {
    if (tripRequest) {
      onDecline(tripRequest.requestId);
    }
  };

  if (!visible || !tripRequest) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header with countdown */}
          <LinearGradient
            colors={[Colors.primary, Colors.secondary]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <Ionicons name="flash" size={24} color={Colors.text.white} />
                <Text style={styles.title}>Trip Request</Text>
              </View>
              
              {/* Countdown timer */}
              <View style={styles.countdownContainer}>
                <View style={styles.countdownCircle}>
                  <Text style={styles.countdownText}>{timeRemaining}</Text>
                </View>
                <Text style={styles.countdownLabel}>seconds to accept</Text>
              </View>
            </View>
            
            {/* Progress bar */}
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  {
                    width: countdownAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </LinearGradient>

          {/* Trip Details */}
          <View style={styles.content}>
            {/* Earnings */}
            <View style={styles.earningsCard}>
              <Text style={styles.earningsAmount}>
                ${tripRequest.estimatedEarnings.toFixed(2)}
              </Text>
              <Text style={styles.earningsLabel}>Estimated earnings</Text>
            </View>

            {/* Trip Info */}
            <View style={styles.tripInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color={Colors.primary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Pickup</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {tripRequest.pickupAddress}
                  </Text>
                </View>
              </View>

              <View style={styles.routeLine}>
                <View style={styles.routeDots} />
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="flag" size={20} color={Colors.status.completed} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Delivery</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {tripRequest.deliveryAddress}
                  </Text>
                </View>
              </View>
            </View>

            {/* Material & Duration */}
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Ionicons name="cube" size={16} color={Colors.text.secondary} />
                <Text style={styles.detailText}>{tripRequest.materialType}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="time" size={16} color={Colors.text.secondary} />
                <Text style={styles.detailText}>{tripRequest.estimatedDuration} min</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.declineButton]} 
              onPress={handleDecline}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color={Colors.text.white} />
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton]} 
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={24} color={Colors.text.white} />
              <Text style={styles.acceptText}>Accept</Text>
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
    padding: 20,
  },
  container: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    width: width - 40,
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: Colors.text.white,
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.text.white,
  },
  countdownText: {
    color: Colors.text.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  countdownLabel: {
    color: Colors.text.white,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.text.white,
  },
  content: {
    padding: 20,
  },
  earningsCard: {
    backgroundColor: Colors.status.completed + '20',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.status.completed + '30',
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.status.completed,
  },
  earningsLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  tripInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  routeLine: {
    marginLeft: 9,
    marginVertical: 8,
  },
  routeDots: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border.medium,
    borderRadius: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 6,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
  },
  declineButton: {
    backgroundColor: Colors.status.cancelled,
  },
  acceptButton: {
    backgroundColor: Colors.status.completed,
  },
  declineText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  acceptText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
