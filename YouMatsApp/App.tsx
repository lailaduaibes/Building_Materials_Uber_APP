/**
 * YouMats Driver App - Modern Uber-style Interface
 * Professional building materials delivery platform for drivers
 * Black & White Theme
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Alert,
  ActivityIndicator,
  Text,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Black & White Theme (matching customer app)
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
};

// Import modern services
import { driverService, Driver, OrderAssignment } from './services/DriverService';
import { driverLocationService } from './services/DriverLocationService';

// Import modern screens
import ModernDriverDashboard from './screens/ModernDriverDashboard';
import ProfessionalDriverDashboard from './screens/ProfessionalDriverDashboard';
import OrderAssignmentScreen from './screens/OrderAssignmentScreen';
import EarningsScreen from './screens/EarningsScreen';
import TripHistoryScreen from './screens/TripHistoryScreen';
import DriverProfileScreen from './screens/DriverProfileScreen';
import LiveTripTrackingScreen from './screens/LiveTripTrackingScreen';
import { AuthScreensSupabase } from './AuthScreensSupabase';
import { authService, User } from './AuthServiceSupabase';
import EnhancedDriverRegistrationScreen from './screens/EnhancedDriverRegistrationScreen';
import { EmailVerificationScreen } from './screens/EmailVerificationScreen';

type AppScreen =
  | 'auth'
  | 'dashboard'
  | 'order_assignment'
  | 'earnings'
  | 'trip_history'
  | 'profile'
  | 'live_tracking'
  | 'register'
  | 'email_verification';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('auth');
  const [pendingOrder, setPendingOrder] = useState<OrderAssignment | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderAssignment | null>(null);
  const [showOrderAssignment, setShowOrderAssignment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [useProfessionalDashboard, setUseProfessionalDashboard] = useState(true); // Default to new professional dashboard

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check for existing session
      const session = await authService.getCurrentSession();
      if (session?.user) {
        // Convert Supabase user to our User type
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          emailConfirmed: session.user.email_confirmed_at !== null,
          firstName: session.user.user_metadata?.first_name || '',
          lastName: session.user.user_metadata?.last_name || '',
          phone: session.user.phone || '',
          createdAt: session.user.created_at
        };
        setCurrentUser(user);
        const driverInitialized = await initializeDriver(user.id);
        if (!driverInitialized) {
          // If driver initialization fails, logout the user
          handleLogout();
        }
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDriver = async (userId: string) => {
    try {
      const driver = await driverService.initializeDriver(userId);
      if (driver) {
        setCurrentDriver(driver);
        setCurrentScreen('dashboard');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing driver:', error);
      return false;
    }
  };

  const handleAuthSuccess = async (user: User) => {
    try {
      console.log('🎯 handleAuthSuccess called with user:', { id: user.id, email: user.email, role: user.role });
      setCurrentUser(user);
      
      // Check if this user can be a driver
      console.log('🚗 Calling driverService.initializeDriver...');
      const driver = await driverService.initializeDriver(user.id);
      console.log('🚗 driverService.initializeDriver result:', { 
        success: !!driver, 
        driverId: driver?.id,
        driverName: driver?.fullName 
      });
      
      if (driver) {
        console.log('✅ Driver found! Setting up dashboard...');
        setCurrentDriver(driver);
        setCurrentScreen('dashboard');
      } else {
        console.log('❌ No driver returned, showing access denied...');
        // This is likely a customer account - show error and logout
        Alert.alert(
          'Access Denied',
          'This appears to be a customer account. The driver app is only for registered drivers.\n\nTo become a driver:\n1. Contact support to apply\n2. Complete driver verification\n3. Get admin approval\n\nPlease use the customer app instead.',
          [
            { 
              text: 'Contact Support', 
              onPress: () => {
                Alert.alert('Support', 'Please email support@youmats.com or call +1-XXX-XXX-XXXX');
              }
            },
            { 
              text: 'Logout', 
              onPress: handleLogout,
              style: 'default'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error during authentication:', error);
      Alert.alert('Error', 'Failed to authenticate. Please try again.');
      handleLogout();
    }
  };

  const handleLogout = async () => {
    try {
      // Update driver status to offline before logout
      if (currentDriver) {
        await driverService.updateDriverStatus('offline');
        driverLocationService.stopDriverTracking();
      }

      await authService.logout();
      await AsyncStorage.clear();
      
      setCurrentUser(null);
      setCurrentDriver(null);
      setCurrentScreen('auth');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleOrderReceived = (order: OrderAssignment) => {
    setPendingOrder(order);
    setShowOrderAssignment(true);
    
    // Play notification sound or vibration here
    // Vibration.vibrate([0, 500, 200, 500]);
  };

  const handleOrderAccepted = () => {
    setShowOrderAssignment(false);
    setActiveOrder(pendingOrder);
    setPendingOrder(null);
    // Navigate to live trip tracking
    setCurrentScreen('live_tracking');
  };

  const handleOrderDeclined = () => {
    setShowOrderAssignment(false);
    setPendingOrder(null);
  };

  const handleNavigateToOrder = (order: OrderAssignment) => {
    setActiveOrder(order);
    setCurrentScreen('live_tracking');
  };

  // Navigation functions for new screens
  const handleNavigateToEarnings = () => {
    setCurrentScreen('earnings');
  };

  const handleNavigateToTripHistory = () => {
    setCurrentScreen('trip_history');
  };

  const handleNavigateToProfile = () => {
    setCurrentScreen('profile');
  };

  const handleBackToDashboard = () => {
    // Increment refresh key to force dashboard to reload its data
    setDashboardRefreshKey(prev => prev + 1);
    setCurrentScreen('dashboard');
  };

  const handleTripCompleted = () => {
    setActiveOrder(null);
    // Increment refresh key to force dashboard to reload its data
    setDashboardRefreshKey(prev => prev + 1);
    setCurrentScreen('dashboard');
    Alert.alert(
      'Trip Completed!',
      'Great job! Your earnings have been updated.',
      [{ text: 'OK' }]
    );
  };

  const handleNavigateToRegister = () => {
    setCurrentScreen('register');
  };

  const handleEmailVerificationRequired = (email: string) => {
    setVerificationEmail(email);
    setCurrentScreen('email_verification');
  };

  const handleEmailVerificationComplete = (driverId: string) => {
    // The enhanced registration screen handles documents internally
    Alert.alert(
      'Email Verified! 📧',
      'Your email has been verified. Please continue with document upload.',
      [
        {
          text: 'Continue',
          onPress: () => setCurrentScreen('register'), // Go back to enhanced registration
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.background} />
        <ExpoStatusBar style="dark" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading Driver App...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.background} />
      <ExpoStatusBar style="dark" />

      {currentScreen === 'auth' && (
        <AuthScreensSupabase
          onAuthSuccess={handleAuthSuccess}
          onNavigateToRegister={handleNavigateToRegister}
        />
      )}

      {currentScreen === 'register' && (
        <EnhancedDriverRegistrationScreen
          onRegistrationComplete={(success: boolean, message: string) => {
            if (success) {
              Alert.alert('Registration Complete', message);
              setCurrentScreen('auth');
            } else {
              Alert.alert('Registration Failed', message);
            }
          }}
          onBackToLogin={() => setCurrentScreen('auth')}
        />
      )}

      {currentScreen === 'email_verification' && (
        <EmailVerificationScreen
          email={verificationEmail}
          onVerificationComplete={handleEmailVerificationComplete}
          onBackToRegistration={() => setCurrentScreen('register')}
        />
      )}

      {currentScreen === 'dashboard' && currentDriver && (
        <>
          {useProfessionalDashboard ? (
            <ProfessionalDriverDashboard
              key={dashboardRefreshKey}
              onNavigateToOrder={handleNavigateToOrder}
              onNavigateToEarnings={handleNavigateToEarnings}
              onNavigateToTripHistory={handleNavigateToTripHistory}
              onNavigateToProfile={handleNavigateToProfile}
            />
          ) : (
            <ModernDriverDashboard
              key={dashboardRefreshKey}
              onNavigateToOrder={handleNavigateToOrder}
              onNavigateToEarnings={handleNavigateToEarnings}
              onNavigateToTripHistory={handleNavigateToTripHistory}
              onNavigateToProfile={handleNavigateToProfile}
            />
          )}
        </>
      )}

      {currentScreen === 'earnings' && (
        <EarningsScreen onBack={handleBackToDashboard} />
      )}

      {currentScreen === 'trip_history' && (
        <TripHistoryScreen onBack={handleBackToDashboard} />
      )}

      {currentScreen === 'profile' && (
        <DriverProfileScreen 
          onBack={handleBackToDashboard} 
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'live_tracking' && activeOrder && currentDriver && (
        <LiveTripTrackingScreen
          order={activeOrder}
          driverId={currentDriver.id}
          onBack={handleBackToDashboard}
          onCompleteTrip={handleTripCompleted}
        />
      )}

      {/* Order Assignment Modal */}
      {pendingOrder && (
        <OrderAssignmentScreen
          order={pendingOrder}
          visible={showOrderAssignment}
          onAccept={handleOrderAccepted}
          onDecline={handleOrderDeclined}
          onClose={() => setShowOrderAssignment(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
  },
});

export default App;
