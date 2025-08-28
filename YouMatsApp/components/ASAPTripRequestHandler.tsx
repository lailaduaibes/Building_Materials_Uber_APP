/**
 * ASAP Trip Request Handler - Component to handle incoming trip requests
 * Integrates with the driver dashboard to show real-time trip requests
 */

import React, { useEffect } from 'react';
import { TripRequestModal } from './TripRequestModal';
import { useTripRequests } from '../hooks/useTripRequests';

interface ASAPTripRequestHandlerProps {
  isDriverOnline: boolean;
  onTripAccepted?: (tripId: string) => void;
  onTripDeclined?: (tripId: string) => void;
}

export const ASAPTripRequestHandler: React.FC<ASAPTripRequestHandlerProps> = ({
  isDriverOnline,
  onTripAccepted,
  onTripDeclined,
}) => {
  const {
    currentRequest,
    showModal,
    acceptTrip,
    declineTrip,
    handleTimeout,
    isListening,
    startListening,
    stopListening,
  } = useTripRequests();

  // Start/stop listening based on driver online status
  useEffect(() => {
    if (isDriverOnline && !isListening) {
      console.log('🟢 Driver went online - starting trip request listener');
      startListening();
    } else if (!isDriverOnline && isListening) {
      console.log('🔴 Driver went offline - stopping trip request listener');
      stopListening();
    }
  }, [isDriverOnline, isListening, startListening, stopListening]);

  // Handle trip acceptance
  const handleAccept = async (requestId: string) => {
    await acceptTrip(requestId);
    
    if (currentRequest && onTripAccepted) {
      onTripAccepted(currentRequest.tripId);
    }
  };

  // Handle trip decline
  const handleDecline = async (requestId: string) => {
    await declineTrip(requestId);
    
    if (currentRequest && onTripDeclined) {
      onTripDeclined(currentRequest.tripId);
    }
  };

  // Handle timeout
  const handleRequestTimeout = async (requestId: string) => {
    await handleTimeout(requestId);
    
    if (currentRequest && onTripDeclined) {
      onTripDeclined(currentRequest.tripId);
    }
  };

  // Convert request to modal format
  const modalRequest = currentRequest ? {
    requestId: currentRequest.id,
    tripId: currentRequest.tripId,
    pickupAddress: currentRequest.pickupAddress,
    deliveryAddress: currentRequest.deliveryAddress,
    materialType: currentRequest.materialType,
    estimatedEarnings: currentRequest.estimatedEarnings,
    estimatedDuration: currentRequest.estimatedDuration,
    timeToAccept: Math.max(0, Math.floor((new Date(currentRequest.acceptanceDeadline).getTime() - Date.now()) / 1000)),
  } : null;

  return (
    <TripRequestModal
      visible={showModal}
      tripRequest={modalRequest}
      onAccept={handleAccept}
      onDecline={handleDecline}
      onTimeout={handleRequestTimeout}
    />
  );
};
