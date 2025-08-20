/**
 * YouMats - Professional Building Materials Delivery Platform
 * Cross-Platform Compatible (iOS & Android)
 * Enhanced with Supabase email verification authentication system
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { AuthScreensSupabase } from './AuthScreensSupabase';
import { authService, User } from './AuthServiceSupabase';

// Get device dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Device type detection
const isTablet = screenWidth >= 768;
const isSmallDevice = screenWidth < 375;

// Platform-specific constants
const HEADER_HEIGHT = Platform.OS === 'ios' ? 44 : 56;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

// Cross-platform responsive theme
const theme = {
  primary: '#2C5CC5',
  secondary: '#1E40AF',
  accent: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    white: '#FFFFFF',
    light: '#94A3B8',
  },
  border: '#E2E8F0',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// App screen types
type Screen = 'loading' | 'auth' | 'customer' | 'driver' | 'dispatcher' | 'dashboard';

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize authentication on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Add small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if user is already authenticated
      const currentUser = authService.getCurrentUser();
      const authenticated = authService.isAuthenticated();
      
      if (authenticated && currentUser && currentUser.emailConfirmed) {
        setUser(currentUser);
        setIsAuthenticated(true);
        setCurrentScreen(getRoleBasedScreen(currentUser.role || 'customer'));
      } else if (currentUser && !currentUser.emailConfirmed) {
        // User exists but email not verified
        setCurrentScreen('auth');
      } else {
        setCurrentScreen('auth');
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setCurrentScreen('auth');
    }
  };

  const getRoleBasedScreen = (role: string): Screen => {
    switch (role.toLowerCase()) {
      case 'driver':
        return 'driver';
      case 'dispatcher':
        return 'dispatcher';
      case 'admin':
        return 'dashboard';
      default:
        return 'customer';
    }
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    setCurrentScreen(getRoleBasedScreen(userData.role || 'customer'));
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
              setUser(null);
              setIsAuthenticated(false);
              setCurrentScreen('auth');
              Alert.alert('Success', 'Logged out successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  // Loading screen
  if (currentScreen === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.primary, theme.secondary]}
          style={styles.loadingGradient}
        >
          <Text style={styles.loadingLogo}>YouMats</Text>
          <ActivityIndicator size="large" color={theme.text.white} style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Initializing...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Authentication screen
  if (currentScreen === 'auth') {
    return (
      <SafeAreaView style={styles.container}>
        <ExpoStatusBar style="light" />
        <AuthScreensSupabase onAuthSuccess={handleAuthSuccess} />
      </SafeAreaView>
    );
  }

  // Main app screens based on user role
  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />
      {renderMainContent()}
    </SafeAreaView>
  );

  function renderMainContent() {
    const userDisplayName = user 
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : 'User';

    switch (currentScreen) {
      case 'customer':
        return renderCustomerDashboard();
      case 'driver':
        return renderDriverDashboard();
      case 'dispatcher':
        return renderDispatcherDashboard();
      case 'dashboard':
        return renderAdminDashboard();
      default:
        return renderCustomerDashboard();
    }
  }

  function renderCustomerDashboard() {
    return (
      <ScrollView style={styles.mainContainer}>
        <LinearGradient
          colors={[theme.primary, theme.secondary]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.firstName || 'Customer'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Customer Dashboard</Text>
          
          <View style={styles.dashboardGrid}>
            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>📦</Text>
              </View>
              <Text style={styles.cardTitle}>Place Order</Text>
              <Text style={styles.cardDescription}>Order building materials for delivery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>📋</Text>
              </View>
              <Text style={styles.cardTitle}>My Orders</Text>
              <Text style={styles.cardDescription}>Track your delivery orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>💳</Text>
              </View>
              <Text style={styles.cardTitle}>Payment</Text>
              <Text style={styles.cardDescription}>Manage payment methods</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>📞</Text>
              </View>
              <Text style={styles.cardTitle}>Support</Text>
              <Text style={styles.cardDescription}>Get help and support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderDriverDashboard() {
    return (
      <ScrollView style={styles.mainContainer}>
        <LinearGradient
          colors={[theme.success, '#059669']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Driver Portal</Text>
              <Text style={styles.userName}>{user?.firstName || 'Driver'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Driver Dashboard</Text>
          
          <View style={styles.dashboardGrid}>
            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>🚚</Text>
              </View>
              <Text style={styles.cardTitle}>Active Deliveries</Text>
              <Text style={styles.cardDescription}>View assigned delivery routes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>📍</Text>
              </View>
              <Text style={styles.cardTitle}>Navigation</Text>
              <Text style={styles.cardDescription}>GPS navigation for deliveries</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>✅</Text>
              </View>
              <Text style={styles.cardTitle}>Complete Delivery</Text>
              <Text style={styles.cardDescription}>Mark deliveries as completed</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>📊</Text>
              </View>
              <Text style={styles.cardTitle}>Statistics</Text>
              <Text style={styles.cardDescription}>View delivery performance</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderDispatcherDashboard() {
    return (
      <ScrollView style={styles.mainContainer}>
        <LinearGradient
          colors={[theme.warning, '#D97706']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Dispatch Center</Text>
              <Text style={styles.userName}>{user?.firstName || 'Dispatcher'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Dispatcher Dashboard</Text>
          
          <View style={styles.dashboardGrid}>
            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>📋</Text>
              </View>
              <Text style={styles.cardTitle}>Order Queue</Text>
              <Text style={styles.cardDescription}>Manage pending orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>🚛</Text>
              </View>
              <Text style={styles.cardTitle}>Fleet Management</Text>
              <Text style={styles.cardDescription}>Assign drivers and vehicles</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>🗺️</Text>
              </View>
              <Text style={styles.cardTitle}>Route Optimization</Text>
              <Text style={styles.cardDescription}>Optimize delivery routes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>📈</Text>
              </View>
              <Text style={styles.cardTitle}>Analytics</Text>
              <Text style={styles.cardDescription}>View operational metrics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderAdminDashboard() {
    return (
      <ScrollView style={styles.mainContainer}>
        <LinearGradient
          colors={[theme.error, '#DC2626']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Admin Panel</Text>
              <Text style={styles.userName}>{user?.firstName || 'Administrator'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Admin Dashboard</Text>
          
          <View style={styles.dashboardGrid}>
            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>👥</Text>
              </View>
              <Text style={styles.cardTitle}>User Management</Text>
              <Text style={styles.cardDescription}>Manage users and roles</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>🚚</Text>
              </View>
              <Text style={styles.cardTitle}>Fleet Management</Text>
              <Text style={styles.cardDescription}>Manage vehicles and drivers</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>📊</Text>
              </View>
              <Text style={styles.cardTitle}>Reports</Text>
              <Text style={styles.cardDescription}>Business analytics and reports</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardCard}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>⚙️</Text>
              </View>
              <Text style={styles.cardTitle}>Settings</Text>
              <Text style={styles.cardDescription}>System configuration</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  
  // Loading screen styles
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingLogo: {
    fontSize: isTablet ? 48 : 36,
    fontWeight: 'bold',
    color: theme.text.white,
    marginBottom: 30,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: isTablet ? 18 : 16,
    color: theme.text.white,
    opacity: 0.8,
  },

  // Main app styles
  mainContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingTop: STATUS_BAR_HEIGHT + 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: {
    fontSize: isTablet ? 18 : 14,
    color: theme.text.white,
    opacity: 0.9,
  },
  userName: {
    fontSize: isTablet ? 28 : 20,
    fontWeight: 'bold',
    color: theme.text.white,
    marginTop: 4,
  },
  userEmail: {
    fontSize: isTablet ? 16 : 12,
    color: theme.text.white,
    opacity: 0.8,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutText: {
    color: theme.text.white,
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginBottom: 20,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dashboardCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: isTablet ? '48%' : '100%',
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardIcon: {
    width: 50,
    height: 50,
    backgroundColor: theme.primary + '15',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconText: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: isTablet ? 20 : 16,
    fontWeight: '600',
    color: theme.text.primary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: isTablet ? 16 : 14,
    color: theme.text.secondary,
    lineHeight: 20,
  },
});

export default App;
