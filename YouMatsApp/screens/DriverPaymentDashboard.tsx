import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../theme/colors';
import { authService } from '../AuthServiceSupabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get the authenticated Supabase client
const supabase = authService.getSupabaseClient();

interface PendingEarnings {
  total_pending: number;
  trips_count: number;
}

interface PaymentMethod {
  id: string;
  type: string;
  bank_name?: string;
  account_number_last4?: string;
  paypal_email?: string;
  nickname?: string;
  is_default: boolean;
  verification_status: string;
}

interface DriverPaymentDashboardProps {
  onBack?: () => void;
}

const DriverPaymentDashboard: React.FC<DriverPaymentDashboardProps> = ({ onBack }) => {
  const { t: i18nT } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [pendingEarnings, setPendingEarnings] = useState<PendingEarnings | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    initializePaymentData();
  }, []);

  const initializePaymentData = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'Please log in first');
        return;
      }
      setCurrentUserId(currentUser.id);
      await loadPaymentData(currentUser.id);
    } catch (error) {
      console.error('Error initializing payment data:', error);
      Alert.alert('Error', 'Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentData = async (userId: string) => {
    try {
      // Load pending earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('driver_earnings')
        .select('total_earnings')
        .eq('driver_id', userId)
        .eq('status', 'pending');

      if (earningsError) throw earningsError;

      const totalPending = earningsData?.reduce((sum: number, earning: any) => sum + (earning.total_earnings || 0), 0) || 0;
      const tripsCount = earningsData?.length || 0;

      setPendingEarnings({
        total_pending: totalPending,
        trips_count: tripsCount,
      });

      // Load payment methods
      const { data: methodsData, error: methodsError } = await supabase
        .from('driver_payment_methods')
        .select('*')
        .eq('driver_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (methodsError) throw methodsError;
      setPaymentMethods(methodsData || []);

    } catch (error) {
      console.error('Error loading payment data:', error);
      throw error;
    }
  };

  const addTestPaymentMethod = async () => {
    if (!currentUserId) return;

    Alert.alert(
      'Add Test Payment Method',
      'This will add a test bank account for demonstration',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            try {
              setLoading(true);
              
              const testMethod = {
                driver_id: currentUserId,
                type: 'bank_account',
                bank_name: 'Test Bank',
                account_type: 'checking',
                account_holder_name: 'Test Driver',
                account_number_last4: '1234',
                routing_number_encrypted: '123456789',
                nickname: 'Test Bank Account',
                is_default: paymentMethods.length === 0,
                payout_schedule: 'weekly',
                minimum_payout_amount: 1.00,
              };

              const { error } = await supabase
                .from('driver_payment_methods')
                .insert(testMethod);

              if (error) throw error;

              Alert.alert('Success', 'Test payment method added');
              await loadPaymentData(currentUserId);
            } catch (error) {
              console.error('Error adding test payment method:', error);
              Alert.alert('Error', 'Failed to add test payment method');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const requestTestPayout = async () => {
    if (!currentUserId || !pendingEarnings || pendingEarnings.total_pending <= 0) {
      Alert.alert('No Earnings', 'You need pending earnings to request a payout');
      return;
    }

    if (paymentMethods.length === 0) {
      Alert.alert('No Payment Method', 'Please add a payment method first');
      return;
    }

    Alert.alert(
      'Request Test Payout',
      `Request payout of $${pendingEarnings.total_pending.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              setLoading(true);
              
              const defaultMethod = paymentMethods.find(m => m.is_default) || paymentMethods[0];
              const platformFee = pendingEarnings.total_pending * 0.15; // 15% platform fee
              const processingFee = 2.50; // $2.50 processing fee
              const netAmount = pendingEarnings.total_pending - platformFee - processingFee;

              const testPayout = {
                driver_id: currentUserId,
                payment_method_id: defaultMethod.id,
                amount: pendingEarnings.total_pending,
                platform_fee: platformFee,
                processing_fee: processingFee,
                net_amount: netAmount,
                period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
                period_end: new Date().toISOString(),
                trips_included: pendingEarnings.trips_count,
                status: 'pending',
                payout_type: 'manual',
                description: 'Test payout request',
              };

              const { error } = await supabase
                .from('driver_payouts')
                .insert(testPayout);

              if (error) throw error;

              // Update earnings status to included_in_payout
              const { error: updateError } = await supabase
                .from('driver_earnings')
                .update({ status: 'included_in_payout' })
                .eq('driver_id', currentUserId)
                .eq('status', 'pending');

              if (updateError) throw updateError;

              Alert.alert('Success', `Payout request submitted!\nNet amount: $${netAmount.toFixed(2)}`);
              await loadPaymentData(currentUserId);
            } catch (error) {
              console.error('Error requesting payout:', error);
              Alert.alert('Error', 'Failed to request payout');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{i18nT('general.loadingPaymentDashboard')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>{i18nT('general.paymentDashboard')}</Text>
              <Text style={styles.subtitle}>{i18nT('general.manageYourEarningsAndPayouts')}</Text>
            </View>
          </View>
        </View>

        {/* Pending Earnings Card */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Ionicons name="wallet-outline" size={24} color={Colors.primary} />
            <Text style={styles.earningsTitle}>{i18nT('general.pendingEarnings')}</Text>
          </View>
          <Text style={styles.earningsAmount}>
            {pendingEarnings ? formatCurrency(pendingEarnings.total_pending) : '$0.00'}
          </Text>
          <Text style={styles.earningsDetail}>
            From {pendingEarnings?.trips_count || 0} completed trips
          </Text>
        </View>

        {/* Payment Methods Summary */}
        <View style={styles.paymentMethodsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="card-outline" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>{i18nT('general.paymentMethods')}</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            {paymentMethods.length} method{paymentMethods.length !== 1 ? 's' : ''} configured
          </Text>
          {paymentMethods.map((method) => (
            <View key={method.id} style={styles.methodItem}>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>
                  {method.nickname || method.type}
                </Text>
                {method.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>{i18nT('general.default')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.methodDetails}>
                {method.type === 'bank_account' 
                  ? `${method.bank_name} •••• ${method.account_number_last4}`
                  : method.paypal_email
                }
              </Text>
              <Text style={[styles.methodStatus, { 
                color: method.verification_status === 'verified' ? Colors.success : Colors.warning 
              }]}>
                {method.verification_status}
              </Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={addTestPaymentMethod}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.text.white} />
            <Text style={styles.actionButtonText}>{i18nT('general.addTestPaymentMethod')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.payoutButton,
              (!pendingEarnings || pendingEarnings.total_pending <= 0 || paymentMethods.length === 0) && styles.disabledButton
            ]}
            onPress={requestTestPayout}
            disabled={!pendingEarnings || pendingEarnings.total_pending <= 0 || paymentMethods.length === 0}
          >
            <Ionicons name="cash-outline" size={20} color={Colors.text.white} />
            <Text style={styles.actionButtonText}>{i18nT('general.requestTestPayout')}</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            This is a test payment dashboard. In production, payouts would be processed through 
            Stripe Connect or similar payment processors with proper bank verification.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Colors.text.secondary,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  earningsCard: {
    margin: 20,
    padding: 20,
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Colors.shadow.opacity,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  earningsDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  paymentMethodsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Colors.shadow.opacity,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  methodItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: Colors.text.white,
    fontSize: 12,
    fontWeight: '600',
  },
  methodDetails: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  methodStatus: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  payoutButton: {
    backgroundColor: Colors.success,
  },
  disabledButton: {
    backgroundColor: Colors.text.light,
  },
  actionButtonText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});

export default DriverPaymentDashboard;
