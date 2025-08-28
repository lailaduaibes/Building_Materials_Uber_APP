import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExactSchemaASAPService, ASAPTripRequest } from '../services/ExactSchemaASAPService';

interface ExactSchemaASAPModalProps {
  visible: boolean;
  request: ASAPTripRequest | null;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onClose: () => void;
  driverId: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ExactSchemaASAPModal: React.FC<ExactSchemaASAPModalProps> = ({
  visible,
  request,
  onAccept,
  onDecline,
  onClose,
  driverId,
}) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [progressAnimation] = useState(new Animated.Value(1));
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!visible || !request || !request.acceptance_deadline) return;

    // Calculate time left based on acceptance_deadline
    const calculateTimeLeft = () => {
      const deadline = new Date(request.acceptance_deadline!);
      const now = new Date();
      const diff = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
      return diff;
    };

    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 0) {
        clearInterval(timer);
        onClose();
        return;
      }

      // Update progress animation
      const progress = newTimeLeft / 15; // Assuming 15 second window
      Animated.timing(progressAnimation, {
        toValue: progress,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, request, progressAnimation, onClose]);

  const handleAccept = async () => {
    if (!request || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await ExactSchemaASAPService.acceptTripRequest(request.id, driverId);
      
      if (result.success) {
        onAccept(request.id);
        onClose();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept trip request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!request || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await ExactSchemaASAPService.declineTripRequest(request.id, driverId);
      
      if (result.success) {
        onDecline(request.id);
        onClose();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to decline trip request');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!request) return null;

  const formatPrice = (price?: number) => {
    return price ? `$${price.toFixed(2)}` : 'Price TBD';
  };

  const formatDistance = (distance?: number) => {
    return distance ? `${distance.toFixed(1)} km` : 'Distance TBD';
  };

  const formatDuration = (duration?: number) => {
    return duration ? `${duration} min` : 'Duration TBD';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header with countdown */}
          <View style={styles.header}>
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{timeLeft}s</Text>
              <View style={styles.progressBarContainer}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Trip details */}
          <View style={styles.content}>
            <Text style={styles.title}>New Trip Request</Text>
            
            {/* Material and earnings info */}
            <View style={styles.infoCard}>
              <View style={styles.materialInfo}>
                <Ionicons name="cube-outline" size={24} color="#007BFF" />
                <View style={styles.materialText}>
                  <Text style={styles.materialType}>{request.material_type}</Text>
                  <Text style={styles.loadDescription}>{request.load_description}</Text>
                </View>
              </View>
              
              <View style={styles.earningsCard}>
                <Text style={styles.earningsAmount}>{formatPrice(request.quoted_price)}</Text>
                <Text style={styles.earningsLabel}>Estimated Earnings</Text>
              </View>
            </View>

            {/* Trip details */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={20} color="#28A745" />
                <Text style={styles.detailText}>
                  {request.pickup_address.formatted_address}
                </Text>
              </View>
              
              <View style={styles.routeLine} />
              
              <View style={styles.detailRow}>
                <Ionicons name="flag-outline" size={20} color="#DC3545" />
                <Text style={styles.detailText}>
                  {request.delivery_address.formatted_address}
                </Text>
              </View>
            </View>

            {/* Trip stats */}
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatDistance(request.estimated_distance_km)}</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatDuration(request.estimated_duration_minutes)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              {request.estimated_weight_tons && (
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{request.estimated_weight_tons}t</Text>
                  <Text style={styles.statLabel}>Weight</Text>
                </View>
              )}
            </View>

            {/* Special requirements */}
            {(request.requires_crane || request.requires_hydraulic_lift || request.special_requirements) && (
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Special Requirements:</Text>
                {request.requires_crane && (
                  <Text style={styles.requirement}>• Crane required</Text>
                )}
                {request.requires_hydraulic_lift && (
                  <Text style={styles.requirement}>• Hydraulic lift required</Text>
                )}
                {request.special_requirements && (
                  <Text style={styles.requirement}>• {request.special_requirements}</Text>
                )}
              </View>
            )}
          </View>

          {/* Action buttons */}
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: screenWidth * 0.9,
    maxWidth: 400,
    maxHeight: screenHeight * 0.8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  timerContainer: {
    flex: 1,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007BFF',
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007BFF',
    borderRadius: 2,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  materialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  materialText: {
    marginLeft: 12,
    flex: 1,
  },
  materialType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    textTransform: 'capitalize',
  },
  loadDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 2,
  },
  earningsCard: {
    alignItems: 'center',
    backgroundColor: '#007BFF',
    borderRadius: 8,
    padding: 12,
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#DEE2E6',
    marginLeft: 9,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  requirementsContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  requirement: {
    fontSize: 13,
    color: '#856404',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#28A745',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DC3545',
  },
  declineButtonText: {
    color: '#DC3545',
    fontSize: 16,
    fontWeight: '600',
  },
});
