/**
 * Simple Authentication Screens for Customer App
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
import { Ionicons } from '@expo/vector-icons';
import { authService, User } from './AuthService';

interface AuthScreensProps {
  onAuthSuccess: (user: User) => void;
}

type AuthStep = 'login' | 'register' | 'verify-email';

export const AuthScreens: React.FC<AuthScreensProps> = ({ onAuthSuccess }) => {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login(email.trim(), password);
      
      if (result.error) {
        Alert.alert('Login Failed', result.error);
      } else if (result.user) {
        if (result.user.role !== 'customer') {
          Alert.alert('Access Denied', 'This app is for customers only.');
          return;
        }
        
        if (!result.user.emailVerified) {
          setCurrentStep('verify-email');
        } else {
          onAuthSuccess(result.user);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    console.log('🎯 handleRegister called');
    
    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      console.log('❌ Validation failed: missing fields');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      console.log('❌ Validation failed: invalid email');
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      console.log('❌ Validation failed: password too short');
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    console.log('✅ Validation passed, starting registration...');
    setLoading(true);
    
    try {
      const userData = {
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      
      console.log('📞 Calling authService.register with:', userData);
      const result = await authService.register(userData);
      console.log('📨 Registration result:', result);

      if (result.error) {
        console.log('❌ Registration failed with error:', result.error);
        Alert.alert('Registration Failed', result.error);
      } else if (result.needsVerification) {
        console.log('✅ Registration successful, needs verification');
        Alert.alert('Success', 'Registration successful! Please check your email for verification code.');
        setCurrentStep('verify-email');
      }
    } catch (error) {
      console.error('💥 Unexpected error in handleRegister:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      console.log('🔄 Setting loading to false');
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.verifyEmail(email.trim(), verificationCode.trim());

      if (result.error) {
        Alert.alert('Verification Failed', result.error);
      } else if (result.success && result.user) {
        Alert.alert('Success', 'Email verified successfully!');
        onAuthSuccess(result.user);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const result = await authService.resendVerificationCode(email.trim());
      
      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        Alert.alert('Success', 'Verification code sent to your email');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Customer Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#7f8c8d"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#7f8c8d"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity 
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons 
            name={showPassword ? 'eye-off' : 'eye'} 
            size={24} 
            color="#7f8c8d" 
          />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => setCurrentStep('register')}>
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRegisterForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Create Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#7f8c8d"
        value={firstName}
        onChangeText={setFirstName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        placeholderTextColor="#7f8c8d"
        value={lastName}
        onChangeText={setLastName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#7f8c8d"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password (min 6 characters)"
          placeholderTextColor="#7f8c8d"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity 
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons 
            name={showPassword ? 'eye-off' : 'eye'} 
            size={24} 
            color="#7f8c8d" 
          />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={() => {
          console.log('🔥 Create Account button pressed!');
          handleRegister();
        }}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => setCurrentStep('login')}>
        <Text style={styles.linkText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerificationForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Verify Email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Verification Code"
        placeholderTextColor="#7f8c8d"
        value={verificationCode}
        onChangeText={setVerificationCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleVerifyEmail}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Verifying...' : 'Verify Email'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={handleResendCode} disabled={loading}>
        <Text style={styles.linkText}>Resend verification code</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => setCurrentStep('login')}>
        <Text style={styles.linkText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#2c3e50', '#34495e']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.appTitle}>BuildMate</Text>
            <Text style={styles.appSubtitle}>Customer Portal</Text>
          </View>
          
          {currentStep === 'login' && renderLoginForm()}
          {currentStep === 'register' && renderRegisterForm()}
          {currentStep === 'verify-email' && renderVerificationForm()}
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 18,
    color: '#bdc3c7',
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 30,
    margin: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 15,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#3498db',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
  },
});
