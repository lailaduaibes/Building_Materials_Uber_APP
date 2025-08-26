/**
 * PaymentHistoryScreen - Display user's payment transaction history
 * Shows receipts, payment status, and transaction details
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Theme } from '../theme';
import { authService } from '../AuthServiceSupabase';
import { supabase } from '../config/supabaseClient';

interface PaymentTransaction {
  id: string;
  tripId: string;
  amount: number;
  paymentMethodType: string;
  paymentMethodLast4?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  processedAt: string;
  tripDetails?: {
    pickupAddress: string;
    deliveryAddress: string;
    materialType: string;
    truckType: string;
  };
}

interface PaymentReceipt {
  id: string;
  tripId: string;
  amount: number;
  paymentMethod: string;
  transactionDate: string;
  tripDetails: {
    pickupAddress: string;
    deliveryAddress: string;
    materialType: string;
    truckType: string;
  };
  receiptNumber: string;
}

interface PaymentHistoryScreenProps {
  onBack: () => void;
}

export default function PaymentHistoryScreen({ onBack }: PaymentHistoryScreenProps) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      
      if (!user) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      // Query trip_requests with payment information using proper foreign key
      const { data: trips, error } = await supabase
        .from('trip_requests')
        .select(`
          id,
          quoted_price,
          payment_status,
          payment_method_id,
          paid_amount,
          payment_processed_at,
          payment_transaction_id,
          pickup_address,
          delivery_address,
          material_type,
          required_truck_type_id,
          payment_methods (
            id,
            type,
            last4,
            brand
          )
        `)
        .eq('customer_id', user.id)
        .not('payment_status', 'is', null)
        .order('payment_processed_at', { ascending: false });

      if (error) {
        console.error('Error loading payment history:', error);
        Alert.alert('Error', 'Failed to load payment history');
        return;
      }

      // Transform data to match our interface
      const transformedTransactions: PaymentTransaction[] = trips?.map(trip => {
        const paymentMethod = Array.isArray(trip.payment_methods) ? trip.payment_methods[0] : trip.payment_methods;
        
        return {
          id: trip.id,
          tripId: trip.id,
          amount: trip.paid_amount || trip.quoted_price || 0,
          paymentMethodType: paymentMethod?.type || 'card',
          paymentMethodLast4: paymentMethod?.last4 || '****',
          status: (trip.payment_status as 'pending' | 'completed' | 'failed' | 'refunded') || 'pending',
          transactionId: trip.payment_transaction_id || `TXN_${trip.id.slice(0, 8)}`,
          processedAt: trip.payment_processed_at || new Date().toISOString(),
          tripDetails: {
            pickupAddress: trip.pickup_address?.formatted_address || 'Unknown pickup',
            deliveryAddress: trip.delivery_address?.formatted_address || 'Unknown delivery',
            materialType: trip.material_type || 'Unknown material',
            truckType: 'Standard Truck', // Would need to join with truck_types table
          },
        };
      }).filter(transaction => transaction.amount > 0) || []; // Only show trips with amounts

      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error loading payment history:', error);
      Alert.alert('Error', 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPaymentHistory();
    setRefreshing(false);
  };

  const viewReceipt = (transaction: PaymentTransaction) => {
    const receipt: PaymentReceipt = {
      id: transaction.id,
      tripId: transaction.tripId,
      amount: transaction.amount,
      paymentMethod: `${transaction.paymentMethodType.toUpperCase()}${transaction.paymentMethodLast4 ? ` •••• ${transaction.paymentMethodLast4}` : ''}`,
      transactionDate: transaction.processedAt,
      tripDetails: transaction.tripDetails!,
      receiptNumber: `RCP-${transaction.id.slice(-8).toUpperCase()}`,
    };
    
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Theme.colors.success;
      case 'pending':
        return Theme.colors.warning;
      case 'failed':
        return Theme.colors.error;
      case 'refunded':
        return '#6366f1';
      default:
        return Theme.colors.text.secondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransaction = ({ item }: { item: PaymentTransaction }) => (
    <TouchableOpacity style={styles.transactionCard} onPress={() => viewReceipt(item)}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionAmount}>{formatAmount(item.amount)}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.processedAt)}</Text>
        </View>
        <View style={styles.transactionStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={Theme.colors.text.secondary} />
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <Text style={styles.transactionTrip} numberOfLines={2}>
          {item.tripDetails?.pickupAddress} → {item.tripDetails?.deliveryAddress}
        </Text>
        <Text style={styles.transactionPayment}>
          {item.paymentMethodType.toUpperCase()}{item.paymentMethodLast4 ? ` •••• ${item.paymentMethodLast4}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const ReceiptModal = () => (
    <Modal
      visible={showReceiptModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowReceiptModal(false)}
    >
      <SafeAreaView style={styles.receiptContainer}>
        <StatusBar style="dark" />
        
        {/* Receipt Header */}
        <View style={styles.receiptHeader}>
          <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
            <MaterialIcons name="close" size={24} color={Theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.receiptTitle}>Payment Receipt</Text>
          <TouchableOpacity onPress={() => Alert.alert('Share', 'Share receipt functionality would be implemented here')}>
            <MaterialIcons name="share" size={24} color={Theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {selectedReceipt && (
          <View style={styles.receiptContent}>
            {/* Receipt Details */}
            <View style={styles.receiptSection}>
              <Text style={styles.receiptNumber}>Receipt #{selectedReceipt.receiptNumber}</Text>
              <Text style={styles.receiptDate}>{formatDate(selectedReceipt.transactionDate)}</Text>
            </View>

            {/* Amount */}
            <View style={styles.receiptAmountSection}>
              <Text style={styles.receiptAmountLabel}>Amount Paid</Text>
              <Text style={styles.receiptAmount}>{formatAmount(selectedReceipt.amount)}</Text>
            </View>

            {/* Trip Details */}
            <View style={styles.receiptSection}>
              <Text style={styles.receiptSectionTitle}>Trip Details</Text>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Pickup:</Text>
                <Text style={styles.receiptValue} numberOfLines={2}>{selectedReceipt.tripDetails.pickupAddress}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Delivery:</Text>
                <Text style={styles.receiptValue} numberOfLines={2}>{selectedReceipt.tripDetails.deliveryAddress}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Material:</Text>
                <Text style={styles.receiptValue}>{selectedReceipt.tripDetails.materialType}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Vehicle:</Text>
                <Text style={styles.receiptValue}>{selectedReceipt.tripDetails.truckType}</Text>
              </View>
            </View>

            {/* Payment Method */}
            <View style={styles.receiptSection}>
              <Text style={styles.receiptSectionTitle}>Payment Method</Text>
              <Text style={styles.receiptValue}>{selectedReceipt.paymentMethod}</Text>
            </View>

            {/* Footer */}
            <View style={styles.receiptFooter}>
              <Text style={styles.receiptFooterText}>Thank you for using YouMats!</Text>
              <Text style={styles.receiptFooterSubtext}>Building Materials Delivery Service</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={Theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment History</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Loading payment history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color={Theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Payment History</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="receipt-long" size={64} color={Theme.colors.text.secondary} />
          <Text style={styles.emptyTitle}>No Payment History</Text>
          <Text style={styles.emptySubtitle}>Your payment transactions will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          style={styles.transactionsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ReceiptModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Theme.colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.text.primary,
  },
  transactionDate: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  transactionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  transactionDetails: {
    gap: 4,
  },
  transactionTrip: {
    fontSize: 14,
    color: Theme.colors.text.primary,
    fontWeight: '500',
  },
  transactionPayment: {
    fontSize: 13,
    color: Theme.colors.text.secondary,
  },
  
  // Receipt Modal Styles
  receiptContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background.primary,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  receiptContent: {
    flex: 1,
    padding: 16,
  },
  receiptSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  receiptNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.text.primary,
  },
  receiptDate: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 4,
  },
  receiptAmountSection: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  receiptAmountLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  receiptSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  receiptLabel: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    fontWeight: '500',
    width: 80,
  },
  receiptValue: {
    fontSize: 14,
    color: Theme.colors.text.primary,
    flex: 1,
  },
  receiptFooter: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  receiptFooterText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  receiptFooterSubtext: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 4,
  },
});
