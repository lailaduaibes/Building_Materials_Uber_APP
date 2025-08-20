/**
 * DriverEarningsScreen - Uber-style Earnings and Analytics Dashboard
 * Detailed earnings breakdown, performance metrics, and goal tracking
 * Black & White Theme
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Driver, DriverStats, driverService } from '../services/DriverService';

const { width, height } = Dimensions.get('window');

// Black & White Theme (matching customer app)
const theme = {
  primary: '#000000',
  secondary: '#333333',
  accent: '#666666',
  background: '#FFFFFF',
  white: '#FFFFFF',
  text: '#000000',
  lightText: '#666666',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  border: '#E0E0E0',
};

interface Props {
  driver: Driver;
  onBack: () => void;
}

const DriverEarningsScreen: React.FC<Props> = ({ driver, onBack }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(500); // $500 weekly goal
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = async () => {
    try {
      const driverStats = await driverService.getDriverStats();
      setStats(driverStats);
    } catch (error) {
      console.error('Error loading earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPeriodData = () => {
    if (!stats) return { earnings: 0, deliveries: 0, hours: 0 };
    
    switch (selectedPeriod) {
      case 'today':
        return {
          earnings: stats.today.earnings,
          deliveries: stats.today.deliveries,
          hours: stats.today.hoursWorked,
        };
      case 'week':
        return {
          earnings: stats.thisWeek.earnings,
          deliveries: stats.thisWeek.deliveries,
          hours: stats.thisWeek.hoursWorked,
        };
      case 'month':
        return {
          earnings: stats.thisMonth.earnings,
          deliveries: stats.thisMonth.deliveries,
          hours: stats.thisMonth.hoursWorked,
        };
    }
  };

  const getGoalProgress = () => {
    if (!stats) return 0;
    return Math.min((stats.thisWeek.earnings / weeklyGoal) * 100, 100);
  };

  const getAveragePerHour = () => {
    const data = getCurrentPeriodData();
    return data.hours > 0 ? data.earnings / data.hours : 0;
  };

  const getAveragePerDelivery = () => {
    const data = getCurrentPeriodData();
    return data.deliveries > 0 ? data.earnings / data.deliveries : 0;
  };

  const periodData = getCurrentPeriodData();
  const goalProgress = getGoalProgress();

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading earnings data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['today', 'week', 'month'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Earnings Display */}
        <View style={styles.mainEarningsCard}>
          <Text style={styles.earningsAmount}>${periodData.earnings.toFixed(2)}</Text>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          
          <View style={styles.earningsBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>{periodData.deliveries}</Text>
              <Text style={styles.breakdownLabel}>Deliveries</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>{periodData.hours.toFixed(1)}h</Text>
              <Text style={styles.breakdownLabel}>Online Time</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>${getAveragePerHour().toFixed(2)}</Text>
              <Text style={styles.breakdownLabel}>Per Hour</Text>
            </View>
          </View>
        </View>

        {/* Weekly Goal Progress (only show for week/month) */}
        {selectedPeriod !== 'today' && (
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>Weekly Goal</Text>
              <Text style={styles.goalAmount}>${stats?.thisWeek.earnings.toFixed(2)} / ${weeklyGoal}</Text>
            </View>
            
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${goalProgress}%` }]} />
            </View>
            
            <Text style={styles.goalProgress}>
              {goalProgress.toFixed(0)}% Complete • ${(weeklyGoal - (stats?.thisWeek.earnings || 0)).toFixed(2)} to go
            </Text>
          </View>
        )}

        {/* Performance Metrics */}
        <View style={styles.metricsCard}>
          <Text style={styles.cardTitle}>Performance Metrics</Text>
          
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Ionicons name="star" size={20} color={theme.warning} />
              <Text style={styles.metricValue}>{driver.rating.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
            
            <View style={styles.metricItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
              <Text style={styles.metricValue}>98%</Text>
              <Text style={styles.metricLabel}>Accept Rate</Text>
            </View>
            
            <View style={styles.metricItem}>
              <Ionicons name="time" size={20} color={theme.primary} />
              <Text style={styles.metricValue}>${getAveragePerDelivery().toFixed(2)}</Text>
              <Text style={styles.metricLabel}>Per Trip</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity Summary */}
        <View style={styles.activityCard}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="today" size={20} color={theme.success} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Best Day This Week</Text>
              <Text style={styles.activitySubtitle}>Tuesday - $85.50 in 6 hours</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="trending-up" size={20} color={theme.primary} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Earnings Trend</Text>
              <Text style={styles.activitySubtitle}>+12% vs last week</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="trophy" size={20} color={theme.warning} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Achievement</Text>
              <Text style={styles.activitySubtitle}>Completed 50 deliveries!</Text>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsCard}>
          <Text style={styles.cardTitle}>Earnings Tips</Text>
          
          <View style={styles.tipItem}>
            <Ionicons name="bulb" size={16} color={theme.warning} />
            <Text style={styles.tipText}>Work during peak hours (7-9 AM, 5-7 PM) for higher demand</Text>
          </View>
          
          <View style={styles.tipItem}>
            <Ionicons name="location" size={16} color={theme.primary} />
            <Text style={styles.tipText}>Stay near construction sites and hardware stores for more orders</Text>
          </View>
          
          <View style={styles.tipItem}>
            <Ionicons name="people" size={16} color={theme.success} />
            <Text style={styles.tipText}>Maintain high ratings to receive more delivery requests</Text>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.lightText,
  },
  header: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.white,
  },
  headerSpace: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: theme.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.lightText,
  },
  periodButtonTextActive: {
    color: theme.white,
  },
  mainEarningsCard: {
    backgroundColor: theme.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.success,
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 16,
    color: theme.lightText,
    marginBottom: 24,
  },
  earningsBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: theme.lightText,
  },
  goalCard: {
    backgroundColor: theme.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
  },
  goalAmount: {
    fontSize: 14,
    color: theme.lightText,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.border,
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.success,
    borderRadius: 4,
  },
  goalProgress: {
    fontSize: 14,
    color: theme.lightText,
    textAlign: 'center',
  },
  metricsCard: {
    backgroundColor: theme.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.lightText,
  },
  activityCard: {
    backgroundColor: theme.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.primary,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: theme.lightText,
  },
  tipsCard: {
    backgroundColor: theme.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: theme.lightText,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default DriverEarningsScreen;
