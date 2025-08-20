/**
 * YouMats - Professional Building Materials Delivery Platform
 * Modern, Professional UI with Enhanced UX
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
  TextInput,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// API Configuration
const API_BASE_URL = 'https://doom-beyond-i-continent.trycloudflare.com/api/v1';

// Professional Theme Colors
const theme = {
  primary: '#2C5CC5',      // Professional Blue
  secondary: '#1E40AF',    // Darker Blue
  accent: '#3B82F6',       // Bright Blue
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  error: '#EF4444',        // Red
  background: '#F8FAFC',   // Light Gray
  surface: '#FFFFFF',      // White
  text: {
    primary: '#1E293B',    // Dark Gray
    secondary: '#64748B',  // Medium Gray
    light: '#94A3B8',      // Light Gray
    white: '#FFFFFF',      // White
  },
  border: '#E2E8F0',       // Light Border
  shadow: '#00000015',     // Subtle Shadow
};

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

type Screen = 'welcome' | 'login' | 'register' | 'dashboard' | 'customer' | 'driver' | 'dispatcher';

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');

  // Register form state
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'customer',
    password: '',
    confirmPassword: '',
  });

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Check for existing session on app start
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem('youmats_token');
      const userData = await AsyncStorage.getItem('youmats_user');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setCurrentScreen('dashboard');
      } else {
        setCurrentScreen('welcome');
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setCurrentScreen('welcome');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (data.success && response.ok) {
        await AsyncStorage.setItem('youmats_token', data.data.token);
        await AsyncStorage.setItem('youmats_user', JSON.stringify(data.data.user));
        setUser(data.data.user);
        setCurrentScreen('dashboard');
        setError('');
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Unable to connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const { firstName, lastName, email, phone, role, password, confirmPassword } = registerData;
    
    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          role,
          password,
        }),
      });

      const data = await response.json();

      if (data.success && response.ok) {
        // Success - redirect to login
        setCurrentScreen('login');
        setRegisterData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'customer',
          password: '',
          confirmPassword: '',
        });
        setError('');
      } else {
        setError(data.message || 'Unable to create account');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Unable to connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('youmats_token');
      await AsyncStorage.removeItem('youmats_user');
      setUser(null);
      setCurrentScreen('welcome');
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LinearGradient
          colors={[theme.primary, theme.secondary]}
          style={styles.loadingGradient}
        >
          <Text style={styles.brandTitle}>YouMats</Text>
          <Text style={styles.brandSubtitle}>Building Materials Delivery</Text>
          <ActivityIndicator size="large" color={theme.text.white} style={{ marginTop: 30 }} />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Welcome Screen
  const renderWelcomeScreen = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
        style={styles.welcomeContainer}
      >
        <View style={styles.welcomeContent}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>YouMats</Text>
            <Text style={styles.brandSubtitle}>Professional Building Materials Delivery</Text>
            <Text style={styles.brandDescription}>
              Streamline your construction projects with our reliable delivery platform
            </Text>
          </View>

          <View style={styles.welcomeButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]}
              onPress={() => setCurrentScreen('login')}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setCurrentScreen('register')}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Key Features</Text>
            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>• Real-time order tracking</Text>
              <Text style={styles.featureItem}>• Professional delivery management</Text>
              <Text style={styles.featureItem}>• Instant notifications</Text>
              <Text style={styles.featureItem}>• Secure transactions</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );

  // Professional Registration Screen
  const renderRegisterScreen = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.background} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.formHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setCurrentScreen('welcome')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.screenTitle}>Create Account</Text>
              <Text style={styles.screenSubtitle}>Join YouMats to start managing your deliveries</Text>
            </View>
          </View>

          {/* Registration Form */}
          <View style={styles.formCard}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Personal Information</Text>
              
              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    placeholderTextColor={theme.text.light}
                    value={registerData.firstName}
                    onChangeText={(text) => setRegisterData({...registerData, firstName: text})}
                    autoCapitalize="words"
                  />
                </View>
                
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    placeholderTextColor={theme.text.light}
                    value={registerData.lastName}
                    onChangeText={(text) => setRegisterData({...registerData, lastName: text})}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={theme.text.light}
                  value={registerData.email}
                  onChangeText={(text) => setRegisterData({...registerData, email: text.toLowerCase()})}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={theme.text.light}
                  value={registerData.phone}
                  onChangeText={(text) => setRegisterData({...registerData, phone: text})}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Type</Text>
              <View style={styles.roleSelector}>
                {[
                  { key: 'customer', label: 'Customer', desc: 'Order building materials' },
                  { key: 'driver', label: 'Driver', desc: 'Deliver materials' },
                  { key: 'dispatcher', label: 'Dispatcher', desc: 'Manage deliveries' },
                ].map((role) => (
                  <TouchableOpacity
                    key={role.key}
                    style={[
                      styles.roleOption,
                      registerData.role === role.key && styles.roleOptionSelected
                    ]}
                    onPress={() => setRegisterData({...registerData, role: role.key})}
                  >
                    <View style={styles.roleContent}>
                      <Text style={[
                        styles.roleLabel,
                        registerData.role === role.key && styles.roleLabelSelected
                      ]}>
                        {role.label}
                      </Text>
                      <Text style={[
                        styles.roleDesc,
                        registerData.role === role.key && styles.roleDescSelected
                      ]}>
                        {role.desc}
                      </Text>
                    </View>
                    <View style={[
                      styles.roleRadio,
                      registerData.role === role.key && styles.roleRadioSelected
                    ]} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Security</Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Password (min. 6 characters)"
                  placeholderTextColor={theme.text.light}
                  value={registerData.password}
                  onChangeText={(text) => setRegisterData({...registerData, password: text})}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={theme.text.light}
                  value={registerData.confirmPassword}
                  onChangeText={(text) => setRegisterData({...registerData, confirmPassword: text})}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.text.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => setCurrentScreen('login')}>
                <Text style={styles.loginPromptLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const renderLoginScreen = () => (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1E3A8A', '#3B82F6', '#60A5FA']}
        style={styles.loadingContainer}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.formContainer}>
              <View style={styles.formHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setCurrentScreen('welcome')}
                >
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                
                <View style={styles.headerContent}>
                  <Text style={styles.screenTitle}>Welcome Back</Text>
                  <Text style={styles.screenSubtitle}>
                    Sign in to your YouMats account to continue
                  </Text>
                </View>
              </View>

              <View style={styles.formCard}>
                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor={theme.text.light}
                      value={loginEmail}
                      onChangeText={setLoginEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor={theme.text.light}
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={theme.text.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.loginPrompt}>
                  <Text style={styles.loginPromptText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => setCurrentScreen('register')}>
                    <Text style={styles.loginPromptLink}>Create Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );

  const renderDashboard = () => (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1E3A8A', '#3B82F6', '#60A5FA']}
        style={styles.loadingContainer}
      >
        <View style={styles.dashboardContainer}>
          <View style={styles.dashboardHeader}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userNameText}>{user?.firstName} {user?.lastName}</Text>
              <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
            </View>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.dashboardContent}>
            <View style={styles.dashboardGrid}>
              <View style={styles.dashboardCard}>
                <Text style={styles.cardTitle}>Quick Order</Text>
                <Text style={styles.cardDesc}>Create a new delivery order</Text>
                <TouchableOpacity style={styles.cardButton}>
                  <Text style={styles.cardButtonText}>Order Now</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dashboardCard}>
                <Text style={styles.cardTitle}>My Orders</Text>
                <Text style={styles.cardDesc}>View your order history</Text>
                <TouchableOpacity style={styles.cardButton}>
                  <Text style={styles.cardButtonText}>View Orders</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dashboardCard}>
                <Text style={styles.cardTitle}>Track Delivery</Text>
                <Text style={styles.cardDesc}>Real-time delivery tracking</Text>
                <TouchableOpacity style={styles.cardButton}>
                  <Text style={styles.cardButtonText}>Track</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dashboardCard}>
                <Text style={styles.cardTitle}>Support</Text>
                <Text style={styles.cardDesc}>Get help with your orders</Text>
                <TouchableOpacity style={styles.cardButton}>
                  <Text style={styles.cardButtonText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.recentOrdersSection}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <View style={styles.orderCard}>
                <Text style={styles.orderTitle}>Order #12345</Text>
                <Text style={styles.orderStatus}>In Transit</Text>
                <Text style={styles.orderDate}>Ordered on Jan 10, 2025</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );

  // Render appropriate screen
  switch (currentScreen) {
    case 'welcome':
      return renderWelcomeScreen();
    case 'register':
      return renderRegisterScreen();
    case 'login':
      return renderLoginScreen();
    case 'dashboard':
      return renderDashboard();
    default:
      return renderWelcomeScreen();
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },

  // Welcome Screen Styles
  welcomeContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  brandTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.text.white,
    letterSpacing: 2,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 16,
    color: theme.text.white,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  brandDescription: {
    fontSize: 14,
    color: theme.text.white,
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  welcomeButtons: {
    gap: 16,
  },
  featuresContainer: {
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.white,
    marginBottom: 12,
  },
  featuresList: {
    alignItems: 'flex-start',
  },
  featureItem: {
    fontSize: 14,
    color: theme.text.white,
    opacity: 0.8,
    marginBottom: 4,
  },

  // Form Styles
  formContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  formHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '500',
  },
  headerContent: {
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text.primary,
    textAlign: 'center',
  },
  screenSubtitle: {
    fontSize: 16,
    color: theme.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: theme.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    marginBottom: 40,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // Input Styles
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.text.primary,
  },

  // Role Selector Styles
  roleSelector: {
    gap: 12,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
  },
  roleOptionSelected: {
    borderColor: theme.primary,
    backgroundColor: `${theme.primary}08`,
  },
  roleContent: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
  },
  roleLabelSelected: {
    color: theme.primary,
  },
  roleDesc: {
    fontSize: 14,
    color: theme.text.secondary,
    marginTop: 2,
  },
  roleDescSelected: {
    color: theme.primary,
  },
  roleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.border,
  },
  roleRadioSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },

  // Button Styles
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.text.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.white,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.white,
  },

  // Login Prompt Styles
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginPromptText: {
    fontSize: 14,
    color: theme.text.secondary,
  },
  loginPromptLink: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '600',
  },

  // Error Styles
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },

  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    padding: 20,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: theme.text.white,
    opacity: 0.8,
  },
  userNameText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text.white,
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    color: theme.text.white,
    opacity: 0.7,
    marginTop: 2,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutText: {
    color: theme.text.white,
    fontSize: 14,
    fontWeight: '500',
  },
  dashboardContent: {
    flex: 1,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  dashboardCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: '48%',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: theme.text.secondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  cardButton: {
    backgroundColor: theme.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardButtonText: {
    color: theme.text.white,
    fontSize: 12,
    fontWeight: '600',
  },
  recentOrdersSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text.white,
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
  },
  orderStatus: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  orderDate: {
    fontSize: 12,
    color: theme.text.secondary,
    marginTop: 2,
  },
});

export default App;
