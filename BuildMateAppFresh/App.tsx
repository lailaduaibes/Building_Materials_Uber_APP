/**
 * BuildMate Delivery App
 * Professional Building Materials Delivery Management System with Authentication
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

type Screen = 'login' | 'register' | 'dashboard' | 'customer' | 'driver' | 'dispatcher' | 'create-order';

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    password: '',
  });

  // Order form state
  const [orderData, setOrderData] = useState({
    materialType: '',
    description: '',
    quantity: '',
    unit: 'kg',
    weight: '',
    pickupStreet: '',
    pickupCity: '',
    pickupState: '',
    pickupZip: '',
    deliveryStreet: '',
    deliveryCity: '',
    deliveryState: '',
    deliveryZip: '',
    scheduledPickupTime: '',
    scheduledDeliveryTime: '',
    notes: '',
  });

  // Check for existing session on app start
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem('buildmate_token');
      const userData = await AsyncStorage.getItem('buildmate_user');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setCurrentScreen('dashboard');
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://takes-missouri-favorite-but.trycloudflare.com/api/v1/auth/login', {
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

      if (response.ok && data.success) {
        await AsyncStorage.setItem('buildmate_token', data.data.token);
        await AsyncStorage.setItem('buildmate_user', JSON.stringify(data.data.user));
        setUser(data.data.user);
        setCurrentScreen('dashboard');
        Alert.alert('Success', `Welcome back, ${data.data.user.firstName}!`);
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const { firstName, lastName, email, phone, role, password } = registerData;
    
    if (!firstName || !lastName || !email || !phone || !role || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://takes-missouri-favorite-but.trycloudflare.com/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Account created successfully! Please sign in.');
        setCurrentScreen('login');
        setRegisterData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: '',
          password: '',
        });
      } else {
        Alert.alert('Registration Failed', data.message || 'Unable to create account');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('buildmate_token');
      await AsyncStorage.removeItem('buildmate_user');
      setUser(null);
      setCurrentScreen('login');
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const testBackendConnection = async () => {
    try {
      const response = await fetch('https://takes-missouri-favorite-but.trycloudflare.com/health');
      const data = await response.json();
      Alert.alert('Backend Connection', `✅ ${data.message}`);
    } catch (error) {
      Alert.alert('Backend Connection', '❌ Failed to connect to backend API. Make sure your backend is running on https://takes-missouri-favorite-but.trycloudflare.com');
      console.error('Backend connection error:', error);
    }
  };

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2E86C1" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E86C1" />
          <Text style={styles.loadingText}>Loading BuildMate...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Login Screen
  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2E86C1" />
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>BuildMate</Text>
            <Text style={styles.headerSubtitle}>Building Materials Delivery</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Please sign in to continue</Text>

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={loginEmail}
              onChangeText={setLoginEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>🔐 Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => setCurrentScreen('register')}>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Register Screen
  if (currentScreen === 'register') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2E86C1" />
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen('login')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Account</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={registerData.firstName}
              onChangeText={(text) => setRegisterData({...registerData, firstName: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={registerData.lastName}
              onChangeText={(text) => setRegisterData({...registerData, lastName: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={registerData.email}
              onChangeText={(text) => setRegisterData({...registerData, email: text})}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={registerData.phone}
              onChangeText={(text) => setRegisterData({...registerData, phone: text})}
              keyboardType="phone-pad"
            />

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Role:</Text>
              <View style={styles.roleButtons}>
                {['customer', 'driver', 'dispatcher'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleButton,
                      registerData.role === role && styles.roleButtonSelected
                    ]}
                    onPress={() => setRegisterData({...registerData, role})}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      registerData.role === role && styles.roleButtonTextSelected
                    ]}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              value={registerData.password}
              onChangeText={(text) => setRegisterData({...registerData, password: text})}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>✅ Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Dashboard Screen (authenticated user)
  if (currentScreen === 'dashboard') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2E86C1" />
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>BuildMate</Text>
            <Text style={styles.headerSubtitle}>Welcome, {user?.firstName}!</Text>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={logout}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Choose Your Portal</Text>
              <Text style={styles.welcomeText}>
                Access your dashboard to manage orders and deliveries
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => setCurrentScreen('customer')}
            >
              <Text style={styles.buttonText}>🏗️ Customer Portal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={() => setCurrentScreen('driver')}
            >
              <Text style={styles.buttonText}>🚛 Driver Portal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
              onPress={() => setCurrentScreen('dispatcher')}
            >
              <Text style={styles.outlineButtonText}>📊 Dispatcher Portal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={testBackendConnection}
            >
              <Text style={styles.buttonText}>🔗 Test API Connection</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Customer Portal
  if (currentScreen === 'customer') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2E86C1" />
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen('dashboard')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Customer Portal</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Place Your Order</Text>
              <Text style={styles.welcomeText}>
                Order building materials for delivery to your site
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => setCurrentScreen('create-order')}
            >
              <Text style={styles.buttonText}>📦 Place New Order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={() => Alert.alert('Track Order', 'Order tracking feature coming soon!')}
            >
              <Text style={styles.buttonText}>📍 Track My Orders</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Driver Portal
  if (currentScreen === 'driver') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2E86C1" />
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen('dashboard')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Driver Portal</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Manage Deliveries</Text>
              <Text style={styles.welcomeText}>
                View and manage your assigned delivery routes
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => Alert.alert('View Routes', 'Route management feature coming soon!')}
            >
              <Text style={styles.buttonText}>🗺️ View My Routes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={() => Alert.alert('Update Status', 'Status update feature coming soon!')}
            >
              <Text style={styles.buttonText}>📱 Update Delivery Status</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Dispatcher Portal
  if (currentScreen === 'dispatcher') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2E86C1" />
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen('dashboard')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Dispatcher Portal</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Fleet Management</Text>
              <Text style={styles.welcomeText}>
                Coordinate drivers and manage delivery assignments
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => Alert.alert('Manage Fleet', 'Fleet management feature coming soon!')}
            >
              <Text style={styles.buttonText}>🚛 Manage Fleet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={() => Alert.alert('Assign Orders', 'Order assignment feature coming soon!')}
            >
              <Text style={styles.buttonText}>📋 Assign Orders</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Create Order Screen
  if (currentScreen === 'create-order') {
    const handleCreateOrder = async () => {
      if (!orderData.materialType || !orderData.description || !orderData.quantity || !orderData.weight ||
          !orderData.pickupStreet || !orderData.deliveryStreet) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      setLoading(true);
      try {
        const orderPayload = {
          items: [{
            materialType: orderData.materialType,
            description: orderData.description,
            quantity: parseFloat(orderData.quantity),
            unit: orderData.unit,
            weight: parseFloat(orderData.weight),
            volume: 0, // Default value
          }],
          pickupAddress: {
            street: orderData.pickupStreet,
            city: orderData.pickupCity,
            state: orderData.pickupState,
            zipCode: orderData.pickupZip,
          },
          deliveryAddress: {
            street: orderData.deliveryStreet,
            city: orderData.deliveryCity,
            state: orderData.deliveryState,
            zipCode: orderData.deliveryZip,
          },
          scheduledPickupTime: orderData.scheduledPickupTime || null,
          scheduledDeliveryTime: orderData.scheduledDeliveryTime || null,
          notes: orderData.notes || null,
        };

        const token = await AsyncStorage.getItem('buildmate_token');
        const response = await fetch('https://takes-missouri-favorite-but.trycloudflare.com/api/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(orderPayload),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          Alert.alert('Success', 'Order created successfully!', [
            { text: 'OK', onPress: () => setCurrentScreen('customer') }
          ]);
          // Reset form
          setOrderData({
            materialType: '',
            description: '',
            quantity: '',
            unit: 'kg',
            weight: '',
            pickupStreet: '',
            pickupCity: '',
            pickupState: '',
            pickupZip: '',
            deliveryStreet: '',
            deliveryCity: '',
            deliveryState: '',
            deliveryZip: '',
            scheduledPickupTime: '',
            scheduledDeliveryTime: '',
            notes: '',
          });
        } else {
          Alert.alert('Order Failed', data.message || 'Unable to create order');
        }
      } catch (error) {
        console.error('Order creation error:', error);
        Alert.alert('Error', 'Unable to connect to server. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2E86C1" />
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen('customer')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Order</Text>
            <Text style={styles.headerSubtitle}>Building Materials Delivery</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Order Details</Text>
            <Text style={styles.formSubtitle}>Tell us what you need delivered</Text>

            <TextInput
              style={styles.input}
              placeholder="Material Type (e.g., Cement, Bricks, Steel)"
              value={orderData.materialType}
              onChangeText={(text) => setOrderData({...orderData, materialType: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Description"
              value={orderData.description}
              onChangeText={(text) => setOrderData({...orderData, description: text})}
              multiline
            />

            <View style={styles.rowContainer}>
              <TextInput
                style={[styles.input, styles.halfWidth]}
                placeholder="Quantity"
                value={orderData.quantity}
                onChangeText={(text) => setOrderData({...orderData, quantity: text})}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.halfWidth]}
                placeholder="Weight (kg)"
                value={orderData.weight}
                onChangeText={(text) => setOrderData({...orderData, weight: text})}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.sectionTitle}>Pickup Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Street Address"
              value={orderData.pickupStreet}
              onChangeText={(text) => setOrderData({...orderData, pickupStreet: text})}
            />
            <View style={styles.rowContainer}>
              <TextInput
                style={[styles.input, styles.halfWidth]}
                placeholder="City"
                value={orderData.pickupCity}
                onChangeText={(text) => setOrderData({...orderData, pickupCity: text})}
              />
              <TextInput
                style={[styles.input, styles.quarterWidth]}
                placeholder="State"
                value={orderData.pickupState}
                onChangeText={(text) => setOrderData({...orderData, pickupState: text})}
              />
              <TextInput
                style={[styles.input, styles.quarterWidth]}
                placeholder="ZIP"
                value={orderData.pickupZip}
                onChangeText={(text) => setOrderData({...orderData, pickupZip: text})}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Street Address"
              value={orderData.deliveryStreet}
              onChangeText={(text) => setOrderData({...orderData, deliveryStreet: text})}
            />
            <View style={styles.rowContainer}>
              <TextInput
                style={[styles.input, styles.halfWidth]}
                placeholder="City"
                value={orderData.deliveryCity}
                onChangeText={(text) => setOrderData({...orderData, deliveryCity: text})}
              />
              <TextInput
                style={[styles.input, styles.quarterWidth]}
                placeholder="State"
                value={orderData.deliveryState}
                onChangeText={(text) => setOrderData({...orderData, deliveryState: text})}
              />
              <TextInput
                style={[styles.input, styles.quarterWidth]}
                placeholder="ZIP"
                value={orderData.deliveryZip}
                onChangeText={(text) => setOrderData({...orderData, deliveryZip: text})}
                keyboardType="numeric"
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Special Notes (Optional)"
              value={orderData.notes}
              onChangeText={(text) => setOrderData({...orderData, notes: text})}
              multiline
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleCreateOrder}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>📦 Create Order</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={testBackendConnection}
            >
              <Text style={styles.buttonText}>🔧 Test Connection</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <View></View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 18,
    color: '#2C3E50',
    marginTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2E86C1',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 35,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    position: 'absolute',
    right: 20,
    top: 35,
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 10,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#5D6D7E',
    textAlign: 'center',
    marginBottom: 25,
  },
  input: {
    borderWidth: 2,
    borderColor: '#ECF0F1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: 'white',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: '#E74C3C',
  },
  successButton: {
    backgroundColor: '#28B463',
  },
  testButton: {
    backgroundColor: '#E67E22',
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: '#2E86C1',
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  outlineButtonText: {
    color: '#2E86C1',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  linkText: {
    color: '#7F8C8D',
    fontSize: 16,
  },
  link: {
    color: '#3498DB',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: '#ECF0F1',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  roleButtonSelected: {
    borderColor: '#3498DB',
    backgroundColor: '#EBF3FD',
  },
  roleButtonText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: 'bold',
  },
  roleButtonTextSelected: {
    color: '#3498DB',
  },
  welcomeSection: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 12,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#5D6D7E',
    textAlign: 'center',
    lineHeight: 24,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  halfWidth: {
    width: '48%',
  },
  quarterWidth: {
    width: '23%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
});

export default App;
