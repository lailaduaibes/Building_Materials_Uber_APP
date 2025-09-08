/**
 * WeeklyPayoutService - Handles automatic weekly payouts to drivers
 * Follows Uber-style weekly payout system (every Tuesday)
 */

import { authService } from '../AuthServiceSupabase';
import { Alert } from 'react-native';

// Get the authenticated Supabase client
const supabase = authService.getSupabaseClient();

export interface PayoutSchedule {
  id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  total_earnings: number;
  platform_fee: number;
  processing_fee: number;
  net_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_method_id: string;
  scheduled_date: string;
  processed_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface InstantPayoutRequest {
  driver_id: string;
  amount: number;
  processing_fee: number;
  net_amount: number;
  payment_method_id: string;
}

class WeeklyPayoutService {
  /**
   * Calculate next Tuesday payout date
   */
  getNextPayoutDate(): Date {
    const today = new Date();
    const nextTuesday = new Date();
    
    // Calculate days until next Tuesday (2 = Tuesday)
    const daysUntilTuesday = (2 - today.getDay() + 7) % 7;
    const finalDays = daysUntilTuesday === 0 ? 7 : daysUntilTuesday; // If today is Tuesday, next Tuesday
    
    nextTuesday.setDate(today.getDate() + finalDays);
    nextTuesday.setHours(9, 0, 0, 0); // 9 AM payout time
    
    return nextTuesday;
  }

  /**
   * Get the current payout period (Monday to Sunday)
   */
  getCurrentPayoutPeriod(): { start: Date; end: Date } {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate start of week (Monday)
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    // Calculate end of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { start: weekStart, end: weekEnd };
  }

  /**
   * Get driver's pending earnings for current period
   */
  async getPendingEarningsForPayout(driverId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('driver_earnings')
        .select('total_earnings')
        .eq('driver_id', driverId)
        .eq('status', 'pending');

      if (error) throw error;

      return data?.reduce((sum, earning) => sum + (earning.total_earnings || 0), 0) || 0;
    } catch (error) {
      console.error('Error getting pending earnings:', error);
      return 0;
    }
  }

  /**
   * Schedule weekly payout for a driver
   */
  async scheduleWeeklyPayout(driverId: string, paymentMethodId: string): Promise<PayoutSchedule | null> {
    try {
      const pendingAmount = await this.getPendingEarningsForPayout(driverId);
      
      if (pendingAmount <= 0) {
        console.log('No pending earnings for payout');
        return null;
      }

      const period = this.getCurrentPayoutPeriod();
      const nextPayoutDate = this.getNextPayoutDate();
      
      // Calculate fees
      const platformFee = 0; // No additional platform fee for weekly payouts
      const processingFee = 0; // Free weekly payouts
      const netAmount = pendingAmount - platformFee - processingFee;

      const payoutData = {
        driver_id: driverId,
        period_start: period.start.toISOString(),
        period_end: period.end.toISOString(),
        total_earnings: pendingAmount,
        platform_fee: platformFee,
        processing_fee: processingFee,
        net_amount: netAmount,
        status: 'pending' as const,
        payment_method_id: paymentMethodId,
        scheduled_date: nextPayoutDate.toISOString(),
      };

      const { data, error } = await supabase
        .from('driver_payouts')
        .insert(payoutData)
        .select()
        .single();

      if (error) throw error;

      console.log('Weekly payout scheduled:', data);
      return data;
    } catch (error) {
      console.error('Error scheduling weekly payout:', error);
      return null;
    }
  }

  /**
   * Request instant payout (with fee)
   */
  async requestInstantPayout(driverId: string, paymentMethodId: string): Promise<PayoutSchedule | null> {
    try {
      const pendingAmount = await this.getPendingEarningsForPayout(driverId);
      
      if (pendingAmount <= 0) {
        Alert.alert('No Earnings', 'You have no earnings available for payout');
        return null;
      }

      // Instant payout fee: $0.50 or 1.5% of amount, whichever is higher
      const percentageFee = pendingAmount * 0.015; // 1.5%
      const processingFee = Math.max(0.50, percentageFee);
      const netAmount = pendingAmount - processingFee;

      if (netAmount <= 0) {
        Alert.alert('Amount Too Small', 'Payout amount is too small after processing fees');
        return null;
      }

      const now = new Date();
      const payoutData = {
        driver_id: driverId,
        period_start: now.toISOString(),
        period_end: now.toISOString(),
        total_earnings: pendingAmount,
        platform_fee: 0,
        processing_fee: processingFee,
        net_amount: netAmount,
        status: 'processing' as const,
        payment_method_id: paymentMethodId,
        scheduled_date: now.toISOString(),
        type: 'instant',
      };

      const { data, error } = await supabase
        .from('driver_payouts')
        .insert(payoutData)
        .select()
        .single();

      if (error) throw error;

      // Mark earnings as included in payout
      await this.markEarningsAsIncludedInPayout(driverId, data.id);

      console.log('Instant payout requested:', data);
      return data;
    } catch (error) {
      console.error('Error requesting instant payout:', error);
      Alert.alert('Payout Error', 'Failed to process instant payout. Please try again.');
      return null;
    }
  }

  /**
   * Mark driver earnings as included in a payout
   */
  private async markEarningsAsIncludedInPayout(driverId: string, payoutId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('driver_earnings')
        .update({
          status: 'included_in_payout',
          payout_id: payoutId,
          updated_at: new Date().toISOString(),
        })
        .eq('driver_id', driverId)
        .eq('status', 'pending');

      if (error) throw error;

      console.log('Earnings marked as included in payout:', payoutId);
    } catch (error) {
      console.error('Error marking earnings as included in payout:', error);
      throw error;
    }
  }

  /**
   * Get driver's payout history
   */
  async getPayoutHistory(driverId: string, limit: number = 10): Promise<PayoutSchedule[]> {
    try {
      const { data, error } = await supabase
        .from('driver_payouts')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting payout history:', error);
      return [];
    }
  }

  /**
   * Get next scheduled payout date for display
   */
  getFormattedNextPayoutDate(): string {
    const nextPayout = this.getNextPayoutDate();
    const today = new Date();
    
    const diffTime = nextPayout.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return `${diffDays} days (${nextPayout.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })})`;
    }
  }

  /**
   * Check if driver has automatic weekly payouts enabled
   */
  async hasAutomaticPayoutsEnabled(driverId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('driver_payment_methods')
        .select('is_default')
        .eq('driver_id', driverId)
        .eq('is_default', true)
        .eq('is_verified', true);

      if (error) throw error;

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking automatic payouts:', error);
      return false;
    }
  }
}

export const weeklyPayoutService = new WeeklyPayoutService();
