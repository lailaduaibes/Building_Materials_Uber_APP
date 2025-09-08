/**
 * YouMats Driver App - Modern Professional Interface
 * Professional building materials delivery platform for drivers
 * Updated to match YouMats Brand Blue Theme with Multi-Language Support
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
  I18nManager,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import i18n configuration
import './src/i18n';

// Import the new YouMats theme system
import { Colors, theme } from './theme/colors';

// Import Language Provider
import { LanguageProvider } from './src/contexts/LanguageContext';

// Import modern services
import { driverService, Driver, OrderAssignment } from './services/DriverService';
import { driverLocationService } from './services/DriverLocationService';
import { driverPushNotificationService } from './services/DriverPushNotificationService';
import { asapTripHandler } from './services/ASAPTripHandler';

// Import modern screens
import ProfessionalDriverDashboard from './screens/ProfessionalDriverDashboard';
import OrderAssignmentScreen from './screens/OrderAssignmentScreen';
import EarningsScreen from './screens/EarningsScreen';
import DriverPaymentDashboard from './screens/DriverPaymentDashboard';
import ProfessionalDriverPaymentDashboard from './screens/ProfessionalDriverPaymentDashboard';
import TripHistoryScreen from './screens/TripHistoryScreen';
import DriverProfileScreen from './screens/DriverProfileScreen';
import LiveTripTrackingScreen from './screens/LiveTripTrackingScreen';
import RatingScreen from './screens/RatingScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import { AuthScreensSupabase } from './AuthScreensSupabase';
import { authService, User } from './AuthServiceSupabase';
import EnhancedDriverRegistrationScreen from './screens/EnhancedDriverRegistrationScreen';
import { EmailVerificationScreen } from './screens/EmailVerificationScreen';

type AppScreen =
  | 'welcome'
  | 'auth'
  | 'dashboard'
  | 'order_assignment'
  | 'earnings'
  | 'payment'
  | 'trip_history'
  | 'profile'
  | 'live_tracking'
  | 'register'
  | 'email_verification'
  | 'rating';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('welcome'); // Start with welcome screen
  const [pendingOrder, setPendingOrder] = useState<OrderAssignment | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderAssignment | null>(null);
  const [showOrderAssignment, setShowOrderAssignment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [completedTripData, setCompletedTripData] = useState<{
    tripId: string;
    customerName?: string;
    pickupLocation?: string;
    deliveryLocation?: string;
    completedAt?: string;
  } | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Force LTR layout for all languages - Professional app approach
      console.log('🌐 Forcing LTR layout for consistent UI across all languages');
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
      
      // TEMPORARY: Clear welcome flag to test new welcome screen
      await AsyncStorage.removeItem('hasSeenWelcome');
      
      // DEVELOPMENT MODE: Always show welcome screen for testing
      const FORCE_WELCOME_SCREEN = true; // Set to false in production
      
      if (FORCE_WELCOME_SCREEN) {
        setCurrentScreen('welcome');
        setIsLoading(false);
        return;
      }
      
      // Check if user has seen welcome screen
      const welcomeSeen = await AsyncStorage.getItem('hasSeenWelcome');
      if (!welcomeSeen) {
        setCurrentScreen('welcome');
        setIsLoading(false);
        return;
      }
      
      setHasSeenWelcome(true);
      
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
      } else {
        setCurrentScreen('auth');
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkForPendingASAPTrip = async () => {
    try {
      const pendingTripId = await AsyncStorage.getItem('pending_asap_trip');
      if (pendingTripId) {
        console.log('📱 Found pending ASAP trip from notification:', pendingTripId);
        
        // Clear the stored trip ID
        await AsyncStorage.removeItem('pending_asap_trip');
        
        // Try to load the trip details and show order assignment
        const availableTrips = await driverService.getAvailableTrips();
        const pendingTrip = availableTrips.find(trip => trip.id === pendingTripId);
        
        if (pendingTrip) {
          console.log('✅ Loading ASAP trip from notification');
          setPendingOrder(pendingTrip);
          setShowOrderAssignment(true);
        } else {
          console.warn('⚠️ Pending ASAP trip not found or expired');
        }
      }
    } catch (error) {
      console.error('❌ Error checking for pending ASAP trip:', error);
    }
  };

  const initializeDriver = async (userId: string) => {
    try {
      const driver = await driverService.initializeDriver(userId);
      if (driver) {
        setCurrentDriver(driver);
        
        // Initialize push notifications for driver
        const pushInitialized = await driverPushNotificationService.initialize(userId);
        if (pushInitialized) {
          console.log('✅ Push notifications initialized for driver');
          // Subscribe to real-time trip notifications
          driverPushNotificationService.subscribeToTripNotifications();
          
          // Check for pending ASAP trip from notification tap
          await checkForPendingASAPTrip();
        } else {
          console.warn('⚠️ Push notifications could not be initialized');
        }
        
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

  const handleWelcomeComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      setHasSeenWelcome(true);
      setCurrentScreen('auth');
    } catch (error) {
      console.error('Error saving welcome completion:', error);
      setCurrentScreen('auth');
    }
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      setHasSeenWelcome(true);
      setCurrentScreen('register'); // Navigate to driver registration
    } catch (error) {
      console.error('Error saving welcome completion:', error);
      setCurrentScreen('register');
    }
  };

  const handleLoginFromWelcome = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      setHasSeenWelcome(true);
      setCurrentScreen('auth'); // Navigate to login
    } catch (error) {
      console.error('Error saving welcome completion:', error);
      setCurrentScreen('auth');
    }
  };

  // TEMPORARY: Function to reset welcome screen for testing
  const resetWelcomeScreen = async () => {
    try {
      await AsyncStorage.removeItem('hasSeenWelcome');
      setHasSeenWelcome(false);
      setCurrentScreen('welcome');
      console.log('Welcome screen reset - app will show welcome on next launch');
    } catch (error) {
      console.error('Error resetting welcome screen:', error);
    }
  };

  const handleOrderReceived = async (order: OrderAssignment) => {
    // Handle ASAP trips with push notifications for background/closed app scenarios
    if (order.pickupTimePreference === 'asap') {
      await asapTripHandler.handleASAPTripAssignment(order, (order) => {
        setPendingOrder(order);
        setShowOrderAssignment(true);
      });
    } else {
      // Regular scheduled trip handling
      setPendingOrder(order);
      setShowOrderAssignment(true);
    }
    
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

  const handleNavigateToPayment = () => {
    setCurrentScreen('payment');
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
    // Store completed trip data for rating
    if (activeOrder) {
      setCompletedTripData({
        tripId: activeOrder.id,
        customerName: activeOrder.customerName,
        pickupLocation: activeOrder.pickupLocation.address,
        deliveryLocation: activeOrder.deliveryLocation.address,
        completedAt: new Date().toISOString()
      });
      
      // Navigate to rating screen
      setCurrentScreen('rating');
    }
    
    setActiveOrder(null);
    // Increment refresh key to force dashboard to reload its data
    setDashboardRefreshKey(prev => prev + 1);
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
    <LanguageProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.background} />
        <ExpoStatusBar style="dark" />

        {currentScreen === 'welcome' && (
          <WelcomeScreen 
            onGetStarted={handleGetStarted} 
            onLogin={handleLoginFromWelcome}
          />
        )}

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
        <ProfessionalDriverDashboard
          key={dashboardRefreshKey}
          onNavigateToOrder={handleNavigateToOrder}
          onNavigateToEarnings={handleNavigateToEarnings}
          onNavigateToTripHistory={handleNavigateToTripHistory}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToPayment={handleNavigateToPayment}
        />
      )}

      {currentScreen === 'earnings' && (
        <EarningsScreen onBack={handleBackToDashboard} />
      )}

      {currentScreen === 'payment' && (
        <ProfessionalDriverPaymentDashboard onBack={handleBackToDashboard} />
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

      {/* Rating Screen */}
      {currentScreen === 'rating' && completedTripData && (
        <RatingScreen
          route={{
            params: {
              ...completedTripData,
              ratingType: 'customer' as const  // Driver is rating the customer
            }
          }}
          navigation={{
            goBack: () => {
              setCompletedTripData(null);
              setCurrentScreen('dashboard');
              Alert.alert(
                'Trip Completed!',
                'Great job! Your earnings have been updated.',
                [{ text: 'OK' }]
              );
            }
          }}
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
    </LanguageProvider>
  );
};const styles = StyleSheet.create({
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
