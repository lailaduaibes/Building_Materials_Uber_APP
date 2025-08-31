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
import { customerRatingService } from '../services/CustomerRatingService';
import { Theme } from '../theme';

interface CustomerRatingScreenProps {
  route: {
    params: {
      tripId: string;
      driverName?: string;
      driverPhoto?: string;
      pickupLocation?: string;
      deliveryLocation?: string;
      completedAt?: string;
      estimatedDeliveryTime?: string;
      actualDeliveryTime?: string;
    };
  };
  navigation: any;
}

const CustomerRatingScreen: React.FC<CustomerRatingScreenProps> = ({ route, navigation }) => {
  const { 
    tripId, 
    driverName, 
    driverPhoto,
    pickupLocation, 
    deliveryLocation, 
    completedAt,
    estimatedDeliveryTime,
    actualDeliveryTime
  } = route.params;
  
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

  const ratingDescriptions = {
    1: 'Service was below expectations',
    2: 'Service was okay, but needs improvement',
    3: 'Service was good and professional',
    4: 'Service was very good, exceeded expectations',
    5: 'Outstanding service! Highly recommend this driver'
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await customerRatingService.submitDriverRating({
        tripId,
        rating,
        feedback: feedback.trim()
      });

      if (result.success) {
        Alert.alert(
          'Rating Submitted', 
          'Thank you for your feedback! Your rating helps us maintain quality service.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to trip history or main dashboard
                navigation.navigate('OrderHistory');
              }
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
              color={star <= rating ? '#FFD700' : Theme.colors.border.light}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDriverInfo = () => {
    return (
      <View style={styles.driverCard}>
        <View style={styles.driverHeader}>
          <View style={styles.driverPhotoContainer}>
            {driverPhoto ? (
              <Image source={{ uri: driverPhoto }} style={styles.driverPhoto} />
            ) : (
              <View style={[styles.driverPhoto, styles.driverPhotoPlaceholder]}>
                <Ionicons name="person" size={32} color={Theme.colors.text.secondary} />
              </View>
            )}
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>
              {driverName || 'Your Driver'}
            </Text>
            <Text style={styles.deliveryCompletedText}>
              Delivery Completed
            </Text>
          </View>
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={24} color={Theme.colors.success} />
          </View>
        </View>
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
            <Ionicons name="arrow-back" size={24} color={Theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Your Driver</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Driver Info */}
        {renderDriverInfo()}

        {/* Trip Summary Card */}
        <View style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Ionicons name="location" size={20} color={Theme.colors.primary} />
            <Text style={styles.tripTitle}>Trip Summary</Text>
          </View>
          
          <View style={styles.tripDetail}>
            <Text style={styles.detailLabel}>Pickup:</Text>
            <Text style={styles.detailValue}>{pickupLocation || 'N/A'}</Text>
          </View>
          
          <View style={styles.tripDetail}>
            <Text style={styles.detailLabel}>Delivery:</Text>
            <Text style={styles.detailValue}>{deliveryLocation || 'N/A'}</Text>
          </View>
          
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
            How was your delivery experience?
          </Text>
          <Text style={styles.ratingSubtitle}>
            Your feedback helps us maintain quality service
          </Text>
          
          {renderStars()}
          
          {rating > 0 && (
            <View style={styles.ratingFeedbackContainer}>
              <Text style={styles.ratingLabel}>
                {ratingLabels[rating as keyof typeof ratingLabels]}
              </Text>
              <Text style={styles.ratingDescription}>
                {ratingDescriptions[rating as keyof typeof ratingDescriptions]}
              </Text>
            </View>
          )}
        </View>

        {/* Feedback Section */}
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackTitle}>
            Additional Comments (Optional)
          </Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Tell us about your experience with this driver..."
            multiline
            numberOfLines={4}
            value={feedback}
            onChangeText={setFeedback}
            maxLength={500}
            placeholderTextColor={Theme.colors.text.secondary}
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
            {isSubmitting ? 'Submitting Rating...' : 'Submit Rating'}
          </Text>
        </TouchableOpacity>

        {/* Skip Option */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('OrderHistory')}
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
    backgroundColor: Theme.colors.background.primary,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  driverCard: {
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverPhotoContainer: {
    marginRight: 16,
  },
  driverPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  driverPhotoPlaceholder: {
    backgroundColor: Theme.colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 4,
  },
  deliveryCompletedText: {
    fontSize: 14,
    color: Theme.colors.success,
    fontWeight: '500',
  },
  completedBadge: {
    padding: 8,
  },
  tripCard: {
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
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
    marginBottom: 16,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginLeft: 8,
  },
  tripDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.primary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    flex: 2,
    textAlign: 'right',
  },
  ratingSection: {
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
  },
  ratingFeedbackContainer: {
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginBottom: 8,
  },
  ratingDescription: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  feedbackSection: {
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 12,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Theme.colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: Theme.colors.background.primary,
  },
  characterCount: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: Theme.colors.border.light,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: Theme.colors.text.secondary,
  },
  skipButton: {
    alignItems: 'center',
    padding: 12,
  },
  skipButtonText: {
    color: Theme.colors.text.secondary,
    fontSize: 14,
  },
});

export default CustomerRatingScreen;
