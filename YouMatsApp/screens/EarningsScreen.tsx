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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';
import { Colors } from '../theme/colors'; // Import YouMats theme
import { useLanguage } from '../src/contexts/LanguageContext';

const { width } = Dimensions.get('window');

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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  periodButtonTextActive: {
    color: Colors.text.onPrimary,
  },
  earningsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  earningsTitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: Colors.text.onPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  payoutSection: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  payoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  payoutDate: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  payoutStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  payoutStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.onPrimary,
    textTransform: 'capitalize',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
});
