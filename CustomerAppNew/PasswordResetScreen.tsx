/**
 * PasswordResetScreen - Modern black/white UI for password reset
 * Handles both forgot password and change password functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from './AuthServiceSupabase';
import { Theme } from './theme';

interface PasswordResetScreenProps {
  onBack: () => void;
  mode: 'forgot' | 'change'; // forgot = email reset, change = current user password change
  userEmail?: string; // For change mode
}

export const PasswordResetScreen: React.FC<PasswordResetScreenProps> = ({
  onBack,
  mode,
  userEmail,
}) => {
  const [email, setEmail] = useState(userEmail || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const result = await authService.resetPassword(email.trim());
      
      if (result.success) {
        Alert.alert(
          'Email Sent!',
          'Check your email for password reset instructions. The link will expire in 1 hour.',
          [
            {
              text: 'OK',
              onPress: onBack,
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to send reset email');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Check password strength
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecialChar) {
      Alert.alert(
        'Weak Password',
        'Password must contain:\n• At least one uppercase letter\n• At least one lowercase letter\n• At least one number\n• At least one special character'
      );
      return;
    }

    try {
      setLoading(true);
      const result = await authService.updatePassword(newPassword);
      
      if (result.success) {
        Alert.alert(
          'Success!',
          'Your password has been updated successfully.',
          [
            {
              text: 'OK',
              onPress: onBack,
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to update password');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'forgot') {
      handleForgotPassword();
    } else {
      handleChangePassword();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'forgot' ? 'Reset Password' : 'Change Password'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {/* Title and Description */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>
              {mode === 'forgot' ? 'Forgot your password?' : 'Update your password'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'forgot' 
                ? "Enter your email address and we'll send you a link to reset your password."
                : "Choose a strong password to keep your account secure."
              }
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'forgot' ? (
              // Forgot Password Form
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ) : (
              // Change Password Form
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <MaterialIcons
                        name={showNewPassword ? 'visibility' : 'visibility-off'}
                        size={20}
                        color="#999"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <MaterialIcons
                        name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                        size={20}
                        color="#999"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password Requirements */}
                <View style={styles.requirements}>
                  <Text style={styles.requirementsTitle}>Password must contain:</Text>
                  <Text style={styles.requirement}>• At least 8 characters</Text>
                  <Text style={styles.requirement}>• Uppercase and lowercase letters</Text>
                  <Text style={styles.requirement}>• At least one number</Text>
                  <Text style={styles.requirement}>• At least one special character</Text>
                </View>
              </>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'forgot' ? 'Send Reset Link' : 'Update Password'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    backgroundColor: Theme.colors.primary,
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.primary,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  titleSection: {
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Theme.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    lineHeight: 22,
  },
  form: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Theme.colors.text.primary,
    backgroundColor: '#FFFFFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Theme.colors.text.primary,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  requirements: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 8,
  },
  requirement: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginBottom: 4,
  },
  submitButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: '#E0E0E0',
    borderColor: '#E0E0E0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export { PasswordResetScreen as default };
