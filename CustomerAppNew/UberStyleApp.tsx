/**
 * Uber-Style Building Materials Delivery App
 * Transformed from e-commerce to on-demand truck delivery service
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

// Import our theme system
import { Theme } from './theme';

// Import our UI components
import { Screen, Button, Card } from './components';

// Import authentication screens
import AndroidCompatibleWelcome from './screens/AndroidCompatibleWelcome';
import { LoginScreen, SignUpScreen } from './screens';

// Import NEW Android-Compatible Dashboard
import AndroidCompatibleDashboard from './screens/AndroidCompatibleDashboard';

// Import Enhanced UI Components (keep existing)
import EnhancedAccountSettingsScreen from './screens/EnhancedAccountSettingsScreen';
import WorkingSupportScreen from './screens/WorkingSupportScreen';

// Import services
import { authService } from './AuthServiceSupabase';

// Simple placeholder for screens that don't exist yet
const PlaceholderScreen: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text style={{ fontSize: 24, marginBottom: 20 }}>{title}</Text>
    <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
      This screen is coming soon!
    </Text>
    <TouchableOpacity
      style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 8 }}
      onPress={onBack}
    >
      <Text style={{ color: 'white', fontSize: 16 }}>Back to Dashboard</Text>
    </TouchableOpacity>
  </View>
);

const { width } = Dimensions.get('window');

type AuthFlow = 'welcome' | 'login' | 'signup';
type MainScreen = 'dashboard' | 'requestTruck' | 'trackTrip' | 'tripHistory' | 'tripDetail' | 'accountSettings' | 'customerSupport';

// Use Supabase User interface
import { User } from './AuthServiceSupabase';

interface NavigationState {
  screen: MainScreen;
  tripId?: string;
}

export default function UberStyleApp() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authFlow, setAuthFlow] = useState<AuthFlow>('welcome');
  const [navigationState, setNavigationState] = useState<NavigationState>({
    screen: 'dashboard',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsLoading(false);
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
      setCurrentUser(user);
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
              await authService.logout();
              setCurrentUser(null);
              setAuthFlow('welcome');
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
    switch (authFlow) {
      case 'login':
        return (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigateToSignUp={() => setAuthFlow('signup')}
          />
        );
      case 'signup':
        return (
          <SignUpScreen
            onSignUpSuccess={handleSignUpSuccess}
            onNavigateToLogin={() => setAuthFlow('login')}
          />
        );
      default:
        return (
          <AndroidCompatibleWelcome
            onGetStarted={handleGetStarted}
            onLogin={handleLoginFromWelcome}
          />
        );
    }
  }

  // UPDATED: Navigation handler for Android-compatible app
  const handleNavigate = (screen: string) => {
    // Handle other navigation screens
    switch (screen) {
      case 'NewOrder': // Map to requestTruck
        setNavigationState({ screen: 'requestTruck' });
        break;
      case 'TrackOrder': // Map to trackTrip
        setNavigationState({ screen: 'trackTrip' });
        break;
      case 'OrderHistory': // Map to tripHistory
        setNavigationState({ screen: 'tripHistory' });
        break;
      case 'Profile': // Map to accountSettings
        setNavigationState({ screen: 'accountSettings' });
        break;
      case 'Support':
        setNavigationState({ screen: 'customerSupport' });
        break;
      default:
        console.log(`Navigation to ${screen} - using placeholder`);
    }
  };

  const handleBackToDashboard = () => {
    setNavigationState({ screen: 'dashboard' });
  };

  const handleTrackTrip = (tripId: string) => {
    setNavigationState({ screen: 'trackTrip', tripId });
  };

  // UPDATED: Handle trip request creation (replaces order creation)
  const handleTripRequested = (tripId: string) => {
    Alert.alert(
      'Trip Requested!', 
      `Your truck request ${tripId} has been created. We're finding the best driver for you.`,
      [
        {
          text: 'Track Trip',
          onPress: () => setNavigationState({ screen: 'trackTrip', tripId }),
        },
        {
          text: 'OK',
          onPress: () => setNavigationState({ screen: 'dashboard' }),
        },
      ]
    );
  };

  // UPDATED: Handle screen navigation for logged-in users (Uber-style)
  switch (navigationState.screen) {
    case 'requestTruck': // CHANGED: from 'createOrder' to 'requestTruck'
      return (
        <PlaceholderScreen
          title="Request Truck"
          onBack={handleBackToDashboard}
        />
      );
    case 'trackTrip': // CHANGED: from 'trackOrder' to 'trackTrip'
      return (
        <PlaceholderScreen
          title="Track Trip"
          onBack={handleBackToDashboard}
        />
      );
    case 'tripHistory': // CHANGED: from 'orderHistory' to 'tripHistory'
      return (
        <PlaceholderScreen
          title="Trip History"
          onBack={handleBackToDashboard}
        />
      );
    case 'tripDetail': // CHANGED: from 'orderDetail' to 'tripDetail'
      return (
        <PlaceholderScreen
          title="Trip Details"
          onBack={handleBackToDashboard}
        />
      );
    case 'accountSettings':
      return (
        <EnhancedAccountSettingsScreen
          onBack={handleBackToDashboard}
        />
      );
    case 'customerSupport':
      return (
        <WorkingSupportScreen
          onBack={handleBackToDashboard}
        />
      );
    default:
      // UPDATED: Android-Compatible Dashboard
      return (
        <AndroidCompatibleDashboard
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

// export default UberStyleApp; // Removed duplicate default export
