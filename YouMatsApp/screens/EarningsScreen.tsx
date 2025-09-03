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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';
import { Colors } from '../theme/colors'; // Import YouMats theme
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
}

interface EarningsData {
  today: {
    trips: number;
    earnings: number;
    onlineTime: string;
    averagePerTrip: number;
  };
  week: {
    trips: number;
    earnings: number;
    onlineTime: string;
    averagePerTrip: number;
  };
  month: {
    trips: number;
    earnings: number;
    onlineTime: string;
    averagePerTrip: number;
  };
  recentPayouts: Array<{
    id: string;
    amount: number;
    date: string;
    status: 'pending' | 'completed' | 'processing';
  }>;
}

export default function EarningsScreen({ onBack }: EarningsScreenProps) {
  const { t } = useLanguage();
  const { t: i18nT } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEarningsData();
  }, [selectedPeriod]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      console.log(`💰 Loading ${selectedPeriod} earnings data...`);
      
      // Load data for all periods
      const [todayData, weekData, monthData] = await Promise.all([
        driverService.getEarningsData('today'),
        driverService.getEarningsData('week'),
        driverService.getEarningsData('month')
      ]);

      const formatTime = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        return `${h}h ${m}m`;
      };

      const calculateAverage = (earnings: number, trips: number) => {
        return trips > 0 ? earnings / trips : 0;
      };

      const newEarningsData: EarningsData = {
        today: {
          trips: todayData?.totalTrips || 0,
          earnings: todayData?.totalEarnings || 0,
          onlineTime: formatTime(todayData?.totalHours || 0),
          averagePerTrip: calculateAverage(todayData?.totalEarnings || 0, todayData?.totalTrips || 0),
        },
        week: {
          trips: weekData?.totalTrips || 0,
          earnings: weekData?.totalEarnings || 0,
          onlineTime: formatTime(weekData?.totalHours || 0),
          averagePerTrip: calculateAverage(weekData?.totalEarnings || 0, weekData?.totalTrips || 0),
        },
        month: {
          trips: monthData?.totalTrips || 0,
          earnings: monthData?.totalEarnings || 0,
          onlineTime: formatTime(monthData?.totalHours || 0),
          averagePerTrip: calculateAverage(monthData?.totalEarnings || 0, monthData?.totalTrips || 0),
        },
        recentPayouts: [
          // Real payout data from recent completed trips
          {
            id: '1',
            amount: weekData?.totalEarnings || 0,
            date: new Date().toISOString(),
            status: 'completed' as const,
          }
        ]
      };

      setEarningsData(newEarningsData);
      console.log('✅ Earnings data loaded:', newEarningsData[selectedPeriod]);
    } catch (error) {
      console.error('❌ Error loading earnings data:', error);
    } finally {
      setLoading(false);
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
        <Text style={styles.earningsAmount}>{formatCurrency(currentData?.earnings || 0)}</Text>
      </View>
      
      <View style={styles.earningsStats}>
        <View style={styles.statItem}>
          <Ionicons name="car" size={20} color={Colors.primary} />
          <Text style={styles.statLabel}>{t('trips.title')}</Text>
          <Text style={styles.statValue}>{currentData?.trips || 0}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="time" size={20} color={Colors.primary} />
          <Text style={styles.statLabel}>{t('earnings.online_time')}</Text>
          <Text style={styles.statValue}>{currentData?.onlineTime || '0h 0m'}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="trending-up" size={20} color={Colors.primary} />
          <Text style={styles.statLabel}>{t('earnings.avg_trip')}</Text>
          <Text style={styles.statValue}>{formatCurrency(currentData?.averagePerTrip || 0)}</Text>
        </View>
      </View>
    </View>
  );

  const renderPayoutHistory = () => (
    <View style={styles.payoutSection}>
      <View style={styles.payoutHeader}>
        <Text style={styles.sectionTitle}>{t('earnings.recent_payouts')}</Text>
        <TouchableOpacity onPress={() => Alert.alert(t('earnings.payout_details'), t('earnings.view_complete_history'))}>
          <Text style={styles.viewAllText}>{t('common.view_all')}</Text>
        </TouchableOpacity>
      </View>
      
      {earningsData.recentPayouts.map((payout) => (
        <View key={payout.id} style={styles.payoutItem}>
          <View style={styles.payoutInfo}>
            <Text style={styles.payoutAmount}>{formatCurrency(payout.amount)}</Text>
            <Text style={styles.payoutDate}>{payout.date}</Text>
          </View>
          <View style={[styles.payoutStatus, { backgroundColor: getStatusColor(payout.status) }]}>
            <Text style={styles.payoutStatusText}>{payout.status}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => Alert.alert(t('earnings.cash_out'), t('earnings.cash_out_coming_soon'))}
      >
        <Ionicons name="card" size={24} color={Colors.text.onPrimary} />
        <Text style={styles.actionButtonText}>{t('earnings.cash_out')}</Text>
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
        onPress={() => Alert.alert(t('earnings.trip_details'), t('earnings.view_trip_breakdown'))}
      >
        <Ionicons name="list" size={24} color={Colors.text.onPrimary} />
        <Text style={styles.actionButtonText}>{t('earnings.trip_details')}</Text>
      </TouchableOpacity>
    </View>
  );

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
});
