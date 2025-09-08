import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableNativeFeedback,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { authService } from '../AuthServiceSupabase';
import { driverEarningsService, EarningsBreakdown } from '../services/DriverEarningsService';
import { weeklyPayoutService, PayoutSchedule } from '../services/WeeklyPayoutService';
import { bankAccountService, BankAccount } from '../services/BankAccountService';
import BankAccountSetupModal from '../components/BankAccountSetupModal';

// Get screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isSmallScreen = screenWidth < 375;

// Get the authenticated Supabase client
const supabase = authService.getSupabaseClient();

interface EarningsData {
  today: number;
  week: number;
  month: number;
  total: number;
  available_for_payout: number;
  pending_earnings: number;
  trips_count: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  bank_name?: string;
  account_number_last4?: string;
  account_holder_name?: string;
  is_default: boolean;
  is_verified: boolean;
  is_active: boolean;
  nickname?: string;
  created_at: string;
}

interface RecentPayout {
  id: string;
  amount: number;
  net_amount: number;
  status: string;
  payout_type: string;
  created_at: string;
  processed_at?: string;
}

interface ProfessionalDriverPaymentDashboardProps {
  onBack?: () => void;
}

const ProfessionalDriverPaymentDashboard: React.FC<ProfessionalDriverPaymentDashboardProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [nextPayoutDate, setNextPayoutDate] = useState<string>('');
  const [hasAutomaticPayouts, setHasAutomaticPayouts] = useState(false);
  const [showBankSetup, setShowBankSetup] = useState(false);
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    available_for_payout: 0,
    pending_earnings: 0,
    trips_count: { today: 0, week: 0, month: 0, total: 0 }
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<RecentPayout[]>([]);
  const [activeTab, setActiveTab] = useState<'earnings' | 'methods' | 'history'>('earnings');

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
      await loadAllPaymentData(currentUser.id);
    } catch (error) {
      console.error('Error initializing payment data:', error);
      Alert.alert('Error', 'Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const loadAllPaymentData = async (userId: string) => {
    await Promise.all([
      loadEarningsData(userId),
      loadPaymentMethods(userId),
      loadRecentPayouts(userId),
      loadPayoutInfo(userId)
    ]);
  };

  const loadPayoutInfo = async (userId: string) => {
    try {
      // Get next payout date
      const nextPayout = weeklyPayoutService.getFormattedNextPayoutDate();
      setNextPayoutDate(nextPayout);

      // Check if automatic payouts are enabled
      const hasAuto = await weeklyPayoutService.hasAutomaticPayoutsEnabled(userId);
      setHasAutomaticPayouts(hasAuto);
    } catch (error) {
      console.error('Error loading payout info:', error);
      setNextPayoutDate('Not available');
      setHasAutomaticPayouts(false);
    }
  };

  const loadEarningsData = async (userId: string) => {
    try {
      // Use the professional earnings service
      const earningsBreakdown = await driverEarningsService.getEarningsBreakdown(userId);
      const availableEarnings = await driverEarningsService.getAvailableEarnings(userId);

      // Convert the breakdown to our interface format
      const earningsData = {
        today: earningsBreakdown.today.total_earnings,
        week: earningsBreakdown.week.total_earnings,
        month: earningsBreakdown.month.total_earnings,
        total: earningsBreakdown.total.total_earnings,
        available_for_payout: availableEarnings,
        pending_earnings: earningsBreakdown.total.pending_earnings,
        trips_count: {
          today: earningsBreakdown.today.trips_count,
          week: earningsBreakdown.week.trips_count,
          month: earningsBreakdown.month.trips_count,
          total: earningsBreakdown.total.trips_count
        }
      };

      setEarnings(earningsData);
    } catch (error) {
      console.error('Error loading earnings data:', error);
      throw error;
    }
  };

  const loadPaymentMethods = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('driver_payment_methods')
        .select('*')
        .eq('driver_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      throw error;
    }
  };

  const loadRecentPayouts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('driver_payouts')
        .select('*')
        .eq('driver_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentPayouts(data || []);
    } catch (error) {
      console.error('Error loading recent payouts:', error);
      throw error;
    }
  };

  const onRefresh = async () => {
    if (!currentUserId) return;
    setRefreshing(true);
    try {
      await loadAllPaymentData(currentUserId);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const requestInstantPayout = async () => {
    if (!currentUserId || earnings.available_for_payout <= 0) {
      Alert.alert('No Earnings', 'You have no earnings available for payout');
      return;
    }

    const defaultMethod = paymentMethods.find(m => m.is_default);
    if (!defaultMethod) {
      Alert.alert('No Payment Method', 'Please add a payment method first');
      return;
    }

    // Calculate fees using the service
    const percentageFee = earnings.available_for_payout * 0.015; // 1.5%
    const processingFee = Math.max(0.50, percentageFee);
    const netAmount = earnings.available_for_payout - processingFee;

    Alert.alert(
      'Instant Payout',
      `Request instant payout of $${earnings.available_for_payout.toFixed(2)}?\n\nInstant payout fee: $${processingFee.toFixed(2)}\nYou'll receive: $${netAmount.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Request Payout', 
          onPress: async () => {
            try {
              setLoading(true);
              
              const payout = await weeklyPayoutService.requestInstantPayout(currentUserId, defaultMethod.id);
              
              if (payout) {
                Alert.alert(
                  'Payout Requested!', 
                  `Your instant payout of $${payout.net_amount.toFixed(2)} has been requested and will arrive within 30 minutes.`
                );
                await loadAllPaymentData(currentUserId);
              } else {
                Alert.alert('Payout Failed', 'Unable to process instant payout. Please try again.');
              }
            } catch (error) {
              console.error('Error requesting instant payout:', error);
              Alert.alert('Error', 'Failed to request instant payout');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const addBankAccount = () => {
    setShowBankSetup(true);
  };

  const handleBankAccountAdded = (bankAccount: BankAccount) => {
    // Refresh payment methods
    if (currentUserId) {
      loadAllPaymentData(currentUserId);
    }
  };

  const viewTripHistory = async () => {
    if (!currentUserId) return;

    try {
      const tripEarnings = await driverEarningsService.getDriverTripEarnings(currentUserId);
      
      if (tripEarnings.length === 0) {
        Alert.alert(
          'No Trip History', 
          'You haven\'t completed any trips yet. Earnings are automatically recorded when you complete deliveries.'
        );
        return;
      }

      // Show recent trip earnings
      const recentTrips = tripEarnings.slice(0, 5);
      const tripDetails = recentTrips.map(trip => 
        `Trip ${trip.trip_id.slice(-8)}: $${trip.total_earnings.toFixed(2)}`
      ).join('\n');

      Alert.alert(
        'Recent Trip Earnings',
        `Your last ${recentTrips.length} completed trips:\n\n${tripDetails}\n\nNote: Earnings are automatically recorded when you mark deliveries as completed.`
      );
    } catch (error) {
      console.error('Error viewing trip history:', error);
      Alert.alert('Error', 'Failed to load trip history');
    }
  };

  const renderEarningsTab = () => {
    // Show helpful message if no earnings yet
    if (earnings.total === 0) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.emptyEarningsState}>
            <Ionicons name="car-sport-outline" size={64} color={Colors.text.secondary} />
            <Text style={styles.emptyEarningsTitle}>No Earnings Yet</Text>
            <Text style={styles.emptyEarningsText}>
              Complete your first delivery to start earning!{'\n\n'}
              Earnings are automatically calculated when you mark deliveries as "delivered" in the driver app.
            </Text>
            <View style={styles.earningsInfoBox}>
              <Text style={styles.earningsInfoTitle}>How it works:</Text>
              <Text style={styles.earningsInfoText}>
                • You keep 85% of delivery fee{'\n'}
                • Platform takes 15% commission{'\n'}
                • You get 100% of tips{'\n'}
                • Weekly payouts every Tuesday{'\n'}
                • Instant payout available anytime
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.earningsGrid}>
          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>Today</Text>
            <Text style={styles.earningsAmount}>${earnings.today.toFixed(2)}</Text>
            <Text style={styles.earningsTrips}>{earnings.trips_count.today} trips</Text>
          </View>
          
          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>This Week</Text>
            <Text style={styles.earningsAmount}>${earnings.week.toFixed(2)}</Text>
            <Text style={styles.earningsTrips}>{earnings.trips_count.week} trips</Text>
          </View>
          
          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>This Month</Text>
            <Text style={styles.earningsAmount}>${earnings.month.toFixed(2)}</Text>
            <Text style={styles.earningsTrips}>{earnings.trips_count.month} trips</Text>
          </View>
          
          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>Total Lifetime</Text>
            <Text style={styles.earningsAmount}>${earnings.total.toFixed(2)}</Text>
            <Text style={styles.earningsTrips}>{earnings.trips_count.total} trips</Text>
          </View>
        </View>

        {/* Next Payout Information */}
        <View style={styles.nextPayoutCard}>
          <View style={styles.nextPayoutHeader}>
            <Ionicons name="calendar" size={20} color={Colors.primary} />
            <Text style={styles.nextPayoutTitle}>Next Automatic Payout</Text>
          </View>
          <Text style={styles.nextPayoutDate}>{nextPayoutDate}</Text>
          <Text style={styles.nextPayoutSubtext}>
            {hasAutomaticPayouts 
              ? 'Automatic weekly payouts enabled' 
              : 'Add a payment method to enable automatic payouts'
            }
          </Text>
        </View>

        <View style={styles.payoutSection}>
          <View style={styles.availableEarnings}>
            <Ionicons name="wallet" size={24} color={Colors.primary} />
            <View style={styles.availableEarningsText}>
              <Text style={styles.availableAmount}>${earnings.available_for_payout.toFixed(2)}</Text>
              <Text style={styles.availableLabel}>Available for Payout</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.payoutButton,
              earnings.available_for_payout <= 0 && styles.payoutButtonDisabled
            ]}
            onPress={requestInstantPayout}
            disabled={earnings.available_for_payout <= 0}
          >
            <Ionicons name="flash" size={20} color="white" />
            <Text style={styles.payoutButtonText}>Instant Payout</Text>
          </TouchableOpacity>

          {/* View Trip History Button */}
          <TouchableOpacity 
            style={styles.tripHistoryButton}
            onPress={viewTripHistory}
          >
            <Ionicons name="list" size={20} color={Colors.primary} />
            <Text style={styles.tripHistoryButtonText}>View Trip History</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPaymentMethodsTab = () => (
    <View style={styles.tabContent}>
      {paymentMethods.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={48} color={Colors.text.secondary} />
          <Text style={styles.emptyStateText}>No payment methods added</Text>
          <Text style={styles.emptyStateSubtext}>Add a bank account to receive payouts</Text>
        </View>
      ) : (
        <ScrollView>
          {paymentMethods.map((method) => (
            <View key={method.id} style={styles.paymentMethodCard}>
              <View style={styles.paymentMethodHeader}>
                <Ionicons 
                  name={method.type === 'bank_account' ? 'business' : 'card'} 
                  size={Platform.OS === 'android' ? 28 : 24} 
                  color={Colors.primary} 
                />
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodName}>
                    {method.nickname || method.bank_name || 'Payment Method'}
                  </Text>
                  <Text style={styles.paymentMethodDetails}>
                    {method.type === 'bank_account' 
                      ? `****${method.account_number_last4}` 
                      : 'Payment Account'
                    }
                  </Text>
                </View>
                <View style={styles.paymentMethodBadges}>
                  {method.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                  {method.is_verified ? (
                    <View style={styles.verifiedBadge}>
                      <Ionicons 
                        name="checkmark-circle" 
                        size={Platform.OS === 'android' ? 18 : 16} 
                        color={Colors.status.completed} 
                      />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Ionicons 
                        name="time-outline" 
                        size={Platform.OS === 'android' ? 18 : 16} 
                        color="#F59E0B" 
                      />
                      <Text style={styles.pendingBadgeText}>Pending Verification</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      
      {Platform.OS === 'android' ? (
        <TouchableNativeFeedback 
          onPress={addBankAccount}
          background={TouchableNativeFeedback.Ripple(`${Colors.primary}20`, false)}
        >
          <View style={styles.addMethodButton}>
            <Ionicons name="add" size={24} color={Colors.primary} />
            <Text style={styles.addMethodText}>Add Bank Account</Text>
          </View>
        </TouchableNativeFeedback>
      ) : (
        <TouchableOpacity style={styles.addMethodButton} onPress={addBankAccount}>
          <Ionicons name="add" size={24} color={Colors.primary} />
          <Text style={styles.addMethodText}>Add Bank Account</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      {recentPayouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color={Colors.text.secondary} />
          <Text style={styles.emptyStateText}>No payout history</Text>
          <Text style={styles.emptyStateSubtext}>Your payout history will appear here</Text>
        </View>
      ) : (
        <ScrollView>
          {recentPayouts.map((payout) => (
            <View key={payout.id} style={styles.payoutHistoryCard}>
              <View style={styles.payoutHistoryHeader}>
                <View style={styles.payoutHistoryInfo}>
                  <Text style={styles.payoutHistoryAmount}>${payout.net_amount.toFixed(2)}</Text>
                  <Text style={styles.payoutHistoryDate}>
                    {new Date(payout.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.payoutHistoryStatus}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(payout.status) }
                  ]}>
                    <Text style={styles.statusBadgeText}>{payout.status}</Text>
                  </View>
                  <Text style={styles.payoutType}>{payout.payout_type}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Colors.status.completed;
      case 'pending': return Colors.status.pending;
      case 'processing': return Colors.primary;
      case 'failed': return Colors.error;
      default: return Colors.text.secondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading payment information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Driver Payments</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {Platform.OS === 'android' ? (
          <>
            <TouchableNativeFeedback 
              onPress={() => setActiveTab('earnings')}
              background={TouchableNativeFeedback.Ripple(`${Colors.primary}20`, false)}
            >
              <View style={[styles.tab, activeTab === 'earnings' && styles.activeTab]}>
                <Text style={[styles.tabText, activeTab === 'earnings' && styles.activeTabText]}>
                  Earnings
                </Text>
              </View>
            </TouchableNativeFeedback>
            <TouchableNativeFeedback 
              onPress={() => setActiveTab('methods')}
              background={TouchableNativeFeedback.Ripple(`${Colors.primary}20`, false)}
            >
              <View style={[styles.tab, activeTab === 'methods' && styles.activeTab]}>
                <Text style={[styles.tabText, activeTab === 'methods' && styles.activeTabText]}>
                  Payment Methods
                </Text>
              </View>
            </TouchableNativeFeedback>
            <TouchableNativeFeedback 
              onPress={() => setActiveTab('history')}
              background={TouchableNativeFeedback.Ripple(`${Colors.primary}20`, false)}
            >
              <View style={[styles.tab, styles.lastTab, activeTab === 'history' && styles.activeTab]}>
                <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                  History
                </Text>
              </View>
            </TouchableNativeFeedback>
          </>
        ) : (
          <>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'earnings' && styles.activeTab]}
              onPress={() => setActiveTab('earnings')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'earnings' && styles.activeTabText]}>
                Earnings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'methods' && styles.activeTab]}
              onPress={() => setActiveTab('methods')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'methods' && styles.activeTabText]}>
                Payment Methods
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'history' && styles.activeTab]}
              onPress={() => setActiveTab('history')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                History
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'earnings' && renderEarningsTab()}
        {activeTab === 'methods' && renderPaymentMethodsTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </ScrollView>

      {/* Bank Account Setup Modal */}
      <BankAccountSetupModal
        visible={showBankSetup}
        onClose={() => setShowBankSetup(false)}
        onSuccess={handleBankAccountAdded}
        driverId={currentUserId || ''}
      />
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
    fontSize: 16,
    color: Colors.text.secondary,
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  refreshButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: Platform.OS === 'android' ? 0 : 1,
    borderBottomColor: Colors.border.light,
    // Ensure proper spacing on different screen sizes
    paddingHorizontal: isTablet ? 32 : 0,
    // Android Material Design shadow
    ...(Platform.OS === 'android' && {
      elevation: 2,
      shadowColor: '#000',
    }),
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    }),
  },
  tab: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 16 : (isSmallScreen ? 12 : 16),
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'android' ? 56 : 48, // Material Design touch target
    position: 'relative',
    // Better visual feedback on Android
    ...(Platform.OS === 'android' && {
      borderRadius: 0,
      overflow: 'hidden',
    }),
    // Add subtle dividers between tabs on Android
    ...(Platform.OS === 'android' && {
      borderRightWidth: 0.5,
      borderRightColor: `${Colors.border.light}50`,
    }),
  },
  lastTab: {
    // Remove right border from last tab
    ...(Platform.OS === 'android' && {
      borderRightWidth: 0,
    }),
  },
  activeTab: {
    borderBottomWidth: Platform.OS === 'android' ? 3 : 2,
    borderBottomColor: Colors.primary,
    // Android Material Design ripple effect
    ...(Platform.OS === 'android' && {
      backgroundColor: `${Colors.primary}10`, // 10% opacity background
    }),
  },
  tabText: {
    fontSize: Platform.OS === 'android' ? 14 : (isSmallScreen ? 14 : 16),
    color: Colors.text.secondary,
    textAlign: 'center',
    fontWeight: Platform.OS === 'android' ? '500' : 'normal',
    // Better text styling for Android
    ...(Platform.OS === 'android' && {
      letterSpacing: 0.5,
      textTransform: 'uppercase' as 'uppercase',
    }),
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: Platform.OS === 'android' ? '700' : '600',
    // Enhanced active text for Android
    ...(Platform.OS === 'android' && {
      fontSize: 14,
      letterSpacing: 0.5,
    }),
  },
  content: {
    flex: 1,
    backgroundColor: Platform.OS === 'android' ? Colors.background.primary : Colors.background.secondary,
  },
  tabContent: {
    padding: isTablet ? 24 : isSmallScreen ? 12 : 16,
    // Better spacing for Android
    ...(Platform.OS === 'android' && {
      paddingTop: 20,
      backgroundColor: Colors.background.primary,
    }),
  },
  earningsGrid: {
    flexDirection: isTablet ? 'row' : 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: isSmallScreen ? 8 : 12,
  },
  earningsCard: {
    flex: isTablet ? 0 : 1,
    width: isTablet ? (screenWidth - 64) / 4 : undefined,
    minWidth: isTablet ? 150 : '45%',
    backgroundColor: Colors.background.secondary,
    padding: isSmallScreen ? 12 : 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    // Add shadow for better visual separation
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
  earningsLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: isTablet ? 24 : isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  earningsTrips: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  payoutSection: {
    backgroundColor: Colors.background.secondary,
    padding: isSmallScreen ? 16 : 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 16,
    // Add shadow for better visual hierarchy
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
  availableEarnings: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  availableEarningsText: {
    marginLeft: 12,
    flex: 1,
  },
  availableAmount: {
    fontSize: isTablet ? 28 : isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  availableLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: Colors.text.secondary,
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: isSmallScreen ? 14 : 16,
    borderRadius: 8,
    gap: 8,
  },
  payoutButtonDisabled: {
    backgroundColor: Colors.text.secondary,
    opacity: 0.6,
  },
  payoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 56 : 48,
    paddingHorizontal: Platform.OS === 'android' ? 24 : 16,
  },
  emptyStateText: {
    fontSize: Platform.OS === 'android' ? 20 : 18,
    fontWeight: Platform.OS === 'android' ? '700' : '600',
    color: Colors.text.primary,
    marginTop: Platform.OS === 'android' ? 20 : 16,
    marginBottom: Platform.OS === 'android' ? 12 : 8,
    textAlign: 'center',
    letterSpacing: Platform.OS === 'android' ? 0.2 : 0,
  },
  emptyStateSubtext: {
    fontSize: Platform.OS === 'android' ? 15 : 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? 22 : 20,
    letterSpacing: Platform.OS === 'android' ? 0.1 : 0,
  },
  paymentMethodCard: {
    backgroundColor: Colors.background.secondary,
    padding: Platform.OS === 'android' ? 16 : (isSmallScreen ? 14 : 16),
    borderRadius: Platform.OS === 'android' ? 8 : 12,
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: Colors.border.light,
    marginBottom: Platform.OS === 'android' ? 16 : 12,
    marginHorizontal: Platform.OS === 'android' ? 4 : 0,
    // Add shadow for better visual separation
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
    }),
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Platform.OS === 'android' ? 56 : 48,
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: Platform.OS === 'android' ? 16 : 12,
    paddingRight: 8,
  },
  paymentMethodName: {
    fontSize: Platform.OS === 'android' ? 16 : (isSmallScreen ? 14 : 16),
    fontWeight: Platform.OS === 'android' ? '600' : '600',
    color: Colors.text.primary,
    marginBottom: Platform.OS === 'android' ? 4 : 2,
    letterSpacing: Platform.OS === 'android' ? 0.1 : 0,
  },
  paymentMethodDetails: {
    fontSize: Platform.OS === 'android' ? 14 : (isSmallScreen ? 12 : 14),
    color: Colors.text.secondary,
    letterSpacing: Platform.OS === 'android' ? 0.1 : 0,
  },
  paymentMethodBadges: {
    flexDirection: Platform.OS === 'android' ? 'column' : 'row',
    alignItems: Platform.OS === 'android' ? 'flex-end' : 'center',
    gap: Platform.OS === 'android' ? 6 : 8,
  },
  defaultBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 8,
    paddingVertical: Platform.OS === 'android' ? 6 : 4,
    borderRadius: Platform.OS === 'android' ? 16 : 12,
    minWidth: Platform.OS === 'android' ? 60 : undefined,
    alignItems: 'center',
  },
  defaultBadgeText: {
    color: 'white',
    fontSize: Platform.OS === 'android' ? 12 : 12,
    fontWeight: Platform.OS === 'android' ? '700' : '600',
    textAlign: 'center',
    letterSpacing: Platform.OS === 'android' ? 0.5 : 0,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.completed + '20',
    paddingHorizontal: Platform.OS === 'android' ? 10 : 8,
    paddingVertical: Platform.OS === 'android' ? 6 : 4,
    borderRadius: Platform.OS === 'android' ? 16 : 12,
    gap: Platform.OS === 'android' ? 6 : 4,
    minWidth: Platform.OS === 'android' ? 80 : undefined,
    justifyContent: 'center',
  },
  verifiedBadgeText: {
    color: Colors.status.completed,
    fontSize: Platform.OS === 'android' ? 12 : 12,
    fontWeight: Platform.OS === 'android' ? '700' : '600',
    letterSpacing: Platform.OS === 'android' ? 0.3 : 0,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Platform.OS === 'android' ? 10 : 8,
    paddingVertical: Platform.OS === 'android' ? 6 : 4,
    borderRadius: Platform.OS === 'android' ? 16 : 12,
    gap: Platform.OS === 'android' ? 6 : 4,
    minWidth: Platform.OS === 'android' ? 120 : undefined,
    justifyContent: 'center',
  },
  pendingBadgeText: {
    color: '#92400E',
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: Platform.OS === 'android' ? '700' : '600',
    letterSpacing: Platform.OS === 'android' ? 0.3 : 0,
  },
  addMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Platform.OS === 'android' ? Colors.background.secondary : Colors.background.secondary,
    padding: Platform.OS === 'android' ? 18 : 16,
    borderRadius: Platform.OS === 'android' ? 8 : 12,
    borderWidth: Platform.OS === 'android' ? 1 : 2,
    borderColor: Colors.primary,
    borderStyle: Platform.OS === 'android' ? 'solid' : 'dashed',
    marginTop: Platform.OS === 'android' ? 20 : 16,
    marginHorizontal: Platform.OS === 'android' ? 4 : 0,
    gap: Platform.OS === 'android' ? 10 : 8,
    minHeight: Platform.OS === 'android' ? 56 : undefined,
    // Add elevation for Android
    ...(Platform.OS === 'android' && {
      elevation: 1,
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    }),
  },
  addMethodText: {
    color: Colors.primary,
    fontSize: Platform.OS === 'android' ? 16 : 16,
    fontWeight: Platform.OS === 'android' ? '700' : '600',
    letterSpacing: Platform.OS === 'android' ? 0.5 : 0,
  },
  payoutHistoryCard: {
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 12,
  },
  payoutHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutHistoryInfo: {
    flex: 1,
  },
  payoutHistoryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  payoutHistoryDate: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  payoutHistoryStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  payoutType: {
    fontSize: 12,
    color: Colors.text.secondary,
    textTransform: 'capitalize',
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 12,
    gap: 8,
  },
  simulateButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  tripHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 12,
    gap: 8,
  },
  tripHistoryButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyEarningsState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyEarningsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyEarningsText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  earningsInfoBox: {
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    width: '100%',
  },
  earningsInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  earningsInfoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  nextPayoutCard: {
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  nextPayoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  nextPayoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  nextPayoutDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  nextPayoutSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});

export default ProfessionalDriverPaymentDashboard;
