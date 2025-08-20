import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';

const { width } = Dimensions.get('window');

// Theme colors - matching our black & white theme
const theme = {
  primary: '#000000',
  secondary: '#333333',
  accent: '#666666',
  background: '#FFFFFF',
  white: '#FFFFFF',
  text: '#000000',
  lightText: '#666666',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  border: '#E0E0E0',
  cardBackground: '#F8F8F8',
};

interface TripHistoryScreenProps {
  onBack: () => void;
}

interface Trip {
  id: string;
  date: string;
  time: string;
  customerName: string;
  pickupAddress: string;
  deliveryAddress: string;
  distance: string;
  duration: string;
  earnings: number;
  materials: string[];
  status: 'completed' | 'cancelled' | 'ongoing';
  rating?: number;
  tip?: number;
}

export default function TripHistoryScreen({ onBack }: TripHistoryScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [trips, setTrips] = useState<Trip[]>([]);

  // Load trip history on component mount
  useEffect(() => {
    loadTripHistory();
  }, []);

  // Transform raw database data to Trip interface
  const transformTripData = (rawTrips: any[]): Trip[] => {
    return rawTrips.map(trip => ({
      id: trip.id,
      date: trip.delivered_at ? new Date(trip.delivered_at).toLocaleDateString() : new Date(trip.created_at).toLocaleDateString(),
      time: trip.delivered_at ? new Date(trip.delivered_at).toLocaleTimeString() : new Date(trip.created_at).toLocaleTimeString(),
      customerName: trip.users ? `${trip.users.first_name || ''} ${trip.users.last_name || ''}`.trim() : 'Customer',
      pickupAddress: trip.pickup_address?.formatted_address || trip.pickup_address || 'Pickup Location',
      deliveryAddress: trip.delivery_address?.formatted_address || trip.delivery_address || 'Delivery Location',
      distance: trip.estimated_distance_km ? `${trip.estimated_distance_km.toFixed(1)} km` : 'N/A',
      duration: 'N/A', // We don't have duration in database
      earnings: trip.final_price || 0,
      materials: trip.material_type ? [trip.material_type] : ['Building Materials'],
      status: trip.status === 'delivered' ? 'completed' : trip.status,
      rating: trip.customer_rating || undefined,
      tip: 0 // We don't have tip data in database yet
    }));
  };

  const loadTripHistory = async () => {
    try {
      console.log('📋 Loading trip history...');
      const rawTripHistory = await driverService.getTripHistory(50);
      console.log('📋 Trip history loaded:', rawTripHistory.length, 'trips');
      const transformedTrips = transformTripData(rawTripHistory);
      setTrips(transformedTrips);
    } catch (error) {
      console.error('❌ Error loading trip history:', error);
      // Keep empty array on error
      setTrips([]);
    }
  };

  const filteredTrips = trips.filter(trip => 
    selectedFilter === 'all' || trip.status === selectedFilter
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadTripHistory();
    setRefreshing(false);
  }, []);

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.success;
      case 'cancelled': return theme.error;
      case 'ongoing': return theme.warning;
      default: return theme.accent;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={14}
            color={star <= rating ? "#FFD700" : theme.accent}
          />
        ))}
      </View>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {(['all', 'completed', 'cancelled'] as const).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterTab,
            selectedFilter === filter && styles.filterTabActive,
          ]}
          onPress={() => setSelectedFilter(filter)}
        >
          <Text style={[
            styles.filterTabText,
            selectedFilter === filter && styles.filterTabTextActive,
          ]}>
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTripCard = (trip: Trip) => (
    <TouchableOpacity 
      key={trip.id} 
      style={styles.tripCard}
      onPress={() => Alert.alert('Trip Details', `View details for trip ${trip.id}`)}
    >
      <View style={styles.tripHeader}>
        <View style={styles.tripTimeInfo}>
          <Text style={styles.tripDate}>{trip.date}</Text>
          <Text style={styles.tripTime}>{trip.time}</Text>
        </View>
        <View style={styles.tripEarnings}>
          <Text style={styles.earningsAmount}>{formatCurrency(trip.earnings)}</Text>
          {trip.tip && trip.tip > 0 && (
            <Text style={styles.tipAmount}>+{formatCurrency(trip.tip)} tip</Text>
          )}
        </View>
      </View>

      <View style={styles.tripRoute}>
        <View style={styles.routeIndicator}>
          <View style={styles.routeDot} />
          <View style={styles.routeLine} />
          <View style={[styles.routeDot, styles.destinationDot]} />
        </View>
        <View style={styles.routeAddresses}>
          <Text style={styles.pickupAddress} numberOfLines={1}>
            {trip.pickupAddress}
          </Text>
          <Text style={styles.deliveryAddress} numberOfLines={1}>
            {trip.deliveryAddress}
          </Text>
        </View>
      </View>

      <View style={styles.tripDetails}>
        <Text style={styles.customerName}>{trip.customerName}</Text>
        <View style={styles.tripMeta}>
          <Text style={styles.metaText}>{trip.distance} • {trip.duration}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
            <Text style={styles.statusText}>{trip.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.materialsSection}>
        <Text style={styles.materialsLabel}>Materials:</Text>
        <Text style={styles.materialsText} numberOfLines={1}>
          {trip.materials && Array.isArray(trip.materials) ? trip.materials.join(', ') : 'Building Materials'}
        </Text>
      </View>

      {trip.rating && (
        <View style={styles.ratingSection}>
          {renderStars(trip.rating)}
          <Text style={styles.ratingText}>Customer Rating</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSummaryStats = () => {
    const completedTrips = trips.filter(t => t.status === 'completed');
    const totalEarnings = completedTrips.reduce((sum, trip) => sum + (trip.earnings || 0) + (trip.tip || 0), 0);
    const avgRating = completedTrips.length > 0 
      ? completedTrips.reduce((sum, trip) => sum + (trip.rating || 0), 0) / completedTrips.length
      : 0;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today's Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{completedTrips.length}</Text>
            <Text style={styles.summaryLabel}>Trips</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatCurrency(totalEarnings)}</Text>
            <Text style={styles.summaryLabel}>Earnings</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{avgRating.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>Rating</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip History</Text>
        <TouchableOpacity onPress={() => Alert.alert('Search', 'Search trips functionality')}>
          <Ionicons name="search" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderSummaryStats()}
        {renderFilterTabs()}
        
        <View style={styles.tripsContainer}>
          {filteredTrips.map(renderTripCard)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: theme.white,
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: theme.primary,
  },
  filterTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.lightText,
  },
  filterTabTextActive: {
    color: theme.primary,
    fontWeight: '600',
  },
  tripsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tripCard: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tripTimeInfo: {
    flex: 1,
  },
  tripDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  tripTime: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 2,
  },
  tripEarnings: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.success,
  },
  tipAmount: {
    fontSize: 12,
    color: theme.success,
    marginTop: 2,
  },
  tripRoute: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  routeIndicator: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 2,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.primary,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: theme.border,
    marginVertical: 4,
  },
  destinationDot: {
    backgroundColor: theme.success,
  },
  routeAddresses: {
    flex: 1,
  },
  pickupAddress: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
    marginBottom: 8,
  },
  deliveryAddress: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  tripDetails: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  tripMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: theme.lightText,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.white,
    textTransform: 'capitalize',
  },
  materialsSection: {
    marginBottom: 12,
  },
  materialsLabel: {
    fontSize: 12,
    color: theme.lightText,
    marginBottom: 4,
  },
  materialsText: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 12,
    color: theme.lightText,
  },
});
