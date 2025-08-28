/**
 * Supabase Auth Screens for YouMats
 * Professional email verification authentication system
 * Cross-platform compatible (iOS & Android)
 * Black & White Theme
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { authService, AuthResponse } from './AuthServiceSupabase';
import { Colors } from './theme/colors';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface AuthScreensProps {
  onAuthSuccess: (user: any) => void;
  onNavigateToRegister: () => void;
}

export const AuthScreensSupabase: React.FC<AuthScreensProps> = ({ onAuthSuccess, onNavigateToRegister }) => {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Form validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
  };

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleResponse = (response: AuthResponse) => {
    if (response.success) {
      // Don't show success message here - let the App component handle role validation
      if (response.data?.user) {
        onAuthSuccess(response.data.user);
      }
    } else {
      Alert.alert('Error', response.message);
    }
  };

  const handleLogin = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(formData.email, formData.password);
      handleResponse(response);
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!validateEmail(formData.email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    try {
      const response = await authService.resetPassword(formData.email);
      handleResponse(response);
      if (response.success) {
        setCurrentScreen('login');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    key: string,
    placeholder: string,
    secureTextEntry: boolean = false,
    keyboardType: any = 'default'
  ) => (
    <View style={styles.inputContainer}>
      <TextInput
        style={[styles.input, errors[key] && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={formData[key as keyof typeof formData]}
        onChangeText={(value) => updateFormData(key, value)}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
    </View>
  );

  const renderLoginScreen = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Driver Sign In</Text>
      <Text style={styles.subtitle}>Access your YouMats driver dashboard</Text>

      {renderInput('email', 'Email Address', false, 'email-address')}
      {renderInput('password', 'Password', true)}

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setCurrentScreen('forgot')}
      >
        <Text style={styles.linkText}>Forgot Password?</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={styles.infoText}>
        Don't have a driver account?
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={onNavigateToRegister}
      >
        <Text style={styles.buttonText}>Register as Driver</Text>
      </TouchableOpacity>
    </View>
  );

  const renderForgotScreen = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you a reset link
      </Text>

      {renderInput('email', 'Email Address', false, 'email-address')}

      <TouchableOpacity
        style={styles.button}
        onPress={handleForgotPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setCurrentScreen('login')}
      >
        <Text style={styles.linkText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.gradient}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.appName}>YouMats</Text>
            <Text style={styles.tagline}>Building Materials Delivery</Text>
          </View>

          <View style={styles.formWrapper}>
            {currentScreen === 'login' && renderLoginScreen()}
            {currentScreen === 'forgot' && renderForgotScreen()}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  gradient: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 20,
    backgroundColor: Colors.primary,
    borderRadius: 15,
    marginHorizontal: -10,
    paddingHorizontal: 10,
  },
  appName: {
    fontSize: isTablet ? 48 : 36,
    fontWeight: 'bold',
    color: Colors.text.white,
    marginBottom: 8,
  },
  tagline: {
    fontSize: isTablet ? 20 : 16,
    color: Colors.text.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  formWrapper: {
    backgroundColor: Colors.text.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isTablet ? 18 : 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: isTablet ? 16 : 12,
    fontSize: isTablet ? 18 : 16,
    color: Colors.text.primary,
  },
  inputError: {
    borderColor: Colors.status.cancelled,
  },
  errorText: {
    color: Colors.status.cancelled,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: isTablet ? 18 : 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: Colors.text.white,
    fontSize: isTablet ? 20 : 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: isTablet ? 18 : 14,
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: isTablet ? 20 : 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  linkText: {
    color: Colors.primary,
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 24,
  },
  infoText: {
    color: Colors.text.secondary,
    fontSize: isTablet ? 16 : 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
