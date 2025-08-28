/**
 * ASAP Trip Trigger - Integration service to trigger real-time matching when ASAP orders are created
 * This service should be called after a trip is created in the database to start the matching process
 */

import { tripMatchingService } from './TripMatchingService';

export class ASAPTripTrigger {
  /**
   * Trigger ASAP matching for a newly created trip
   * This should be called immediately after trip creation
   */
  static async triggerASAPMatching(tripId: string): Promise<void> {
    try {
      console.log('🚀 Triggering ASAP matching for trip:', tripId);

      // Start the matching process asynchronously
      // Don't await this so the order creation response isn't delayed
      setImmediate(async () => {
        const success = await tripMatchingService.matchASAPTrip(tripId);
        
        if (success) {
          console.log('✅ ASAP matching completed successfully for trip:', tripId);
        } else {
          console.log('⚠️ ASAP matching failed or not applicable for trip:', tripId);
        }
      });

    } catch (error) {
      console.error('💥 Error triggering ASAP matching:', error);
      // Don't throw - this shouldn't fail the order creation
    }
  }

  /**
   * Check if a trip should trigger ASAP matching
   */
  static shouldTriggerASAP(tripData: any): boolean {
    return tripData.pickup_time_preference === 'asap';
  }
}

// Example usage in order creation API:
/*
// In your order creation endpoint (server-side):
const trip = await createTripInDatabase(tripData);

// If it's an ASAP trip, trigger matching
if (ASAPTripTrigger.shouldTriggerASAP(trip)) {
  ASAPTripTrigger.triggerASAPMatching(trip.id);
}

return { success: true, tripId: trip.id };
*/
