/**
 * BankVerificationModal - Real micro-deposit verification interface
 * Allows drivers to enter the two small deposit amounts for bank verification
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { stripeService } from '../services/StripeService';

interface BankVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bankAccountId: string;
  customerId: string;
  bankName: string;
  accountLast4: string;
}

const BankVerificationModal: React.FC<BankVerificationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  bankAccountId,
  customerId,
  bankName,
  accountLast4,
}) => {
  const [amount1, setAmount1] = useState('');
  const [amount2, setAmount2] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(3);

  const formatAmount = (value: string): string => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return cleaned;
  };

  const handleAmount1Change = (value: string) => {
    const formatted = formatAmount(value);
    if (parseFloat(formatted) <= 0.99 || formatted === '') {
      setAmount1(formatted);
    }
  };

  const handleAmount2Change = (value: string) => {
    const formatted = formatAmount(value);
    if (parseFloat(formatted) <= 0.99 || formatted === '') {
      setAmount2(formatted);
    }
  };

  const validateAmounts = (): boolean => {
    const amt1 = parseFloat(amount1);
    const amt2 = parseFloat(amount2);

    if (!amount1 || !amount2) {
      Alert.alert('Missing Amounts', 'Please enter both deposit amounts.');
      return false;
    }

    if (isNaN(amt1) || isNaN(amt2)) {
      Alert.alert('Invalid Amounts', 'Please enter valid amounts (e.g., 0.32).');
      return false;
    }

    if (amt1 <= 0 || amt1 >= 1 || amt2 <= 0 || amt2 >= 1) {
      Alert.alert('Invalid Range', 'Micro-deposits are typically between $0.01 and $0.99.');
      return false;
    }

    if (amt1 === amt2) {
      Alert.alert('Different Amounts', 'The two deposits should be different amounts.');
      return false;
    }

    return true;
  };

  const handleVerify = async () => {
    if (!validateAmounts()) return;

    setLoading(true);
    try {
      const success = await stripeService.verifyMicroDeposits(
        customerId,
        bankAccountId,
        parseFloat(amount1),
        parseFloat(amount2)
      );

      if (success) {
        onSuccess();
        onClose();
      } else {
        setAttempts(prev => prev - 1);
        if (attempts <= 1) {
          Alert.alert(
            'Too Many Failed Attempts',
            'You\'ve exceeded the maximum number of verification attempts. Please contact support for assistance.'
          );
          onClose();
        }
      }
    } catch (error) {
      console.error('Error verifying deposits:', error);
      Alert.alert('Error', 'Failed to verify deposits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNeedHelp = () => {
    Alert.alert(
      'Finding Your Deposits',
      'Look for two small deposits from "STRIPE" or "ACME CORP" in your bank account or online banking statement. These deposits typically appear within 1-2 business days.\n\nThe amounts are usually between $0.01 and $0.99.\n\nIf you don\'t see them yet, please wait and check again tomorrow.',
      [
        { text: 'OK', style: 'default' },
        { text: 'Contact Support', onPress: () => {
          // In a real app, this would open support chat or email
          Alert.alert('Support', 'Support contact functionality would be implemented here.');
        }}
      ]
    );
  };

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
            <Text style={styles.title}>Verify Bank Account</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Account Info */}
            <View style={styles.accountInfo}>
              <Ionicons name="business" size={32} color={Colors.primary} />
              <View style={styles.accountDetails}>
                <Text style={styles.bankName}>{bankName}</Text>
                <Text style={styles.accountNumber}>Account ending in {accountLast4}</Text>
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>Enter Micro-Deposit Amounts</Text>
              <Text style={styles.instructionsText}>
                We sent 2 small deposits to your account. Check your bank statement and enter the exact amounts below.
              </Text>
            </View>

            {/* Amount Inputs */}
            <View style={styles.amountInputs}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Deposit Amount</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount1}
                    onChangeText={handleAmount1Change}
                    placeholder="0.00"
                    placeholderTextColor={Colors.text.secondary}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Second Deposit Amount</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount2}
                    onChangeText={handleAmount2Change}
                    placeholder="0.00"
                    placeholderTextColor={Colors.text.secondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            {/* Attempts Remaining */}
            {attempts < 3 && (
              <View style={styles.attemptsWarning}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text style={styles.attemptsText}>
                  {attempts} attempt{attempts !== 1 ? 's' : ''} remaining
                </Text>
              </View>
            )}

            {/* Help Section */}
            <TouchableOpacity style={styles.helpButton} onPress={handleNeedHelp}>
              <Ionicons name="help-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.helpText}>Don't see the deposits?</Text>
            </TouchableOpacity>

            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.status.completed} />
              <Text style={styles.securityText}>
                This verification process is required by banking regulations to ensure the security of your account.
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!amount1 || !amount2 || loading) && styles.verifyButtonDisabled
              ]}
              onPress={handleVerify}
              disabled={!amount1 || !amount2 || loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>Verify Account</Text>
                  <Ionicons name="checkmark" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  accountDetails: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  accountNumber: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  instructions: {
    marginTop: 24,
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  amountInputs: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  attemptsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  attemptsText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 24,
    gap: 8,
  },
  helpText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  securityNotice: {
    flexDirection: 'row',
    backgroundColor: Colors.status.completed + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default BankVerificationModal;
