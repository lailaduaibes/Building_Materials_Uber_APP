import React, { useState, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';
import { DocumentUploadScreen } from './DocumentUploadScreen';
import { EmailVerificationScreen } from './EmailVerificationScreen';
import { createClient } from '@supabase/supabase-js';

const { width } = Dimensions.get('window');

import { Colors } from '../theme/colors';

interface EnhancedDriverRegistrationScreenProps {
  onRegistrationComplete: (success: boolean, message: string) => void;
  onBackToLogin: () => void;
}

type RegistrationStep = 'account' | 'personal' | 'vehicle' | 'email_verification' | 'documents' | 'complete';

export const EnhancedDriverRegistrationScreen: React.FC<EnhancedDriverRegistrationScreenProps> = ({
  onRegistrationComplete,
  onBackToLogin,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('account');
  const [driverId, setDriverId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [truckTypes, setTruckTypes] = useState<any[]>([]);
  const [selectedTruckType, setSelectedTruckType] = useState<string>('');

  // Form data state
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
    maxPayload: '',
    maxVolume: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Load truck types on component mount
  useEffect(() => {
    loadTruckTypes();
  }, []);

  const loadTruckTypes = async () => {
    try {
      const supabase = createClient(
        'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28'
      );

      const { data, error } = await supabase
        .from('truck_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading truck types:', error);
        // Set default truck types if loading fails
        setTruckTypes([
          { id: 'small', name: 'Small Truck', payload_capacity: 2, volume_capacity: 8 },
          { id: 'medium', name: 'Medium Truck', payload_capacity: 5, volume_capacity: 15 },
          { id: 'large', name: 'Large Truck', payload_capacity: 10, volume_capacity: 25 }
        ]);
      } else {
        setTruckTypes(data || []);
        // Set default selection to Small Truck
        if (data && data.length > 0) {
          const smallTruck = data.find(truck => truck.name === 'Small Truck') || data[0];
          setSelectedTruckType(smallTruck.name);
          updateField('maxPayload', smallTruck.payload_capacity.toString());
          updateField('maxVolume', smallTruck.volume_capacity.toString());
        }
      }
    } catch (error) {
      console.error('Exception loading truck types:', error);
      // Set fallback truck types
      setTruckTypes([
        { id: 'small', name: 'Small Truck', payload_capacity: 2, volume_capacity: 8 },
        { id: 'medium', name: 'Medium Truck', payload_capacity: 5, volume_capacity: 15 }
      ]);
    }
  };

  // Step progress
  const steps = [
    { id: 'account', title: 'Account', icon: 'person-outline' },
    { id: 'personal', title: 'Personal', icon: 'information-circle-outline' },
    { id: 'vehicle', title: 'Vehicle', icon: 'car-outline' },
    { id: 'email_verification', title: 'Verify Email', icon: 'mail-outline' },
    { id: 'documents', title: 'Documents', icon: 'document-text-outline' },
    { id: 'complete', title: 'Complete', icon: 'checkmark-circle-outline' }
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.id === currentStep);
  };

  // Validation functions
  const validateAccountStep = () => {
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

  const validatePersonalStep = () => {
    const { phone, yearsExperience, licenseNumber } = formData;
    
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    
    if (!licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter your driver\'s license number');
      return false;
    }
    
    const experience = parseInt(yearsExperience);
    if (isNaN(experience) || experience < 0) {
      Alert.alert('Error', 'Please enter valid years of experience (0 or more)');
      return false;
    }
    
    return true;
  };

  const validateVehicleStep = () => {
    const { vehicleModel, vehicleYear, vehiclePlate, maxPayload, maxVolume } = formData;
    
    if (!vehicleModel.trim()) {
      Alert.alert('Error', 'Please enter your vehicle model');
      return false;
    }
    
    if (!vehiclePlate.trim()) {
      Alert.alert('Error', 'Please enter your vehicle plate number');
      return false;
    }
    
    const year = parseInt(vehicleYear);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1990 || year > currentYear + 1) {
      Alert.alert('Error', 'Please enter a valid vehicle year');
      return false;
    }

    if (!selectedTruckType) {
      Alert.alert('Error', 'Please select a truck type');
      return false;
    }

    const payload = parseFloat(maxPayload);
    if (isNaN(payload) || payload <= 0) {
      Alert.alert('Error', 'Please enter a valid maximum payload');
      return false;
    }

    const volume = parseFloat(maxVolume);
    if (isNaN(volume) || volume <= 0) {
      Alert.alert('Error', 'Please enter a valid maximum volume');
      return false;
    }
    
    return true;
  };

  // Navigation functions
  const handleNext = async () => {
    let isValid = false;
    
    switch (currentStep) {
      case 'account':
        isValid = validateAccountStep();
        if (isValid) setCurrentStep('personal');
        break;
      case 'personal':
        isValid = validatePersonalStep();
        if (isValid) setCurrentStep('vehicle');
        break;
      case 'vehicle':
        isValid = validateVehicleStep();
        if (isValid) {
          await registerDriver();
        }
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'account':
        onBackToLogin();
        break;
      case 'personal':
        setCurrentStep('account');
        break;
      case 'vehicle':
        setCurrentStep('personal');
        break;
      case 'documents':
        setCurrentStep('vehicle');
        break;
      case 'complete':
        // Already completed
        break;
    }
  };

  const registerDriver = async () => {
    try {
      setLoading(true);
      
      const registrationData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        yearsExperience: parseInt(formData.yearsExperience),
        licenseNumber: formData.licenseNumber,
        vehicleInfo: {
          model: formData.vehicleModel,
          year: parseInt(formData.vehicleYear),
          plate: formData.vehiclePlate,
          maxPayload: parseFloat(formData.maxPayload),
          maxVolume: parseFloat(formData.maxVolume),
        },
        selectedTruckType: selectedTruckType
      };

      const result = await driverService.registerNewDriver(registrationData);
      
      if (result.success && result.data?.driverProfile?.id) {
        setDriverId(result.data.driverProfile.id);
        
        // Check if email verification is required based on registration result
        if (result.data.requiresEmailConfirmation !== false) {
          // Email verification is required (default) or not specified
          console.log('📧 Email verification required - proceeding to verification step');
          setCurrentStep('email_verification');
        } else {
          // Email verification was not required (rare case)
          console.log('✅ No email verification needed - proceeding to documents');
          setCurrentStep('documents');
        }
      } else {
        Alert.alert('Registration Failed', result.message || 'Failed to register driver');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentsUploaded = () => {
    setCurrentStep('complete');
  };

  const handleEmailVerificationComplete = (verifiedDriverId: string) => {
    // Update the driver ID if different and proceed to documents
    if (verifiedDriverId) {
      setDriverId(verifiedDriverId);
    }
    setCurrentStep('documents');
  };

  const handleComplete = () => {
    onRegistrationComplete(true, 'Registration completed successfully! Your application is now under review.');
  };

  // Render progress indicator
  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressSteps}>
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = index < getCurrentStepIndex();
          const isAccessible = index <= getCurrentStepIndex();
          
          return (
            <View key={step.id} style={styles.progressStep}>
              <View style={[
                styles.progressCircle,
                isCompleted && styles.progressCircleCompleted,
                isActive && styles.progressCircleActive,
                !isAccessible && styles.progressCircleDisabled
              ]}>
                <Ionicons 
                  name={isCompleted ? 'checkmark' : step.icon as any} 
                  size={isCompleted ? 16 : 14} 
                  color={
                    isCompleted ? Colors.text.white :
                    isActive ? Colors.text.white :
                    isAccessible ? Colors.primary : Colors.text.secondary
                  } 
                />
              </View>
              <Text style={[
                styles.progressLabel,
                isActive && styles.progressLabelActive,
                !isAccessible && styles.progressLabelDisabled
              ]}>
                {step.title}
              </Text>
              {index < steps.length - 1 && (
                <View style={[
                  styles.progressLine,
                  isCompleted && styles.progressLineCompleted
                ]} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  // Render account step
  const renderAccountStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Create Your Account</Text>
      <Text style={styles.stepDescription}>
        Enter your personal information to get started
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>First Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.firstName}
          onChangeText={(value) => updateField('firstName', value)}
          placeholder="Enter your first name"
          placeholderTextColor={Colors.text.secondary}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Last Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.lastName}
          onChangeText={(value) => updateField('lastName', value)}
          placeholder="Enter your last name"
          placeholderTextColor={Colors.text.secondary}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email Address *</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(value) => updateField('email', value)}
          placeholder="Enter your email address"
          placeholderTextColor={Colors.text.secondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={formData.password}
            onChangeText={(value) => updateField('password', value)}
            placeholder="Enter your password"
            placeholderTextColor={Colors.text.secondary}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
          >
            <Ionicons 
              name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
              size={20} 
              color={Colors.text.secondary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirm Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={formData.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            placeholder="Confirm your password"
            placeholderTextColor={Colors.text.secondary}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.passwordToggle}
          >
            <Ionicons 
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
              size={20} 
              color={Colors.text.secondary} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  // Render personal step
  const renderPersonalStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>
        Tell us about your driving experience
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={(value) => updateField('phone', value)}
          placeholder="Enter your phone number"
          placeholderTextColor={Colors.text.secondary}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Driver's License Number *</Text>
        <TextInput
          style={styles.input}
          value={formData.licenseNumber}
          onChangeText={(value) => updateField('licenseNumber', value)}
          placeholder="Enter your license number"
          placeholderTextColor={Colors.text.secondary}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Years of Experience *</Text>
        <TextInput
          style={styles.input}
          value={formData.yearsExperience}
          onChangeText={(value) => updateField('yearsExperience', value)}
          placeholder="Enter years of driving experience"
          placeholderTextColor={Colors.text.secondary}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.status.pending} />
        <Text style={styles.infoText}>
          You'll need to upload your driver's license for verification in the next step
        </Text>
      </View>
    </ScrollView>
  );

  // Render vehicle step
  const renderVehicleStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Vehicle Information</Text>
      <Text style={styles.stepDescription}>
        Provide details about your delivery vehicle and capabilities
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Vehicle Model *</Text>
        <TextInput
          style={styles.input}
          value={formData.vehicleModel}
          onChangeText={(value) => updateField('vehicleModel', value)}
          placeholder="e.g., Ford Transit, Toyota Hiace"
          placeholderTextColor={Colors.text.secondary}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Vehicle Year *</Text>
        <TextInput
          style={styles.input}
          value={formData.vehicleYear}
          onChangeText={(value) => updateField('vehicleYear', value)}
          placeholder="Enter vehicle year"
          placeholderTextColor={Colors.text.secondary}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>License Plate *</Text>
        <TextInput
          style={styles.input}
          value={formData.vehiclePlate}
          onChangeText={(value) => updateField('vehiclePlate', value)}
          placeholder="Enter license plate number"
          placeholderTextColor={Colors.text.secondary}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Truck Type *</Text>
        <Text style={styles.inputDescription}>Select the type that best matches your vehicle</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.truckTypeContainer}>
          {truckTypes.map((truckType) => (
            <TouchableOpacity
              key={truckType.id}
              style={[
                styles.truckTypeCard,
                selectedTruckType === truckType.name && styles.truckTypeCardSelected
              ]}
              onPress={() => {
                setSelectedTruckType(truckType.name);
                updateField('maxPayload', truckType.payload_capacity.toString());
                updateField('maxVolume', truckType.volume_capacity.toString());
              }}
            >
              <Text style={[
                styles.truckTypeName,
                selectedTruckType === truckType.name && styles.truckTypeNameSelected
              ]}>
                {truckType.name}
              </Text>
              <Text style={[
                styles.truckTypeSpecs,
                selectedTruckType === truckType.name && styles.truckTypeSpecsSelected
              ]}>
                {truckType.payload_capacity}t • {truckType.volume_capacity}m³
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.inputLabel}>Max Payload (tons) *</Text>
          <TextInput
            style={styles.input}
            value={formData.maxPayload}
            onChangeText={(value) => updateField('maxPayload', value)}
            placeholder="e.g., 5.0"
            placeholderTextColor={Colors.text.secondary}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.inputLabel}>Max Volume (m³) *</Text>
          <TextInput
            style={styles.input}
            value={formData.maxVolume}
            onChangeText={(value) => updateField('maxVolume', value)}
            placeholder="e.g., 10.0"
            placeholderTextColor={Colors.text.secondary}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="car-outline" size={20} color={Colors.status.pending} />
        <Text style={styles.infoText}>
          You'll need to upload vehicle registration and insurance documents in the next step. 
          Your truck type selection helps us match you with appropriate delivery orders.
        </Text>
      </View>
    </ScrollView>
  );

  // Render completion step
  const renderCompleteStep = () => (
    <View style={styles.completeContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color={Colors.status.completed} />
      </View>
      
      <Text style={styles.successTitle}>Registration Complete!</Text>
      <Text style={styles.successDescription}>
        Thank you for joining YouMats! Your application has been submitted and is now under review.
      </Text>

      <View style={styles.nextStepsContainer}>
        <Text style={styles.nextStepsTitle}>What happens next:</Text>
        <View style={styles.nextStep}>
          <Ionicons name="time-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.nextStepText}>Review takes 2-3 business days</Text>
        </View>
        <View style={styles.nextStep}>
          <Ionicons name="mail-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.nextStepText}>You'll receive an email with the decision</Text>
        </View>
        <View style={styles.nextStep}>
          <Ionicons name="checkmark-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.nextStepText}>Once approved, you can start accepting orders</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.completeButton}
        onPress={handleComplete}
      >
        <Text style={styles.completeButtonText}>Continue to Login</Text>
      </TouchableOpacity>
    </View>
  );

  // Main render
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Registration</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Indicator */}
      {currentStep !== 'complete' && renderProgressIndicator()}

      {/* Content */}
      <View style={styles.content}>
        {currentStep === 'account' && renderAccountStep()}
        {currentStep === 'personal' && renderPersonalStep()}
        {currentStep === 'vehicle' && renderVehicleStep()}
        {currentStep === 'email_verification' && (
          <EmailVerificationScreen
            email={formData.email}
            onVerificationComplete={handleEmailVerificationComplete}
            onBackToRegistration={() => setCurrentStep('vehicle')}
          />
        )}
        {currentStep === 'documents' && driverId ? (
          <DocumentUploadScreen
            driverId={driverId}
            onDocumentsUploaded={handleDocumentsUploaded}
            onBack={handleBack}
          />
        ) : currentStep === 'documents' && !driverId ? (
          <View style={styles.completeContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={Colors.status.cancelled} style={styles.successIcon} />
            <Text style={styles.successTitle}>Registration Error</Text>
            <Text style={styles.successDescription}>
              No driver ID found. Please restart the registration process.
            </Text>
            <TouchableOpacity 
              style={[styles.button, styles.nextButton]}
              onPress={() => setCurrentStep('account')}
            >
              <Text style={styles.nextButtonText}>Restart Registration</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {currentStep === 'complete' && renderCompleteStep()}
      </View>

      {/* Navigation Buttons */}
      {currentStep !== 'documents' && currentStep !== 'complete' && currentStep !== 'email_verification' && (
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.button, styles.nextButton]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.text.white} />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === 'vehicle' ? 'Register' : 'Next'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.text.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: Colors.background.secondary,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    alignItems: 'center',
    position: 'relative',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressCircleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  progressCircleCompleted: {
    borderColor: Colors.status.completed,
    backgroundColor: Colors.status.completed,
  },
  progressCircleDisabled: {
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
    minWidth: 60,
  },
  progressLabelActive: {
    color: Colors.text.primary,
    fontWeight: '600',
  },
  progressLabelDisabled: {
    color: Colors.text.secondary,
  },
  progressLine: {
    position: 'absolute',
    top: 16,
    left: 32,
    width: 40,
    height: 2,
    backgroundColor: Colors.border.light,
  },
  progressLineCompleted: {
    backgroundColor: Colors.status.completed,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 14,
    padding: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 243, 205, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 18,
    marginLeft: 8,
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  nextStepsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextStepText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 12,
    flex: 1,
  },
  navigationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  nextButton: {
    backgroundColor: Colors.primary,
  },
  nextButtonText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  completeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  completeButtonText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for truck type selection and layout
  inputDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  truckTypeContainer: {
    marginBottom: 10,
  },
  truckTypeCard: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  truckTypeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background.secondary,
  },
  truckTypeName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  truckTypeNameSelected: {
    color: Colors.primary,
  },
  truckTypeSpecs: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  truckTypeSpecsSelected: {
    color: Colors.primary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  halfWidth: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default EnhancedDriverRegistrationScreen;
