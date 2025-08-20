import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TripService from '../services/TripService';
import { authService } from '../AuthServiceSupabase';
import {
  SimpleSafeArea,
  SimpleCard,
  SimpleButton,
  SimpleText,
  platformStyles,
} from '../components/SimpleComponents';

const { width } = Dimensions.get('window');

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

const AndroidCompatibleDashboard: React.FC<DashboardScreenProps> = ({ onNavigate, onLogout }) => {
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
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: 'Current Location',
        formatted_address: 'Your current location',
      };

      setCurrentLocation(locationData);
      await AsyncStorage.setItem('currentLocation', JSON.stringify(locationData));
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const loadRecentTrips = async () => {
    try {
      if (!user?.id) return;
      
      const trips = await TripService.getUserTrips(user.id);
      setRecentTrips(trips.slice(0, 3));
    } catch (error) {
      console.error('Error loading recent trips:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeDashboard();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View>
          <SimpleText variant="heading" style={styles.welcomeText}>
            Welcome Back!
          </SimpleText>
          <SimpleText style={styles.userNameText}>
            {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
          </SimpleText>
        </View>
        <SimpleButton
          title="Logout"
          onPress={onLogout}
          style={styles.logoutButton}
          textStyle={styles.logoutButtonText}
        />
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <SimpleCard style={styles.quickActionsCard}>
      <SimpleText variant="heading" style={styles.sectionTitle}>
        Quick Actions
      </SimpleText>
      
      <View style={styles.actionButtonsContainer}>
        <SimpleButton
          title="New Order"
          onPress={() => onNavigate('NewOrder')}
          style={styles.primaryActionButton}
        />
        
        <SimpleButton
          title="Track Order"
          onPress={() => onNavigate('TrackOrder')}
          style={styles.secondaryActionButton}
          textStyle={styles.secondaryActionButtonText}
        />
      </View>

      <View style={styles.actionButtonsContainer}>
        <SimpleButton
          title="Order History"
          onPress={() => onNavigate('OrderHistory')}
          style={styles.secondaryActionButton}
          textStyle={styles.secondaryActionButtonText}
        />
        
        <SimpleButton
          title="Profile"
          onPress={() => onNavigate('Profile')}
          style={styles.secondaryActionButton}
          textStyle={styles.secondaryActionButtonText}
        />
      </View>
    </SimpleCard>
  );

  const renderLocationCard = () => (
    <SimpleCard style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <MaterialIcons 
          name="location-on" 
          size={24} 
          color={platformStyles.colors.primary} 
        />
        <SimpleText variant="heading" style={styles.sectionTitle}>
          Your Location
        </SimpleText>
      </View>
      
      {locationLoading ? (
        <SimpleText style={styles.locationText}>
          Getting your location...
        </SimpleText>
      ) : currentLocation ? (
        <SimpleText style={styles.locationText}>
          {currentLocation.formatted_address}
        </SimpleText>
      ) : (
        <SimpleText style={styles.locationText}>
          Location not available
        </SimpleText>
      )}
      
      <SimpleButton
        title="Update Location"
        onPress={getCurrentLocation}
        style={styles.updateLocationButton}
        textStyle={styles.updateLocationButtonText}
      />
    </SimpleCard>
  );

  const renderRecentTrips = () => (
    <SimpleCard style={styles.recentTripsCard}>
      <SimpleText variant="heading" style={styles.sectionTitle}>
        Recent Orders
      </SimpleText>
      
      {recentTrips.length > 0 ? (
        recentTrips.map((trip, index) => (
          <View key={index} style={styles.tripItem}>
            <View style={styles.tripInfo}>
              <SimpleText style={styles.tripMaterial}>
                {trip.material_type}
              </SimpleText>
              <SimpleText variant="caption" style={styles.tripStatus}>
                Status: {trip.status || 'Pending'}
              </SimpleText>
            </View>
            <SimpleText style={styles.tripPrice}>
              {trip.quoted_price ? `$${trip.quoted_price}` : 'Quote Pending'}
            </SimpleText>
          </View>
        ))
      ) : (
        <SimpleText style={styles.noTripsText}>
          No recent orders found
        </SimpleText>
      )}
      
      <SimpleButton
        title="View All Orders"
        onPress={() => onNavigate('OrderHistory')}
        style={styles.viewAllButton}
        textStyle={styles.viewAllButtonText}
      />
    </SimpleCard>
  );

  if (isLoading) {
    return (
      <SimpleSafeArea>
        <View style={styles.loadingContainer}>
          <SimpleText>Loading dashboard...</SimpleText>
        </View>
      </SimpleSafeArea>
    );
  }

  return (
    <SimpleSafeArea>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderQuickActions()}
        {renderLocationCard()}
        {renderRecentTrips()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SimpleSafeArea>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: platformStyles.colors.background,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  header: {
    backgroundColor: platformStyles.colors.background,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  welcomeText: {
    marginBottom: 4,
  },
  
  userNameText: {
    color: platformStyles.colors.textSecondary,
  },
  
  logoutButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: platformStyles.colors.border,
    minHeight: 36,
  },
  
  logoutButtonText: {
    color: platformStyles.colors.text,
    fontSize: 14,
  },
  
  quickActionsCard: {
    marginBottom: 16,
  },
  
  sectionTitle: {
    marginBottom: 16,
    fontSize: 20,
  },
  
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  
  primaryActionButton: {
    flex: 1,
    marginRight: 8,
  },
  
  secondaryActionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: platformStyles.colors.border,
    marginHorizontal: 4,
  },
  
  secondaryActionButtonText: {
    color: platformStyles.colors.text,
  },
  
  locationCard: {
    marginBottom: 16,
  },
  
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  locationText: {
    marginBottom: 16,
    color: platformStyles.colors.textSecondary,
  },
  
  updateLocationButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: platformStyles.colors.primary,
  },
  
  updateLocationButtonText: {
    color: platformStyles.colors.primary,
  },
  
  recentTripsCard: {
    marginBottom: 16,
  },
  
  tripItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: platformStyles.colors.border,
  },
  
  tripInfo: {
    flex: 1,
  },
  
  tripMaterial: {
    fontWeight: '500',
    marginBottom: 4,
  },
  
  tripStatus: {
    color: platformStyles.colors.textSecondary,
  },
  
  tripPrice: {
    fontWeight: '600',
    color: platformStyles.colors.primary,
  },
  
  noTripsText: {
    textAlign: 'center',
    color: platformStyles.colors.textSecondary,
    marginVertical: 20,
  },
  
  viewAllButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: platformStyles.colors.primary,
    marginTop: 16,
  },
  
  viewAllButtonText: {
    color: platformStyles.colors.primary,
  },
  
  bottomPadding: {
    height: 100,
  },
});

export default AndroidCompatibleDashboard;
