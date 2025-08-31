import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerRatingService } from '../services/CustomerRatingService';
import { Theme } from '../theme';

interface PendingRatingItemProps {
  tripId: string;
  driverName: string;
  driverPhoto?: string;
  pickupLocation: string;
  deliveryLocation: string;
  completedAt: string;
  onRatePress: (tripData: any) => void;
}

const PendingRatingItem: React.FC<PendingRatingItemProps> = ({
  tripId,
  driverName,
  driverPhoto,
  pickupLocation,
  deliveryLocation,
  completedAt,
  onRatePress,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.ratingItem}>
      <View style={styles.ratingHeader}>
        <View style={styles.driverInfo}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={20} color={Theme.colors.text.secondary} />
          </View>
          <View>
            <Text style={styles.driverName}>{driverName}</Text>
            <Text style={styles.completedDate}>
              Completed {formatDate(completedAt)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.rateButton}
          onPress={() => onRatePress({
            tripId,
            driverName,
            driverPhoto,
            pickupLocation,
            deliveryLocation,
            completedAt,
          })}
        >
          <Ionicons name="star-outline" size={20} color="#fff" />
          <Text style={styles.rateButtonText}>Rate</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.tripRoute}>
        <View style={styles.routePoint}>
          <Ionicons name="radio-button-on" size={12} color={Theme.colors.primary} />
          <Text style={styles.routeText} numberOfLines={1}>
            {pickupLocation}
          </Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <Ionicons name="location" size={12} color={Theme.colors.success} />
          <Text style={styles.routeText} numberOfLines={1}>
            {deliveryLocation}
          </Text>
        </View>
      </View>
    </View>
  );
};

interface PendingRatingsListProps {
  customerId: string;
  onRateTrip: (tripData: any) => void;
  refreshTrigger?: number;
}

const PendingRatingsList: React.FC<PendingRatingsListProps> = ({
  customerId,
  onRateTrip,
  refreshTrigger,
}) => {
  const [pendingRatings, setPendingRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingRatings();
  }, [customerId, refreshTrigger]);

  const loadPendingRatings = async () => {
    try {
      setLoading(true);
      const result = await customerRatingService.getTripsNeedingRating(customerId);
      
      if (result.success) {
        setPendingRatings(result.data);
      } else {
        console.error('Failed to load pending ratings');
      }
    } catch (error) {
      console.error('Error loading pending ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading pending ratings...</Text>
      </View>
    );
  }

  if (pendingRatings.length === 0) {
    return null; // Don't show anything if no pending ratings
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="star-outline" size={20} color={Theme.colors.primary} />
        <Text style={styles.headerTitle}>Rate Your Recent Trips</Text>
      </View>
      
      <FlatList
        data={pendingRatings}
        keyExtractor={(item) => item.tripId}
        renderItem={({ item }) => (
          <PendingRatingItem
            tripId={item.tripId}
            driverName={item.driverName}
            driverPhoto={item.driverPhoto}
            pickupLocation={item.pickupLocation}
            deliveryLocation={item.deliveryLocation}
            completedAt={item.completedAt}
            onRatePress={onRateTrip}
          />
        )}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false} // Since this is embedded in another scroll view
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginLeft: 8,
  },
  ratingItem: {
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: Theme.colors.background.primary,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 2,
  },
  completedDate: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  tripRoute: {
    paddingLeft: 8,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeLine: {
    width: 1,
    height: 8,
    backgroundColor: Theme.colors.border.light,
    marginLeft: 5,
    marginBottom: 4,
  },
  routeText: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginLeft: 8,
  },
});

export default PendingRatingsList;
