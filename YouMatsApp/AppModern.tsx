/**
 * YouMats Driver App - Modern Uber-style Interface
 * Professional building materials delivery platform for drivers
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

// Import modern services
import { driverService, Driver, OrderAssignment } from './services/DriverService';
import { driverLocationService } from './services/DriverLocationService';

// Import modern screens
import ModernDriverDashboard from './screens/ModernDriverDashboard';
import OrderAssignmentScreen from './screens/OrderAssignmentScreen';
import { AuthScreensSupabase } from './AuthScreensSupabase';
import { authService, User } from './AuthServiceSupabase';

type AppScreen = 'auth' | 'dashboard' | 'order_assignment';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('auth');
  const [pendingOrder, setPendingOrder] = useState<OrderAssignment | null>(null);
  const [showOrderAssignment, setShowOrderAssignment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        await initializeDriver(user.id);
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
      } else {
        Alert.alert(
          'Driver Profile Not Found',
          'No driver profile found for this account. Please contact support.',
          [{ text: 'OK', onPress: handleLogout }]
        );
      }
    } catch (error) {
      console.error('Error initializing driver:', error);
      Alert.alert('Error', 'Failed to load driver profile. Please try again.');
    }
  };

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    await initializeDriver(user.id);
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
    setPendingOrder(null);
    // Navigate to order tracking screen
    Alert.alert(
      'Order Accepted!',
      'Order has been accepted. Navigate to pickup location.',
      [{ text: 'OK' }]
    );
  };

  const handleOrderDeclined = () => {
    setShowOrderAssignment(false);
    setPendingOrder(null);
  };

  const handleNavigateToOrder = (order: OrderAssignment) => {
    // This would navigate to order details/tracking screen
    Alert.alert(
      'Navigate to Order',
      `Navigate to pickup location for ${order.customerName}`,
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2C5CC5" />
          <Text style={styles.loadingText}>Loading Driver App...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2C5CC5" />
      <ExpoStatusBar style="light" />

      {currentScreen === 'auth' && (
        <AuthScreensSupabase onAuthSuccess={handleAuthSuccess} />
      )}

      {currentScreen === 'dashboard' && currentDriver && (
        <ModernDriverDashboard
          driver={currentDriver}
          onOrderReceived={handleOrderReceived}
          onNavigateToOrder={handleNavigateToOrder}
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
    backgroundColor: '#2C5CC5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2C5CC5',
    fontWeight: '500',
  },
});

export default App;
