import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';
import { responsive } from '../utils/ResponsiveUtils';

const theme = {
  primary: '#3B82F6',
  white: '#FFFFFF',
  text: '#1F2937',
  lightText: '#6B7280',
  border: '#E5E7EB',
  background: '#F9FAFB',
  cardBackground: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  shadow: '#000000',
};

interface RatingScreenProps {
  route: {
    params: {
      tripId: string;
      customerName?: string;
      pickupLocation?: string;
      deliveryLocation?: string;
      completedAt?: string;
      ratingType: 'customer' | 'driver'; // Who is being rated
    };
  };
  navigation: any;
}

const RatingScreen: React.FC<RatingScreenProps> = ({ route, navigation }) => {
  const { tripId, customerName, pickupLocation, deliveryLocation, completedAt, ratingType } = route.params;
  
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const ratingLabels = {
    1: 'Poor',
    2: 'Fair', 
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await driverService.submitRating({
        tripId,
        rating,
        feedback: feedback.trim(),
        ratingType
      });

      if (result.success) {
        Alert.alert(
          'Rating Submitted', 
          'Thank you for your feedback!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error(result.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            style={styles.starButton}
            onPress={() => setRating(star)}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={40}
              color={star <= rating ? '#FFD700' : theme.border}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Rate {ratingType === 'customer' ? 'Customer' : 'Delivery Experience'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Trip Info Card */}
        <View style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Ionicons name="checkmark-circle" size={24} color={theme.success} />
            <Text style={styles.tripStatus}>Trip Completed</Text>
          </View>
          
          {customerName && (
            <View style={styles.tripDetail}>
              <Text style={styles.detailLabel}>
                {ratingType === 'customer' ? 'Customer:' : 'Delivered to:'}
              </Text>
              <Text style={styles.detailValue}>{customerName}</Text>
            </View>
          )}
          
          {pickupLocation && (
            <View style={styles.tripDetail}>
              <Text style={styles.detailLabel}>Pickup:</Text>
              <Text style={styles.detailValue}>{pickupLocation}</Text>
            </View>
          )}
          
          {deliveryLocation && (
            <View style={styles.tripDetail}>
              <Text style={styles.detailLabel}>Delivery:</Text>
              <Text style={styles.detailValue}>{deliveryLocation}</Text>
            </View>
          )}
          
          {completedAt && (
            <View style={styles.tripDetail}>
              <Text style={styles.detailLabel}>Completed:</Text>
              <Text style={styles.detailValue}>
                {new Date(completedAt).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>
            How would you rate this {ratingType === 'customer' ? 'customer' : 'delivery'}?
          </Text>
          
          {renderStars()}
          
          {rating > 0 && (
            <Text style={styles.ratingLabel}>
              {ratingLabels[rating as keyof typeof ratingLabels]}
            </Text>
          )}
        </View>

        {/* Feedback Section */}
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackTitle}>
            Share your feedback (optional)
          </Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder={`Tell us about your experience with this ${ratingType === 'customer' ? 'customer' : 'delivery'}...`}
            multiline
            numberOfLines={4}
            value={feedback}
            onChangeText={setFeedback}
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {feedback.length}/500 characters
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (rating === 0 || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleRatingSubmit}
          disabled={rating === 0 || isSubmitting}
        >
          <Text style={[
            styles.submitButtonText,
            (rating === 0 || isSubmitting) && styles.submitButtonTextDisabled
          ]}>
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Text>
        </TouchableOpacity>

        {/* Skip Option */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    padding: responsive.padding(20),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsive.spacing(20),
  },
  backButton: {
    padding: responsive.padding(8),
  },
  headerTitle: {
    fontSize: responsive.fontSize(18),
    fontWeight: '600',
    color: theme.text,
  },
  placeholder: {
    width: 40,
  },
  tripCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: responsive.padding(20),
    marginBottom: responsive.spacing(24),
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive.spacing(16),
  },
  tripStatus: {
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: theme.success,
    marginLeft: responsive.spacing(8),
  },
  tripDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: responsive.spacing(8),
  },
  detailLabel: {
    fontSize: responsive.fontSize(14),
    fontWeight: '500',
    color: theme.text,
    flex: 1,
  },
  detailValue: {
    fontSize: responsive.fontSize(14),
    color: theme.lightText,
    flex: 2,
    textAlign: 'right',
  },
  ratingSection: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: responsive.padding(24),
    marginBottom: responsive.spacing(20),
    alignItems: 'center',
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingTitle: {
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
    marginBottom: responsive.spacing(20),
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: responsive.spacing(12),
  },
  starButton: {
    padding: responsive.padding(8),
  },
  ratingLabel: {
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: theme.primary,
  },
  feedbackSection: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: responsive.padding(20),
    marginBottom: responsive.spacing(24),
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackTitle: {
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: theme.text,
    marginBottom: responsive.spacing(12),
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: responsive.padding(12),
    fontSize: responsive.fontSize(14),
    color: theme.text,
    textAlignVertical: 'top',
    minHeight: responsive.scale(100),
  },
  characterCount: {
    fontSize: responsive.fontSize(12),
    color: theme.lightText,
    textAlign: 'right',
    marginTop: responsive.spacing(4),
  },
  submitButton: {
    backgroundColor: theme.primary,
    borderRadius: 8,
    padding: responsive.padding(16),
    alignItems: 'center',
    marginBottom: responsive.spacing(12),
  },
  submitButtonDisabled: {
    backgroundColor: theme.border,
  },
  submitButtonText: {
    color: theme.white,
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: theme.lightText,
  },
  skipButton: {
    alignItems: 'center',
    padding: responsive.padding(12),
  },
  skipButtonText: {
    color: theme.lightText,
    fontSize: responsive.fontSize(14),
  },
});

export default RatingScreen;
