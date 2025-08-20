-- Enhanced Real-time Trip Tracking Schema
-- This ensures the driver app can provide live updates to customers

-- Trip tracking table for real-time location updates
CREATE TABLE IF NOT EXISTS trip_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_request_id UUID REFERENCES trip_requests(id) ON DELETE CASCADE,
    driver_latitude DECIMAL(10, 8) NOT NULL,
    driver_longitude DECIMAL(11, 8) NOT NULL,
    customer_latitude DECIMAL(10, 8),
    customer_longitude DECIMAL(11, 8),
    status TEXT CHECK (status IN ('assigned', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'delivered')) DEFAULT 'assigned',
    eta_minutes INTEGER,
    distance_remaining_km DECIMAL(6, 2),
    current_speed_kmh DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trip_request_id)
);

-- Driver locations table for real-time driver tracking
CREATE TABLE IF NOT EXISTS driver_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES driver_profiles(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2),
    heading DECIMAL(5, 2),
    speed_kmh DECIMAL(5, 2),
    status TEXT CHECK (status IN ('online', 'offline', 'busy', 'on_break')) DEFAULT 'offline',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id)
);

-- Enable Row Level Security
ALTER TABLE trip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_tracking
-- Drivers can read and update their own trip tracking
DROP POLICY IF EXISTS "Drivers can manage their trip tracking" ON trip_tracking;
CREATE POLICY "Drivers can manage their trip tracking" ON trip_tracking
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM trip_requests tr 
            WHERE tr.id = trip_tracking.trip_request_id 
            AND tr.assigned_driver_id IN (
                SELECT id FROM driver_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Customers can read tracking for their trips
DROP POLICY IF EXISTS "Customers can read their trip tracking" ON trip_tracking;
CREATE POLICY "Customers can read their trip tracking" ON trip_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_requests tr 
            WHERE tr.id = trip_tracking.trip_request_id 
            AND tr.customer_id = auth.uid()
        )
    );

-- RLS Policies for driver_locations
-- Drivers can manage their own location
DROP POLICY IF EXISTS "Drivers can manage their location" ON driver_locations;
CREATE POLICY "Drivers can manage their location" ON driver_locations
    FOR ALL USING (
        driver_id IN (
            SELECT id FROM driver_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Customers can read driver locations for their active trips
DROP POLICY IF EXISTS "Customers can read driver locations for active trips" ON driver_locations;
CREATE POLICY "Customers can read driver locations for active trips" ON driver_locations
    FOR SELECT USING (
        driver_id IN (
            SELECT tr.assigned_driver_id 
            FROM trip_requests tr 
            WHERE tr.customer_id = auth.uid() 
            AND tr.status IN ('assigned', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery')
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_tracking_trip_request_id ON trip_tracking(trip_request_id);
CREATE INDEX IF NOT EXISTS idx_trip_tracking_updated_at ON trip_tracking(updated_at);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_updated_at ON driver_locations(updated_at);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE trip_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_trip_tracking_updated_at ON trip_tracking;
CREATE TRIGGER update_trip_tracking_updated_at 
    BEFORE UPDATE ON trip_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_driver_locations_updated_at ON driver_locations;
CREATE TRIGGER update_driver_locations_updated_at 
    BEFORE UPDATE ON driver_locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample tracking data (for testing)
-- Note: This will only work if trip_requests and driver_profiles exist
INSERT INTO trip_tracking (
    trip_request_id,
    driver_latitude,
    driver_longitude,
    customer_latitude,
    customer_longitude,
    status,
    eta_minutes,
    distance_remaining_km
) 
SELECT 
    tr.id,
    24.7136 + (RANDOM() - 0.5) * 0.1, -- Random location near Riyadh
    46.6753 + (RANDOM() - 0.5) * 0.1,
    tr.pickup_latitude,
    tr.pickup_longitude,
    'en_route_pickup'::TEXT,
    15 + FLOOR(RANDOM() * 30)::INTEGER,
    2.5 + (RANDOM() * 10)::DECIMAL(6,2)
FROM trip_requests tr 
WHERE tr.status = 'assigned'
AND NOT EXISTS (
    SELECT 1 FROM trip_tracking tt 
    WHERE tt.trip_request_id = tr.id
)
LIMIT 5
ON CONFLICT (trip_request_id) DO NOTHING;

-- Insert sample driver locations
INSERT INTO driver_locations (
    driver_id,
    latitude,
    longitude,
    accuracy,
    status
)
SELECT 
    dp.id,
    24.7136 + (RANDOM() - 0.5) * 0.2, -- Random locations in Riyadh area
    46.6753 + (RANDOM() - 0.5) * 0.2,
    5.0 + (RANDOM() * 10)::DECIMAL(6,2),
    'online'::TEXT
FROM driver_profiles dp 
WHERE NOT EXISTS (
    SELECT 1 FROM driver_locations dl 
    WHERE dl.driver_id = dp.id
)
LIMIT 10
ON CONFLICT (driver_id) DO NOTHING;

-- Create a view for real-time trip status with driver info
CREATE OR REPLACE VIEW live_trip_status AS
SELECT 
    tt.*,
    tr.customer_id,
    tr.pickup_address,
    tr.delivery_address,
    tr.total_amount,
    dp.first_name as driver_first_name,
    dp.last_name as driver_last_name,
    dp.phone as driver_phone,
    dp.vehicle_plate,
    dp.vehicle_model,
    dp.rating as driver_rating,
    dl.accuracy as location_accuracy,
    dl.heading as driver_heading,
    dl.speed_kmh as driver_speed
FROM trip_tracking tt
JOIN trip_requests tr ON tt.trip_request_id = tr.id
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.id
LEFT JOIN driver_locations dl ON dp.id = dl.driver_id;

COMMENT ON TABLE trip_tracking IS 'Real-time trip tracking data for live customer updates';
COMMENT ON TABLE driver_locations IS 'Real-time driver location data for customer tracking';
COMMENT ON VIEW live_trip_status IS 'Complete live trip status with driver information for customer apps';
