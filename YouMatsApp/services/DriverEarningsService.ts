import { authService } from '../AuthServiceSupabase';
import { Alert } from 'react-native';

// Get the authenticated Supabase client
const supabase = authService.getSupabaseClient();

export interface TripEarning {
  id: string;
  driver_id: string;
  trip_id: string;
  trip_fare: number;
  platform_commission_rate: number;
  platform_commission: number;
  driver_earnings: number;
  tip_amount: number;
  bonus_amount: number;
  adjustment_amount: number;
  total_earnings: number;
  status: 'pending' | 'included_in_payout' | 'paid' | 'disputed';
  created_at: string;
  updated_at: string;
}

export interface EarningsSummary {
  total_earnings: number;
  available_for_payout: number;
  pending_earnings: number;
  trips_count: number;
  commission_paid: number;
  tips_received: number;
}

export interface EarningsBreakdown {
  today: EarningsSummary;
  week: EarningsSummary;
  month: EarningsSummary;
  total: EarningsSummary;
}

class DriverEarningsService {
  /**
   * Get all completed trips for a driver that have earnings recorded
   * This method fetches real trip data from the database
   */
  async getDriverTripEarnings(driverId: string): Promise<TripEarning[]> {
    try {
      const { data, error } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching driver trip earnings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDriverTripEarnings:', error);
      return [];
    }
  }

  /**
   * Calculate and store earnings for a completed trip
   * Note: This is usually handled automatically by the database trigger
   * when trip status changes to 'delivered'
   */
  async recordTripEarnings(
    driverId: string,
    tripId: string,
    tripFare: number,
    tipAmount: number = 0,
    bonusAmount: number = 0
  ): Promise<TripEarning | null> {
    try {
      // Platform commission rate (15% by default, can be configured)
      const commissionRate = 0.15;
      const platformCommission = tripFare * commissionRate;
      const driverEarnings = tripFare - platformCommission;
      const totalEarnings = driverEarnings + tipAmount + bonusAmount;

      const earningData = {
        driver_id: driverId,
        trip_id: tripId,
        trip_fare: tripFare,
        platform_commission_rate: commissionRate,
        platform_commission: platformCommission,
        driver_earnings: driverEarnings,
        tip_amount: tipAmount,
        bonus_amount: bonusAmount,
        adjustment_amount: 0,
        total_earnings: totalEarnings,
        status: 'pending' as const,
      };

      const { data, error } = await supabase
        .from('driver_earnings')
        .insert(earningData)
        .select()
        .single();

      if (error) {
        console.error('Error recording trip earnings:', error);
        return null;
      }

      console.log('Trip earnings recorded:', data);
      return data;
    } catch (error) {
      console.error('Error in recordTripEarnings:', error);
      return null;
    }
  }

  /**
   * Get comprehensive earnings breakdown for a driver
   */
  async getEarningsBreakdown(driverId: string): Promise<EarningsBreakdown> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all earnings for the driver
      const { data: allEarnings, error } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', driverId);

      if (error) throw error;

      const breakdown: EarningsBreakdown = {
        today: this.createEmptySummary(),
        week: this.createEmptySummary(),
        month: this.createEmptySummary(),
        total: this.createEmptySummary(),
      };

      allEarnings?.forEach(earning => {
        const earningDate = new Date(earning.created_at);
        
        // Update total
        this.addToSummary(breakdown.total, earning);

        // Update period-specific summaries
        if (earningDate >= today) {
          this.addToSummary(breakdown.today, earning);
        }
        if (earningDate >= weekStart) {
          this.addToSummary(breakdown.week, earning);
        }
        if (earningDate >= monthStart) {
          this.addToSummary(breakdown.month, earning);
        }
      });

      return breakdown;
    } catch (error) {
      console.error('Error getting earnings breakdown:', error);
      return {
        today: this.createEmptySummary(),
        week: this.createEmptySummary(),
        month: this.createEmptySummary(),
        total: this.createEmptySummary(),
      };
    }
  }

  /**
   * Get earnings available for payout (completed trips not yet paid)
   */
  async getAvailableEarnings(driverId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('driver_earnings')
        .select('total_earnings')
        .eq('driver_id', driverId)
        .eq('status', 'pending');

      if (error) throw error;

      return data?.reduce((sum, earning) => sum + (earning.total_earnings || 0), 0) || 0;
    } catch (error) {
      console.error('Error getting available earnings:', error);
      return 0;
    }
  }

  /**
   * Mark earnings as included in a payout
   */
  async markEarningsAsPaidOut(driverId: string, earningIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('driver_earnings')
        .update({ 
          status: 'included_in_payout',
          updated_at: new Date().toISOString()
        })
        .eq('driver_id', driverId)
        .in('id', earningIds);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking earnings as paid out:', error);
      return false;
    }
  }

  /**
   * Mark all pending earnings as included in payout
   */
  async markAllPendingEarningsAsPaidOut(driverId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('driver_earnings')
        .update({ 
          status: 'included_in_payout',
          updated_at: new Date().toISOString()
        })
        .eq('driver_id', driverId)
        .eq('status', 'pending');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all pending earnings as paid out:', error);
      return false;
    }
  }

  /**
   * Add manual adjustment to driver earnings
   */
  async addEarningsAdjustment(
    driverId: string,
    tripId: string,
    adjustmentAmount: number,
    reason: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('driver_earnings')
        .update({ 
          adjustment_amount: adjustmentAmount,
          adjustment_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('driver_id', driverId)
        .eq('trip_id', tripId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding earnings adjustment:', error);
      return false;
    }
  }

  /**
   * Get detailed earnings history for a driver
   */
  async getEarningsHistory(
    driverId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TripEarning[]> {
    try {
      const { data, error } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting earnings history:', error);
      return [];
    }
  }

  /**
   * Helper method to create empty earnings summary
   */
  private createEmptySummary(): EarningsSummary {
    return {
      total_earnings: 0,
      available_for_payout: 0,
      pending_earnings: 0,
      trips_count: 0,
      commission_paid: 0,
      tips_received: 0,
    };
  }

  /**
   * Helper method to add earnings to summary
   */
  private addToSummary(summary: EarningsSummary, earning: any): void {
    summary.total_earnings += earning.total_earnings || 0;
    summary.trips_count += 1;
    summary.commission_paid += earning.platform_commission || 0;
    summary.tips_received += earning.tip_amount || 0;

    // Available for payout (completed trips not yet paid)
    if (earning.status === 'pending') {
      summary.available_for_payout += earning.total_earnings || 0;
    }

    // Pending earnings (trips in progress)
    if (earning.status === 'pending') {
      summary.pending_earnings += earning.total_earnings || 0;
    }
  }

  /**
   * Get a summary of how driver earnings work
   * (Educational information for drivers)
   */
  getEarningsExplanation(): string {
    return `How Driver Earnings Work:

1. When you complete a delivery and mark it as "delivered", earnings are automatically calculated
2. You keep 85% of the trip fare, platform takes 15% commission
3. You receive 100% of customer tips
4. Bonuses and incentives are added by the platform
5. Earnings are available for payout weekly (Tuesdays) or instant payout for a small fee

Earnings are calculated automatically when trips are completed - no manual entry needed!`;
  }

  /**
   * Check if driver has any completed trips
   */
  async hasCompletedTrips(driverId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('driver_earnings')
        .select('id')
        .eq('driver_id', driverId)
        .limit(1);

      if (error) {
        console.error('Error checking completed trips:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error in hasCompletedTrips:', error);
      return false;
    }
  }

  /**
   * Create a mock trip record for testing purposes
   */
  private async createMockTripRecord(tripId: string, driverId: string, tripFare: number): Promise<boolean> {
    try {
      const supabase = authService.getSupabaseClient();
      
      // Check if a customer exists, if not create a mock one
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('user_type', 'customer')
        .limit(1);

      let customerId = users && users.length > 0 ? users[0].id : this.generateUUID();

      const mockTrip = {
        id: tripId,
        customer_id: customerId,
        driver_id: driverId,
        pickup_location: JSON.stringify({
          address: "123 Mock Pickup St",
          latitude: 40.7128,
          longitude: -74.0060
        }),
        dropoff_location: JSON.stringify({
          address: "456 Mock Dropoff Ave", 
          latitude: 40.7589,
          longitude: -73.9851
        }),
        total_price: tripFare,
        status: 'completed',
        trip_type: 'delivery',
        vehicle_type: 'truck',
        materials: JSON.stringify([{
          type: 'construction',
          description: 'Mock building materials',
          weight: 500
        }]),
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('trip_requests')
        .insert(mockTrip);

      if (error) {
        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          console.log('Trip already exists, proceeding with earnings');
          return true;
        } else {
          console.error('Error creating mock trip:', error);
          return false;
        }
      }

      console.log('Mock trip record created successfully');
      return true;
    } catch (error) {
      console.error('Error creating mock trip record:', error);
      return false;
    }
  }

  /**
   * Record earnings without trip reference (fallback method)
   */
  private async recordEarningsWithoutTrip(driverId: string, tripFare: number): Promise<TripEarning | null> {
    try {
      const supabase = authService.getSupabaseClient();
      
      // Use a simple approach - insert directly into driver_earnings without trip constraint
      const commissionRate = 0.15;
      const platformCommission = tripFare * commissionRate;
      const driverEarnings = tripFare - platformCommission;
      const tipAmount = Math.round((Math.random() * 10) * 100) / 100;
      const bonusAmount = Math.random() > 0.8 ? Math.round((Math.random() * 5 + 2) * 100) / 100 : 0;
      const totalEarnings = driverEarnings + tipAmount + bonusAmount;

      // Insert without the trip_id constraint by temporarily handling it
      console.log('Recording simplified earnings for testing...');
      Alert.alert(
        'Earnings Simulated!',
        `Trip Fare: $${tripFare.toFixed(2)}\n` +
        `Platform Fee: -$${platformCommission.toFixed(2)}\n` +
        `Driver Earnings: $${driverEarnings.toFixed(2)}\n` +
        `Tip: +$${tipAmount.toFixed(2)}\n` +
        `Bonus: +$${bonusAmount.toFixed(2)}\n` +
        `Total: $${totalEarnings.toFixed(2)}`
      );

      // Return a mock earnings object for display purposes
      return {
        id: this.generateUUID(),
        driver_id: driverId,
        trip_id: 'simulated',
        trip_fare: tripFare,
        platform_commission_rate: commissionRate,
        platform_commission: platformCommission,
        driver_earnings: driverEarnings,
        tip_amount: tipAmount,
        bonus_amount: bonusAmount,
        adjustment_amount: 0,
        total_earnings: totalEarnings,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in recordEarningsWithoutTrip:', error);
      return null;
    }
  }

  /**
   * Generate a proper UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Export singleton instance
export const driverEarningsService = new DriverEarningsService();

// Helper function to integrate with trip completion
export const onTripCompleted = async (
  driverId: string,
  tripId: string,
  tripFare: number,
  tipAmount: number = 0
) => {
  console.log('Trip completed, recording earnings...');
  const earning = await driverEarningsService.recordTripEarnings(
    driverId,
    tripId,
    tripFare,
    tipAmount
  );
  
  if (earning) {
    console.log(`Earnings recorded: Driver earned $${earning.total_earnings} for trip ${tripId}`);
    return earning;
  } else {
    console.error('Failed to record trip earnings');
    return null;
  }
};
