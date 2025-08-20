/**
 * BuildMate Customer App
 * Professional Building Materials Ordering Platform
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Customer-specific components
import CustomerDashboard from './components/CustomerDashboard';
import OrderPlacement from './components/OrderPlacement';
import OrderTracking from './components/OrderTracking';
import OrderHistory from './components/OrderHistory';
import { AuthScreensCustomer } from './AuthScreensCustomer';
import { authService, User } from './AuthServiceCustomer';

type CustomerScreen = 'auth' | 'dashboard' | 'place-order' | 'track-order' | 'history';

const CustomerApp: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<CustomerScreen>('dashboard');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await authService.getCurrentUser();
      // Ensure user is a customer
      if (user && user.role !== 'customer') {
        Alert.alert('Access Denied', 'This app is for customers only. Please use the appropriate app for your role.');
        await authService.logout();
        return;
      }
      setCurrentUser(user);
      
      const savedScreen = await AsyncStorage.getItem('customerCurrentScreen');
      if (savedScreen && user) {
        setCurrentScreen(savedScreen as CustomerScreen);
      }
    } catch (error) {
      console.log('Not authenticated:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (user: User) => {
    if (user.role !== 'customer') {
      Alert.alert('Access Denied', 'This app is for customers only.');
      return;
    }
    setCurrentUser(user);
    setCurrentScreen('dashboard');
    await AsyncStorage.setItem('customerCurrentScreen', 'dashboard');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setCurrentUser(null);
      setCurrentScreen('auth');
      await AsyncStorage.removeItem('customerCurrentScreen');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const navigateToScreen = async (screen: CustomerScreen) => {
    setCurrentScreen(screen);
    await AsyncStorage.setItem('customerCurrentScreen', screen);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LinearGradient
          colors={['#2c3e50', '#34495e']}
          style={styles.loadingGradient}
        >
          <Text style={styles.loadingText}>BuildMate</Text>
          <Text style={styles.loadingSubtext}>Customer Portal</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <ExpoStatusBar style="light" backgroundColor="#2c3e50" />
        <AuthScreensCustomer onAuthSuccess={handleLogin} />
      </SafeAreaView>
    );
  }

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <CustomerDashboard user={currentUser} onNavigate={navigateToScreen} />;
      case 'place-order':
        return <OrderPlacement user={currentUser} onNavigate={navigateToScreen} />;
      case 'track-order':
        return <OrderTracking user={currentUser} />;
      case 'history':
        return <OrderHistory user={currentUser} />;
      default:
        return <CustomerDashboard user={currentUser} onNavigate={navigateToScreen} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor="#2c3e50" />
      
      {renderCurrentScreen()}

      {/* Customer Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <LinearGradient
          colors={['rgba(44, 62, 80, 0.95)', 'rgba(52, 73, 94, 0.95)']}
          style={styles.navGradient}
        >
          <TouchableOpacity
            style={[styles.navButton, currentScreen === 'dashboard' && styles.activeNavButton]}
            onPress={() => navigateToScreen('dashboard')}
          >
            <Text style={[styles.navText, currentScreen === 'dashboard' && styles.activeNavText]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, currentScreen === 'place-order' && styles.activeNavButton]}
            onPress={() => navigateToScreen('place-order')}
          >
            <Text style={[styles.navText, currentScreen === 'place-order' && styles.activeNavText]}>
              Order
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, currentScreen === 'track-order' && styles.activeNavButton]}
            onPress={() => navigateToScreen('track-order')}
          >
            <Text style={[styles.navText, currentScreen === 'track-order' && styles.activeNavText]}>
              Track
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, currentScreen === 'history' && styles.activeNavButton]}
            onPress={() => navigateToScreen('history')}
          >
            <Text style={[styles.navText, currentScreen === 'history' && styles.activeNavText]}>
              History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={handleLogout}
          >
            <Text style={styles.navText}>Logout</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  navGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
  },
  activeNavButton: {
    backgroundColor: 'rgba(46, 204, 113, 0.3)',
  },
  navText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    fontWeight: '600',
  },
  activeNavText: {
    opacity: 1,
    color: '#2ecc71',
  },
});

export default CustomerApp;
