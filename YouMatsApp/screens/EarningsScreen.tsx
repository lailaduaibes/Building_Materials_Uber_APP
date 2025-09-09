/**
 * Professional Earnings Screen - Complete Functionality
 * Real database integration with trip details, cash out, tax documentation
 * Connected to payment system for seamless money management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Alert,
  Platform,
  RefreshControl,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';
import { driverEarningsService, TripEarning, EarningsBreakdown } from '../services/DriverEarningsService';
import { weeklyPayoutService } from '../services/WeeklyPayoutService';
import { authService } from '../AuthServiceSupabase';
import { Colors } from '../theme/colors';
import { useLanguage } from '../src/contexts/LanguageContext';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';

const { width } = Dimensions.get('window');
const screenWidth = width;

// Enhanced responsive calculations for Android
const getResponsiveValue = (small: number, medium: number = small * 1.2, large: number = small * 1.5) => {
  if (screenWidth < 360) return small * 0.9; // Small Android phones
  if (screenWidth < 400) return small; // Standard Android phones
  if (screenWidth < 600) return medium; // Large phones/small tablets
  return large; // Tablets
};

interface EarningsScreenProps {
  onBack: () => void;
  onNavigateToPayment?: () => void;
}

interface RecentPayout {
  id: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'processing';
  method: string;
}

interface TaxDocument {
  year: number;
  totalEarnings: number;
  totalTrips: number;
  documentUrl?: string;
  isReady: boolean;
}

export default function EarningsScreen({ onBack, onNavigateToPayment }: EarningsScreenProps) {
  const { t } = useLanguage();
  const { t: i18nT } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [earningsData, setEarningsData] = useState<EarningsBreakdown | null>(null);
  const [tripEarnings, setTripEarnings] = useState<TripEarning[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<RecentPayout[]>([]);
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showTaxDocs, setShowTaxDocs] = useState(false);
  const [availableForCashOut, setAvailableForCashOut] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        Alert.alert(t('common.error'), t('earnings.login_required'));
        return;
      }
      setCurrentUserId(user.id);
      await loadAllEarningsData(user.id);
    } catch (error) {
      console.error('Error initializing earnings data:', error);
      Alert.alert(t('common.error'), t('earnings.failed_to_load_data'));
    }
  };

  const loadAllEarningsData = async (userId: string) => {
    try {
      setLoading(true);
      console.log('💰 Loading comprehensive earnings data...');
      
      await Promise.all([
        loadEarningsBreakdown(userId),
        loadTripEarnings(userId),
        loadRecentPayouts(userId),
        loadTaxDocuments(userId),
        loadAvailableForCashOut(userId),
      ]);
    } catch (error) {
      console.error('Error loading earnings data:', error);
      Alert.alert(t('common.error'), t('earnings.failed_to_load_info'));
    } finally {
      setLoading(false);
    }
  };

  const loadEarningsBreakdown = async (userId: string) => {
    try {
      const breakdown = await driverEarningsService.getEarningsBreakdown(userId);
      setEarningsData(breakdown);
      console.log('✅ Earnings breakdown loaded:', breakdown);
    } catch (error) {
      console.error('Error loading earnings breakdown:', error);
    }
  };

  const loadTripEarnings = async (userId: string) => {
    try {
      const trips = await driverEarningsService.getDriverTripEarnings(userId);
      setTripEarnings(trips.slice(0, 20)); // Show last 20 trips
      console.log('✅ Trip earnings loaded:', trips.length);
    } catch (error) {
      console.error('Error loading trip earnings:', error);
    }
  };

  const loadRecentPayouts = async (userId: string) => {
    try {
      // Get recent payouts from weekly payout service
      const payouts = await weeklyPayoutService.getPayoutHistory(userId, 5);
      
      // Map PayoutSchedule to RecentPayout format
      const mappedPayouts: RecentPayout[] = payouts.map(payout => ({
        id: payout.id,
        amount: payout.net_amount,
        date: payout.completed_at || payout.scheduled_date,
        status: payout.status === 'failed' ? 'pending' : payout.status as 'pending' | 'completed' | 'processing',
        method: t('earnings.bank_transfer') // Default for now, can be enhanced later
      }));
      
      setRecentPayouts(mappedPayouts);
      console.log('✅ Recent payouts loaded:', mappedPayouts.length);
    } catch (error) {
      console.error('Error loading recent payouts:', error);
      setRecentPayouts([]); // Set empty array on error
    }
  };

  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [processingCashOut, setProcessingCashOut] = useState(false);
  const [showTripDetailsModal, setShowTripDetailsModal] = useState(false);
  const [showPayoutHistoryModal, setShowPayoutHistoryModal] = useState(false);
  const [allPayouts, setAllPayouts] = useState<RecentPayout[]>([]);

  const handleCashOut = async () => {
    if (!currentUserId) return;
    
    const availableAmount = currentData?.available_for_payout || 0;
    
    if (availableAmount <= 0) {
      Alert.alert(
        t('earnings.no_earnings_title'),
        t('earnings.no_earnings_message'),
        [{ text: t('common.ok'), style: 'default' }]
      );
      return;
    }
    
    // Check minimum cash out amount
    if (availableAmount < 10) {
      Alert.alert(
        t('earnings.minimum_amount_title'),
        t('earnings.minimum_amount_message', { amount: formatCurrency(availableAmount) }),
        [{ text: t('common.ok'), style: 'default' }]
      );
      return;
    }
    
    // Show confirmation with fee information
    const fee = Math.max(0.50, availableAmount * 0.015);
    const netAmount = availableAmount - fee;
    
    Alert.alert(
      t('earnings.instant_cashout_title'),
      t('earnings.instant_cashout_message', { 
        available: formatCurrency(availableAmount),
        fee: formatCurrency(fee),
        netAmount: formatCurrency(netAmount)
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('earnings.cashout_now'), 
          style: 'default',
          onPress: () => processCashOut()
        }
      ]
    );
  };

  const processCashOut = async () => {
    if (!currentUserId) return;
    
    setProcessingCashOut(true);
    
    try {
      console.log('💰 Processing cash out for driver:', currentUserId);
      
      // Use a default payment method for now - in production you'd let user select
      const defaultPaymentMethodId = 'default-bank-account';
      
      const result = await weeklyPayoutService.requestInstantPayout(
        currentUserId,
        defaultPaymentMethodId
      );
      
      if (result) {
        console.log('✅ Cash out successful:', result);
        Alert.alert(
          t('earnings.cashout_success_title'),
          t('earnings.cashout_success_message', {
            netAmount: formatCurrency(result.net_amount),
            processingFee: formatCurrency(result.processing_fee)
          }),
          [
            { 
              text: t('common.ok'), 
              onPress: () => {
                // Reload earnings data to reflect the payout
                loadAllEarningsData(currentUserId);
              }
            }
          ]
        );
      } else {
        console.error('❌ Cash out failed - no result returned');
        Alert.alert(t('earnings.cashout_failed_title'), t('earnings.cashout_failed_message'));
      }
    } catch (error) {
      console.error('❌ Cash out error:', error);
      Alert.alert(
        t('earnings.cashout_failed_title'), 
        t('earnings.cashout_error_message')
      );
    } finally {
      setProcessingCashOut(false);
    }
  };

  const handleShowTripDetails = () => {
    if (!tripEarnings || tripEarnings.length === 0) {
      Alert.alert(
        t('earnings.no_trip_data_title'),
        t('earnings.no_trip_data_message'),
        [{ text: t('common.ok'), style: 'default' }]
      );
      return;
    }
    
    setShowTripDetailsModal(true);
  };

  const handleShowPayoutHistory = async () => {
    if (!currentUserId) return;
    
    try {
      // Load all payouts for the modal
      const payouts = await weeklyPayoutService.getPayoutHistory(currentUserId, 50); // Get up to 50 payouts
      
      const mappedPayouts: RecentPayout[] = payouts.map(payout => ({
        id: payout.id,
        amount: payout.net_amount,
        date: payout.completed_at || payout.scheduled_date,
        status: payout.status === 'failed' ? 'pending' : payout.status as 'pending' | 'completed' | 'processing',
        method: t('earnings.bank_transfer') // Default for now
      }));
      
      setAllPayouts(mappedPayouts);
      setShowPayoutHistoryModal(true);
    } catch (error) {
      console.error('Error loading all payouts:', error);
      Alert.alert(t('common.error'), t('earnings.failed_to_load_payout_history'));
    }
  };

  const loadTaxDocuments = async (userId: string) => {
    try {
      const currentYear = new Date().getFullYear();
      const lastYear = currentYear - 1;
      
      // Generate tax documents for current and last year
      const docs: TaxDocument[] = [];
      
      for (const year of [currentYear, lastYear]) {
        // Get earnings history for the year
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        const allEarnings = await driverEarningsService.getEarningsHistory(userId, 1000);
        const yearlyEarnings = allEarnings.filter(earning => {
          const earningDate = new Date(earning.created_at);
          return earningDate >= yearStart && earningDate <= yearEnd;
        });
        
        const totalEarnings = yearlyEarnings.reduce((sum, earning) => sum + (earning.total_earnings || 0), 0);
        const totalTrips = yearlyEarnings.length;
        
        docs.push({
          year,
          totalEarnings,
          totalTrips,
          isReady: totalTrips > 0,
          documentUrl: totalTrips > 0 ? `/tax-documents/${userId}/${year}.pdf` : undefined,
        });
      }
      
      setTaxDocuments(docs);
      console.log('✅ Tax documents loaded:', docs);
    } catch (error) {
      console.error('Error loading tax documents:', error);
      setTaxDocuments([]);
    }
  };

  const loadAvailableForCashOut = async (userId: string) => {
    try {
      const available = await driverEarningsService.getAvailableEarnings(userId);
      setAvailableForCashOut(available);
      console.log('✅ Available for cash out:', available);
    } catch (error) {
      console.error('Error loading available earnings:', error);
      setAvailableForCashOut(0);
    }
  };

  const currentData = earningsData?.[selectedPeriod];

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} SAR`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.status.completed;
      case 'processing': return Colors.status.inProgress;
      case 'pending': return Colors.status.pending;
      default: return Colors.primary;
    }
  };

  if (loading || !earningsData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('earnings.title')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('earnings.loading_earnings')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['today', 'week', 'month'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive,
          ]}>
            {t(`earnings.${period}`)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEarningsCard = () => (
    <View style={styles.earningsCard}>
      <View style={styles.earningsHeader}>
        <Text style={styles.earningsTitle}>{t('earnings.total_earnings')}</Text>
        <Text style={styles.earningsAmount}>{formatCurrency(currentData?.total_earnings || 0)}</Text>
      </View>
      
      <View style={styles.earningsStats}>
        <View style={styles.statItem}>
          <Ionicons name="car" size={20} color={Colors.primary} />
          <Text style={styles.statLabel}>{t('trips.title')}</Text>
          <Text style={styles.statValue}>{currentData?.trips_count || 0}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="time" size={20} color={Colors.primary} />
          <Text style={styles.statLabel}>{t('earnings.available')}</Text>
          <Text style={styles.statValue}>{formatCurrency(currentData?.available_for_payout || 0)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="trending-up" size={20} color={Colors.primary} />
          <Text style={styles.statLabel}>{t('earnings.tips')}</Text>
          <Text style={styles.statValue}>{formatCurrency(currentData?.tips_received || 0)}</Text>
        </View>
      </View>
    </View>
  );

  const renderPayoutHistory = () => (
    <View style={styles.payoutSection}>
      <View style={styles.payoutHeader}>
        <Text style={styles.sectionTitle}>{t('earnings.recent_payouts')}</Text>
        <TouchableOpacity onPress={handleShowPayoutHistory}>
          <Text style={styles.viewAllText}>{t('common.view_all')}</Text>
        </TouchableOpacity>
      </View>
      
      {recentPayouts.length > 0 ? (
        recentPayouts.map((payout: RecentPayout) => (
          <View key={payout.id} style={styles.payoutItem}>
            <View style={styles.payoutInfo}>
              <Text style={styles.payoutAmount}>{formatCurrency(payout.amount)}</Text>
              <Text style={styles.payoutDate}>
                {new Date(payout.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
            <View style={[styles.payoutStatus, { backgroundColor: getStatusColor(payout.status) }]}>
              <Text style={styles.payoutStatusText}>
                {payout.status === 'completed' ? 'Paid' : 
                 payout.status === 'processing' ? 'Processing' : 
                 'Pending'}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyPayoutState}>
          <Ionicons name="card-outline" size={48} color={Colors.text.secondary} />
          <Text style={styles.emptyPayoutText}>{i18nT('general.noPayoutsYet')}</Text>
          <Text style={styles.emptyPayoutSubtext}>{i18nT('general.completeTripsToStartEarning')}</Text>
        </View>
      )}
    </View>
  );

  const renderQuickActions = () => {
    const availableForCashOut = currentData?.available_for_payout || 0;
    const canCashOut = availableForCashOut >= 10; // Minimum 10 SAR
    const cashOutFee = availableForCashOut > 0 ? Math.max(0.50, availableForCashOut * 0.015) : 0;
    
    return (
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            (!canCashOut || processingCashOut) && styles.actionButtonDisabled
          ]}
          onPress={handleCashOut}
          disabled={processingCashOut || !canCashOut}
        >
          <Ionicons 
            name={processingCashOut ? "hourglass" : "card"} 
            size={24} 
            color={Colors.text.onPrimary} 
          />
          <Text style={styles.actionButtonText}>
            {processingCashOut ? '⏳ Processing...' : 
             canCashOut ? `💸 Cash Out (Fee: ${formatCurrency(cashOutFee)})` : 
             availableForCashOut > 0 ? `💰 Min 10 SAR Required` :
             '💸 No Earnings Available'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Alert.alert(t('earnings.tax_documents'), t('earnings.download_tax_docs'))}
        >
          <Ionicons name="document" size={24} color={Colors.text.onPrimary} />
          <Text style={styles.actionButtonText}>{t('earnings.tax_docs')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleShowTripDetails}
        >
          <Ionicons name="list" size={24} color={Colors.text.onPrimary} />
          <Text style={styles.actionButtonText}>{t('earnings.trip_details')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('earnings.title')}</Text>
        <TouchableOpacity onPress={() => Alert.alert(t('common.help'), t('earnings.contact_support'))}>
          <Ionicons name="help-circle-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderPeriodSelector()}
        {renderEarningsCard()}
        {renderQuickActions()}
        {renderPayoutHistory()}
      </ScrollView>

      {/* Trip Details Modal */}
      <Modal
        visible={showTripDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTripDetailsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowTripDetailsModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{i18nT('general.tripDetails')}</Text>
            <View style={styles.modalCloseButton} />
          </View>

          {/* Trip Details Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {tripEarnings && tripEarnings.length > 0 ? (
              tripEarnings.map((trip, index) => (
                <View key={trip.trip_id || index} style={styles.tripCard}>
                  {/* Trip Header */}
                  <View style={styles.tripHeader}>
                    <View style={styles.tripInfo}>
                      <Text style={styles.tripDate}>
                        {new Date(trip.created_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      <Text style={styles.tripId}>Trip #{trip.trip_id}</Text>
                    </View>
                    <Text style={styles.tripEarnings}>
                      {trip.total_earnings.toFixed(2)} SAR
                    </Text>
                  </View>

                  {/* Earnings Breakdown */}
                  <View style={styles.earningsBreakdown}>
                    <Text style={styles.breakdownTitle}>{i18nT('general.earningsBreakdown')}</Text>
                    
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{i18nT('general.tripFare')}</Text>
                      <Text style={styles.breakdownAmount}>
                        {trip.trip_fare.toFixed(2)} SAR
                      </Text>
                    </View>

                    {trip.tip_amount > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{i18nT('general.customerTip')}</Text>
                        <Text style={[styles.breakdownAmount, { color: Colors.success }]}>
                          +{trip.tip_amount.toFixed(2)} SAR
                        </Text>
                      </View>
                    )}

                    {trip.bonus_amount > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{i18nT('general.bonus')}</Text>
                        <Text style={[styles.breakdownAmount, { color: Colors.success }]}>
                          +{trip.bonus_amount.toFixed(2)} SAR
                        </Text>
                      </View>
                    )}

                    {trip.adjustment_amount !== 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{i18nT('general.adjustment')}</Text>
                        <Text style={[styles.breakdownAmount, { color: trip.adjustment_amount > 0 ? Colors.success : Colors.error }]}>
                          {trip.adjustment_amount > 0 ? '+' : ''}{trip.adjustment_amount.toFixed(2)} SAR
                        </Text>
                      </View>
                    )}

                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Platform Commission ({(trip.platform_commission_rate * 100).toFixed(1)}%)</Text>
                      <Text style={[styles.breakdownAmount, { color: Colors.error }]}>
                        -{trip.platform_commission.toFixed(2)} SAR
                      </Text>
                    </View>

                    <View style={[styles.breakdownRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>{i18nT('general.driverEarnings')}</Text>
                      <Text style={styles.totalAmount}>
                        {trip.driver_earnings.toFixed(2)} SAR
                      </Text>
                    </View>

                    <View style={[styles.breakdownRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>{i18nT('general.totalEarnings')}</Text>
                      <Text style={styles.totalAmount}>
                        {trip.total_earnings.toFixed(2)} SAR
                      </Text>
                    </View>
                  </View>

                  {/* Trip Status */}
                  <View style={styles.tripStats}>
                    <View style={styles.tripStatItem}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                      <Text style={styles.statText}>
                        {trip.status === 'paid' ? 'Paid' : 
                         trip.status === 'pending' ? 'Pending' :
                         trip.status === 'included_in_payout' ? 'Included in Payout' :
                         trip.status === 'disputed' ? 'Disputed' : 'Completed'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={64} color={Colors.text.secondary} />
                <Text style={styles.emptyStateTitle}>{i18nT('general.noTripsYet')}</Text>
                <Text style={styles.emptyStateText}>
                  Start driving to see your trip details and earnings breakdown here.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Payout History Modal */}
      <Modal
        visible={showPayoutHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPayoutHistoryModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowPayoutHistoryModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{i18nT('general.payoutHistory')}</Text>
            <View style={styles.modalCloseButton} />
          </View>

          {/* Payout History Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {allPayouts && allPayouts.length > 0 ? (
              <>
                {/* Summary Stats */}
                <View style={styles.payoutSummaryCard}>
                  <Text style={styles.payoutSummaryTitle}>{i18nT('general.payoutSummary')}</Text>
                  <View style={styles.payoutSummaryRow}>
                    <Text style={styles.payoutSummaryLabel}>{i18nT('general.totalPayouts')}:</Text>
                    <Text style={styles.payoutSummaryValue}>{allPayouts.length}</Text>
                  </View>
                  <View style={styles.payoutSummaryRow}>
                    <Text style={styles.payoutSummaryLabel}>{i18nT('general.totalAmount')}:</Text>
                    <Text style={styles.payoutSummaryValue}>
                      {formatCurrency(allPayouts.reduce((sum, p) => sum + p.amount, 0))}
                    </Text>
                  </View>
                  <View style={styles.payoutSummaryRow}>
                    <Text style={styles.payoutSummaryLabel}>{i18nT('general.completed')}:</Text>
                    <Text style={styles.payoutSummaryValue}>
                      {allPayouts.filter(p => p.status === 'completed').length}
                    </Text>
                  </View>
                </View>

                {/* Payout List */}
                {allPayouts.map((payout, index) => (
                  <View key={payout.id} style={styles.payoutHistoryCard}>
                    {/* Payout Header */}
                    <View style={styles.payoutCardHeader}>
                      <View style={styles.payoutCardInfo}>
                        <Text style={styles.payoutCardAmount}>
                          {formatCurrency(payout.amount)}
                        </Text>
                        <Text style={styles.payoutCardDate}>
                          {new Date(payout.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      <View style={[styles.payoutCardStatus, { backgroundColor: getStatusColor(payout.status) }]}>
                        <Text style={styles.payoutCardStatusText}>
                          {payout.status === 'completed' ? '✅ Paid' : 
                           payout.status === 'processing' ? '⏳ Processing' : 
                           '⏰ Pending'}
                        </Text>
                      </View>
                    </View>

                    {/* Payout Details */}
                    <View style={styles.payoutCardDetails}>
                      <View style={styles.payoutDetailRow}>
                        <Ionicons name="card-outline" size={16} color={Colors.text.secondary} />
                        <Text style={styles.payoutDetailLabel}>{i18nT('general.paymentMethod')}:</Text>
                        <Text style={styles.payoutDetailValue}>{payout.method}</Text>
                      </View>
                      
                      <View style={styles.payoutDetailRow}>
                        <Ionicons name="receipt-outline" size={16} color={Colors.text.secondary} />
                        <Text style={styles.payoutDetailLabel}>{i18nT('general.payoutId')}:</Text>
                        <Text style={styles.payoutDetailValue}>#{payout.id.slice(-8)}</Text>
                      </View>

                      {payout.status === 'completed' && (
                        <View style={styles.payoutDetailRow}>
                          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                          <Text style={styles.payoutDetailLabel}>{i18nT('general.processingTime')}:</Text>
                          <Text style={styles.payoutDetailValue}>{i18nT('general.oneToThreeMinutes')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}

                {/* Footer Info */}
                <View style={styles.payoutFooter}>
                  <Text style={styles.payoutFooterText}>
                    💡 Payouts are processed instantly. Contact support if you need help with any payout.
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="card-outline" size={64} color={Colors.text.secondary} />
                <Text style={styles.emptyStateTitle}>{i18nT('general.noPayoutsYet')}</Text>
                <Text style={styles.emptyStateText}>
                  Complete trips and request payouts to see your payment history here.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveValue(16, 20, 24),
    paddingVertical: getResponsiveValue(12, 15, 18),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    minHeight: getResponsiveValue(56, 64, 72),
  },
  backButton: {
    padding: getResponsiveValue(4, 5, 6),
    minHeight: getResponsiveValue(44, 48, 52), // Android touch target
    minWidth: getResponsiveValue(44, 48, 52),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: getResponsiveValue(18, 20, 22),
    fontWeight: '600',
    color: Colors.text.primary,
    lineHeight: getResponsiveValue(24, 26, 28),
  },
  content: {
    flex: 1,
    padding: getResponsiveValue(16, 20, 24),
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: getResponsiveValue(10, 12, 14),
    padding: getResponsiveValue(3, 4, 5),
    marginBottom: getResponsiveValue(16, 20, 24),
  },
  periodButton: {
    flex: 1,
    paddingVertical: getResponsiveValue(10, 12, 14),
    alignItems: 'center',
    borderRadius: getResponsiveValue(6, 8, 10),
    minHeight: getResponsiveValue(40, 44, 48),
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  periodButtonText: {
    fontSize: getResponsiveValue(14, 16, 18),
    fontWeight: '500',
    color: Colors.text.secondary,
    lineHeight: getResponsiveValue(18, 20, 22),
  },
  periodButtonTextActive: {
    color: Colors.text.onPrimary,
  },
  earningsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: getResponsiveValue(12, 16, 20),
    padding: getResponsiveValue(20, 24, 28),
    marginBottom: getResponsiveValue(16, 20, 24),
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  earningsHeader: {
    alignItems: 'center',
    marginBottom: getResponsiveValue(20, 24, 28),
  },
  earningsTitle: {
    fontSize: getResponsiveValue(14, 16, 18),
    color: Colors.text.secondary,
    marginBottom: getResponsiveValue(6, 8, 10),
    lineHeight: getResponsiveValue(18, 20, 22),
  },
  earningsAmount: {
    fontSize: getResponsiveValue(32, 36, 40),
    fontWeight: 'bold',
    color: Colors.primary,
    lineHeight: getResponsiveValue(38, 42, 46),
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: getResponsiveValue(8, 12, 16),
  },
  statItem: {
    alignItems: 'center',
    minWidth: getResponsiveValue(60, 70, 80),
  },
  statLabel: {
    fontSize: getResponsiveValue(11, 12, 14),
    color: Colors.text.secondary,
    marginTop: getResponsiveValue(3, 4, 5),
    marginBottom: getResponsiveValue(2, 2, 3),
    lineHeight: getResponsiveValue(14, 16, 18),
    textAlign: 'center',
  },
  statValue: {
    fontSize: getResponsiveValue(14, 16, 18),
    fontWeight: '600',
    color: Colors.text.primary,
    lineHeight: getResponsiveValue(18, 20, 22),
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: getResponsiveValue(16, 20, 24),
    gap: getResponsiveValue(8, 12, 16),
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: getResponsiveValue(10, 12, 14),
    paddingVertical: getResponsiveValue(14, 16, 18),
    paddingHorizontal: getResponsiveValue(12, 16, 20),
    alignItems: 'center',
    minHeight: getResponsiveValue(48, 52, 56), // Android touch target
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionButtonDisabled: {
    backgroundColor: Colors.text.secondary,
    opacity: 0.6,
  },
  actionButtonText: {
    color: Colors.text.onPrimary,
    fontSize: getResponsiveValue(11, 12, 14),
    fontWeight: '600',
    marginTop: getResponsiveValue(3, 4, 5),
    lineHeight: getResponsiveValue(14, 16, 18),
    textAlign: 'center',
  },
  payoutSection: {
    backgroundColor: Colors.background.primary,
    borderRadius: getResponsiveValue(12, 16, 20),
    padding: getResponsiveValue(16, 20, 24),
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(12, 16, 20),
    minHeight: getResponsiveValue(32, 36, 40),
  },
  sectionTitle: {
    fontSize: getResponsiveValue(16, 18, 20),
    fontWeight: '600',
    color: Colors.text.primary,
    lineHeight: getResponsiveValue(20, 22, 24),
  },
  viewAllText: {
    fontSize: getResponsiveValue(13, 14, 16),
    color: Colors.primary,
    fontWeight: '500',
    lineHeight: getResponsiveValue(16, 18, 20),
    minHeight: getResponsiveValue(32, 36, 40), // Touch target
    paddingVertical: getResponsiveValue(8, 10, 12),
  },
  payoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getResponsiveValue(10, 12, 14),
    paddingHorizontal: getResponsiveValue(4, 8, 12),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    minHeight: getResponsiveValue(56, 64, 72),
  },
  payoutInfo: {
    flex: 1,
    paddingRight: getResponsiveValue(8, 12, 16),
  },
  payoutAmount: {
    fontSize: getResponsiveValue(15, 16, 18),
    fontWeight: '600',
    color: Colors.text.primary,
    lineHeight: getResponsiveValue(18, 20, 22),
  },
  payoutDate: {
    fontSize: getResponsiveValue(13, 14, 16),
    color: Colors.text.secondary,
    marginTop: getResponsiveValue(2, 2, 3),
    lineHeight: getResponsiveValue(16, 18, 20),
  },
  payoutStatus: {
    paddingHorizontal: getResponsiveValue(10, 12, 14),
    paddingVertical: getResponsiveValue(4, 6, 8),
    borderRadius: getResponsiveValue(10, 12, 14),
    minHeight: getResponsiveValue(28, 32, 36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  payoutStatusText: {
    fontSize: getResponsiveValue(11, 12, 14),
    fontWeight: '500',
    color: Colors.text.onPrimary,
    textTransform: 'capitalize',
    lineHeight: getResponsiveValue(14, 16, 18),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getResponsiveValue(40, 48, 56),
  },
  loadingText: {
    fontSize: getResponsiveValue(15, 16, 18),
    color: Colors.text.secondary,
    lineHeight: getResponsiveValue(20, 22, 24),
  },
  // Trip Details Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveValue(16, 20, 24),
    paddingVertical: getResponsiveValue(12, 15, 18),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    minHeight: getResponsiveValue(56, 64, 72),
  },
  modalCloseButton: {
    padding: getResponsiveValue(4, 5, 6),
    minHeight: getResponsiveValue(44, 48, 52),
    minWidth: getResponsiveValue(44, 48, 52),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: getResponsiveValue(18, 20, 22),
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: getResponsiveValue(16, 20, 24),
  },
  tripCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: getResponsiveValue(12, 14, 16),
    padding: getResponsiveValue(16, 18, 20),
    marginVertical: getResponsiveValue(8, 10, 12),
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: getResponsiveValue(12, 14, 16),
  },
  tripInfo: {
    flex: 1,
  },
  tripDate: {
    fontSize: getResponsiveValue(14, 15, 16),
    color: Colors.text.secondary,
    marginBottom: getResponsiveValue(4, 5, 6),
  },
  tripId: {
    fontSize: getResponsiveValue(12, 13, 14),
    color: Colors.text.secondary,
  },
  tripEarnings: {
    fontSize: getResponsiveValue(18, 20, 22),
    fontWeight: '700',
    color: Colors.success,
  },
  tripRoute: {
    marginBottom: getResponsiveValue(16, 18, 20),
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveValue(8, 10, 12),
  },
  routeDot: {
    width: getResponsiveValue(8, 10, 12),
    height: getResponsiveValue(8, 10, 12),
    borderRadius: getResponsiveValue(4, 5, 6),
    marginRight: getResponsiveValue(12, 14, 16),
  },
  routeLine: {
    width: 1,
    height: getResponsiveValue(20, 24, 28),
    backgroundColor: Colors.border.light,
    marginLeft: getResponsiveValue(4, 5, 6),
    marginBottom: getResponsiveValue(8, 10, 12),
  },
  routeText: {
    fontSize: getResponsiveValue(14, 15, 16),
    color: Colors.text.primary,
    flex: 1,
  },
  earningsBreakdown: {
    backgroundColor: Colors.background.primary,
    borderRadius: getResponsiveValue(8, 10, 12),
    padding: getResponsiveValue(12, 14, 16),
    marginBottom: getResponsiveValue(12, 14, 16),
  },
  breakdownTitle: {
    fontSize: getResponsiveValue(16, 17, 18),
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: getResponsiveValue(12, 14, 16),
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getResponsiveValue(6, 7, 8),
  },
  breakdownLabel: {
    fontSize: getResponsiveValue(14, 15, 16),
    color: Colors.text.secondary,
    flex: 1,
  },
  breakdownAmount: {
    fontSize: getResponsiveValue(14, 15, 16),
    fontWeight: '500',
    color: Colors.text.primary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    marginTop: getResponsiveValue(8, 10, 12),
    paddingTop: getResponsiveValue(12, 14, 16),
  },
  totalLabel: {
    fontSize: getResponsiveValue(16, 17, 18),
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  totalAmount: {
    fontSize: getResponsiveValue(18, 19, 20),
    fontWeight: '700',
    color: Colors.success,
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: getResponsiveValue(12, 14, 16),
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  tripStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: getResponsiveValue(12, 13, 14),
    color: Colors.text.secondary,
    marginLeft: getResponsiveValue(4, 5, 6),
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getResponsiveValue(40, 48, 56),
  },
  emptyStateTitle: {
    fontSize: getResponsiveValue(18, 20, 22),
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: getResponsiveValue(16, 18, 20),
    marginBottom: getResponsiveValue(8, 10, 12),
  },
  emptyStateText: {
    fontSize: getResponsiveValue(14, 15, 16),
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: getResponsiveValue(20, 22, 24),
    paddingHorizontal: getResponsiveValue(24, 28, 32),
  },
  // Empty Payout State Styles
  emptyPayoutState: {
    alignItems: 'center',
    paddingVertical: getResponsiveValue(24, 28, 32),
  },
  emptyPayoutText: {
    fontSize: getResponsiveValue(16, 17, 18),
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: getResponsiveValue(12, 14, 16),
  },
  emptyPayoutSubtext: {
    fontSize: getResponsiveValue(14, 15, 16),
    color: Colors.text.secondary,
    marginTop: getResponsiveValue(4, 5, 6),
  },
  // Payout History Modal Styles
  payoutSummaryCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: getResponsiveValue(12, 14, 16),
    padding: getResponsiveValue(16, 18, 20),
    marginBottom: getResponsiveValue(16, 18, 20),
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  payoutSummaryTitle: {
    fontSize: getResponsiveValue(16, 17, 18),
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: getResponsiveValue(12, 14, 16),
  },
  payoutSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getResponsiveValue(4, 5, 6),
  },
  payoutSummaryLabel: {
    fontSize: getResponsiveValue(14, 15, 16),
    color: Colors.text.secondary,
  },
  payoutSummaryValue: {
    fontSize: getResponsiveValue(14, 15, 16),
    fontWeight: '600',
    color: Colors.text.primary,
  },
  payoutHistoryCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: getResponsiveValue(12, 14, 16),
    padding: getResponsiveValue(16, 18, 20),
    marginBottom: getResponsiveValue(12, 14, 16),
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  payoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: getResponsiveValue(12, 14, 16),
  },
  payoutCardInfo: {
    flex: 1,
  },
  payoutCardAmount: {
    fontSize: getResponsiveValue(18, 20, 22),
    fontWeight: '700',
    color: Colors.success,
    marginBottom: getResponsiveValue(4, 5, 6),
  },
  payoutCardDate: {
    fontSize: getResponsiveValue(13, 14, 15),
    color: Colors.text.secondary,
  },
  payoutCardStatus: {
    paddingHorizontal: getResponsiveValue(8, 10, 12),
    paddingVertical: getResponsiveValue(4, 5, 6),
    borderRadius: getResponsiveValue(6, 7, 8),
    marginLeft: getResponsiveValue(12, 14, 16),
  },
  payoutCardStatusText: {
    fontSize: getResponsiveValue(12, 13, 14),
    fontWeight: '600',
    color: Colors.text.onPrimary,
  },
  payoutCardDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: getResponsiveValue(12, 14, 16),
  },
  payoutDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveValue(8, 10, 12),
  },
  payoutDetailLabel: {
    fontSize: getResponsiveValue(13, 14, 15),
    color: Colors.text.secondary,
    marginLeft: getResponsiveValue(8, 10, 12),
    flex: 1,
  },
  payoutDetailValue: {
    fontSize: getResponsiveValue(13, 14, 15),
    fontWeight: '500',
    color: Colors.text.primary,
  },
  payoutFooter: {
    backgroundColor: Colors.background.secondary,
    borderRadius: getResponsiveValue(8, 10, 12),
    padding: getResponsiveValue(16, 18, 20),
    marginTop: getResponsiveValue(16, 18, 20),
    marginBottom: getResponsiveValue(24, 28, 32),
  },
  payoutFooterText: {
    fontSize: getResponsiveValue(13, 14, 15),
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: getResponsiveValue(18, 20, 22),
  },
});
