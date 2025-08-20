// Test the fixed getTripById function
const testTripRetrieval = async () => {
  try {
    console.log('🧪 Testing trip retrieval with fixed schema...');
    
    // Import your TripService
    const TripService = require('./services/TripService').default;
    const tripService = new TripService();
    
    // Try to get a trip (replace with actual trip ID)
    const testTripId = 'your-actual-trip-id-here';
    const trip = await tripService.getTripById(testTripId);
    
    if (trip) {
      console.log('✅ Trip retrieved successfully:', {
        id: trip.id,
        status: trip.status,
        tracking: trip.trip_tracking ? 'Has tracking data' : 'No tracking data'
      });
    } else {
      console.log('❌ Trip not found');
    }
    
  } catch (error) {
    console.error('❌ Error testing trip retrieval:', error);
  }
};

// Run the test
testTripRetrieval();
