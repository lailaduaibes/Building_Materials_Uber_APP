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
import { responsive, deviceTypes, responsiveStyles } from '../utils/ResponsiveUtils';

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
          { id: 'small', name: t('vehicles.small_truck'), payload_capacity: 2, volume_capacity: 8 },
          { id: 'medium', name: t('vehicles.medium_truck'), payload_capacity: 5, volume_capacity: 15 },
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
      Alert.alert(t('common.error'), t('registration.full_name_required'));
      return false;
    }
    
    if (!email.trim() || !email.includes('@')) {
      Alert.alert(t('common.error'), t('registration.valid_email_required'));
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('registration.password_min_length'));
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('registration.passwords_no_match'));
      return false;
    }
    
    return true;
  };

  const validatePersonalStep = () => {
    const { phone, yearsExperience, licenseNumber } = formData;
    
    if (!phone.trim()) {
      Alert.alert(t('common.error'), t('registration.phone_required'));
      return false;
    }
    
    if (!licenseNumber.trim()) {
      Alert.alert(t('common.error'), t('registration.license_required'));
      return false;
    }
    
    const experience = parseInt(yearsExperience);
    if (isNaN(experience) || experience < 0) {
      Alert.alert(t('common.error'), t('registration.experience_required'));
      return false;
    }
    
    return true;
  };

  const validateVehicleStep = () => {
    const { vehicleModel, vehicleYear, vehiclePlate, maxPayload, maxVolume } = formData;
    
    if (!vehicleModel.trim()) {
      Alert.alert(t('common.error'), t('registration.vehicle_model_required'));
      return false;
    }
    
    if (!vehiclePlate.trim()) {
      Alert.alert(t('common.error'), t('registration.plate_number_required'));
      return false;
    }
    
    const year = parseInt(vehicleYear);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1990 || year > currentYear + 1) {
      Alert.alert(t('common.error'), t('registration.vehicle_year_required'));
      return false;
    }

    if (!selectedTruckType) {
      Alert.alert(t('common.error'), t('registration.select_truck_type'));
      return false;
    }

    const payload = parseFloat(maxPayload);
    if (isNaN(payload) || payload <= 0) {
      Alert.alert(t('common.error'), t('registration.valid_payload_required'));
      return false;
    }

    const volume = parseFloat(maxVolume);
    if (isNaN(volume) || volume <= 0) {
      Alert.alert(t('common.error'), t('registration.valid_volume_required'));
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
        Alert.alert(t('registration.failed'), result.message || t('registration.failed_message'));
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(t('common.error'), t('registration.registration_failed_try_again'));
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
  const renderProgressIndicator = () => {
    const currentStepIndex = getCurrentStepIndex();
    const progressPercentage = (currentStepIndex / (steps.length - 1)) * 100;
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressHeaderText}>Registration Progress</Text>
          <Text style={styles.progressStepIndicator}>
            Step {currentStepIndex + 1} of {steps.length}
          </Text>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${Math.max(progressPercentage, 8)}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressPercentageText}>
            {Math.round(progressPercentage)}%
          </Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.progressScrollContent}
          style={styles.progressScrollView}
        >
          <View style={styles.progressSteps}>
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < getCurrentStepIndex();
              const isAccessible = index <= getCurrentStepIndex();
              
              return (
                <View key={step.id} style={styles.progressStep}>
                  <View style={styles.progressStepContent}>
                    <View style={[
                      styles.progressCircle,
                      isCompleted && styles.progressCircleCompleted,
                      isActive && styles.progressCircleActive,
                      !isAccessible && styles.progressCircleDisabled
                    ]}>
                      <Ionicons 
                        name={isCompleted ? 'checkmark' : step.icon as any} 
                        size={responsive.scale(isCompleted ? 18 : 16)} 
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
                  </View>
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
        </ScrollView>
      </View>
    );
  };

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
    paddingHorizontal: responsive.padding(20),
    paddingTop: responsive.padding(50),
    paddingBottom: responsive.padding(20),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: responsive.scale(40),
    height: responsive.scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: responsive.fontSize(18, 22),
    fontWeight: '600',
    color: Colors.text.primary,
  },
  placeholder: {
    width: responsive.scale(40),
  },
  progressContainer: {
    paddingHorizontal: responsive.padding(16, 20),
    paddingVertical: responsive.padding(12, 16),
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsive.margin(12, 16),
    paddingHorizontal: responsive.padding(4, 8),
  },
  progressHeaderText: {
    fontSize: responsive.fontSize(14, 16),
    fontWeight: '600',
    color: Colors.text.primary,
  },
  progressStepIndicator: {
    fontSize: responsive.fontSize(12, 14),
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive.margin(16, 20),
    paddingHorizontal: responsive.padding(4, 8),
  },
  progressBarBackground: {
    flex: 1,
    height: responsive.scale(6),
    backgroundColor: Colors.border.light,
    borderRadius: responsive.scale(3),
    marginRight: responsive.margin(12),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: responsive.scale(3),
    minWidth: responsive.scale(8),
  },
  progressPercentageText: {
    fontSize: responsive.fontSize(12, 14),
    fontWeight: '600',
    color: Colors.primary,
    minWidth: responsive.scale(35),
    textAlign: 'right',
  },
  progressScrollView: {
    flexGrow: 0,
  },
  progressScrollContent: {
    paddingHorizontal: responsive.padding(8, 12),
    alignItems: 'center',
    minWidth: '100%',
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minWidth: deviceTypes.isTablet ? responsive.scale(600) : responsive.scale(350),
    paddingHorizontal: responsive.padding(8, 16),
  },
  progressStep: {
    alignItems: 'center',
    position: 'relative',
    flex: 1,
  },
  progressStepContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  progressCircle: {
    width: responsive.scale(deviceTypes.isTablet ? 44 : 36),
    height: responsive.scale(deviceTypes.isTablet ? 44 : 36),
    borderRadius: responsive.scale(deviceTypes.isTablet ? 22 : 18),
    borderWidth: responsive.scale(2),
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: responsive.margin(8, 10),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  progressCircleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  progressCircleCompleted: {
    borderColor: Colors.status.completed,
    backgroundColor: Colors.status.completed,
    shadowColor: Colors.status.completed,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  progressCircleDisabled: {
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
    opacity: 0.6,
  },
  progressLabel: {
    fontSize: responsive.fontSize(10, 12),
    color: Colors.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
    minWidth: responsive.scale(deviceTypes.isTablet ? 80 : 60),
    maxWidth: responsive.scale(deviceTypes.isTablet ? 100 : 70),
    lineHeight: responsive.scale(deviceTypes.isTablet ? 16 : 14),
  },
  progressLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  progressLabelDisabled: {
    color: Colors.text.secondary,
    opacity: 0.6,
  },
  progressLine: {
    position: 'absolute',
    top: responsive.scale(deviceTypes.isTablet ? 22 : 18),
    left: '60%',
    right: '-40%',
    height: responsive.scale(2),
    backgroundColor: Colors.border.light,
    zIndex: 1,
  },
  progressLineCompleted: {
    backgroundColor: Colors.status.completed,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: responsive.padding(20),
  },
  stepTitle: {
    fontSize: responsive.fontSize(24, 28),
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: responsive.margin(20),
    marginBottom: responsive.margin(8),
  },
  stepDescription: {
    fontSize: responsive.fontSize(16, 18),
    color: Colors.text.secondary,
    lineHeight: responsive.scale(22),
    marginBottom: responsive.margin(30),
  },
  inputGroup: {
    marginBottom: responsive.margin(20),
  },
  inputLabel: {
    fontSize: responsive.fontSize(14, 16),
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: responsive.margin(8),
  },
  input: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: responsive.scale(12),
    paddingHorizontal: responsive.padding(16),
    paddingVertical: responsive.padding(14, 16),
    fontSize: responsive.fontSize(16, 18),
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
    fontSize: responsive.fontSize(14, 16),
    color: Colors.text.primary,
    lineHeight: responsive.scale(18),
    marginLeft: responsive.margin(8),
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: responsive.padding(40, 50),
  },
  successIcon: {
    marginBottom: responsive.margin(24),
  },
  successTitle: {
    fontSize: responsive.fontSize(28, 32),
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: responsive.margin(12),
    textAlign: 'center',
  },
  successDescription: {
    fontSize: responsive.fontSize(16, 18),
    color: Colors.text.secondary,
    lineHeight: responsive.scale(22),
    textAlign: 'center',
    marginBottom: responsive.margin(32),
  },
  nextStepsContainer: {
    width: '100%',
    marginBottom: responsive.margin(32),
  },
  nextStepsTitle: {
    fontSize: responsive.fontSize(18, 20),
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: responsive.margin(16),
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive.margin(12),
  },
  nextStepText: {
    fontSize: responsive.fontSize(14, 16),
    color: Colors.text.secondary,
    marginLeft: responsive.margin(12),
    flex: 1,
  },
  navigationContainer: {
    paddingHorizontal: responsive.padding(20),
    paddingVertical: responsive.padding(20),
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  button: {
    borderRadius: responsive.scale(12),
    paddingVertical: responsive.padding(16, 18),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  nextButton: {
    backgroundColor: Colors.primary,
  },
  nextButtonText: {
    color: Colors.text.white,
    fontSize: responsive.fontSize(16, 18),
    fontWeight: '600',
    marginRight: responsive.margin(8),
  },
  completeButton: {
    backgroundColor: Colors.primary,
    borderRadius: responsive.scale(12),
    paddingVertical: responsive.padding(16, 18),
    paddingHorizontal: responsive.padding(32, 36),
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  completeButtonText: {
    color: Colors.text.white,
    fontSize: responsive.fontSize(16, 18),
    fontWeight: '600',
  },
  // New styles for truck type selection and layout
  inputDescription: {
    fontSize: responsive.fontSize(12, 14),
    color: Colors.text.secondary,
    marginBottom: responsive.margin(12),
    lineHeight: responsive.scale(16),
  },
  truckTypeContainer: {
    marginBottom: responsive.margin(10),
  },
  truckTypeCard: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: responsive.scale(12),
    paddingHorizontal: responsive.padding(16, 18),
    paddingVertical: responsive.padding(12, 14),
    marginRight: responsive.margin(12),
    minWidth: responsive.scale(120),
    alignItems: 'center',
  },
  truckTypeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background.secondary,
  },
  truckTypeName: {
    fontSize: responsive.fontSize(14, 16),
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: responsive.margin(4),
  },
  truckTypeNameSelected: {
    color: Colors.primary,
  },
  truckTypeSpecs: {
    fontSize: responsive.fontSize(12, 14),
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
    marginHorizontal: responsive.margin(5),
  },
});

export default EnhancedDriverRegistrationScreen;
