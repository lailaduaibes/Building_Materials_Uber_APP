import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TripService from '../services/TripService';
import { authService } from '../AuthServiceSupabase';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

// Professional minimal theme - black, white, subtle accents
const theme = {
  primary: '#000000',        // Pure black
  secondary: '#FFFFFF',      // Pure white
  accent: '#007AFF',         // iOS blue for interactive elements
  success: '#34C759',        // iOS green for success states
  background: '#FFFFFF',     // White background
  cardBackground: '#FFFFFF', // White cards
  text: '#000000',          // Black text
  lightText: '#8E8E93',     // iOS light gray for secondary text
  border: '#C6C6C8',        // iOS light border
  shadow: 'rgba(0,0,0,0.04)', // Very subtle shadow
};

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  formatted_address: string;
}

interface RecentTrip {
  id?: string;
  pickup_address: any;
  delivery_address: any;
  material_type: string;
  status?: string;
  created_at?: string;
  quoted_price?: number;
}

interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

const UberStyleDashboard: React.FC<DashboardScreenProps> = ({ onNavigate, onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadUserData(),
        getCurrentLocation(),
        loadRecentTrips(),
      ]);
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUser({
          id: userData.id,
          firstName: userData.firstName || userData.email?.split('@')[0] || 'User',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location services to use this app.');
        setLocationLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocode to get address
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address.length > 0) {
        const addr = address[0];
        // Safely handle null/undefined values to prevent Android NullPointerException
        const street = addr.street || '';
        const name = addr.name || '';
        const city = addr.city || '';
        const region = addr.region || '';
        const postalCode = addr.postalCode || '';
        
        const formattedAddress = `${street} ${name}, ${city}, ${region} ${postalCode}`.trim();
        
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: formattedAddress,
          formatted_address: formattedAddress,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. You can set it manually when requesting a truck.');
    } finally {
      setLocationLoading(false);
    }
  };

  const loadRecentTrips = async () => {
    try {
      const trips = await TripService.getUserTrips();
      if (trips && Array.isArray(trips)) {
        setRecentTrips(trips.slice(0, 3)); // Show only recent 3 trips
      }
    } catch (error) {
      console.error('Error loading recent trips:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeDashboard();
    setRefreshing(false);
  };

  const handleQuickRequest = () => {
    if (!currentLocation) {
      Alert.alert(
        'Location Required', 
        'Please wait for your location to be detected or enable location services.',
        [
          { text: 'Manual Setup', onPress: () => onNavigate('RequestTruck') },
          { text: 'Retry', onPress: getCurrentLocation },
        ]
      );
      return;
    }
    onNavigate('RequestTruck');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Good {getGreeting()}</Text>
          <Text style={styles.userNameText}>
            {user?.firstName || 'User'} {user?.lastName || ''}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => onNavigate('settings')} 
          style={styles.profileButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="account-circle" size={36} color={theme.lightText} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLocationCard = () => (
    <View style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <MaterialIcons name="location-on" size={24} color={theme.primary} />
        <Text style={styles.locationTitle}>Your Location</Text>
        <TouchableOpacity 
          onPress={getCurrentLocation} 
          style={styles.refreshLocationButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons 
            name="refresh" 
            size={20} 
            color={theme.accent} 
          />
        </TouchableOpacity>
      </View>
      
      {locationLoading ? (
        <View style={styles.locationLoading}>
          <Text style={styles.locationLoadingText}>Detecting your location...</Text>
        </View>
      ) : currentLocation ? (
        <TouchableOpacity 
          style={styles.locationContent}
          onPress={() => Alert.alert('Location', 'You can change your pickup location when requesting a truck.')}
        >
          <Text style={styles.locationAddress} numberOfLines={2}>
            {currentLocation.address}
          </Text>
          <Text style={styles.locationSubtext}>Tap to change when booking</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.locationContent} 
          onPress={getCurrentLocation}
          activeOpacity={0.7}
        >
          <Text style={styles.locationError}>Unable to detect location</Text>
          <Text style={styles.locationSubtext}>Tap to retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <TouchableOpacity 
        style={[styles.primaryActionButton, !currentLocation && styles.disabledButton]} 
        onPress={handleQuickRequest}
        activeOpacity={0.8}
        hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
      >
        <LinearGradient
          colors={[theme.primary, '#333333']}
          style={styles.primaryActionGradient}
        >
          <MaterialIcons name="local-shipping" size={28} color={theme.secondary} />
          <View style={styles.primaryActionText}>
            <Text style={styles.primaryActionTitle}>Request Truck</Text>
            <Text style={styles.primaryActionSubtitle}>Get building materials delivered</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={24} color={theme.secondary} />
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.secondaryActionsRow}>
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={() => onNavigate('TripHistory')}
          activeOpacity={0.7}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <MaterialIcons name="history" size={24} color={theme.primary} />
          <Text style={styles.secondaryActionText}>Trip History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={() => onNavigate('TrackTrip')}
          activeOpacity={0.7}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <MaterialIcons name="location-on" size={24} color={theme.primary} />
          <Text style={styles.secondaryActionText}>Track Trip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={() => onNavigate('support')}
          activeOpacity={0.7}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <MaterialIcons name="help-outline" size={24} color={theme.primary} />
          <Text style={styles.secondaryActionText}>Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRecentTrips = () => (
    <View style={styles.recentTripsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>
        <TouchableOpacity onPress={() => onNavigate('TripHistory')}>
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>
      
      {recentTrips.length > 0 ? (
        recentTrips.map((trip) => (
          <TouchableOpacity 
            key={trip.id}
            style={styles.tripCard}
            onPress={() => onNavigate(`TrackTrip:${trip.id}`)}
          >
            <View style={styles.tripCardHeader}>
              <MaterialIcons name="local-shipping" size={20} color={theme.accent} />
              <Text style={styles.tripMaterial}>{trip.material_type}</Text>
              <View style={[styles.statusBadge, getStatusBadgeStyle(trip.status || 'pending')]}>
                <Text style={[styles.statusText, getStatusTextStyle(trip.status || 'pending')]}>
                  {(trip.status || 'pending').replace('_', ' ')}
                </Text>
              </View>
            </View>
            <Text style={styles.tripRoute} numberOfLines={1}>
              {trip.pickup_address?.formatted_address || 'Pickup'} → {trip.delivery_address?.formatted_address || 'Delivery'}
            </Text>
            <View style={styles.tripCardFooter}>
              <Text style={styles.tripDate}>
                {new Date(trip.created_at || Date.now()).toLocaleDateString()}
              </Text>
              {trip.quoted_price && (
                <Text style={styles.tripPrice}>R{trip.quoted_price.toFixed(2)}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="local-shipping" size={48} color={theme.lightText} />
          <Text style={styles.emptyStateText}>No recent trips</Text>
          <Text style={styles.emptyStateSubtext}>Request your first truck delivery</Text>
        </View>
      )}
    </View>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'delivered':
        return { backgroundColor: '#E8F5E8' };
      case 'in_transit':
      case 'en_route_delivery':
        return { backgroundColor: '#E3F2FD' };
      case 'assigned':
      case 'picked_up':
        return { backgroundColor: '#FFF3E0' };
      default:
        return { backgroundColor: '#F5F5F5' };
    }
  };

  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case 'delivered':
        return { color: '#2E7D32' };
      case 'in_transit':
      case 'en_route_delivery':
        return { color: '#1976D2' };
      case 'assigned':
      case 'picked_up':
        return { color: '#F57C00' };
      default:
        return { color: '#666666' };
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.secondary} />
        <View style={styles.loadingContainer}>
          <MaterialIcons name="local-shipping" size={48} color={theme.primary} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content"
        backgroundColor={theme.background}
        translucent={false}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderHeader()}
          {renderLocationCard()}
          {renderQuickActions()}
          {renderRecentTrips()}
          
          {/* Bottom spacing for Android navigation */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' ? 20 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.lightText,
  },
  header: {
    backgroundColor: theme.background,
    paddingHorizontal: isTablet ? 40 : 20,
    paddingBottom: isTablet ? 30 : 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: isTablet ? 18 : 16,
    color: theme.lightText,
    marginBottom: 4,
    fontWeight: '400',
  },
  userNameText: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: '700',
    color: theme.text,
  },
  profileButton: {
    padding: Platform.OS === 'android' ? 8 : 4,
    borderRadius: 20,
    minHeight: Platform.OS === 'android' ? 44 : 36,
    minWidth: Platform.OS === 'android' ? 44 : 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCard: {
    backgroundColor: theme.cardBackground,
    marginHorizontal: isTablet ? 40 : 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 16,
    padding: isTablet ? 30 : 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginLeft: 8,
    flex: 1,
  },
  refreshLocationButton: {
    padding: Platform.OS === 'android' ? 8 : 4,
    borderRadius: 16,
    minHeight: Platform.OS === 'android' ? 36 : 32,
    minWidth: Platform.OS === 'android' ? 36 : 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContent: {
    paddingLeft: 32,
  },
  locationAddress: {
    fontSize: 14,
    color: theme.text,
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: 12,
    color: theme.lightText,
  },
  locationLoading: {
    paddingLeft: 32,
    paddingVertical: 8,
  },
  locationLoadingText: {
    fontSize: 14,
    color: theme.lightText,
    fontStyle: 'italic',
  },
  locationError: {
    fontSize: 14,
    color: '#E74C3C',
    marginBottom: 4,
  },
  quickActionsContainer: {
    paddingHorizontal: isTablet ? 40 : 20,
    marginBottom: 20,
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  sectionTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  primaryActionButton: {
    borderRadius: Platform.OS === 'android' ? 12 : 16,
    marginBottom: 20,
    overflow: 'hidden',
    minHeight: Platform.OS === 'android' ? 64 : 50,
    elevation: Platform.OS === 'android' ? 4 : 0,
    shadowColor: Platform.OS === 'ios' ? theme.shadow : 'transparent',
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 4 } : { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'ios' ? 0.2 : 0,
    shadowRadius: Platform.OS === 'ios' ? 8 : 0,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.primary,
  },
  primaryActionText: {
    flex: 1,
    marginLeft: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  primaryActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.secondary,
    marginBottom: 4,
    textAlign: 'left',
  },
  primaryActionSubtitle: {
    fontSize: 14,
    color: theme.secondary,
    opacity: 0.8,
    fontWeight: '400',
    textAlign: 'left',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryActionButton: {
    backgroundColor: theme.cardBackground,
    borderRadius: Platform.OS === 'android' ? 12 : 16,
    padding: Platform.OS === 'android' ? 18 : 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: (width - 80) / 3,
    borderWidth: Platform.OS === 'android' ? 0.5 : 1,
    borderColor: theme.border,
    marginBottom: 8,
    minHeight: Platform.OS === 'android' ? 88 : 80,
    height: Platform.OS === 'android' ? 88 : 80,
    elevation: Platform.OS === 'android' ? 2 : 0,
    shadowColor: Platform.OS === 'ios' ? theme.shadow : 'transparent',
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0,
    shadowRadius: Platform.OS === 'ios' ? 4 : 0,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
  },
  recentTripsContainer: {
    paddingHorizontal: isTablet ? 40 : 20,
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.accent,
    fontWeight: '500',
  },
  tripCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripMaterial: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  tripRoute: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 8,
  },
  tripCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripDate: {
    fontSize: 12,
    color: theme.lightText,
  },
  tripPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.success,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.lightText,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 4,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default UberStyleDashboard;
