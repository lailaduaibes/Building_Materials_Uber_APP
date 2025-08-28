/**
 * Trip Request Service - Driver-side service for handling incoming ASAP trip requests
 * Polls for new trip requests and manages acceptance/decline
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tripMatchingService } from './TripMatchingService';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface IncomingTripRequest {
  id: string;
  tripId: string;
  pickupAddress: string;
  deliveryAddress: string;
  materialType: string;
  estimatedEarnings: number;
  estimatedDuration: number;
  acceptanceDeadline: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
}

type TripRequestCallback = (request: IncomingTripRequest) => void;

class TripRequestService {
  private isListening = false;
  private currentDriverId: string | null = null;
  private subscription: any = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private onTripRequestCallback: TripRequestCallback | null = null;

  /**
   * Start listening for trip requests for the current driver
   */
  async startListening(driverId: string, onTripRequest: TripRequestCallback): Promise<void> {
    try {
      if (this.isListening) {
        console.log('Already listening for trip requests');
        return;
      }

      this.currentDriverId = driverId;
      this.onTripRequestCallback = onTripRequest;
      this.isListening = true;

      console.log('🎧 Starting trip request listener for driver:', driverId);

      // Start real-time subscription
      this.setupRealtimeSubscription();
      
      // Also poll for existing pending requests (in case real-time missed any)
      this.checkForPendingRequests();
      
      // Set up fallback polling every 5 seconds
      this.pollInterval = setInterval(() => {
        this.checkForPendingRequests();
      }, 5000);

    } catch (error) {
      console.error('💥 Error starting trip request listener:', error);
    }
  }

  /**
   * Stop listening for trip requests
   */
  stopListening(): void {
    console.log('🛑 Stopping trip request listener');
    
    this.isListening = false;
    this.currentDriverId = null;
    this.onTripRequestCallback = null;

    // Clean up subscription
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }

    // Clear polling interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Set up real-time subscription for trip requests
   */
  private setupRealtimeSubscription(): void {
    if (!this.currentDriverId) return;

    this.subscription = supabase
      .channel(`trip_requests_${this.currentDriverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_requests',
          filter: `driver_id=eq.${this.currentDriverId}`
        },
        (payload: any) => {
          console.log('📨 New trip request received via real-time:', payload.new);
          this.handleNewTripRequest(payload.new);
        }
      )
      .subscribe();
  }

  /**
   * Check for pending trip requests (polling fallback)
   */
  private async checkForPendingRequests(): Promise<void> {
    if (!this.currentDriverId || !this.isListening) return;

    try {
      const { data: requests, error } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('driver_id', this.currentDriverId)
        .eq('status', 'pending')
        .gt('acceptance_deadline', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (requests && requests.length > 0) {
        console.log(`📋 Found ${requests.length} pending trip requests`);
        
        // Process the most recent request
        requests.forEach(request => {
          this.handleNewTripRequest(request);
        });
      }

    } catch (error) {
      console.error('💥 Error checking for pending requests:', error);
    }
  }

  /**
   * Handle incoming trip request
   */
  private handleNewTripRequest(requestData: any): void {
    try {
      // Check if deadline has passed
      const deadline = new Date(requestData.acceptance_deadline);
      if (deadline <= new Date()) {
        console.log('⏰ Trip request expired, ignoring');
        return;
      }

      // Convert to our interface format
      const tripRequest: IncomingTripRequest = {
        id: requestData.id,
        tripId: requestData.trip_id,
        pickupAddress: requestData.pickup_address,
        deliveryAddress: requestData.delivery_address,
        materialType: requestData.material_type,
        estimatedEarnings: Number(requestData.estimated_earnings) || 0,
        estimatedDuration: Number(requestData.estimated_duration) || 30,
        acceptanceDeadline: requestData.acceptance_deadline,
        status: requestData.status,
        createdAt: requestData.created_at,
      };

      // Notify the callback
      if (this.onTripRequestCallback) {
        console.log('📞 Calling trip request callback');
        this.onTripRequestCallback(tripRequest);
      }

    } catch (error) {
      console.error('💥 Error handling new trip request:', error);
    }
  }

  /**
   * Accept a trip request
   */
  async acceptTripRequest(requestId: string): Promise<boolean> {
    try {
      if (!this.currentDriverId) {
        console.error('No current driver ID');
        return false;
      }

      console.log('✅ Accepting trip request:', requestId);

      // Use the matching service to handle acceptance
      const success = await tripMatchingService.acceptTripRequest(requestId, this.currentDriverId);
      
      if (success) {
        console.log('✅ Trip request accepted successfully');
      } else {
        console.log('❌ Failed to accept trip request');
      }

      return success;

    } catch (error) {
      console.error('💥 Error accepting trip request:', error);
      return false;
    }
  }

  /**
   * Decline a trip request
   */
  async declineTripRequest(requestId: string): Promise<boolean> {
    try {
      if (!this.currentDriverId) {
        console.error('No current driver ID');
        return false;
      }

      console.log('❌ Declining trip request:', requestId);

      // Use the matching service to handle decline
      const success = await tripMatchingService.declineTripRequest(requestId, this.currentDriverId);
      
      if (success) {
        console.log('✅ Trip request declined successfully');
      } else {
        console.log('❌ Failed to decline trip request');
      }

      return success;

    } catch (error) {
      console.error('💥 Error declining trip request:', error);
      return false;
    }
  }

  /**
   * Get current driver ID
   */
  getCurrentDriverId(): string | null {
    return this.currentDriverId;
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}

export const tripRequestService = new TripRequestService();
export { TripRequestService };
