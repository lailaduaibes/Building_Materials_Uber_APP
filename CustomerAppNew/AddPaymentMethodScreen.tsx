import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import paymentService, { PaymentService, CardDetails, PaymentResponse } from './services/PaymentService';
import { Theme } from './theme';

interface AddPaymentMethodScreenProps {
  onBack: () => void;
  onPaymentAdded: () => void;
}

export default function AddPaymentMethodScreen({ onBack, onPaymentAdded }: AddPaymentMethodScreenProps) {
  const [paymentType, setPaymentType] = useState<'card' | 'paypal'>('card');
  const [loading, setLoading] = useState(false);
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState('');
  
  // PayPal form state
  const [paypalEmail, setPaypalEmail] = useState('');

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      const formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
      setExpiryDate(formatted);
    } else {
      setExpiryDate(cleaned);
    }
  };

  const validateCardForm = (): boolean => {
    if (!cardNumber.replace(/\s/g, '')) {
      Alert.alert('Error', 'Please enter card number');
      return false;
    }

    if (!PaymentService.validateCardNumber(cardNumber)) {
      Alert.alert('Error', 'Please enter a valid card number');
      return false;
    }

    if (!expiryDate || expiryDate.length !== 5) {
      Alert.alert('Error', 'Please enter expiry date in MM/YY format');
      return false;
    }

    const [month, year] = expiryDate.split('/');
    const monthNum = parseInt(month);
    const yearNum = parseInt(`20${year}`);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (monthNum < 1 || monthNum > 12) {
      Alert.alert('Error', 'Please enter a valid expiry month');
      return false;
    }

    if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
      Alert.alert('Error', 'Card has expired');
      return false;
    }

    if (!cvc || cvc.length < 3) {
      Alert.alert('Error', 'Please enter a valid CVC');
      return false;
    }

    if (!holderName.trim()) {
      Alert.alert('Error', 'Please enter cardholder name');
      return false;
    }

    return true;
  };

  const validatePayPalForm = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!paypalEmail || !emailRegex.test(paypalEmail)) {
      Alert.alert('Error', 'Please enter a valid PayPal email address');
      return false;
    }
    return true;
  };

  const handleAddCard = async () => {
    if (!validateCardForm()) return;

    setLoading(true);
    try {
      const [month, year] = expiryDate.split('/');
      const cardDetails: CardDetails = {
        number: cardNumber.replace(/\s/g, ''),
        expiryMonth: parseInt(month),
        expiryYear: parseInt(`20${year}`),
        cvc,
        holderName: holderName.trim()
      };

      const response: PaymentResponse = await paymentService.addCard(cardDetails);

      if (response.success) {
        Alert.alert('Success', 'Card added successfully', [
          { text: 'OK', onPress: () => {
            onPaymentAdded();
            onBack();
          }}
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to add card');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add card');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayPal = async () => {
    if (!validatePayPalForm()) return;

    setLoading(true);
    try {
      const response: PaymentResponse = await paymentService.addPayPal(paypalEmail);

      if (response.success) {
        Alert.alert('Success', 'PayPal account added successfully', [
          { text: 'OK', onPress: () => {
            onPaymentAdded();
            onBack();
          }}
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to add PayPal account');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add PayPal account');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (paymentType === 'card') {
      handleAddCard();
    } else {
      handleAddPayPal();
    }
  };

  const renderCardForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Card Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={styles.input}
          value={cardNumber}
          onChangeText={formatCardNumber}
          placeholder="1234 5678 9012 3456"
          keyboardType="numeric"
          maxLength={19}
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>Expiry Date</Text>
          <TextInput
            style={styles.input}
            value={expiryDate}
            onChangeText={formatExpiryDate}
            placeholder="MM/YY"
            keyboardType="numeric"
            maxLength={5}
            placeholderTextColor="#666"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
          <Text style={styles.label}>CVC</Text>
          <TextInput
            style={styles.input}
            value={cvc}
            onChangeText={setCvc}
            placeholder="123"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            placeholderTextColor="#666"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Cardholder Name</Text>
        <TextInput
          style={styles.input}
          value={holderName}
          onChangeText={setHolderName}
          placeholder="John Doe"
          autoCapitalize="words"
          placeholderTextColor="#666"
        />
      </View>
    </View>
  );

  const renderPayPalForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>PayPal Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>PayPal Email</Text>
        <TextInput
          style={styles.input}
          value={paypalEmail}
          onChangeText={setPaypalEmail}
          placeholder="your.email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#666"
        />
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
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Payment Method</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Payment Type Selection */}
        <View style={styles.paymentTypeSection}>
          <Text style={styles.sectionTitle}>Payment Type</Text>
          
          <View style={styles.paymentTypeButtons}>
            <TouchableOpacity
              style={[
                styles.paymentTypeButton,
                paymentType === 'card' && styles.paymentTypeButtonActive
              ]}
              onPress={() => setPaymentType('card')}
            >
              <MaterialIcons 
                name="credit-card" 
                size={24} 
                color={paymentType === 'card' ? '#fff' : '#666'} 
              />
              <Text style={[
                styles.paymentTypeText,
                paymentType === 'card' && styles.paymentTypeTextActive
              ]}>
                Credit/Debit Card
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentTypeButton,
                paymentType === 'paypal' && styles.paymentTypeButtonActive
              ]}
              onPress={() => setPaymentType('paypal')}
            >
              <MaterialIcons 
                name="account-balance-wallet" 
                size={24} 
                color={paymentType === 'paypal' ? '#fff' : '#666'} 
              />
              <Text style={[
                styles.paymentTypeText,
                paymentType === 'paypal' && styles.paymentTypeTextActive
              ]}>
                PayPal
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Section */}
        {paymentType === 'card' ? renderCardForm() : renderPayPalForm()}

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <MaterialIcons name="security" size={20} color="#666" />
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
          </Text>
        </View>
      </ScrollView>

      {/* Add Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>
              Add {paymentType === 'card' ? 'Card' : 'PayPal'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  paymentTypeSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginBottom: 15,
  },
  paymentTypeButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  paymentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  paymentTypeButtonActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  paymentTypeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  paymentTypeTextActive: {
    color: '#fff',
  },
  formSection: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: Theme.colors.primary,
    backgroundColor: '#f9f9f9',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 20,
  },
  securityText: {
    marginLeft: 10,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
