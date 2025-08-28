/**
 * useTripRequests Hook - React hook for handling incoming ASAP trip requests
 * Manages trip request modal state and driver responses
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { tripRequestService, IncomingTripRequest } from '../services/TripRequestService';
import { authService } from '../AuthServiceSupabase';

interface UseTripRequestsReturn {
  currentRequest: IncomingTripRequest | null;
  showModal: boolean;
  acceptTrip: (requestId: string) => Promise<void>;
  declineTrip: (requestId: string) => Promise<void>;
  handleTimeout: (requestId: string) => Promise<void>;
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
}

export const useTripRequests = (): UseTripRequestsReturn => {
  const [currentRequest, setCurrentRequest] = useState<IncomingTripRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - resume listening if user is available
        if (currentUser && !isListening) {
          console.log('App resumed - restarting trip request listener');
          startListening();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - keep listening but handle differently
        console.log('App backgrounded - continuing to listen for trip requests');
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [currentUser, isListening]);

  // Handle incoming trip requests
  const handleTripRequest = useCallback((request: IncomingTripRequest) => {
    console.log('🚨 New trip request received:', request);

    // If there's already a request showing, this new one will replace it
    if (currentRequest) {
      console.log('⚠️ Replacing existing trip request with newer one');
    }

    setCurrentRequest(request);
    setShowModal(true);

    // Play sound or vibrate (optional)
    // Vibration.vibrate([0, 500, 200, 500]);
  }, [currentRequest]);

  // Start listening for trip requests
  const startListening = useCallback(async () => {
    try {
      if (!currentUser?.id) {
        console.error('No current user - cannot start listening for trip requests');
        return;
      }

      if (isListening) {
        console.log('Already listening for trip requests');
        return;
      }

      console.log('🚀 Starting trip request listener for user:', currentUser.id);
      await tripRequestService.startListening(currentUser.id, handleTripRequest);
      setIsListening(true);

    } catch (error) {
      console.error('💥 Error starting trip request listener:', error);
      Alert.alert('Error', 'Failed to start listening for trip requests');
    }
  }, [currentUser, isListening, handleTripRequest]);

  // Stop listening for trip requests
  const stopListening = useCallback(() => {
    console.log('🛑 Stopping trip request listener');
    tripRequestService.stopListening();
    setIsListening(false);
    setCurrentRequest(null);
    setShowModal(false);
  }, []);

  // Accept trip request
  const acceptTrip = useCallback(async (requestId: string) => {
    try {
      console.log('✅ Accepting trip request:', requestId);

      const success = await tripRequestService.acceptTripRequest(requestId);
      
      if (success) {
        Alert.alert('Trip Accepted!', 'Navigate to pickup location to start the trip.');
        setShowModal(false);
        setCurrentRequest(null);
      } else {
        Alert.alert('Error', 'Failed to accept trip. It may have been assigned to another driver.');
      }

    } catch (error) {
      console.error('💥 Error accepting trip:', error);
      Alert.alert('Error', 'Failed to accept trip request');
    }
  }, []);

  // Decline trip request
  const declineTrip = useCallback(async (requestId: string) => {
    try {
      console.log('❌ Declining trip request:', requestId);

      const success = await tripRequestService.declineTripRequest(requestId);
      
      // Always close the modal, regardless of success
      setShowModal(false);
      setCurrentRequest(null);

      if (!success) {
        console.warn('Failed to properly decline trip, but continuing');
      }

    } catch (error) {
      console.error('💥 Error declining trip:', error);
      // Still close the modal
      setShowModal(false);
      setCurrentRequest(null);
    }
  }, []);

  // Handle timeout (auto-decline)
  const handleTimeout = useCallback(async (requestId: string) => {
    try {
      console.log('⏰ Trip request timed out:', requestId);

      // Auto-decline the request
      await tripRequestService.declineTripRequest(requestId);
      
      setShowModal(false);
      setCurrentRequest(null);

      // Optional: Show timeout notification
      Alert.alert('Trip Request Expired', 'You did not respond in time.');

    } catch (error) {
      console.error('💥 Error handling timeout:', error);
      setShowModal(false);
      setCurrentRequest(null);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        tripRequestService.stopListening();
      }
    };
  }, [isListening]);

  return {
    currentRequest,
    showModal,
    acceptTrip,
    declineTrip,
    handleTimeout,
    isListening,
    startListening,
    stopListening,
  };
};
