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
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { authService, AuthResponse } from './AuthServiceSupabase';
import { Colors, getGradient } from './theme/colors';
import { responsive, deviceTypes, responsiveStyles } from './utils/ResponsiveUtils';

const { width: screenWidth } = Dimensions.get('window');

interface AuthScreensProps {
  onAuthSuccess: (user: any) => void;
  onNavigateToRegister: () => void;
}

export const AuthScreensSupabase: React.FC<AuthScreensProps> = ({ onAuthSuccess, onNavigateToRegister }) => {
  const { t } = useTranslation();
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
      <Text style={styles.title}>Driver Portal</Text>
      <Text style={styles.subtitle}>Sign in to your driver account</Text>

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

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onNavigateToRegister}
      >
        <Text style={styles.secondaryButtonText}>Get Started as Driver</Text>
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
      <LinearGradient
        colors={getGradient('welcome')}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.appName}>YouMats</Text>
          </View>

          <View style={styles.formWrapper}>
            {currentScreen === 'login' && renderLoginScreen()}
            {currentScreen === 'forgot' && renderForgotScreen()}
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: responsive.padding(20),
    paddingTop: Platform.OS === 'ios' ? responsive.padding(60) : responsive.padding(40),
    paddingBottom: responsive.padding(40),
    justifyContent: 'center',
    minHeight: Dimensions.get('window').height - (Platform.OS === 'ios' ? 100 : 80),
  },
  header: {
    alignItems: 'center',
    marginBottom: responsive.margin(40),
    paddingVertical: responsive.padding(20),
  },
  appName: {
    fontSize: responsive.fontSize(42, 48),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: responsive.margin(8),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  tagline: {
    fontSize: responsive.fontSize(18, 20),
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  formWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: responsive.scale(20),
    padding: responsive.padding(30),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: responsive.fontSize(28, 32),
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: responsive.margin(8),
  },
  subtitle: {
    fontSize: responsive.fontSize(16, 18),
    color: '#666666',
    textAlign: 'center',
    marginBottom: responsive.margin(32),
    lineHeight: responsive.scale(22),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginBottom: responsive.margin(20),
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E1E5E9',
    borderRadius: responsive.scale(12),
    paddingHorizontal: responsive.padding(16),
    paddingVertical: responsive.padding(14, 18),
    fontSize: responsive.fontSize(16, 18),
    color: '#333333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#FF4757',
  },
  errorText: {
    color: '#FF4757',
    fontSize: responsive.fontSize(12, 14),
    marginTop: responsive.margin(4),
    marginLeft: responsive.margin(4),
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: responsive.scale(12),
    paddingVertical: responsive.padding(16, 18),
    alignItems: 'center',
    marginTop: responsive.margin(8),
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize(18, 20),
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: responsive.scale(12),
    paddingVertical: responsive.padding(16, 18),
    alignItems: 'center',
    marginTop: responsive.margin(16),
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: responsive.fontSize(18, 20),
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: responsive.margin(16),
    paddingVertical: responsive.padding(8),
  },
  linkText: {
    color: Colors.primary,
    fontSize: responsive.fontSize(14, 16),
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E1E5E9',
    marginVertical: responsive.margin(24),
  },
  infoText: {
    color: '#666666',
    fontSize: responsive.fontSize(14, 16),
    textAlign: 'center',
    lineHeight: responsive.scale(20),
  },
});
