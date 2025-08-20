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

// Import our new screens (renamed for Uber-style with black/white theme)
import WelcomeScreen from './screens/WelcomeScreen';
import UberStyleDashboard from './screens/UberStyleDashboard';
import { AuthScreensSupabase } from './AuthScreensSupabase';
import RequestTruckScreenMinimal from './screens/RequestTruckScreenMinimal'; // New minimal Uber-style screen

// Import Enhanced UI Components
import OrderHistoryScreen from './OrderHistoryScreen'; // Updated modern black/white theme
import EnhancedAccountSettingsScreen from './screens/EnhancedAccountSettingsScreen'; // Main settings screen (in proper screens directory)
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
type MainScreen = 'dashboard' | 'requestTruck' | 'trackTrip' | 'tripHistory' | 'settings' | 'support';

// Use Supabase User interface (CORRECT ARCHITECTURE)
import { User } from './AuthServiceSupabase';

interface NavigationState {
  screen: MainScreen;
  tripId?: string; // Changed from orderId to tripId
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

  // Navigation handler for dashboard  
  const handleNavigate = (screen: string) => {
    if (screen.startsWith('TrackTrip:')) {
      const tripId = screen.split(':')[1];
      setNavigationState({ screen: 'trackTrip', tripId });
    } else {
      // Handle main navigation screens (matching UberStyleDashboard buttons)
      switch (screen) {
        case 'RequestTruck': // From UberStyleDashboard
          setNavigationState({ screen: 'requestTruck' });
          break;
        case 'TrackTrip': // From UberStyleDashboard
          Alert.alert('Track Trip', 'Please select a trip to track from your recent trips.');
          break;
        case 'TripHistory': // From UberStyleDashboard
          setNavigationState({ screen: 'tripHistory' });
          break;
        case 'settings': // From UberStyleDashboard settings icon
        case 'AccountSettings': // Alternative
          setNavigationState({ screen: 'settings' });
          break;
        case 'support': // From UberStyleDashboard support button
        case 'CustomerSupport': // Alternative
          setNavigationState({ screen: 'support' });
          break;
        default:
          console.log(`Navigation to ${screen} - feature coming soon!`);
      }
    }
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
  switch (navigationState.screen) {
    case 'requestTruck':
      return (
        <RequestTruckScreenMinimal
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
      // Black & White Themed Main Dashboard (Android Compatible)
      return (
        <UberStyleDashboard
          onNavigate={handleNavigate}
          onLogout={handleLogout}
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
