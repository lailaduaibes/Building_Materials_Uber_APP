/**
 * Customer Authentication Screens
 * Professional login/register interface for customers with email verification
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authService, User } from './AuthServiceCustomer';

interface AuthScreensProps {
  onAuthSuccess: (user: User) => void;
}

type AuthStep = 'login' | 'register' | 'verify-email';

export const AuthScreensCustomer: React.FC<AuthScreensProps> = ({ onAuthSuccess }) => {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    verificationCode: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    }

    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (currentStep !== 'verify-email') {
      if (!formData.password.trim()) {
        Alert.alert('Error', 'Password is required');
        return false;
      }

      if (formData.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return false;
      }
    }

    if (currentStep === 'register') {
      if (!formData.firstName.trim()) {
        Alert.alert('Error', 'First name is required');
        return false;
      }

      if (!formData.lastName.trim()) {
        Alert.alert('Error', 'Last name is required');
        return false;
      }
    }

    if (currentStep === 'verify-email') {
      if (!formData.verificationCode.trim()) {
        Alert.alert('Error', 'Verification code is required');
        return false;
      }

      if (formData.verificationCode.length !== 6) {
        Alert.alert('Error', 'Verification code must be 6 digits');
        return false;
      }
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const user = await authService.login(formData.email, formData.password);
      onAuthSuccess(user);
    } catch (error: any) {
      if (error.message.includes('verify your email')) {
        Alert.alert(
          'Email Verification Required',
          'Please verify your email before logging in. Would you like to resend the verification code?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Resend Code', 
              onPress: () => {
                setCurrentStep('verify-email');
                handleResendCode();
              }
            }
          ]
        );
      } else {
        Alert.alert('Login Failed', error.message || 'Please check your credentials and try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await authService.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
      });
      
      Alert.alert(
        'Registration Successful',
        'A verification code has been sent to your email. Please enter it below.',
        [{ text: 'Continue', onPress: () => setCurrentStep('verify-email') }]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const user = await authService.verifyEmail(formData.email, formData.verificationCode);
      Alert.alert(
        'Email Verified',
        'Welcome to BuildMate! Your account has been verified successfully.',
        [{ text: 'Continue', onPress: () => onAuthSuccess(user) }]
      );
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Please check your code and try again');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await authService.resendVerificationCode(formData.email);
      Alert.alert('Success', 'A new verification code has been sent to your email');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    try {
      await authService.requestPasswordReset(formData.email);
      Alert.alert(
        'Password Reset',
        'If an account with that email exists, you will receive a password reset link shortly.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    }
  };

  const clearForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      verificationCode: '',
    });
  };

  const switchToLogin = () => {
    setCurrentStep('login');
    clearForm();
  };

  const switchToRegister = () => {
    setCurrentStep('register');
    clearForm();
  };

  const goBackToLogin = () => {
    setCurrentStep('login');
    setFormData(prev => ({ ...prev, verificationCode: '' }));
  };

  const renderLoginForm = () => (
    <>
      {/* Email Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your email"
          value={formData.email}
          onChangeText={(value) => handleInputChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Password Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your password"
          value={formData.password}
          onChangeText={(value) => handleInputChange('password', value)}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      {/* Forgot Password Link */}
      <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
        <Text style={styles.forgotButtonText}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Switch to Register */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Don't have an account? </Text>
        <TouchableOpacity onPress={switchToRegister}>
          <Text style={styles.switchLink}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderRegisterForm = () => (
    <>
      {/* Email Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your email"
          value={formData.email}
          onChangeText={(value) => handleInputChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Password Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your password"
          value={formData.password}
          onChangeText={(value) => handleInputChange('password', value)}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Name Fields */}
      <View style={styles.nameRow}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.inputLabel}>First Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="First name"
            value={formData.firstName}
            onChangeText={(value) => handleInputChange('firstName', value)}
            autoCapitalize="words"
          />
        </View>

        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.inputLabel}>Last Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Last name"
            value={formData.lastName}
            onChangeText={(value) => handleInputChange('lastName', value)}
            autoCapitalize="words"
          />
        </View>
      </View>

      {/* Phone Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your phone number"
          value={formData.phone}
          onChangeText={(value) => handleInputChange('phone', value)}
          keyboardType="phone-pad"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </Text>
      </TouchableOpacity>

      {/* Switch to Login */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Already have an account? </Text>
        <TouchableOpacity onPress={switchToLogin}>
          <Text style={styles.switchLink}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderVerificationForm = () => (
    <>
      {/* Email Display */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput
          style={[styles.textInput, styles.disabledInput]}
          value={formData.email}
          editable={false}
        />
      </View>

      {/* Verification Code Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Verification Code</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter 6-digit code"
          value={formData.verificationCode}
          onChangeText={(value) => handleInputChange('verificationCode', value.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          maxLength={6}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.helperText}>
          Please check your email for the 6-digit verification code
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleVerifyEmail}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Verifying...' : 'Verify Email'}
        </Text>
      </TouchableOpacity>

      {/* Resend Code */}
      <TouchableOpacity 
        style={styles.forgotButton} 
        onPress={handleResendCode}
        disabled={loading}
      >
        <Text style={styles.forgotButtonText}>Resend Verification Code</Text>
      </TouchableOpacity>

      {/* Back to Login */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Want to try a different email? </Text>
        <TouchableOpacity onPress={goBackToLogin}>
          <Text style={styles.switchLink}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const getTitle = () => {
    switch (currentStep) {
      case 'login':
        return 'Welcome back!';
      case 'register':
        return 'Create your account';
      case 'verify-email':
        return 'Verify your email';
      default:
        return 'Welcome!';
    }
  };

  const renderCurrentForm = () => {
    switch (currentStep) {
      case 'login':
        return renderLoginForm();
      case 'register':
        return renderRegisterForm();
      case 'verify-email':
        return renderVerificationForm();
      default:
        return renderLoginForm();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#2c3e50', '#34495e', '#5d6d7e']}
        style={styles.background}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <Text style={styles.appTitle}>BuildMate</Text>
            <Text style={styles.appSubtitle}>Customer Portal</Text>
            <Text style={styles.welcomeText}>{getTitle()}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              {renderCurrentForm()}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Professional building materials delivery
            </Text>
            <Text style={styles.footerSubtext}>
              Reliable • Fast • Quality Service
            </Text>
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
  background: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 2,
  },
  appSubtitle: {
    fontSize: 18,
    color: '#ecf0f1',
    marginBottom: 24,
    opacity: 0.9,
  },
  welcomeText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 30,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  forgotButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotButtonText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#6c757d',
  },
  switchLink: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#ecf0f1',
    marginBottom: 4,
    opacity: 0.8,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#ecf0f1',
    opacity: 0.6,
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
