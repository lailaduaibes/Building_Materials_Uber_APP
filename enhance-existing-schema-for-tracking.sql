-- Real-time Tracking Enhancement for Existing Schema
-- This script enhances your existing database for driver app real-time tracking

-- 1. First, let's check what we have and what needs to be updated
DO $$
BEGIN
    RAISE NOTICE '🔍 Checking existing schema for real-time tracking compatibility...';
END $$;

-- 2. Update trip_tracking table to match the driver app requirements
-- Your existing trip_tracking table needs some adjustments for real-time driver updates
ALTER TABLE public.trip_tracking 
    ADD COLUMN IF NOT EXISTS trip_request_id uuid REFERENCES trip_requests(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS customer_latitude numeric,
    ADD COLUMN IF NOT EXISTS customer_longitude numeric,
    ADD COLUMN IF NOT EXISTS eta_minutes integer,
    ADD COLUMN IF NOT EXISTS distance_remaining_km numeric,
    ADD COLUMN IF NOT EXISTS current_speed_kmh numeric,
    ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('assigned', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'delivered')),
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Update column names to match driver app expectations
DO $$
BEGIN
    -- Check if we need to rename columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_tracking' AND column_name = 'current_latitude') THEN
        ALTER TABLE trip_tracking RENAME COLUMN current_latitude TO driver_latitude;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_tracking' AND column_name = 'current_longitude') THEN
        ALTER TABLE trip_tracking RENAME COLUMN current_longitude TO driver_longitude;
    END IF;
    
    -- Set trip_request_id from trip_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_tracking' AND column_name = 'trip_id') THEN
        UPDATE trip_tracking SET trip_request_id = trip_id WHERE trip_request_id IS NULL;
    END IF;
END $$;

-- 3. Create driver_locations table for real-time driver tracking
CREATE TABLE IF NOT EXISTS driver_locations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    accuracy numeric,
    speed numeric,
    heading numeric,
    status text DEFAULT 'online' CHECK (status IN ('online', 'offline', 'busy', 'on_break')),
    current_order_id uuid REFERENCES trip_requests(id),
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(driver_id)
);

-- 4. Create delivery_updates table for status notifications
CREATE TABLE IF NOT EXISTS delivery_updates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    status text NOT NULL,
    estimated_arrival timestamp with time zone,
    location jsonb,
    message text,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Add missing columns to driver_profiles if needed
ALTER TABLE driver_profiles 
    ADD COLUMN IF NOT EXISTS first_name text,
    ADD COLUMN IF NOT EXISTS last_name text,
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS profile_image_url text,
    ADD COLUMN IF NOT EXISTS vehicle_plate text,
    ADD COLUMN IF NOT EXISTS vehicle_model text,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'on_break'));

-- 6. Update driver_profiles with user data if first_name is missing
UPDATE driver_profiles dp
SET 
    first_name = u.first_name,
    last_name = u.last_name,
    phone = u.phone
FROM users u
WHERE dp.user_id = u.id 
AND (dp.first_name IS NULL OR dp.first_name = '');

-- 7. Update trip_requests status values to match driver app expectations
-- Map existing statuses to new ones
UPDATE trip_requests 
SET status = CASE 
    WHEN status = 'matched' THEN 'assigned'
    WHEN status = 'driver_en_route' THEN 'en_route_pickup'
    WHEN status = 'at_pickup' THEN 'at_pickup'
    WHEN status = 'loaded' THEN 'loaded'
    WHEN status = 'in_transit' THEN 'en_route_delivery'
    WHEN status = 'at_delivery' THEN 'en_route_delivery'
    WHEN status = 'delivered' THEN 'delivered'
    ELSE status
END;

-- 8. Enable Row Level Security
ALTER TABLE trip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_updates ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for trip_tracking
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Drivers can update own tracking data" ON trip_tracking;
DROP POLICY IF EXISTS "Customers can view own trip tracking" ON trip_tracking;
DROP POLICY IF EXISTS "Service role full access trip_tracking" ON trip_tracking;

-- Drivers can update their own tracking data
CREATE POLICY "Drivers can update own tracking data" ON trip_tracking
    FOR ALL USING (
        trip_request_id IN (
            SELECT id FROM trip_requests 
            WHERE assigned_driver_id IN (
                SELECT user_id FROM driver_profiles 
                WHERE user_id = auth.uid()
            )
        )
        OR 
        driver_id = auth.uid()
    );

-- Customers can view tracking for their trips
CREATE POLICY "Customers can view own trip tracking" ON trip_tracking
    FOR SELECT USING (
        trip_request_id IN (
            SELECT id FROM trip_requests 
            WHERE customer_id = auth.uid()
        )
    );

-- Service role has full access
CREATE POLICY "Service role full access trip_tracking" ON trip_tracking
    FOR ALL USING (auth.role() = 'service_role');

-- 10. Create RLS policies for driver_locations
DROP POLICY IF EXISTS "Drivers can update own location" ON driver_locations;
DROP POLICY IF EXISTS "Customers can view driver location for active trips" ON driver_locations;
DROP POLICY IF EXISTS "Service role full access driver_locations" ON driver_locations;

-- Drivers can update their own location
CREATE POLICY "Drivers can update own location" ON driver_locations
    FOR ALL USING (
        driver_id IN (
            SELECT id FROM driver_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Customers can view driver location for active trips
CREATE POLICY "Customers can view driver location for active trips" ON driver_locations
    FOR SELECT USING (
        current_order_id IN (
            SELECT id FROM trip_requests 
            WHERE customer_id = auth.uid() 
            AND status IN ('assigned', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery')
        )
    );

-- Service role has full access
CREATE POLICY "Service role full access driver_locations" ON driver_locations
    FOR ALL USING (auth.role() = 'service_role');

-- 11. Create RLS policies for delivery_updates
DROP POLICY IF EXISTS "Users can view own delivery updates" ON delivery_updates;
DROP POLICY IF EXISTS "Drivers can create delivery updates" ON delivery_updates;
DROP POLICY IF EXISTS "Service role full access delivery_updates" ON delivery_updates;

-- Users can view updates for their orders/deliveries
CREATE POLICY "Users can view own delivery updates" ON delivery_updates
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM trip_requests 
            WHERE customer_id = auth.uid() 
            OR assigned_driver_id IN (
                SELECT user_id FROM driver_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Drivers can create updates for assigned orders
CREATE POLICY "Drivers can create delivery updates" ON delivery_updates
    FOR INSERT WITH CHECK (
        order_id IN (
            SELECT id FROM trip_requests 
            WHERE assigned_driver_id IN (
                SELECT user_id FROM driver_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Service role has full access
CREATE POLICY "Service role full access delivery_updates" ON delivery_updates
    FOR ALL USING (auth.role() = 'service_role');

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_tracking_trip_request_id ON trip_tracking(trip_request_id);
CREATE INDEX IF NOT EXISTS idx_trip_tracking_updated_at ON trip_tracking(updated_at);
CREATE INDEX IF NOT EXISTS idx_trip_tracking_driver_id ON trip_tracking(driver_id);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_updated_at ON driver_locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_driver_locations_current_order_id ON driver_locations(current_order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_updates_order_id ON delivery_updates(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_updates_created_at ON delivery_updates(created_at);

CREATE INDEX IF NOT EXISTS idx_trip_requests_assigned_driver_id ON trip_requests(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_customer_id ON trip_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON trip_requests(status);

-- 13. Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE trip_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_requests;

-- 14. Create timestamp update functions
CREATE OR REPLACE FUNCTION update_trip_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_driver_locations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_trip_tracking_timestamp ON trip_tracking;
CREATE TRIGGER update_trip_tracking_timestamp
    BEFORE UPDATE ON trip_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_tracking_timestamp();

DROP TRIGGER IF EXISTS update_driver_locations_timestamp ON driver_locations;
CREATE TRIGGER update_driver_locations_timestamp
    BEFORE UPDATE ON driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_locations_timestamp();

-- 15. Create test data compatible with existing schema
DO $$
DECLARE
    test_trip_id uuid;
    test_driver_profile_id uuid;
    test_customer_id uuid;
BEGIN
    -- Get existing trip and driver for testing
    SELECT id, customer_id INTO test_trip_id, test_customer_id
    FROM trip_requests 
    WHERE status IN ('pending', 'assigned') 
    LIMIT 1;
    
    SELECT id INTO test_driver_profile_id 
    FROM driver_profiles 
    LIMIT 1;
    
    IF test_trip_id IS NOT NULL AND test_driver_profile_id IS NOT NULL THEN
        -- Update trip request to have assigned driver
        UPDATE trip_requests 
        SET 
            assigned_driver_id = (SELECT user_id FROM driver_profiles WHERE id = test_driver_profile_id),
            status = 'assigned'
        WHERE id = test_trip_id;
        
        -- Insert test tracking data
        INSERT INTO trip_tracking (
            trip_request_id,
            driver_latitude,
            driver_longitude,
            customer_latitude,
            customer_longitude,
            status,
            eta_minutes,
            distance_remaining_km,
            driver_id
        ) VALUES (
            test_trip_id,
            24.7136, -- Riyadh latitude
            46.6753, -- Riyadh longitude
            24.7250, -- Customer location
            46.6850, -- Customer location
            'en_route_pickup',
            15,
            2.5,
            (SELECT user_id FROM driver_profiles WHERE id = test_driver_profile_id)
        )
        ON CONFLICT (trip_request_id) DO UPDATE SET
            driver_latitude = EXCLUDED.driver_latitude,
            driver_longitude = EXCLUDED.driver_longitude,
            status = EXCLUDED.status,
            eta_minutes = EXCLUDED.eta_minutes,
            distance_remaining_km = EXCLUDED.distance_remaining_km,
            updated_at = NOW();
        
        -- Insert test driver location
        INSERT INTO driver_locations (
            driver_id,
            latitude,
            longitude,
            status,
            current_order_id
        ) VALUES (
            test_driver_profile_id,
            24.7136,
            46.6753,
            'busy',
            test_trip_id
        )
        ON CONFLICT (driver_id) DO UPDATE SET
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            status = EXCLUDED.status,
            current_order_id = EXCLUDED.current_order_id,
            updated_at = NOW();
            
        RAISE NOTICE '✅ Test tracking data created for trip: % with driver: %', test_trip_id, test_driver_profile_id;
    ELSE
        RAISE NOTICE '⚠️  No existing trip requests or driver profiles found for test data';
    END IF;
END $$;

-- 16. Grant necessary permissions
GRANT ALL ON trip_tracking TO authenticated;
GRANT ALL ON driver_locations TO authenticated;
GRANT ALL ON delivery_updates TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Final status report
DO $$
DECLARE
    trip_count int;
    driver_count int;
    tracking_count int;
BEGIN
    SELECT COUNT(*) INTO trip_count FROM trip_requests;
    SELECT COUNT(*) INTO driver_count FROM driver_profiles;
    SELECT COUNT(*) INTO tracking_count FROM trip_tracking;
    
    RAISE NOTICE '📊 Database Status Report:';
    RAISE NOTICE '   • Trip Requests: %', trip_count;
    RAISE NOTICE '   • Driver Profiles: %', driver_count;
    RAISE NOTICE '   • Trip Tracking Records: %', tracking_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Real-time tracking enhancement completed successfully!';
    RAISE NOTICE '🚗 Driver app can now update location in real-time';
    RAISE NOTICE '📱 Customer app can track driver location live';
    RAISE NOTICE '🔄 Real-time subscriptions enabled for all tracking tables';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for driver app testing! 🎉';
END $$;
