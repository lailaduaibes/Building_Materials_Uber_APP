import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';
import { responsive } from '../utils/ResponsiveUtils';

const { width } = Dimensions.get('window');

// Professional Blue & White Theme
const theme = {
  primary: '#3B82F6',
  secondary: '#FFFFFF',
  accent: '#1E40AF',
  background: '#F8FAFC',
  white: '#FFFFFF',
  text: '#1F2937',
  lightText: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E7EB',
};

interface EmailVerificationScreenProps {
  email: string;
  onVerificationComplete: (driverId: string) => void;
  onBackToRegistration: () => void;
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  email,
  onVerificationComplete,
  onBackToRegistration,
}) => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all fields are filled
    if (newOtp.every(digit => digit !== '') && value) {
      verifyOtp(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (otpCode?: string) => {
    try {
      setLoading(true);
      const code = otpCode || otp.join('');

      if (code.length !== 6) {
        Alert.alert('Invalid Code', 'Please enter a 6-digit verification code');
        return;
      }

      // Verify the OTP using Supabase Auth
      const result = await driverService.verifyEmail(email, code);

      if (result.success) {
        Alert.alert(
          'Email Verified!',
          'Your email has been verified successfully. You can now upload your documents.',
          [
            {
              text: 'Continue',
              onPress: () => {
                if (result.driverId) {
                  onVerificationComplete(result.driverId);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Verification Failed', result.message || 'Invalid verification code. Please try again.');
        // Clear the OTP inputs
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      Alert.alert('Error', 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      setResendLoading(true);
      
      const result = await driverService.resendVerificationCode(email);
      
      if (result.success) {
        Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
        setCountdown(60);
        setCanResend(false);
        
        // Restart countdown
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              setCanResend(true);
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        Alert.alert('Error', result.message || 'Failed to resend code. Please try again.');
      }
    } catch (error) {
      console.error('Error resending code:', error);
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackToRegistration}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Verification</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={80} color={theme.primary} />
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to
          </Text>
          <Text style={styles.email}>{email}</Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : styles.otpInputEmpty,
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.disabledButton]}
            onPress={() => verifyOtp()}
            disabled={loading || otp.some(digit => digit === '')}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.white} />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Email</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity
              style={[styles.resendButton, !canResend && styles.disabledButton]}
              onPress={resendCode}
              disabled={!canResend || resendLoading}
            >
              {resendLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={[
                  styles.resendButtonText,
                  !canResend && styles.disabledText
                ]}>
                  {canResend ? 'Resend Code' : `Resend in ${formatCountdown(countdown)}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color={theme.accent} />
            <Text style={styles.infoText}>
              Check your spam folder if you don't see the email in your inbox.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: responsive.padding(50, 60),
    paddingHorizontal: responsive.padding(20),
    paddingBottom: responsive.padding(20),
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.white,
  },
  backButton: {
    padding: responsive.padding(8),
    marginRight: responsive.margin(16),
  },
  headerTitle: {
    fontSize: responsive.fontSize(20, 24),
    fontWeight: '600',
    color: theme.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: responsive.padding(30),
  },
  content: {
    flex: 1,
    paddingHorizontal: responsive.padding(30, 40),
    paddingTop: responsive.padding(40, 50),
    alignItems: 'center',
    minHeight: responsive.scale(600), // Ensure minimum height for proper scrolling
  },
  iconContainer: {
    marginBottom: responsive.margin(30),
  },
  title: {
    fontSize: responsive.fontSize(28, 32),
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: responsive.margin(10),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: responsive.fontSize(16, 18),
    color: theme.lightText,
    textAlign: 'center',
    marginBottom: responsive.margin(5),
  },
  email: {
    fontSize: responsive.fontSize(16, 18),
    fontWeight: '600',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: responsive.margin(40),
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: responsive.margin(40),
    width: '100%',
    maxWidth: responsive.scale(300),
  },
  otpInput: {
    width: responsive.scale(45),
    height: responsive.scale(55),
    borderWidth: 2,
    borderRadius: responsive.scale(12),
    fontSize: responsive.fontSize(24, 28),
    fontWeight: 'bold',
    color: theme.text,
    backgroundColor: theme.white,
  },
  otpInputEmpty: {
    borderColor: theme.border,
  },
  otpInputFilled: {
    borderColor: theme.primary,
    backgroundColor: '#EBF4FF',
  },
  verifyButton: {
    backgroundColor: theme.primary,
    paddingVertical: responsive.padding(16, 18),
    paddingHorizontal: responsive.padding(40, 50),
    borderRadius: responsive.scale(12),
    width: '100%',
    maxWidth: responsive.scale(300),
    alignItems: 'center',
    marginBottom: responsive.margin(30),
    shadowColor: theme.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  verifyButtonText: {
    color: theme.white,
    fontSize: responsive.fontSize(16, 18),
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: responsive.margin(30),
  },
  resendText: {
    fontSize: responsive.fontSize(14, 16),
    color: theme.lightText,
    marginBottom: responsive.margin(8),
  },
  resendButton: {
    paddingVertical: responsive.padding(8),
    paddingHorizontal: responsive.padding(16),
  },
  resendButtonText: {
    fontSize: responsive.fontSize(16, 18),
    fontWeight: '600',
    color: theme.primary,
  },
  disabledText: {
    color: theme.lightText,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: responsive.padding(16, 18),
    paddingVertical: responsive.padding(12, 14),
    borderRadius: responsive.scale(8),
    width: '100%',
    maxWidth: responsive.scale(300),
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  infoText: {
    fontSize: responsive.fontSize(14, 16),
    color: theme.accent,
    marginLeft: responsive.margin(8),
    flex: 1,
  },
});
