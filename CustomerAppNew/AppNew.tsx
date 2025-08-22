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
import UberStyleDashboard from './screens/UberStyleDashboard';
import { AuthScreensSupabase } from './AuthScreensSupabase';
import RequestTruckScreen from './screens/EnhancedRequestTruckScreen';

// Import new Uber-style components
import UberStyleMainDashboard from './components/UberStyleMainDashboard';
import UberStyleLocationPicker from './components/UberStyleLocationPicker';
import UberStyleMapPicker from './components/UberStyleMapPicker';

// Import Enhanced UI Components
import OrderHistoryScreen from './OrderHistoryScreen';
import EnhancedAccountSettingsScreen from './screens/EnhancedAccountSettingsScreen';
import WorkingSupportScreen from './screens/WorkingSupportScreen';
import LiveTrackingScreenTrip from './LiveTrackingScreenTrip';

// Import Supabase Authentication Service (CORRECT ARCHITECTURE) 
import { authService } from './AuthServiceSupabase';
import { orderService } from './OrderService';
import notificationManager from './services/NotificationManager';

// Import Android compatibility fixes
import { setupAndroidStatusBar } from './utils/AndroidFixes';

const { width } = Dimensions.get('window');

type AuthFlow = 'welcome' | 'login' | 'signup';
type MainScreen = 'dashboard' | 'locationPicker' | 'mapPicker' | 'requestTruck' | 'trackTrip' | 'tripHistory' | 'settings' | 'support';

// Use Supabase User interface (CORRECT ARCHITECTURE)
import { User } from './AuthServiceSupabase';

interface NavigationState {
  screen: MainScreen;
  tripId?: string;
  // Add location picker state
  pickupLocation?: string;
  destinationLocation?: string;
  // Add order type filtering
  orderType?: string;
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
      setNavigationState({ screen: 'trackTrip', tripId });
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

  const handleTrackTrip = (tripId: string) => {
    setNavigationState({ screen: 'trackTrip', tripId });
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
          onBack={handleBackToDashboard}
        />
      );
    case 'tripHistory':
      return (
        <OrderHistoryScreen
          onBack={handleBackToDashboard}
          onOrderSelect={(tripId: string) => setNavigationState({ screen: 'trackTrip', tripId })}
          orderTypeFilter={navigationState.orderType}
        />
      );
    case 'settings':
      return (
        <EnhancedAccountSettingsScreen
          onBack={handleBackToDashboard}
          onLogout={handleLogout}
        />
      );
    case 'support':
      return (
        <WorkingSupportScreen
          onBack={handleBackToDashboard}
        />
      );
    default:
      // New Uber-style Main Dashboard
      return (
        <UberStyleMainDashboard
          onNavigateToLocation={() => handleNavigate('requestTruck')}
          onNavigateToProfile={() => handleNavigate('settings')}
          onNavigateToActivity={() => handleNavigate('tripHistory')}
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
