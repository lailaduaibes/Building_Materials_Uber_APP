/**
 * Supabase Auth Screens for Customer App
 * Professional email verification authentication system
 * Cross-platform compatible (iOS & Android)
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authService, User } from './AuthServiceSupabase'; // Import the Supabase auth service

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface AuthScreensProps {
  onAuthSuccess: (user: any) => void;
}

export const AuthScreensSupabase: React.FC<AuthScreensProps> = ({ onAuthSuccess }) => {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'register' | 'verify' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    verificationCode: '',
  });

  // Form validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleResponse = (response: { success: boolean; data?: { user?: User; requiresVerification?: boolean }; error?: string }) => {
    if (response.success && response.data?.user) {
      if (response.data.requiresVerification) {
        setCurrentScreen('verify');
        Alert.alert('Success', 'Registration successful! Please check your email for a 6-digit verification code.');
      } else {
        // Silent login success - no need to show alert, user experience should be seamless
        onAuthSuccess(response.data.user);
      }
    } else {
      Alert.alert('Error', response.error || 'Authentication failed');
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
    const newErrors: { [key: string]: string } = {};

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await authService.resetPassword(formData.email);
      
      if (response.success) {
        Alert.alert(
          'Reset Email Sent', 
          'Check your email for password reset instructions. The link will open a secure webpage where you can reset your password, then return to the app to sign in.',
          [
            {
              text: 'OK',
              onPress: () => setCurrentScreen('login')
            }
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to send reset email');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.phone,
        'customer'
      );
      handleResponse(response);
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Email verification with OTP
  const handleVerify = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.verificationCode.trim()) {
      newErrors.verificationCode = 'Verification code is required';
    } else if (formData.verificationCode.length !== 6) {
      newErrors.verificationCode = 'Verification code must be 6 digits';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyEmail(formData.email, formData.verificationCode);
      
      if (response.success && response.data?.user) {
        Alert.alert('Success', 'Email verified successfully!');
        onAuthSuccess(response.data.user);
      } else {
        Alert.alert('Error', response.error || 'Verification failed');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      Alert.alert('Error', 'Email is required to resend verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.resendVerification(formData.email);
      
      if (response.success) {
        Alert.alert('Success', response.message || 'New verification code sent!');
      } else {
        Alert.alert('Error', response.error || 'Failed to resend verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.appTitle}>YouMats</Text>
      <Text style={styles.appSubtitle}>Customer Portal</Text>
      <Text style={styles.tagline}>Your building materials, delivered</Text>
    </View>
  );

  const renderInput = (
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    keyboardType: any = 'default',
    secureTextEntry: boolean = false,
    error?: string
  ) => (
    <View style={styles.inputContainer}>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.7)"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  const renderPasswordInput = (
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    showPassword: boolean,
    toggleShowPassword: () => void,
    error?: string
  ) => (
    <View style={styles.inputContainer}>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.passwordInput, error && styles.inputError]}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.7)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity 
          style={styles.eyeIcon}
          onPress={toggleShowPassword}
        >
          <Ionicons 
            name={showPassword ? 'eye-off' : 'eye'} 
            size={24} 
            color="rgba(255,255,255,0.7)" 
          />
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  const renderButton = (title: string, onPress: () => void, style?: any) => (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );

  const renderLoginScreen = () => (
    <View style={styles.formContainer}>
      <Text style={styles.screenTitle}>Welcome Back</Text>
      <Text style={styles.screenSubtitle}>Sign in to your account</Text>

      {renderInput(
        'Email',
        formData.email,
        (text) => updateFormData('email', text),
        'email-address',
        false,
        errors.email
      )}

      {renderPasswordInput(
        'Password',
        formData.password,
        (text) => updateFormData('password', text),
        showPassword,
        () => setShowPassword(!showPassword),
        errors.password
      )}

      {renderButton('Sign In', handleLogin)}

      <TouchableOpacity 
        style={styles.linkButton} 
        onPress={() => setCurrentScreen('register')}
      >
        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.linkButton} 
        onPress={() => setCurrentScreen('forgot')}
      >
        <Text style={styles.linkText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRegisterScreen = () => (
    <View style={styles.formContainer}>
      <Text style={styles.screenTitle}>Create Account</Text>
      <Text style={styles.screenSubtitle}>Join YouMats today</Text>

      <View style={styles.nameRow}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
          <TextInput
            style={[styles.input, errors.firstName && styles.inputError]}
            placeholder="First Name"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={formData.firstName}
            onChangeText={(text) => updateFormData('firstName', text)}
            autoCapitalize="words"
          />
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
        </View>
        <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
          <TextInput
            style={[styles.input, errors.lastName && styles.inputError]}
            placeholder="Last Name"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={formData.lastName}
            onChangeText={(text) => updateFormData('lastName', text)}
            autoCapitalize="words"
          />
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
        </View>
      </View>

      {renderInput(
        'Email',
        formData.email,
        (text) => updateFormData('email', text),
        'email-address',
        false,
        errors.email
      )}

      {renderInput(
        'Phone (Optional)',
        formData.phone,
        (text) => updateFormData('phone', text),
        'phone-pad'
      )}

      {renderPasswordInput(
        'Password',
        formData.password,
        (text) => updateFormData('password', text),
        showPassword,
        () => setShowPassword(!showPassword),
        errors.password
      )}

      {renderPasswordInput(
        'Confirm Password',
        formData.confirmPassword,
        (text) => updateFormData('confirmPassword', text),
        showConfirmPassword,
        () => setShowConfirmPassword(!showConfirmPassword),
        errors.confirmPassword
      )}

      {renderButton('Create Account', handleRegister)}

      <TouchableOpacity 
        style={styles.linkButton} 
        onPress={() => setCurrentScreen('login')}
      >
        <Text style={styles.linkText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerifyScreen = () => (
    <View style={styles.formContainer}>
      <Text style={styles.screenTitle}>Verify Email</Text>
      <Text style={styles.screenSubtitle}>
        We've sent a 6-digit code to {formData.email}
      </Text>

      {renderInput(
        'Enter 6-digit code',
        formData.verificationCode,
        (text) => updateFormData('verificationCode', text),
        'number-pad',
        false,
        errors.verificationCode
      )}

      {renderButton('Verify Email', handleVerify)}

      <TouchableOpacity 
        style={styles.linkButton} 
        onPress={handleResendVerification}
      >
        <Text style={styles.linkText}>Resend Code</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.linkButton} 
        onPress={() => setCurrentScreen('login')}
      >
        <Text style={styles.linkText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderForgotScreen = () => (
    <View style={styles.formContainer}>
      <Text style={styles.screenTitle}>Reset Password</Text>
      <Text style={styles.screenSubtitle}>
        Enter your email to receive reset instructions
      </Text>

      {renderInput(
        'Email',
        formData.email,
        (text) => updateFormData('email', text),
        'email-address',
        false,
        errors.email
      )}

      {renderButton('Send Reset Email', handleForgotPassword)}

      <TouchableOpacity 
        style={styles.linkButton} 
        onPress={() => setCurrentScreen('login')}
      >
        <Text style={styles.linkText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const getCurrentScreenComponent = () => {
    switch (currentScreen) {
      case 'register':
        return renderRegisterScreen();
      case 'verify':
        return renderVerifyScreen();
      case 'forgot':
        return renderForgotScreen();
      default:
        return renderLoginScreen();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#000000', '#1a1a1a', '#000000']} style={styles.gradient}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderHeader()}
          {getCurrentScreenComponent()}
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: isTablet ? 48 : 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: isTablet ? 20 : 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: isTablet ? 16 : 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 30,
    marginHorizontal: isTablet ? 100 : 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  screenTitle: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: isTablet ? 18 : 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    fontSize: isTablet ? 18 : 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: isTablet ? 18 : 16,
    color: '#fff',
  },
  eyeIcon: {
    padding: 15,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  button: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#000000',
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginVertical: 8,
  },
  linkText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: isTablet ? 16 : 14,
    textDecorationLine: 'underline',
  },
});
