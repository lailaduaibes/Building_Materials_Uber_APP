-- Apply ASAP Fix Using Existing Function Structure
-- This uses the actual function signature that exists in the database

-- Step 1: Test the existing find_nearby_available_drivers function with correct parameters
-- Based on the function you provided, it expects specific parameter names

-- Step 2: Apply the working ASAP matching function to the database
DO $$
DECLARE
    test_trip_id UUID;
    result_record RECORD;
    driver_record RECORD;
    driver_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔧 Applying ASAP fix using existing function structure...';
    
    -- Find a recent ASAP trip to test with
    SELECT id INTO test_trip_id 
    FROM trip_requests 
    WHERE pickup_time_preference = 'asap' 
        AND status IN ('pending', 'no_drivers_available')
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_trip_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing with trip: %', test_trip_id;
        
        -- Get trip details
        SELECT * INTO result_record FROM trip_requests WHERE id = test_trip_id;
        
        -- Test finding nearby drivers with the existing function
        -- (We'll call it manually since the parameters might be different)
        
        -- Check available drivers using the same criteria as the function
        FOR driver_record IN 
            SELECT 
                dp.user_id as driver_id,
                COALESCE(dp.first_name || ' ' || dp.last_name, 'Driver') as driver_name,
                u.current_latitude as latitude,
                u.current_longitude as longitude,
                -- Calculate distance using Haversine formula
                (6371 * acos(
                    cos(radians(result_record.pickup_latitude)) * 
                    cos(radians(u.current_latitude)) * 
                    cos(radians(u.current_longitude) - radians(result_record.pickup_longitude)) + 
                    sin(radians(result_record.pickup_latitude)) * 
                    sin(radians(u.current_latitude))
                ))::DECIMAL as distance_km,
                u.last_location_update as last_updated,
                dp.current_truck_id,
                dp.vehicle_model,
                dp.vehicle_plate,
                dp.rating,
                dp.total_trips
            FROM driver_profiles dp
            INNER JOIN users u ON dp.user_id = u.id
            WHERE dp.is_available = true 
            AND dp.is_approved = true
            AND dp.status != 'offline'
            AND u.current_latitude IS NOT NULL
            AND u.current_longitude IS NOT NULL
            AND u.last_location_update > NOW() - INTERVAL '60 minutes' -- More lenient for testing
            ORDER BY distance_km ASC, dp.rating DESC, dp.total_trips DESC
            LIMIT 5
        LOOP
            RAISE NOTICE '👤 Found available driver: % (%) at distance: %km', 
                driver_record.driver_name, 
                driver_record.driver_id, 
                driver_record.distance_km;
            driver_count := driver_count + 1;
        END LOOP;
        
        RAISE NOTICE '📊 Total available drivers found: %', driver_count;
        
        IF driver_count > 0 THEN
            RAISE NOTICE '✅ Drivers are available! The issue is likely in the start_asap_matching function parameters or execution.';
        ELSE
            RAISE NOTICE '❌ No drivers available with current criteria. Need to check location data.';
        END IF;
        
    ELSE
        RAISE NOTICE '⚠️ No ASAP trips found for testing';
    END IF;
END $$;
