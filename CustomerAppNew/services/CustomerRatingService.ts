import { supabase } from '../config/supabaseClient';

export interface DriverRatingSubmission {
  tripId: string;
  rating: number;
  feedback?: string;
}

export interface DriverRatingStats {
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recentFeedback: Array<{
    rating: number;
    feedback: string;
    createdAt: string;
    tripId: string;
  }>;
}

export interface CustomerRatingHistory {
  tripId: string;
  driverName: string;
  rating: number;
  feedback: string;
  createdAt: string;
  pickupLocation: string;
  deliveryLocation: string;
}

class CustomerRatingService {
  /**
   * Submit a rating for a driver after trip completion
   */
  async submitDriverRating(submission: DriverRatingSubmission): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      console.log('Submitting driver rating:', submission);

      const { tripId, rating, feedback } = submission;

      // Validate rating range
      if (rating < 1 || rating > 5) {
        return {
          success: false,
          message: 'Rating must be between 1 and 5 stars'
        };
      }

      // Start transaction to update trip and driver rating
      const { data: tripData, error: tripError } = await supabase
        .from('trip_requests')
        .update({
          customer_rating: rating,
          customer_feedback: feedback || null
        })
        .eq('id', tripId)
        .select('assigned_driver_id')
        .single();

      if (tripError) {
        console.error('Error updating trip rating:', tripError);
        return {
          success: false,
          message: 'Failed to submit rating'
        };
      }

      if (!tripData?.assigned_driver_id) {
        return {
          success: false,
          message: 'Driver not found for this trip'
        };
      }

      // Update driver's overall rating
      await this.updateDriverOverallRating(tripData.assigned_driver_id);

      return {
        success: true,
        message: 'Rating submitted successfully',
        data: { tripId, rating }
      };

    } catch (error) {
      console.error('Error submitting driver rating:', error);
      return {
        success: false,
        message: 'Failed to submit rating. Please try again.'
      };
    }
  }

  /**
   * Update driver's overall rating based on all their ratings
   */
  private async updateDriverOverallRating(driverId: string): Promise<void> {
    try {
      // Get all customer ratings for this driver
      const { data: ratings, error: ratingsError } = await supabase
        .from('trip_requests')
        .select('customer_rating')
        .eq('assigned_driver_id', driverId)
        .not('customer_rating', 'is', null);

      if (ratingsError) {
        console.error('Error fetching driver ratings:', ratingsError);
        return;
      }

      if (!ratings || ratings.length === 0) {
        return;
      }

      // Calculate average rating
      const totalRating = ratings.reduce((sum: number, trip: any) => sum + (trip.customer_rating || 0), 0);
      const averageRating = totalRating / ratings.length;
      const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place

      // Update driver profile using user_id
      const { error: updateError } = await supabase
        .from('driver_profiles')
        .update({
          rating: roundedRating,
          total_trips: ratings.length
        })
        .eq('user_id', driverId);

      if (updateError) {
        console.error('Error updating driver overall rating:', updateError);
      } else {
        console.log(`Updated driver ${driverId} rating to ${roundedRating} (${ratings.length} trips)`);
      }

    } catch (error) {
      console.error('Error updating driver overall rating:', error);
    }
  }

  /**
   * Get trips that need rating from the customer
   */
  async getTripsNeedingRating(customerId: string): Promise<{
    success: boolean;
    data: Array<{
      tripId: string;
      driverName: string;
      driverPhoto?: string;
      pickupLocation: string;
      deliveryLocation: string;
      completedAt: string;
    }>;
  }> {
    try {
      console.log('🔍 Fetching trips needing rating for customer:', customerId);

      // Direct query without functions - much simpler and more efficient
      const { data: trips, error } = await supabase
        .from('trip_requests')
        .select(`
          id,
          pickup_address,
          delivery_address,
          delivered_at,
          assigned_driver_id
        `)
        .eq('customer_id', customerId)
        .eq('status', 'delivered')
        .is('customer_rating', null)
        .not('assigned_driver_id', 'is', null)
        .not('delivered_at', 'is', null)
        .order('delivered_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching trips needing rating:', error);
        return { success: false, data: [] };
      }

      if (!trips || trips.length === 0) {
        console.log('📝 No trips found needing rating');
        return { success: true, data: [] };
      }

      console.log(`📋 Found ${trips.length} trips needing rating`);

      // Get driver info for each trip using separate queries
      const tripsWithDrivers = [];
      for (const trip of trips) {
        console.log('🔍 Getting driver info for trip:', trip.id);
        
        const { data: driverData, error: driverError } = await supabase
          .from('driver_profiles')
          .select('first_name, last_name, profile_image_url')
          .eq('user_id', trip.assigned_driver_id)
          .single();

        if (driverError) {
          console.warn('⚠️ Could not fetch driver info for trip:', trip.id, driverError);
        }

        const driverName = driverData 
          ? `${driverData.first_name || ''} ${driverData.last_name || ''}`.trim() || 'Driver'
          : 'Driver';

        const pickupLocation = trip.pickup_address?.formatted_address || 
                              trip.pickup_address?.street || 
                              'Pickup Location';
        
        const deliveryLocation = trip.delivery_address?.formatted_address || 
                               trip.delivery_address?.street || 
                               'Delivery Location';

        tripsWithDrivers.push({
          tripId: trip.id,
          driverName,
          driverPhoto: driverData?.profile_image_url || null,
          pickupLocation,
          deliveryLocation,
          completedAt: trip.delivered_at
        });
      }

      console.log('✅ Successfully fetched trips with driver info:', tripsWithDrivers.length);
      return {
        success: true,
        data: tripsWithDrivers
      };

    } catch (error) {
      console.error('💥 Unexpected error fetching trips needing rating:', error);
      return {
        success: false,
        data: []
      };
    }
  }

  /**
   * Get customer's rating history
   */
  async getCustomerRatingHistory(customerId: string): Promise<{
    success: boolean;
    data: CustomerRatingHistory[];
  }> {
    try {
      // Use direct query with explicit handling for driver info
      const { data: trips, error } = await supabase
        .from('trip_requests')
        .select(`
          id,
          customer_rating,
          customer_feedback,
          delivered_at,
          pickup_address,
          delivery_address,
          assigned_driver_id
        `)
        .eq('customer_id', customerId)
        .not('customer_rating', 'is', null)
        .order('delivered_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer rating history:', error);
        return { success: false, data: [] };
      }

      // Get driver info for each trip
      const ratingHistory = [];
      for (const trip of trips || []) {
        const { data: driverData } = await supabase
          .from('driver_profiles')
          .select('first_name, last_name')
          .eq('user_id', trip.assigned_driver_id)
          .single();

        const driverName = driverData 
          ? `${driverData.first_name || ''} ${driverData.last_name || ''}`.trim() || 'Driver'
          : 'Driver';

        const pickupLocation = trip.pickup_address?.formatted_address || 
                              trip.pickup_address?.street || 
                              'Pickup Location';
        
        const deliveryLocation = trip.delivery_address?.formatted_address || 
                               trip.delivery_address?.street || 
                               'Delivery Location';

        ratingHistory.push({
          tripId: trip.id,
          driverName,
          rating: trip.customer_rating,
          feedback: trip.customer_feedback || '',
          createdAt: trip.delivered_at,
          pickupLocation,
          deliveryLocation
        });
      }

      return {
        success: true,
        data: ratingHistory
      };

    } catch (error) {
      console.error('Error fetching customer rating history:', error);
      return { success: false, data: [] };
    }
  }

  /**
   * Check if a specific trip has been rated by the customer
   */
  async isTripRated(tripId: string): Promise<boolean> {
    try {
      const { data: trip, error } = await supabase
        .from('trip_requests')
        .select('customer_rating')
        .eq('id', tripId)
        .single();

      if (error) {
        console.error('Error checking trip rating status:', error);
        return false;
      }

      return trip?.customer_rating !== null;

    } catch (error) {
      console.error('Error checking trip rating status:', error);
      return false;
    }
  }

  /**
   * Get driver's rating statistics (for display purposes)
   */
  async getDriverRatingStats(driverId: string): Promise<{
    success: boolean;
    data?: DriverRatingStats;
  }> {
    try {
      // Get all ratings for this driver
      const { data: trips, error } = await supabase
        .from('trip_requests')
        .select('customer_rating, customer_feedback, delivered_at, id')
        .eq('assigned_driver_id', driverId)
        .not('customer_rating', 'is', null)
        .order('delivered_at', { ascending: false });

      if (error) {
        console.error('Error fetching driver rating stats:', error);
        return { success: false };
      }

      if (!trips || trips.length === 0) {
        return {
          success: true,
          data: {
            averageRating: 0,
            totalRatings: 0,
            ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            recentFeedback: []
          }
        };
      }

      // Calculate statistics
      const totalRating = trips.reduce((sum: number, trip: any) => sum + trip.customer_rating, 0);
      const averageRating = totalRating / trips.length;

      // Rating breakdown
      const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      trips.forEach((trip: any) => {
        if (trip.customer_rating >= 1 && trip.customer_rating <= 5) {
          ratingBreakdown[trip.customer_rating as keyof typeof ratingBreakdown]++;
        }
      });

      // Recent feedback (last 5 with feedback)
      const recentFeedback = trips
        .filter((trip: any) => trip.customer_feedback && trip.customer_feedback.trim().length > 0)
        .slice(0, 5)
        .map((trip: any) => ({
          rating: trip.customer_rating,
          feedback: trip.customer_feedback,
          createdAt: trip.delivered_at,
          tripId: trip.id
        }));

      return {
        success: true,
        data: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalRatings: trips.length,
          ratingBreakdown,
          recentFeedback
        }
      };

    } catch (error) {
      console.error('Error fetching driver rating stats:', error);
      return { success: false };
    }
  }
}

export const customerRatingService = new CustomerRatingService();
