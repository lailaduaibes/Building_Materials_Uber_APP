import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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

interface RatingManagementScreenProps {
  onBack: () => void;
  onNavigateToRating: (tripData: {
    tripId: string;
    customerName?: string;
    pickupLocation?: string;
    deliveryLocation?: string;
    completedAt?: string;
    ratingType: 'customer' | 'driver';
  }) => void;
}

const RatingManagementScreen: React.FC<RatingManagementScreenProps> = ({
  onBack,
  onNavigateToRating,
}) => {
  const { t: i18nT } = useTranslation();
  const [tripsNeedingRating, setTripsNeedingRating] = useState<any[]>([]);
  const [ratingStats, setRatingStats] = useState<{
    overallRating: number;
    totalRatings: number;
    ratingBreakdown: { [key: number]: number };
    recentFeedback: string[];
  }>({
    overallRating: 0,
    totalRatings: 0,
    ratingBreakdown: {},
    recentFeedback: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [trips, stats] = await Promise.all([
        driverService.getTripsNeedingRating(),
        driverService.getDriverRatingStats(),
      ]);
      
      setTripsNeedingRating(trips);
      setRatingStats(stats);
    } catch (error) {
      console.error('Error loading rating data:', error);
      Alert.alert('Error', 'Failed to load rating data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderStars = (rating: number, size: number = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? '#FFD700' : theme.border}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  const renderRatingBreakdown = () => {
    const total = ratingStats.totalRatings;
    if (total === 0) return null;

    return (
      <View style={styles.breakdownContainer}>
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = ratingStats.ratingBreakdown[rating] || 0;
          const percentage = (count / total) * 100;
          
          return (
            <View key={rating} style={styles.breakdownRow}>
              <Text style={styles.breakdownRating}>{rating}</Text>
              <Ionicons name="star" size={14} color="#FFD700" />
              <View style={styles.breakdownBar}>
                <View 
                  style={[
                    styles.breakdownFill, 
                    { width: `${percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.breakdownCount}>({count})</Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Ratings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading ratings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Ratings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Overall Rating Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overall Rating</Text>
          <View style={styles.overallRatingContainer}>
            <Text style={styles.overallRatingNumber}>
              {ratingStats.overallRating.toFixed(1)}
            </Text>
            {renderStars(ratingStats.overallRating, 20)}
            <Text style={styles.totalRatingsText}>
              Based on {ratingStats.totalRatings} ratings
            </Text>
          </View>
          {renderRatingBreakdown()}
        </View>

        {/* Recent Feedback */}
        {ratingStats.recentFeedback.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Customer Feedback</Text>
            {ratingStats.recentFeedback.map((feedback, index) => (
              <View key={index} style={styles.feedbackItem}>
                <Ionicons name="chatbubble-outline" size={16} color={theme.primary} />
                <Text style={styles.feedbackText}>"{feedback}"</Text>
              </View>
            ))}
          </View>
        )}

        {/* Trips Needing Rating */}
        {tripsNeedingRating.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Rate Your Customers ({tripsNeedingRating.length})
            </Text>
            <Text style={styles.cardDescription}>
              Help improve our service by rating your delivery experience
            </Text>
            
            {tripsNeedingRating.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={styles.tripItem}
                onPress={() => onNavigateToRating({
                  tripId: trip.id,
                  pickupLocation: trip.pickup_location,
                  deliveryLocation: trip.delivery_location,
                  completedAt: trip.completed_at,
                  ratingType: 'customer'
                })}
              >
                <View style={styles.tripInfo}>
                  <Text style={styles.tripRoute}>
                    📍 {trip.pickup_location} → {trip.delivery_location}
                  </Text>
                  <Text style={styles.tripDate}>
                    Completed: {new Date(trip.completed_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.rateButton}>
                  <Ionicons name="star-outline" size={20} color={theme.primary} />
                  <Text style={styles.rateButtonText}>Rate</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Pending Ratings */}
        {tripsNeedingRating.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>All Caught Up! 🎉</Text>
            <Text style={styles.cardDescription}>
              You've rated all your recent customers. Great job!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: responsive.padding(20),
    backgroundColor: theme.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
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
  content: {
    flex: 1,
    padding: responsive.padding(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: responsive.spacing(12),
    fontSize: responsive.fontSize(16),
    color: theme.lightText,
  },
  card: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: responsive.padding(20),
    marginBottom: responsive.spacing(16),
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: responsive.fontSize(18),
    fontWeight: '600',
    color: theme.text,
    marginBottom: responsive.spacing(12),
  },
  cardDescription: {
    fontSize: responsive.fontSize(14),
    color: theme.lightText,
    marginBottom: responsive.spacing(16),
  },
  overallRatingContainer: {
    alignItems: 'center',
    marginBottom: responsive.spacing(20),
  },
  overallRatingNumber: {
    fontSize: responsive.fontSize(32),
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: responsive.spacing(8),
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: responsive.spacing(8),
  },
  totalRatingsText: {
    fontSize: responsive.fontSize(14),
    color: theme.lightText,
  },
  breakdownContainer: {
    marginTop: responsive.spacing(16),
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive.spacing(8),
  },
  breakdownRating: {
    fontSize: responsive.fontSize(14),
    fontWeight: '500',
    color: theme.text,
    width: 20,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.border,
    borderRadius: 4,
    marginHorizontal: responsive.spacing(12),
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  breakdownCount: {
    fontSize: responsive.fontSize(12),
    color: theme.lightText,
    width: 30,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: responsive.spacing(12),
  },
  feedbackText: {
    fontSize: responsive.fontSize(14),
    color: theme.text,
    marginLeft: responsive.spacing(8),
    flex: 1,
    fontStyle: 'italic',
  },
  tripItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: responsive.padding(12),
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tripInfo: {
    flex: 1,
  },
  tripRoute: {
    fontSize: responsive.fontSize(14),
    fontWeight: '500',
    color: theme.text,
    marginBottom: responsive.spacing(4),
  },
  tripDate: {
    fontSize: responsive.fontSize(12),
    color: theme.lightText,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: responsive.padding(12),
    paddingVertical: responsive.padding(8),
    borderRadius: 6,
  },
  rateButtonText: {
    color: theme.white,
    fontSize: responsive.fontSize(12),
    fontWeight: '600',
    marginLeft: responsive.spacing(4),
  },
});

export default RatingManagementScreen;
