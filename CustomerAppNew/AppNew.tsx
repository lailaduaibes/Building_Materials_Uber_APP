/**
 * BuildMate Truck Delivery App - Uber-style Building Materials Delivery
 * Transform from e-commerce to on-demand truck delivery service
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import our new theme system
import { Theme } from './theme';

// Import our new UI components
import { Screen, Button, Card } from './components';

// Import our new screens (renamed for Uber-style with blue theme)
import WelcomeScreen from './screens/WelcomeScreen';
import { AuthScreensSupabase } from './AuthScreensSupabase';
import RequestTruckScreen from './screens/EnhancedRequestTruckScreen';

// Import new Uber-style components
import UberStyleMainDashboard from './components/UberStyleMainDashboard';

// Import Enhanced UI Components
import OrderHistoryScreen from './OrderHistoryScreen';
import ActivityScreen from './screens/ActivityScreen';
import EnhancedAccountSettingsScreen from './screens/EnhancedAccountSettingsScreen';
import WorkingSupportScreen from './screens/WorkingSupportScreen';
import CustomerRatingScreen from './screens/CustomerRatingScreen';
import PaymentHistoryScreen from './screens/PaymentHistoryScreen';
import LiveTrackingScreenTrip from './LiveTrackingScreenTrip';

// Import Supabase Authentication Service (CORRECT ARCHITECTURE) 
import { authService } from './AuthServiceSupabase';
import { orderService } from './OrderService';
import notificationManager from './services/NotificationManager';

// Import Android compatibility fixes
import { setupAndroidStatusBar } from './utils/AndroidFixes';

const { width } = Dimensions.get('window');

type AuthFlow = 'welcome' | 'login' | 'signup';
type MainScreen = 'dashboard' | 'locationPicker' | 'mapPicker' | 'requestTruck' | 'trackTrip' | 'tripHistory' | 'activity' | 'settings' | 'support' | 'paymentHistory' | 'customerRating';

// Use Supabase User interface (CORRECT ARCHITECTURE)
import { User } from './AuthServiceSupabase';

interface NavigationState {
  screen: MainScreen;
  tripId?: string;
  // Add source tracking for proper back navigation
  source?: MainScreen;
  // Add location picker state
  pickupLocation?: string;
  destinationLocation?: string;
  // Add order type filtering
  orderType?: string;
  // Add rating screen properties
  driverName?: string;
  driverPhoto?: string;
  completedAt?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authFlow, setAuthFlow] = useState<AuthFlow>('welcome');
  const [navigationState, setNavigationState] = useState<NavigationState>({
    screen: 'dashboard',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setupAndroidStatusBar(); // Apply Android status bar fixes
    checkExistingSession();
    initializeNotifications();
  }, []);

  const checkExistingSession = async () => {
    try {
      // Check for existing Supabase session (CORRECT ARCHITECTURE)
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        // Update notification manager with current user
        notificationManager.updateCurrentUser(user.id);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeNotifications = async () => {
    try {
      await notificationManager.initialize();
      console.log('Notifications initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  // Handle Welcome screen navigation
  const handleGetStarted = () => {
    setAuthFlow('signup');
  };

  const handleLoginFromWelcome = () => {
    setAuthFlow('login');
  };

  const handleLoginSuccess = async (user: User) => {
    try {
      // Supabase handles session storage automatically (CORRECT ARCHITECTURE)
      setCurrentUser(user);
      // Update notification manager with logged-in user
      notificationManager.updateCurrentUser(user.id);
    } catch (error) {
      console.error('Error handling login success:', error);
      Alert.alert('Error', 'Failed to complete login');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use Supabase logout (CORRECT ARCHITECTURE)
              await authService.logout();
              setCurrentUser(null);
              setAuthFlow('welcome');
              // Clear notification manager user
              notificationManager.updateCurrentUser(null);
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  const handleSignUpSuccess = () => {
    setAuthFlow('login');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  // Show authentication screens
  if (!currentUser) {
    if (authFlow === 'welcome') {
      return (
        <WelcomeScreen
          onGetStarted={handleGetStarted}
          onLogin={handleLoginFromWelcome}
        />
      );
    } else {
      // Use AuthScreensSupabase for login and signup with verification
      return (
        <AuthScreensSupabase
          onAuthSuccess={handleLoginSuccess}
        />
      );
    }
  }

  // Handle service type navigation (delivery, pickup, urgent, bulk)
  const handleNavigateToServiceType = (serviceType: string) => {
    console.log(`🛠️ Navigating to ${serviceType} service`);
    switch (serviceType) {
      case 'delivery':
        setNavigationState({ screen: 'tripHistory' }); // Order History
        break;
      case 'urgent':
        setNavigationState({ screen: 'requestTruck' }); // New Order
        break;
      case 'bulk':
        // Show active orders (in_transit, matched, picked_up)
        setNavigationState({ screen: 'tripHistory', orderType: 'active' }); // Track Active Orders
        break;
      case 'tripHistory':
        setNavigationState({ screen: 'support' }); // Support
        break;
      default:
        setNavigationState({ screen: 'tripHistory' });
    }
  };

  // Navigation handler for dashboard  
  const handleNavigate = (screen: string) => {
    if (screen.startsWith('TrackTrip:')) {
      const tripId = screen.split(':')[1];
      setNavigationState({ screen: 'trackTrip', tripId, source: navigationState.screen });
    } else {
      // Handle main navigation screens
      switch (screen) {
        case 'RequestTruck': // From dashboard - go directly to truck request screen
        case 'requestTruck': // Lowercase version
        case 'locationPicker': // Redirect to main truck request screen
        case 'mapPicker': // Redirect to main truck request screen
          console.log('✅ Navigating to requestTruck screen');
          setNavigationState({ screen: 'requestTruck' });
          break;
        case 'TrackTrip':
          Alert.alert('Track Trip', 'Please select a trip to track from your recent trips.');
          break;
        case 'TripHistory':
          setNavigationState({ screen: 'tripHistory' });
          break;
        case 'settings':
        case 'AccountSettings':
          setNavigationState({ screen: 'settings' });
          break;
        case 'support':
        case 'CustomerSupport':
          setNavigationState({ screen: 'support' });
          break;
        case 'activity':
          setNavigationState({ screen: 'activity' });
          break;
        case 'paymentHistory':
          setNavigationState({ screen: 'paymentHistory' });
          break;
        case 'customerRating':
          setNavigationState({ screen: 'customerRating' });
          break;
        default:
          console.log(`Navigation to ${screen} - feature coming soon!`);
      }
    }
  };

  // New handlers for Uber-style flow
  const handleLocationConfirm = (pickup: string, destination: string) => {
    setNavigationState({ 
      screen: 'requestTruck',
      pickupLocation: pickup,
      destinationLocation: destination
    });
  };

  const handleMapLocationSelect = (location: { latitude: number; longitude: number; address: string }) => {
    // Handle map-selected location
    console.log('Selected location:', location);
    setNavigationState({ screen: 'locationPicker' });
  };

  const handleBackToDashboard = () => {
    setNavigationState({ screen: 'dashboard' });
  };

  const handleSmartBack = () => {
    const source = navigationState.source;
    if (source && source !== 'trackTrip') {
      setNavigationState({ screen: source });
    } else {
      setNavigationState({ screen: 'dashboard' });
    }
  };

  const handleTrackTrip = (tripId: string, source?: MainScreen) => {
    setNavigationState({ screen: 'trackTrip', tripId, source: source || navigationState.screen });
  };

  const handleTripCreated = (tripId: string) => {
    Alert.alert(
      'Trip Requested!', 
      `Trip ${tripId} has been requested successfully. Finding available drivers...`,
      [
        {
          text: 'OK',
          onPress: () => setNavigationState({ screen: 'dashboard' }),
        },
      ]
    );
  };

  // Handle screen navigation for logged-in users
  console.log('🔍 Current navigation state:', navigationState.screen);
  switch (navigationState.screen) {
    case 'requestTruck':
      console.log('📱 Rendering RequestTruckScreen');
      return (
        <RequestTruckScreen
          onBack={handleBackToDashboard}
          onOrderCreated={handleTripCreated}
        />
      );
    case 'trackTrip':
      return (
        <LiveTrackingScreenTrip
          tripId={navigationState.tripId || 'unknown'}
          onBack={handleSmartBack}
          navigation={{
            navigate: (screen: string, params: any) => {
              if (screen === 'CustomerRating') {
                setNavigationState({ screen: 'customerRating', ...params });
              } else if (screen === 'OrderHistory') {
                setNavigationState({ screen: 'tripHistory' });
              }
            }
          }}
        />
      );
    case 'customerRating':
      return (
        <CustomerRatingScreen
          route={{ 
            params: {
              tripId: navigationState.tripId || '',
              driverName: navigationState.driverName,
              driverPhoto: navigationState.driverPhoto,
              pickupLocation: navigationState.pickupLocation,
              deliveryLocation: navigationState.destinationLocation,
              completedAt: navigationState.completedAt,
              estimatedDeliveryTime: navigationState.estimatedDeliveryTime,
              actualDeliveryTime: navigationState.actualDeliveryTime,
            }
          }}
          navigation={{
            navigate: (screen: string) => {
              if (screen === 'OrderHistory') {
                setNavigationState({ screen: 'tripHistory' });
              } else {
                handleBackToDashboard();
              }
            },
            goBack: () => setNavigationState({ screen: 'tripHistory' })
          }}
        />
      );
    case 'tripHistory':
      return (
        <OrderHistoryScreen
          onBack={handleBackToDashboard}
          onOrderSelect={(tripId: string) => setNavigationState({ screen: 'trackTrip', tripId, source: 'tripHistory' })}
          orderTypeFilter={navigationState.orderType}
          onNavigateToRating={(ratingData: any) => {
            setNavigationState({ 
              screen: 'customerRating',
              tripId: ratingData.tripId,
              driverName: ratingData.driverName,
              driverPhoto: ratingData.driverPhoto,
              pickupLocation: ratingData.pickupLocation,
              destinationLocation: ratingData.deliveryLocation,
              completedAt: ratingData.completedAt,
            });
          }}
        />
      );
    case 'activity':
      return (
        <ActivityScreen
          onBack={handleBackToDashboard}
          onNavigateToOrder={(orderId: string) => setNavigationState({ screen: 'trackTrip', tripId: orderId, source: 'activity' })}
        />
      );
    case 'settings':
      return (
        <EnhancedAccountSettingsScreen
          onBack={handleBackToDashboard}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      );
    case 'support':
      return (
        <WorkingSupportScreen
          onBack={handleBackToDashboard}
        />
      );
    case 'paymentHistory':
      return (
        <PaymentHistoryScreen
          onBack={handleBackToDashboard}
        />
      );
    default:
      // New Uber-style Main Dashboard
      return (
        <UberStyleMainDashboard
          onNavigateToLocation={() => handleNavigate('requestTruck')}
          onNavigateToProfile={() => handleNavigate('settings')}
          onNavigateToActivity={() => handleNavigate('activity')}
          onNavigateToServices={() => handleNavigate('requestTruck')}
          onNavigateToServiceType={handleNavigateToServiceType}
          userName={currentUser?.firstName || 'User'}
        />
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
