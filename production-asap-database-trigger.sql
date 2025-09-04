-- 🚀 Production Database Trigger for ASAP Sequential Matching
-- This ensures ASAP trips automatically start sequential matching even if the app fails to trigger it

-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_asap_matching()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for ASAP trips that haven't been assigned yet
  IF NEW.pickup_time_preference = 'asap' AND NEW.assigned_driver_id IS NULL THEN
    -- Log the trigger activation
    RAISE NOTICE '🚨 ASAP trip created: % - Starting sequential matching', NEW.id;
    
    -- Start ASAP matching asynchronously (don't block the insert)
    PERFORM pg_notify('asap_trip_created', json_build_object(
      'trip_id', NEW.id,
      'created_at', NEW.created_at,
      'pickup_lat', NEW.pickup_latitude,
      'pickup_lng', NEW.pickup_longitude
    )::text);
    
    -- Also try to call the matching function directly
    BEGIN
      PERFORM start_asap_matching(NEW.id);
      RAISE NOTICE '✅ Sequential matching started for trip: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Direct matching call failed for trip %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on trip_requests table
DROP TRIGGER IF EXISTS asap_trip_matching_trigger ON trip_requests;
CREATE TRIGGER asap_trip_matching_trigger
  AFTER INSERT ON trip_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_asap_matching();

-- Test the trigger
INSERT INTO trip_requests (
    customer_id,
    pickup_latitude, 
    pickup_longitude,
    pickup_address,
    delivery_latitude,
    delivery_longitude, 
    delivery_address,
    material_type,
    estimated_weight_tons,
    load_description,
    required_truck_type_id,
    requires_crane,
    requires_hydraulic_lift,
    pickup_time_preference,
    estimated_duration_minutes,
    estimated_distance_km,
    quoted_price,
    status,
    payment_status,
    paid_amount,
    payment_processed_at,
    payment_transaction_id
) VALUES (
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c',
    32.387000, 35.324000,
    '{"street": "Test Street", "city": "Test City", "state": "Test", "postal_code": "12345", "formatted_address": "Trigger Test Location"}'::jsonb,
    32.390000, 35.330000,
    '{"street": "Test Delivery", "city": "Test City", "state": "Test", "postal_code": "54321", "formatted_address": "Trigger Test Delivery"}'::jsonb,
    'general_materials',
    2.0,
    'DATABASE TRIGGER TEST - ASAP MATCHING',
    NULL, -- Any truck type
    false, false,
    'asap', -- This should trigger the sequential matching!
    30, 3.8, 65.00,
    'pending', 'pending', 65.00,
    NOW(),
    'TXN_TRIGGER_TEST_' || gen_random_uuid()
) RETURNING id, assigned_driver_id, acceptance_deadline;

-- Verify the trigger worked
SELECT 
    'Database Trigger Test Results' as test_phase,
    id,
    assigned_driver_id,
    acceptance_deadline,
    status,
    CASE 
        WHEN assigned_driver_id IS NOT NULL 
        THEN '🚨 SUCCESS - Trigger assigned driver automatically!'
        ELSE '❌ FAILED - Trigger did not assign driver'
    END as trigger_result
FROM trip_requests 
WHERE load_description = 'DATABASE TRIGGER TEST - ASAP MATCHING'
ORDER BY created_at DESC 
LIMIT 1;
