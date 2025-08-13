import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, FontSizes } from './src/constants/theme';
import { authAPI } from './src/services/api';

export default function App() {
  const testBackendConnection = async () => {
    try {
      const response = await fetch('http://10.0.2.2:3000/health');
      const data = await response.json();
      Alert.alert('Backend Connection', `✅ ${data.message}`, [
        { text: 'OK' }
      ]);
    } catch (error) {
      Alert.alert('Backend Connection', '❌ Failed to connect to backend API', [
        { text: 'OK' }
      ]);
      console.error('Backend connection error:', error);
    }
  };

  const testLogin = async () => {
    try {
      Alert.alert('Testing Login', 'Trying to login with test credentials...', [
        { text: 'OK' }
      ]);
      
      // Test credentials 
      const response = await authAPI.login('customer@test.com', 'password123');
      
      if (response.success) {
        Alert.alert('Login Test', `✅ Login successful!\nUser: ${response.data.user.firstName} ${response.data.user.lastName}\nRole: ${response.data.user.role}`, [
          { text: 'OK' }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Login Test', `❌ Login failed: ${error.response?.data?.message || error.message}`, [
        { text: 'OK' }
      ]);
      console.error('Login error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>BuildMate</Text>
        <Text style={styles.subtitle}>Building Materials Delivery</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.welcomeText}>🚀 React Native App Ready!</Text>
        <Text style={styles.descriptionText}>
          Professional mobile app for iOS & Android{'\n'}
          Connected to your Building Materials API
        </Text>

        {/* Test Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={testBackendConnection}>
            <Text style={styles.buttonText}>🌐 Test Backend Connection</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testLogin}>
            <Text style={styles.buttonText}>🔐 Test Login API</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>✅ Features Ready:</Text>
          <Text style={styles.featureText}>• Professional Login Screen</Text>
          <Text style={styles.featureText}>• Customer Dashboard</Text>
          <Text style={styles.featureText}>• Order Management</Text>
          <Text style={styles.featureText}>• API Integration</Text>
          <Text style={styles.featureText}>• iOS & Android Support</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Ready for testing! 📱</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: FontSizes.xxl,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  descriptionText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    marginBottom: Spacing.xl,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  featuresContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 8,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuresTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  footer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '600',
  },
});
