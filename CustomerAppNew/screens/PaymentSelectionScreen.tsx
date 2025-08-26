/**
 * Payment Selection Screen - Choose payment method for trip payment
 * Professional UI for payment method selection during trip booking
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import paymentService, { PaymentMethod } from '../services/PaymentService';

// Professional blue theme matching customer app
const theme = {
  primary: '#2563EB',      // Blue
  secondary: '#1E40AF',    // Darker blue
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Orange
  error: '#EF4444',        // Red
  background: '#FFFFFF',   // White
  surface: '#F8FAFC',      // Light gray
  text: '#1F2937',         // Dark gray
  textSecondary: '#6B7280', // Medium gray
  border: '#E5E7EB',       // Light border
  disabled: '#9CA3AF'      // Disabled gray
};

interface PaymentSelectionScreenProps {
  onBack: () => void;
  onPaymentMethodSelected: (paymentMethodId: string, amount: number) => void;
  tripAmount: number;
  tripDetails?: {
    pickupAddress: string;
    deliveryAddress: string;
    truckType: string;
  };
}

export default function PaymentSelectionScreen({ 
  onBack, 
  onPaymentMethodSelected, 
  tripAmount,
  tripDetails 
}: PaymentSelectionScreenProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
      
      // Auto-select default payment method
      const defaultMethod = methods.find(m => m.isDefault);
      if (defaultMethod) {
        setSelectedMethodId(defaultMethod.id);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedMethodId(methodId);
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethodId) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      setProcessing(true);
      onPaymentMethodSelected(selectedMethodId, tripAmount);
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (last4?: string) => {
    if (!last4) return '';
    return `•••• •••• •••• ${last4}`;
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    const isSelected = selectedMethodId === method.id;
    
    return (
      <TouchableOpacity
        key={method.id}
        style={[
          styles.paymentMethodCard,
          isSelected && styles.selectedPaymentMethod
        ]}
        onPress={() => handlePaymentMethodSelect(method.id)}
      >
        <View style={styles.paymentMethodContent}>
          <View style={styles.paymentMethodInfo}>
            {method.type === 'card' && (
              <>
                <MaterialIcons 
                  name="credit-card" 
                  size={24} 
                  color={isSelected ? theme.primary : theme.textSecondary} 
                />
                <View style={styles.cardDetails}>
                  <Text style={[styles.cardNumber, isSelected && styles.selectedText]}>
                    {formatCardNumber(method.last4)}
                  </Text>
                  <Text style={[styles.cardBrand, isSelected && styles.selectedTextSecondary]}>
                    {method.brand?.toUpperCase()} • Expires {method.expiryMonth}/{method.expiryYear}
                  </Text>
                </View>
              </>
            )}
            
            {method.type === 'paypal' && (
              <>
                <MaterialIcons 
                  name="account-balance-wallet" 
                  size={24} 
                  color={isSelected ? theme.primary : theme.textSecondary} 
                />
                <View style={styles.cardDetails}>
                  <Text style={[styles.cardNumber, isSelected && styles.selectedText]}>
                    PayPal
                  </Text>
                  <Text style={[styles.cardBrand, isSelected && styles.selectedTextSecondary]}>
                    {method.email}
                  </Text>
                </View>
              </>
            )}
            
            {method.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          
          <View style={[
            styles.selectionIndicator,
            isSelected && styles.selectedIndicator
          ]}>
            {isSelected && (
              <MaterialIcons name="check" size={16} color={theme.background} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading payment methods...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Method</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trip Summary */}
        {tripDetails && (
          <View style={styles.tripSummary}>
            <Text style={styles.sectionTitle}>Trip Summary</Text>
            <View style={styles.tripDetails}>
              <View style={styles.tripDetailRow}>
                <MaterialIcons name="location-on" size={16} color={theme.primary} />
                <Text style={styles.tripDetailText}>{tripDetails.pickupAddress}</Text>
              </View>
              <View style={styles.tripDetailRow}>
                <MaterialIcons name="flag" size={16} color={theme.success} />
                <Text style={styles.tripDetailText}>{tripDetails.deliveryAddress}</Text>
              </View>
              <View style={styles.tripDetailRow}>
                <MaterialIcons name="local-shipping" size={16} color={theme.textSecondary} />
                <Text style={styles.tripDetailText}>{tripDetails.truckType}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>${tripAmount.toFixed(2)}</Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethodsSection}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          
          {paymentMethods.length === 0 ? (
            <View style={styles.noPaymentMethods}>
              <MaterialIcons name="payment" size={48} color={theme.textSecondary} />
              <Text style={styles.noPaymentMethodsText}>No payment methods added</Text>
              <Text style={styles.noPaymentMethodsSubtext}>
                Please add a payment method in Account Settings
              </Text>
            </View>
          ) : (
            <View style={styles.paymentMethodsList}>
              {paymentMethods.map(renderPaymentMethod)}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Confirm Payment Button */}
      {paymentMethods.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!selectedMethodId || processing) && styles.disabledButton
            ]}
            onPress={handleConfirmPayment}
            disabled={!selectedMethodId || processing}
          >
            {processing ? (
              <>
                <ActivityIndicator size="small" color={theme.background} style={styles.buttonLoader} />
                <Text style={styles.confirmButtonText}>Processing...</Text>
              </>
            ) : (
              <Text style={styles.confirmButtonText}>
                Confirm Payment • ${tripAmount.toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tripSummary: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  tripDetails: {
    gap: 8,
  },
  tripDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripDetailText: {
    fontSize: 14,
    color: theme.textSecondary,
    flex: 1,
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginVertical: 8,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.primary,
  },
  paymentMethodsSection: {
    marginVertical: 16,
  },
  paymentMethodsList: {
    gap: 8,
  },
  paymentMethodCard: {
    backgroundColor: theme.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
    padding: 16,
  },
  selectedPaymentMethod: {
    borderColor: theme.primary,
    backgroundColor: '#EBF4FF',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardDetails: {
    marginLeft: 12,
    flex: 1,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  cardBrand: {
    fontSize: 12,
    color: theme.textSecondary,
    textTransform: 'uppercase',
  },
  selectedText: {
    color: theme.primary,
  },
  selectedTextSecondary: {
    color: theme.secondary,
  },
  defaultBadge: {
    backgroundColor: theme.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.background,
    textTransform: 'uppercase',
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  noPaymentMethods: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noPaymentMethodsText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginTop: 12,
    textAlign: 'center',
  },
  noPaymentMethodsSubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.background,
  },
  confirmButton: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: theme.disabled,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.background,
  },
  buttonLoader: {
    marginRight: 8,
  },
});
