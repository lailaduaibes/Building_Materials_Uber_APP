-- Real-time Trip Tracking Infrastructure Setup
-- Run this in Supabase SQL Editor to enable live tracking between driver and customer apps

-- 1. Create trip_tracking table for real-time location updates
CREATE TABLE IF NOT EXISTS trip_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_request_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    driver_latitude DECIMAL(10, 8) NOT NULL,
    driver_longitude DECIMAL(11, 8) NOT NULL,
    customer_latitude DECIMAL(10, 8),
    customer_longitude DECIMAL(11, 8),
    status TEXT NOT NULL CHECK (status IN ('assigned', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'delivered')),
    eta_minutes INTEGER,
    distance_remaining_km DECIMAL(6, 2),
    current_speed_kmh DECIMAL(5, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trip_request_id)
);

-- 2. Create driver_locations table for real-time driver tracking
CREATE TABLE IF NOT EXISTS driver_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    speed DECIMAL(5, 2),
    heading DECIMAL(5, 2),
    status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'busy', 'on_break')),
    current_order_id UUID REFERENCES trip_requests(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id)
);

-- 3. Create delivery_updates table for status notifications
CREATE TABLE IF NOT EXISTS delivery_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    location JSONB,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE trip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_updates ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for trip_tracking

-- Drivers can update their own tracking data
CREATE POLICY "Drivers can update own tracking data" ON trip_tracking
    FOR ALL USING (
        trip_request_id IN (
            SELECT id FROM trip_requests 
            WHERE assigned_driver_id = auth.uid()
        )
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

-- 6. Create RLS policies for driver_locations

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

-- 7. Create RLS policies for delivery_updates

-- Users can view updates for their orders/deliveries
CREATE POLICY "Users can view own delivery updates" ON delivery_updates
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM trip_requests 
            WHERE customer_id = auth.uid() OR assigned_driver_id = auth.uid()
        )
    );

-- Drivers can create updates for assigned orders
CREATE POLICY "Drivers can create delivery updates" ON delivery_updates
    FOR INSERT WITH CHECK (
        order_id IN (
            SELECT id FROM trip_requests 
            WHERE assigned_driver_id = auth.uid()
        )
    );

-- Service role has full access
CREATE POLICY "Service role full access delivery_updates" ON delivery_updates
    FOR ALL USING (auth.role() = 'service_role');

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_tracking_trip_request_id ON trip_tracking(trip_request_id);
CREATE INDEX IF NOT EXISTS idx_trip_tracking_updated_at ON trip_tracking(updated_at);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_updated_at ON driver_locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_delivery_updates_order_id ON delivery_updates(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_updates_created_at ON delivery_updates(created_at);

-- 9. Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE trip_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_updates;

-- 10. Create function to automatically update trip_tracking timestamps
CREATE OR REPLACE FUNCTION update_trip_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_trip_tracking_timestamp ON trip_tracking;
CREATE TRIGGER update_trip_tracking_timestamp
    BEFORE UPDATE ON trip_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_tracking_timestamp();

-- 11. Create function to automatically update driver_locations timestamps
CREATE OR REPLACE FUNCTION update_driver_locations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_driver_locations_timestamp ON driver_locations;
CREATE TRIGGER update_driver_locations_timestamp
    BEFORE UPDATE ON driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_locations_timestamp();

-- 12. Insert some test data for demonstration
-- (This will be executed only if there are existing trip_requests)

-- Insert test trip tracking data if trip requests exist
DO $$
DECLARE
    test_trip_id UUID;
    test_driver_id UUID;
BEGIN
    -- Get a test trip request
    SELECT id INTO test_trip_id 
    FROM trip_requests 
    WHERE status = 'pending' 
    LIMIT 1;
    
    -- Get a test driver
    SELECT id INTO test_driver_id 
    FROM driver_profiles 
    LIMIT 1;
    
    -- Only insert if we have both trip and driver
    IF test_trip_id IS NOT NULL AND test_driver_id IS NOT NULL THEN
        -- Insert test tracking data
        INSERT INTO trip_tracking (
            trip_request_id,
            driver_latitude,
            driver_longitude,
            customer_latitude,
            customer_longitude,
            status,
            eta_minutes,
            distance_remaining_km
        ) VALUES (
            test_trip_id,
            24.7136, -- Riyadh latitude
            46.6753, -- Riyadh longitude
            24.7250, -- Customer location (slightly north)
            46.6850, -- Customer location (slightly east)
            'en_route_pickup',
            15,
            2.5
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
            test_driver_id,
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
            
        RAISE NOTICE 'Test tracking data inserted successfully';
    ELSE
        RAISE NOTICE 'No trip requests or drivers found for test data';
    END IF;
END $$;

-- 13. Grant necessary permissions
GRANT ALL ON trip_tracking TO authenticated;
GRANT ALL ON driver_locations TO authenticated;
GRANT ALL ON delivery_updates TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '✅ Real-time tracking infrastructure setup completed successfully!';
    RAISE NOTICE '📱 Driver app can now update location in real-time';
    RAISE NOTICE '👥 Customer app can track driver location live';
    RAISE NOTICE '🔄 Real-time subscriptions enabled for all tracking tables';
END $$;
