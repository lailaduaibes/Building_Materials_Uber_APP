/**
 * BankAccountSetupModal - Professional bank account setup form
 * Secure, validated bank account registration for driver payouts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../theme/colors';
import { bankAccountService, BankAccountFormData, BankAccount } from '../services/BankAccountService';
import { stripeService } from '../services/StripeService';
import BankVerificationModal from './BankVerificationModal';

interface BankAccountSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (bankAccount: BankAccount) => void;
  driverId: string;
}

const BankAccountSetupModal: React.FC<BankAccountSetupModalProps> = ({
  visible,
  onClose,
  onSuccess,
  driverId,
}) => {
  const { t: i18nT } = useTranslation();
  const [formData, setFormData] = useState<BankAccountFormData>({
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    routing_number: '',
    account_type: 'checking',
    nickname: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [step, setStep] = useState<'form' | 'confirmation'>('form');
  const [lookingUpBank, setLookingUpBank] = useState(false);
  
  // Stripe verification states
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [stripeCustomerId, setStripeCustomerId] = useState<string>('');
  const [stripeBankAccountId, setStripeBankAccountId] = useState<string>('');
  const [savedBankAccount, setSavedBankAccount] = useState<BankAccount | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setFormData({
        bank_name: '',
        account_holder_name: '',
        account_number: '',
        routing_number: '',
        account_type: 'checking',
        nickname: '',
      });
      setErrors({});
      setStep('form');
    }
  }, [visible]);

  const updateField = (field: keyof BankAccountFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRoutingNumberChange = async (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    updateField('routing_number', cleanValue);

    // Auto-lookup bank name when routing number is complete
    if (cleanValue.length === 9 && !formData.bank_name) {
      setLookingUpBank(true);
      try {
        const bankName = await bankAccountService.getBankNameFromRoutingNumber(cleanValue);
        if (bankName) {
          updateField('bank_name', bankName);
        }
      } catch (error) {
        console.error('Error looking up bank name:', error);
      } finally {
        setLookingUpBank(false);
      }
    }
  };

  const validateForm = (): boolean => {
    const validation = bankAccountService.validateBankAccount(formData);
    
    if (!validation.isValid) {
      const newErrors: { [key: string]: string } = {};
      validation.errors.forEach(error => {
        if (error.includes('holder name')) newErrors.account_holder_name = error;
        else if (error.includes('bank name')) newErrors.bank_name = error;
        else if (error.includes('routing')) newErrors.routing_number = error;
        else if (error.includes('account number')) newErrors.account_number = error;
        else if (error.includes('account type')) newErrors.account_type = error;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (step === 'form') {
      setStep('confirmation');
      return;
    }

    // Final submission with real Stripe integration
    setLoading(true);
    try {
      // 1. Save bank account to local database
      const result = await bankAccountService.addBankAccount(driverId, formData);
      
      if (result) {
        setSavedBankAccount(result);
        
        // 2. Create Stripe customer and add bank account
        try {
          const customer = await stripeService.createOrGetCustomer(
            driverId,
            `driver_${driverId}@youmats.com`, // In real app, get from user profile
            formData.account_holder_name
          );
          
          if (!customer) {
            throw new Error('Failed to create Stripe customer');
          }
          
          const stripeBankAccount = await stripeService.addBankAccount(
            customer.id,
            formData.account_number,
            formData.routing_number,
            formData.account_holder_name,
            formData.account_type as 'checking' | 'savings'
          );
          
          if (!stripeBankAccount) {
            throw new Error('Failed to add bank account to Stripe');
          }
          
          // 4. Store Stripe IDs for verification modal
          setStripeCustomerId(customer.id);
          setStripeBankAccountId(stripeBankAccount.id);
          
          // 5. Show verification modal instead of success alert
          setShowVerificationModal(true);
          
        } catch (stripeError) {
          console.error('Stripe integration error:', stripeError);
          // If Stripe fails, still show success but mention manual verification
          Alert.alert(
            'Bank Account Added!',
            'Your bank account has been added successfully. Our team will manually verify it within 1-2 business days.',
            [{ text: 'OK', onPress: () => {
              onSuccess(result);
              onClose();
            }}]
          );
        }
      }
    } catch (error) {
      console.error('Error adding bank account:', error);
      Alert.alert('Error', 'Failed to add bank account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = () => {
    if (savedBankAccount) {
      onSuccess(savedBankAccount);
    }
    setShowVerificationModal(false);
    onClose();
    
    Alert.alert(
      'Verification Complete!',
      'Your bank account has been verified successfully. You can now receive payouts.',
      [{ text: 'Great!' }]
    );
  };

  const renderFormStep = () => (
    <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
      {/* Bank Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{i18nT('general.bankName')}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, errors.bank_name && styles.inputError]}
            value={formData.bank_name}
            onChangeText={(value) => updateField('bank_name', value)}
            placeholder={i18nT('general.egChaseBankWellsFargo')}
            placeholderTextColor={Colors.text.secondary}
            autoCapitalize="words"
          />
          {lookingUpBank && (
            <ActivityIndicator size="small" color={Colors.primary} style={styles.inputIcon} />
          )}
        </View>
        {errors.bank_name && <Text style={styles.errorText}>{errors.bank_name}</Text>}
      </View>

      {/* Account Holder Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{i18nT('general.accountHolderName')}</Text>
        <TextInput
          style={[styles.input, errors.account_holder_name && styles.inputError]}
          value={formData.account_holder_name}
          onChangeText={(value) => updateField('account_holder_name', value)}
          placeholder={i18nT('general.fullNameAsItAppearsOnYourAccount')}
          placeholderTextColor={Colors.text.secondary}
          autoCapitalize="words"
        />
        {errors.account_holder_name && <Text style={styles.errorText}>{errors.account_holder_name}</Text>}
      </View>

      {/* Routing Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{i18nT('general.routingNumber')}</Text>
        <TextInput
          style={[styles.input, errors.routing_number && styles.inputError]}
          value={formData.routing_number}
          onChangeText={handleRoutingNumberChange}
          placeholder={i18nT('general.9digitRoutingNumber')}
          placeholderTextColor={Colors.text.secondary}
          keyboardType="numeric"
          maxLength={9}
        />
        {errors.routing_number && <Text style={styles.errorText}>{errors.routing_number}</Text>}
        <Text style={styles.helpText}>{i18nT('general.foundOnTheBottomLeftOfYourChecks')}</Text>
      </View>

      {/* Account Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{i18nT('general.accountNumber')}</Text>
        <TextInput
          style={[styles.input, errors.account_number && styles.inputError]}
          value={formData.account_number}
          onChangeText={(value) => updateField('account_number', value.replace(/\D/g, ''))}
          placeholder={i18nT('general.yourAccountNumber')}
          placeholderTextColor={Colors.text.secondary}
          keyboardType="numeric"
          secureTextEntry
          maxLength={17}
        />
        {errors.account_number && <Text style={styles.errorText}>{errors.account_number}</Text>}
      </View>

      {/* Account Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{i18nT('general.accountType')}</Text>
        <View style={styles.accountTypeContainer}>
          <TouchableOpacity
            style={[
              styles.accountTypeButton,
              formData.account_type === 'checking' && styles.accountTypeButtonActive
            ]}
            onPress={() => updateField('account_type', 'checking')}
          >
            <Text style={[
              styles.accountTypeText,
              formData.account_type === 'checking' && styles.accountTypeTextActive
            ]}>
              Checking
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.accountTypeButton,
              formData.account_type === 'savings' && styles.accountTypeButtonActive
            ]}
            onPress={() => updateField('account_type', 'savings')}
          >
            <Text style={[
              styles.accountTypeText,
              formData.account_type === 'savings' && styles.accountTypeTextActive
            ]}>
              Savings
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nickname (Optional) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{i18nT('general.nicknameOptional')}</Text>
        <TextInput
          style={styles.input}
          value={formData.nickname}
          onChangeText={(value) => updateField('nickname', value)}
          placeholder={i18nT('general.egMyMainAccountBusinessAccount')}
          placeholderTextColor={Colors.text.secondary}
        />
        <Text style={styles.helpText}>{i18nT('general.giveThisAccountAMemorableName')}</Text>
      </View>

      {/* Security Notice */}
      <View style={styles.securityNotice}>
        <Ionicons name="shield-checkmark" size={20} color={Colors.status.completed} />
        <Text style={styles.securityText}>
          Your banking information is encrypted and secure. We use bank-level security to protect your data.
        </Text>
      </View>
    </ScrollView>
  );

  const renderConfirmationStep = () => (
    <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
      <View style={styles.confirmationHeader}>
        <Ionicons name="checkmark-circle" size={48} color={Colors.status.completed} />
        <Text style={styles.confirmationTitle}>{i18nT('general.confirmBankAccount')}</Text>
        <Text style={styles.confirmationSubtitle}>
          Please verify the information below is correct
        </Text>
      </View>

      <View style={styles.confirmationDetails}>
        <View style={styles.confirmationRow}>
          <Text style={styles.confirmationLabel}>{i18nT('general.bank')}</Text>
          <Text style={styles.confirmationValue}>{formData.bank_name}</Text>
        </View>
        
        <View style={styles.confirmationRow}>
          <Text style={styles.confirmationLabel}>{i18nT('general.accountHolder')}</Text>
          <Text style={styles.confirmationValue}>{formData.account_holder_name}</Text>
        </View>
        
        <View style={styles.confirmationRow}>
          <Text style={styles.confirmationLabel}>{i18nT('general.routingNumber')}</Text>
          <Text style={styles.confirmationValue}>
            {bankAccountService.formatRoutingNumber(formData.routing_number)}
          </Text>
        </View>
        
        <View style={styles.confirmationRow}>
          <Text style={styles.confirmationLabel}>{i18nT('general.account')}</Text>
          <Text style={styles.confirmationValue}>
            {formData.account_type} ****{formData.account_number.slice(-4)}
          </Text>
        </View>

        {formData.nickname && (
          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>{i18nT('general.nickname')}</Text>
            <Text style={styles.confirmationValue}>{formData.nickname}</Text>
          </View>
        )}
      </View>

      <View style={styles.verificationNotice}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <Text style={styles.verificationText}>
          After adding your account, we'll send 2 small deposits (1-2 business days) for verification. 
          You'll need to confirm these amounts to enable payouts.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {step === 'form' ? 'Add Bank Account' : 'Confirm Details'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressStep, styles.progressStepActive]}>
              <Text style={styles.progressStepText}>1</Text>
            </View>
            <View style={[styles.progressLine, step === 'confirmation' && styles.progressLineActive]} />
            <View style={[styles.progressStep, step === 'confirmation' && styles.progressStepActive]}>
              <Text style={styles.progressStepText}>2</Text>
            </View>
          </View>

          {/* Content */}
          {step === 'form' ? renderFormStep() : renderConfirmationStep()}

          {/* Footer */}
          <View style={styles.footer}>
            {step === 'confirmation' && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setStep('form')}
              >
                <Text style={styles.backButtonText}>{i18nT('general.back')}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {step === 'form' ? 'Review Details' : 'Add Bank Account'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Bank Verification Modal */}
      <BankVerificationModal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={handleVerificationSuccess}
        bankAccountId={stripeBankAccountId}
        customerId={stripeCustomerId}
        bankName={formData.bank_name}
        accountLast4={formData.account_number.slice(-4)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.background.secondary,
    borderWidth: 2,
    borderColor: Colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border.light,
    marginHorizontal: 10,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  formContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  helpText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  accountTypeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  accountTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  accountTypeTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  securityNotice: {
    flexDirection: 'row',
    backgroundColor: Colors.status.completed + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  confirmationHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 12,
  },
  confirmationSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  confirmationDetails: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  confirmationLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  confirmationValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  verificationNotice: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  verificationText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: 12,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default BankAccountSetupModal;
