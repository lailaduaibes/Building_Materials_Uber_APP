// Professional ASAP Trip Creation with Auto-Matching
// This is how your customer app should create ASAP trips

async function createASAPTripProfessional(tripData) {
  try {
    console.log('🚀 Creating ASAP trip with auto-matching...');
    
    // Step 1: Create the trip request
    const { data: tripResult, error: createError } = await supabase
      .from('trip_requests')
      .insert({
        customer_id: tripData.customerId,
        pickup_latitude: tripData.pickupLat,
        pickup_longitude: tripData.pickupLng,
        delivery_latitude: tripData.deliveryLat,
        delivery_longitude: tripData.deliveryLng,
        pickup_address: tripData.pickupAddress,
        delivery_address: tripData.deliveryAddress,
        material_type: tripData.materialType,
        estimated_weight_tons: tripData.weightTons,
        load_description: tripData.description,
        pickup_time_preference: 'asap', // Key: This is an ASAP trip
        status: 'pending',
        quoted_price: tripData.price,
        estimated_distance_km: tripData.distanceKm,
        estimated_duration_minutes: tripData.durationMin
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create trip: ${createError.message}`);
    }

    console.log('✅ Trip created successfully:', tripResult.id);

    // Step 2: Immediately trigger ASAP matching
    console.log('🎯 Starting ASAP driver matching...');
    
    const { data: matchingResult, error: matchingError } = await supabase
      .rpc('start_asap_matching_uber_style', {
        trip_request_id: tripResult.id
      });

    if (matchingError) {
      console.error('❌ ASAP matching failed:', matchingError);
      // Trip is created but matching failed - handle gracefully
      return {
        success: true,
        tripId: tripResult.id,
        matchingStatus: 'failed',
        message: 'Trip created but driver matching failed'
      };
    }

    console.log('✅ ASAP matching result:', matchingResult);

    return {
      success: true,
      tripId: tripResult.id,
      matchingStatus: 'success',
      driverAssigned: matchingResult?.[0]?.assigned_driver_id,
      message: matchingResult?.[0]?.message || 'ASAP trip created and matching started'
    };

  } catch (error) {
    console.error('💥 Error in ASAP trip creation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Usage example:
/*
const result = await createASAPTripProfessional({
  customerId: 'customer-uuid',
  pickupLat: 32.38882,
  pickupLng: 35.32197,
  deliveryLat: 32.39000,
  deliveryLng: 35.32500,
  pickupAddress: 'Pickup Location',
  deliveryAddress: 'Delivery Location',
  materialType: 'concrete',
  weightTons: 15.5,
  description: 'Premium concrete mix',
  price: 450.00,
  distanceKm: 8.5,
  durationMin: 90
});

console.log('ASAP Trip Result:', result);
*/
