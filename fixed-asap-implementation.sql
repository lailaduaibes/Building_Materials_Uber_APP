-- Fixed ASAP Trip Matching Implementation
-- Compatible with YOUR EXACT existing schema

-- Add missing fields to trip_requests for ASAP matching
DO $$ 
BEGIN
    -- Add acceptance_deadline for 15-second timer
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trip_requests' AND column_name = 'acceptance_deadline'
    ) THEN
        ALTER TABLE trip_requests ADD COLUMN acceptance_deadline TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN trip_requests.acceptance_deadline IS 'Driver must respond by this time';
    END IF;
    
    -- Add original_trip_id to track driver-specific requests
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trip_requests' AND column_name = 'original_trip_id'
    ) THEN
        ALTER TABLE trip_requests ADD COLUMN original_trip_id UUID REFERENCES trip_requests(id);
        COMMENT ON COLUMN trip_requests.original_trip_id IS 'Links driver-specific requests to original customer request';
    END IF;
    
    -- Add matching_started_at for tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trip_requests' AND column_name = 'matching_started_at'
    ) THEN
        ALTER TABLE trip_requests ADD COLUMN matching_started_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN trip_requests.matching_started_at IS 'When ASAP matching process began';
    END IF;
    
    -- Add driver_request_sent_at for tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trip_requests' AND column_name = 'driver_request_sent_at'
    ) THEN
        ALTER TABLE trip_requests ADD COLUMN driver_request_sent_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN trip_requests.driver_request_sent_at IS 'When request was sent to specific driver';
    END IF;
END $$;

-- Update status field to include new ASAP-specific statuses
ALTER TABLE trip_requests DROP CONSTRAINT IF EXISTS trip_requests_status_check;
ALTER TABLE trip_requests ADD CONSTRAINT trip_requests_status_check 
    CHECK (status IN (
        'pending', 'matched', 'in_transit', 'delivered', 
        'accepted', 'declined', 'expired', 'no_drivers_available', 'matching'
    ));

-- Add indexes for fast ASAP matching
CREATE INDEX IF NOT EXISTS idx_trip_requests_asap_matching 
    ON trip_requests(pickup_time_preference, status, created_at) 
    WHERE pickup_time_preference = 'asap' AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_trip_requests_driver_pending 
    ON trip_requests(assigned_driver_id, status, acceptance_deadline) 
    WHERE status IN ('pending', 'accepted', 'declined', 'expired');

CREATE INDEX IF NOT EXISTS idx_driver_profiles_available 
    ON driver_profiles(is_available, is_approved, status) 
    WHERE is_available = true AND is_approved = true;

-- Simple index on driver_locations without time predicate
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_updated 
    ON driver_locations(driver_id, updated_at);

-- Function to find nearby available drivers using YOUR schema
CREATE OR REPLACE FUNCTION find_nearby_available_drivers(
    pickup_lat DECIMAL,
    pickup_lng DECIMAL, 
    max_distance_km INTEGER DEFAULT 10,
    min_updated_minutes INTEGER DEFAULT 5,
    required_truck_type_id UUID DEFAULT NULL
)
RETURNS TABLE(
    driver_id UUID,
    driver_name TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DECIMAL,
    last_updated TIMESTAMP WITH TIME ZONE,
    current_truck_id UUID,
    vehicle_model TEXT,
    vehicle_plate TEXT,
    rating DECIMAL,
    total_trips INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dp.user_id as driver_id,
        COALESCE(dp.first_name || ' ' || dp.last_name, 'Driver') as driver_name,
        dl.latitude,
        dl.longitude,
        -- Calculate distance using Haversine formula
        (6371 * acos(
            cos(radians(pickup_lat)) * 
            cos(radians(dl.latitude)) * 
            cos(radians(dl.longitude) - radians(pickup_lng)) + 
            sin(radians(pickup_lat)) * 
            sin(radians(dl.latitude))
        ))::DECIMAL as distance_km,
        dl.updated_at as last_updated,
        dp.current_truck_id,
        dp.vehicle_model,
        dp.vehicle_plate,
        dp.rating,
        dp.total_trips
    FROM driver_profiles dp
    INNER JOIN driver_locations dl ON dp.user_id = dl.driver_id
    WHERE dp.is_available = true 
    AND dp.is_approved = true
    AND dp.status != 'offline'
    AND dl.updated_at > NOW() - INTERVAL '1 minute' * min_updated_minutes
    AND (required_truck_type_id IS NULL OR dp.selected_truck_type_id = required_truck_type_id)
    AND (6371 * acos(
        cos(radians(pickup_lat)) * 
        cos(radians(dl.latitude)) * 
        cos(radians(dl.longitude) - radians(pickup_lng)) + 
        sin(radians(pickup_lat)) * 
        sin(radians(dl.latitude))
    )) <= max_distance_km
    ORDER BY distance_km ASC, dp.rating DESC, dp.total_trips DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to start ASAP matching for a trip request
CREATE OR REPLACE FUNCTION start_asap_matching(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    drivers_found INTEGER
) AS $$
DECLARE
    trip_record RECORD;
    driver_record RECORD;
    driver_count INTEGER := 0;
    acceptance_deadline_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the original trip request
    SELECT * INTO trip_record FROM trip_requests WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', 0;
        RETURN;
    END IF;
    
    -- Only process ASAP trips
    IF trip_record.pickup_time_preference != 'asap' THEN
        RETURN QUERY SELECT false, 'Not an ASAP trip', 0;
        RETURN;
    END IF;
    
    -- Mark original trip as matching started
    UPDATE trip_requests 
    SET status = 'matching', matching_started_at = NOW()
    WHERE id = trip_request_id;
    
    -- Set acceptance deadline (15 seconds from now)
    acceptance_deadline_time := NOW() + INTERVAL '15 seconds';
    
    -- Find nearby drivers
    FOR driver_record IN 
        SELECT * FROM find_nearby_available_drivers(
            trip_record.pickup_latitude::DECIMAL,
            trip_record.pickup_longitude::DECIMAL,
            10, -- max 10km
            5,  -- updated within 5 minutes
            trip_record.required_truck_type_id
        )
        LIMIT 5 -- Try max 5 drivers
    LOOP
        -- Create driver-specific trip request
        INSERT INTO trip_requests (
            original_trip_id,
            customer_id,
            pickup_latitude, pickup_longitude, pickup_address,
            delivery_latitude, delivery_longitude, delivery_address,
            material_type, estimated_weight_tons, estimated_volume_m3,
            load_description, special_requirements, required_truck_type_id,
            requires_crane, requires_hydraulic_lift,
            pickup_time_preference, scheduled_pickup_time,
            estimated_duration_minutes, estimated_distance_km, quoted_price,
            status, assigned_driver_id,
            acceptance_deadline, driver_request_sent_at
        ) VALUES (
            trip_request_id, -- Reference to original
            trip_record.customer_id,
            trip_record.pickup_latitude, trip_record.pickup_longitude, trip_record.pickup_address,
            trip_record.delivery_latitude, trip_record.delivery_longitude, trip_record.delivery_address,
            trip_record.material_type, trip_record.estimated_weight_tons, trip_record.estimated_volume_m3,
            trip_record.load_description, trip_record.special_requirements, trip_record.required_truck_type_id,
            trip_record.requires_crane, trip_record.requires_hydraulic_lift,
            'asap', NULL,
            trip_record.estimated_duration_minutes, trip_record.estimated_distance_km, trip_record.quoted_price,
            'pending', driver_record.driver_id,
            acceptance_deadline_time, NOW()
        );
        
        driver_count := driver_count + 1;
    END LOOP;
    
    IF driver_count = 0 THEN
        -- No drivers found, mark as no_drivers_available
        UPDATE trip_requests 
        SET status = 'no_drivers_available'
        WHERE id = trip_request_id;
        
        RETURN QUERY SELECT false, 'No available drivers found', 0;
    ELSE
        RETURN QUERY SELECT true, format('%s drivers notified', driver_count), driver_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to accept trip request (called by driver)
CREATE OR REPLACE FUNCTION accept_trip_request(request_id UUID, accepting_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    original_trip_id UUID
) AS $$
DECLARE
    request_record RECORD;
    original_trip_id_val UUID;
BEGIN
    -- Get the trip request
    SELECT * INTO request_record FROM trip_requests 
    WHERE id = request_id AND assigned_driver_id = accepting_driver_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found or not available', NULL::UUID;
        RETURN;
    END IF;
    
    -- Check if deadline has passed
    IF request_record.acceptance_deadline < NOW() THEN
        UPDATE trip_requests SET status = 'expired' WHERE id = request_id;
        RETURN QUERY SELECT false, 'Request has expired', NULL::UUID;
        RETURN;
    END IF;
    
    original_trip_id_val := request_record.original_trip_id;
    
    -- Accept this request
    UPDATE trip_requests 
    SET status = 'accepted', matched_at = NOW()
    WHERE id = request_id;
    
    -- Update the original trip request
    UPDATE trip_requests 
    SET status = 'matched', 
        assigned_driver_id = accepting_driver_id,
        matched_at = NOW()
    WHERE id = original_trip_id_val;
    
    -- Mark all other pending requests for this trip as expired
    UPDATE trip_requests 
    SET status = 'expired'
    WHERE original_trip_id = original_trip_id_val 
    AND status = 'pending' 
    AND id != request_id;
    
    RETURN QUERY SELECT true, 'Trip accepted successfully', original_trip_id_val;
END;
$$ LANGUAGE plpgsql;

-- Function to decline trip request (called by driver)
CREATE OR REPLACE FUNCTION decline_trip_request(request_id UUID, declining_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    -- Update request status
    UPDATE trip_requests 
    SET status = 'declined'
    WHERE id = request_id 
    AND assigned_driver_id = declining_driver_id 
    AND status = 'pending';
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Request declined';
    ELSE
        RETURN QUERY SELECT false, 'Request not found or already processed';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired requests
CREATE OR REPLACE FUNCTION cleanup_expired_requests()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE trip_requests 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND acceptance_deadline IS NOT NULL 
    AND acceptance_deadline < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create helpful views
CREATE OR REPLACE VIEW pending_driver_requests AS
SELECT 
    tr.*,
    dp.first_name || ' ' || dp.last_name as driver_name,
    dp.phone as driver_phone,
    dp.vehicle_model,
    dp.vehicle_plate,
    EXTRACT(EPOCH FROM (acceptance_deadline - NOW()))::INTEGER as seconds_remaining
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.status = 'pending' 
AND tr.acceptance_deadline IS NOT NULL
AND tr.acceptance_deadline > NOW()
ORDER BY tr.acceptance_deadline ASC;

-- Final success message
SELECT '✅ ASAP Trip Matching Setup Complete!' as message;
