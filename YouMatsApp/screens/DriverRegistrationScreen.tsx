import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';

interface DriverRegistrationScreenProps {
  onRegistrationComplete: (success: boolean, message: string) => void;
  onEmailVerificationRequired: (email: string) => void;
  onBackToLogin: () => void;
}

export const DriverRegistrationScreen: React.FC<DriverRegistrationScreenProps> = ({
  onRegistrationComplete,
  onEmailVerificationRequired,
  onBackToLogin,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    yearsExperience: '',
    licenseNumber: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    const { firstName, lastName, email, password, confirmPassword } = formData;
    
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    const { phone, yearsExperience } = formData;
    
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    
    const experience = parseInt(yearsExperience);
    if (isNaN(experience) || experience < 0) {
      Alert.alert('Error', 'Please enter valid years of experience (0 or more)');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleRegister = async () => {
    if (!validateStep1() || !validateStep2()) return;

    setLoading(true);
    
    try {
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
        yearsExperience: parseInt(formData.yearsExperience) || 0,
        licenseNumber: formData.licenseNumber.trim() || undefined,
        vehicleInfo: formData.vehicleModel ? {
          model: formData.vehicleModel.trim(),
          year: parseInt(formData.vehicleYear) || new Date().getFullYear(),
          plate: formData.vehiclePlate.trim(),
        } : undefined,
      };

      const result = await driverService.registerNewDriver(registrationData);

      if (result.success) {
        // Check if email verification is required
        const authStatus = await driverService.isAuthenticated();
        
        if (!authStatus.authenticated) {
          // Email verification required - show verification screen
          Alert.alert(
            'Check Your Email! 📧',
            'We\'ve sent a verification code to your email address. Please verify your email to continue.',
            [
              {
                text: 'Verify Email',
                onPress: () => onEmailVerificationRequired(formData.email.trim()),
              },
            ]
          );
        } else {
          // User is already authenticated - proceed to document upload
          Alert.alert(
            'Registration Successful! 🎉',
            'Your driver application has been submitted. Please upload your required documents.',
            [
              {
                text: 'Continue',
                onPress: () => onRegistrationComplete(true, result.message),
              },
            ]
          );
        }
      } else {
        Alert.alert('Registration Failed', result.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Account Information</Text>
      
      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.firstName}
            onChangeText={(value) => updateField('firstName', value)}
            placeholder="Enter first name"
            autoCapitalize="words"
          />
        </View>
        
        <View style={styles.halfInput}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.lastName}
            onChangeText={(value) => updateField('lastName', value)}
            placeholder="Enter last name"
            autoCapitalize="words"
          />
        </View>
      </View>

      <Text style={styles.label}>Email Address *</Text>
      <TextInput
        style={styles.input}
        value={formData.email}
        onChangeText={(value) => updateField('email', value)}
        placeholder="Enter email address"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Password *</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          value={formData.password}
          onChangeText={(value) => updateField('password', value)}
          placeholder="Enter password (min 6 characters)"
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Confirm Password *</Text>
      <TextInput
        style={styles.input}
        value={formData.confirmPassword}
        onChangeText={(value) => updateField('confirmPassword', value)}
        placeholder="Confirm password"
        secureTextEntry={!showPassword}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Driver Information</Text>
      
      <Text style={styles.label}>Phone Number *</Text>
      <TextInput
        style={styles.input}
        value={formData.phone}
        onChangeText={(value) => updateField('phone', value)}
        placeholder="Enter phone number"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Years of Driving Experience *</Text>
      <TextInput
        style={styles.input}
        value={formData.yearsExperience}
        onChangeText={(value) => updateField('yearsExperience', value)}
        placeholder="Enter years of experience"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Driver's License Number</Text>
      <TextInput
        style={styles.input}
        value={formData.licenseNumber}
        onChangeText={(value) => updateField('licenseNumber', value)}
        placeholder="Enter license number (optional)"
        autoCapitalize="characters"
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Vehicle Information (Optional)</Text>
      <Text style={styles.subtitle}>
        You can add vehicle details now or later in your profile
      </Text>
      
      <Text style={styles.label}>Vehicle Model</Text>
      <TextInput
        style={styles.input}
        value={formData.vehicleModel}
        onChangeText={(value) => updateField('vehicleModel', value)}
        placeholder="e.g., Toyota Hiace, Isuzu NPR"
      />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Year</Text>
          <TextInput
            style={styles.input}
            value={formData.vehicleYear}
            onChangeText={(value) => updateField('vehicleYear', value)}
            placeholder="2020"
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.halfInput}>
          <Text style={styles.label}>License Plate</Text>
          <TextInput
            style={styles.input}
            value={formData.vehiclePlate}
            onChangeText={(value) => updateField('vehiclePlate', value)}
            placeholder="ABC-1234"
            autoCapitalize="characters"
          />
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackToLogin} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Driver</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((step) => (
          <View key={step} style={styles.progressStep}>
            <View
              style={[
                styles.progressCircle,
                {
                  backgroundColor: currentStep >= step ? '#007AFF' : '#E5E5EA',
                },
              ]}
            >
              <Text
                style={[
                  styles.progressText,
                  { color: currentStep >= step ? 'white' : '#666' },
                ]}
              >
                {step}
              </Text>
            </View>
            {step < 3 && (
              <View
                style={[
                  styles.progressLine,
                  {
                    backgroundColor: currentStep > step ? '#007AFF' : '#E5E5EA',
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        {currentStep < 3 ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.primaryButtonText}>Complete Registration</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressLine: {
    width: 40,
    height: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginRight: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 8,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
