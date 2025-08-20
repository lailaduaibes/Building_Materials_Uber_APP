// AuthScreens.tsx - Enhanced authentication screens with email verification
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authService, RegisterData, LoginData, AuthResponse } from './AuthService';

const { width: screenWidth } = Dimensions.get('window');
const isSmallDevice = screenWidth < 375;

const theme = {
  primary: '#2C5CC5',
  secondary: '#1E40AF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    light: '#94A3B8',
    white: '#FFFFFF',
  },
  border: '#E2E8F0',
  spacing: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  fontSize: {
    body: isSmallDevice ? 13 : 14,
    subheading: isSmallDevice ? 15 : 16,
    heading: isSmallDevice ? 17 : 18,
    title: isSmallDevice ? 19 : 20,
  },
};

interface AuthScreensProps {
  onLoginSuccess: (user: any) => void;
  onNavigate: (screen: string) => void;
  currentScreen: string;
}

export const AuthScreens: React.FC<AuthScreensProps> = ({ 
  onLoginSuccess, 
  onNavigate, 
  currentScreen 
}) => {
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Registration form state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  
  // Email verification state
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
  
  // Forgot password state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(loginEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const loginData: LoginData = {
        email: loginEmail.toLowerCase().trim(),
        password: loginPassword,
      };

      const result = await authService.login(loginData);

      if (result.success && result.data?.user) {
        setLoginEmail('');
        setLoginPassword('');
        onLoginSuccess(result.data.user);
        Alert.alert('Success', 'Welcome to YouMats!');
      } else {
        const errorMessage = result.message || 'Login failed';
        
        // Check if error is related to email verification
        if (errorMessage.toLowerCase().includes('verify') || 
            errorMessage.toLowerCase().includes('verification')) {
          setVerificationEmail(loginEmail);
          setIsAwaitingVerification(true);
          onNavigate('emailVerification');
        }
        
        Alert.alert('Login Failed', errorMessage);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regFirstName || !regLastName || !regEmail || !regPassword || !regConfirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!validateEmail(regEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!validatePassword(regPassword)) {
      Alert.alert(
        'Invalid Password', 
        'Password must be at least 8 characters long and contain:\n• One uppercase letter\n• One lowercase letter\n• One number\n• One special character (@$!%*?&)'
      );
      return;
    }

    if (regPassword !== regConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    
    try {
      const registerData: RegisterData = {
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        email: regEmail.toLowerCase().trim(),
        password: regPassword,
        phone: regPhone.trim() || undefined,
        role: 'customer',
      };

      const result = await authService.register(registerData);

      if (result.success) {
        // Clear form
        setRegFirstName('');
        setRegLastName('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRegPhone('');
        
        // Set verification email for potential resend
        setVerificationEmail(registerData.email);
        setIsAwaitingVerification(true);
        
        Alert.alert(
          'Registration Successful!', 
          'Please check your email and click the verification link to activate your account.',
          [
            {
              text: 'OK',
              onPress: () => onNavigate('emailVerification')
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', result.message || 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) {
      Alert.alert('Error', 'No email address found');
      return;
    }

    setLoading(true);
    
    try {
      const result = await authService.resendVerificationEmail(verificationEmail);
      
      if (result.success) {
        Alert.alert('Success', 'Verification email sent! Please check your inbox.');
      } else {
        Alert.alert('Error', result.message || 'Failed to resend verification email');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(forgotPasswordEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const result = await authService.forgotPassword(forgotPasswordEmail);
      
      if (result.success) {
        Alert.alert(
          'Password Reset Sent', 
          'If an account with this email exists, you will receive a password reset link.',
          [
            {
              text: 'OK',
              onPress: () => {
                setForgotPasswordEmail('');
                onNavigate('login');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to send password reset email');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const renderLoginScreen = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your YouMats account</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={theme.text.light}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
                placeholderTextColor={theme.text.light}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.text.white} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => onNavigate('forgotPassword')}
            >
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => onNavigate('register')}
            >
              <Text style={styles.secondaryButtonText}>Create New Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );

  const renderRegisterScreen = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Join YouMats</Text>
            <Text style={styles.subtitle}>Create your account to get started</Text>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  value={regFirstName}
                  onChangeText={setRegFirstName}
                  autoCapitalize="words"
                  placeholderTextColor={theme.text.light}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  value={regLastName}
                  onChangeText={setRegLastName}
                  autoCapitalize="words"
                  placeholderTextColor={theme.text.light}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={regEmail}
                onChangeText={setRegEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={theme.text.light}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Phone (Optional)"
                value={regPhone}
                onChangeText={setRegPhone}
                keyboardType="phone-pad"
                placeholderTextColor={theme.text.light}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={regPassword}
                onChangeText={setRegPassword}
                secureTextEntry
                placeholderTextColor={theme.text.light}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                value={regConfirmPassword}
                onChangeText={setRegConfirmPassword}
                secureTextEntry
                placeholderTextColor={theme.text.light}
              />
            </View>

            <Text style={styles.passwordRequirements}>
              Password must be at least 8 characters with uppercase, lowercase, number, and special character
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.text.white} />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => onNavigate('login')}
            >
              <Text style={styles.linkText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );

  const renderEmailVerificationScreen = () => (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
        style={styles.gradient}
      >
        <View style={styles.centerContent}>
          <View style={styles.verificationContainer}>
            <Text style={styles.verificationIcon}>📧</Text>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.verificationText}>
              We've sent a verification link to:
            </Text>
            <Text style={styles.verificationEmail}>{verificationEmail}</Text>
            <Text style={styles.verificationSubtext}>
              Click the link in the email to verify your account and complete your registration.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleResendVerification}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.text.white} />
              ) : (
                <Text style={styles.buttonText}>Resend Verification Email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => onNavigate('login')}
            >
              <Text style={styles.linkText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderForgotPasswordScreen = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={forgotPasswordEmail}
                onChangeText={setForgotPasswordEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={theme.text.light}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.text.white} />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => onNavigate('login')}
            >
              <Text style={styles.linkText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );

  // Main render logic
  switch (currentScreen) {
    case 'login':
      return renderLoginScreen();
    case 'register':
      return renderRegisterScreen();
    case 'emailVerification':
      return renderEmailVerificationScreen();
    case 'forgotPassword':
      return renderForgotPasswordScreen();
    default:
      return renderLoginScreen();
  }
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
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  formContainer: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  verificationContainer: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: theme.spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: theme.fontSize.title,
    fontWeight: 'bold',
    color: theme.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  verificationIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  verificationText: {
    fontSize: theme.fontSize.body,
    color: theme.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  verificationEmail: {
    fontSize: theme.fontSize.subheading,
    color: theme.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  verificationSubtext: {
    fontSize: theme.fontSize.body,
    color: theme.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.body,
    color: theme.text.primary,
  },
  passwordRequirements: {
    fontSize: 12,
    color: theme.text.light,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 16,
  },
  button: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: theme.text.white,
    fontSize: theme.fontSize.subheading,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.primary,
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.primary,
    fontSize: theme.fontSize.subheading,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  linkText: {
    color: theme.primary,
    fontSize: theme.fontSize.body,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: theme.spacing.lg,
  },
});
