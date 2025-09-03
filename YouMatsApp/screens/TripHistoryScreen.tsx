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
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../src/contexts/LanguageContext';
import { driverService } from '../services/DriverService';
import { Colors } from '../theme/colors';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';

const { width } = Dimensions.get('window');
const screenWidth = width;

// Enhanced responsive calculations for Android
const getResponsiveValue = (small: number, medium: number = small * 1.2, large: number = small * 1.5) => {
  if (screenWidth < 360) return small * 0.9; // Small Android phones
  if (screenWidth < 400) return small; // Standard Android phones
  if (screenWidth < 600) return medium; // Large phones/small tablets
  return large; // Tablets
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
  const { t } = useLanguage();
  const { t: i18nT } = useTranslation();
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
      customerName: trip.users ? `${trip.users.first_name || ''} ${trip.users.last_name || ''}`.trim() : t('common.customer'),
      pickupAddress: trip.pickup_address?.formatted_address || trip.pickup_address || t('orders.pickup_location'),
      deliveryAddress: trip.delivery_address?.formatted_address || trip.delivery_address || t('orders.delivery_location'),
      distance: trip.estimated_distance_km ? `${trip.estimated_distance_km.toFixed(1)} km` : 'N/A',
      duration: 'N/A', // We don't have duration in database
      earnings: trip.final_price || 0,
      materials: trip.material_type ? [trip.material_type] : [t('orders.building_materials')],
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
      case 'completed': return Colors.status.completed;
      case 'cancelled': return Colors.status.cancelled;
      case 'ongoing': return Colors.status.pending;
      default: return Colors.text.secondary;
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
            color={star <= rating ? "#FFD700" : Colors.text.secondary}
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
            {filter === 'all' ? t('common.all') : 
             filter === 'completed' ? t('orders.status.completed') : 
             t('orders.status.cancelled')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTripCard = (trip: Trip) => (
    <TouchableOpacity 
      key={trip.id} 
      style={styles.tripCard}
      onPress={() => Alert.alert(t('tripHistory.tripDetailsAlert'), `View details for trip ${trip.id}`)}
    >
      <View style={styles.tripHeader}>
        <View style={styles.tripTimeInfo}>
          <Text style={styles.tripDate}>{trip.date}</Text>
          <Text style={styles.tripTime}>{trip.time}</Text>
        </View>
        <View style={styles.tripEarnings}>
          <Text style={styles.earningsAmount}>{formatCurrency(trip.earnings)}</Text>
          {trip.tip && trip.tip > 0 && (
            <Text style={styles.tipAmount}>+{formatCurrency(trip.tip)} {t('common.tip')}</Text>
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
            <Text style={styles.statusText}>
              {trip.status === 'completed' ? t('orders.status.completed') : 
               trip.status === 'cancelled' ? t('orders.status.cancelled') : 
               t('orders.status.ongoing')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.materialsSection}>
        <Text style={styles.materialsLabel}>{t('trips.materials')}:</Text>
        <Text style={styles.materialsText} numberOfLines={1}>
          {trip.materials && Array.isArray(trip.materials) ? trip.materials.join(', ') : t('orders.materials')}
        </Text>
      </View>

      {trip.rating && (
        <View style={styles.ratingSection}>
          {renderStars(trip.rating)}
          <Text style={styles.ratingText}>{t('tripHistory.customerRating')}</Text>
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
        <Text style={styles.summaryTitle}>{t('tripHistory.todaySummary')}</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{completedTrips.length}</Text>
            <Text style={styles.summaryLabel}>{t('tripHistory.trips')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatCurrency(totalEarnings)}</Text>
            <Text style={styles.summaryLabel}>{t('tripHistory.earnings')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{avgRating.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>{t('tripHistory.rating')}</Text>
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
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('tripHistory.title')}</Text>
        <TouchableOpacity onPress={() => Alert.alert(t('common.search'), t('tripHistory.searchTrips'))}>
          <Ionicons name="search" size={24} color={Colors.text.primary} />
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
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveValue(16, 20, 24),
    paddingVertical: getResponsiveValue(12, 15, 18),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    minHeight: getResponsiveValue(56, 64, 72),
  },
  backButton: {
    padding: getResponsiveValue(4, 5, 6),
    minHeight: getResponsiveValue(44, 48, 52), // Android touch target
    minWidth: getResponsiveValue(44, 48, 52),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: getResponsiveValue(18, 20, 22),
    fontWeight: '600',
    color: Colors.text.primary,
    lineHeight: getResponsiveValue(24, 26, 28),
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.background.primary,
    margin: getResponsiveValue(16, 20, 24),
    borderRadius: getResponsiveValue(12, 16, 20),
    padding: getResponsiveValue(16, 20, 24),
    ...Platform.select({
      ios: {
        shadowColor: Colors.text.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  summaryTitle: {
    fontSize: getResponsiveValue(16, 18, 20),
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: getResponsiveValue(12, 16, 20),
    lineHeight: getResponsiveValue(20, 22, 24),
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: getResponsiveValue(8, 12, 16),
  },
  summaryItem: {
    alignItems: 'center',
    minWidth: getResponsiveValue(60, 70, 80),
  },
  summaryValue: {
    fontSize: getResponsiveValue(20, 24, 28),
    fontWeight: 'bold',
    color: Colors.text.primary,
    lineHeight: getResponsiveValue(24, 28, 32),
  },
  summaryLabel: {
    fontSize: getResponsiveValue(12, 14, 16),
    color: Colors.text.secondary,
    marginTop: getResponsiveValue(3, 4, 5),
    lineHeight: getResponsiveValue(16, 18, 20),
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: getResponsiveValue(16, 20, 24),
    marginBottom: getResponsiveValue(8, 10, 12),
  },
  filterTab: {
    flex: 1,
    paddingVertical: getResponsiveValue(10, 12, 14),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: getResponsiveValue(44, 48, 52), // Android touch target
  },
  filterTabActive: {
    borderBottomColor: Colors.text.primary,
  },
  filterTabText: {
    fontSize: getResponsiveValue(14, 16, 18),
    fontWeight: '500',
    color: Colors.text.secondary,
    lineHeight: getResponsiveValue(18, 20, 22),
  },
  filterTabTextActive: {
    color: Colors.text.primary,
    fontWeight: '600',
  },
  tripsContainer: {
    paddingHorizontal: getResponsiveValue(16, 20, 24),
    paddingBottom: getResponsiveValue(16, 20, 24),
  },
  tripCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: getResponsiveValue(12, 16, 20),
    padding: getResponsiveValue(12, 16, 20),
    marginBottom: getResponsiveValue(10, 12, 14),
    ...Platform.select({
      ios: {
        shadowColor: Colors.text.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: getResponsiveValue(12, 16, 20),
  },
  tripTimeInfo: {
    flex: 1,
    paddingRight: getResponsiveValue(8, 12, 16),
  },
  tripDate: {
    fontSize: getResponsiveValue(14, 16, 18),
    fontWeight: '600',
    color: Colors.text.primary,
    lineHeight: getResponsiveValue(18, 20, 22),
  },
  tripTime: {
    fontSize: getResponsiveValue(12, 14, 16),
    color: Colors.text.secondary,
    marginTop: 2,
  },
  tripEarnings: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.driver.earnings, // Professional blue instead of green
  },
  tipAmount: {
    fontSize: 12,
    color: Colors.driver.earnings, // Professional blue instead of green
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
    backgroundColor: Colors.text.primary,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border.light,
    marginVertical: 4,
  },
  destinationDot: {
    backgroundColor: Colors.status.completed, // Professional blue instead of green
  },
  routeAddresses: {
    flex: 1,
  },
  pickupAddress: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
    marginBottom: 8,
  },
  deliveryAddress: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  tripDetails: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  tripMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.background.primary,
    textTransform: 'capitalize',
  },
  materialsSection: {
    marginBottom: 12,
  },
  materialsLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  materialsText: {
    fontSize: 14,
    color: Colors.text.primary,
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
    color: Colors.text.secondary,
  },
});
