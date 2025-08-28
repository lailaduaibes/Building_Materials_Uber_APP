-- Create trip_requests table for real-time ASAP trip matching
-- This table handles the Uber-style driver matching process

CREATE TABLE IF NOT EXISTS trip_requests (
    id TEXT PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
    
    -- Trip details for quick driver decision
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    material_type TEXT NOT NULL DEFAULT 'General Materials',
    estimated_earnings DECIMAL(10,2) NOT NULL DEFAULT 0,
    estimated_duration INTEGER NOT NULL DEFAULT 30, -- in minutes
    
    -- Request timing
    acceptance_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    UNIQUE(trip_id, driver_id), -- Prevent duplicate requests to same driver
    INDEX idx_trip_requests_driver_status (driver_id, status),
    INDEX idx_trip_requests_trip_status (trip_id, status),
    INDEX idx_trip_requests_deadline (acceptance_deadline)
);

-- Enable RLS
ALTER TABLE trip_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drivers can only see their own trip requests
CREATE POLICY "Drivers can view their own trip requests"
    ON trip_requests
    FOR SELECT
    USING (driver_id = auth.uid());

-- Drivers can update their own trip requests (accept/decline)
CREATE POLICY "Drivers can update their own trip requests"
    ON trip_requests
    FOR UPDATE
    USING (driver_id = auth.uid())
    WITH CHECK (driver_id = auth.uid());

-- System can insert trip requests for any driver
CREATE POLICY "System can insert trip requests"
    ON trip_requests
    FOR INSERT
    WITH CHECK (true);

-- System can update any trip request (for cleanup/expiry)
CREATE POLICY "System can update trip requests"
    ON trip_requests
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_trip_requests_updated_at()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trip_requests_updated_at
    BEFORE UPDATE ON trip_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_requests_updated_at();

-- Add new status to trips table for ASAP handling
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS no_drivers_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS matching_started_at TIMESTAMP WITH TIME ZONE;

-- Update existing trips status enum if needed
DO $$
BEGIN
    -- Add new status options for ASAP trip handling
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname = 'trip_status' AND e.enumlabel = 'no_drivers_available'
    ) THEN
        ALTER TYPE trip_status ADD VALUE 'no_drivers_available';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname = 'trip_status' AND e.enumlabel = 'no_drivers_accepted'
    ) THEN
        ALTER TYPE trip_status ADD VALUE 'no_drivers_accepted';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname = 'trip_status' AND e.enumlabel = 'matching'
    ) THEN
        ALTER TYPE trip_status ADD VALUE 'matching';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Values already exist, continue
        NULL;
END
$$;

-- Function to clean up expired trip requests
CREATE OR REPLACE FUNCTION cleanup_expired_trip_requests()
    RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update expired requests
    UPDATE trip_requests 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND acceptance_deadline < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log cleanup
    INSERT INTO system_logs (level, message, metadata, created_at)
    VALUES ('info', 'Cleaned up expired trip requests', 
            jsonb_build_object('expired_count', expired_count), NOW());
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Add driver location tracking table if not exists
CREATE TABLE IF NOT EXISTS driver_locations (
    driver_id UUID PRIMARY KEY REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2), -- GPS accuracy in meters
    heading DECIMAL(5, 2), -- Direction in degrees
    speed DECIMAL(5, 2), -- Speed in km/h
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Spatial index for location queries
    INDEX idx_driver_locations_coords (latitude, longitude),
    INDEX idx_driver_locations_updated (updated_at)
);

-- Enable RLS on driver_locations
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_locations
CREATE POLICY "Drivers can update their own location"
    ON driver_locations
    FOR ALL
    USING (driver_id = auth.uid())
    WITH CHECK (driver_id = auth.uid());

-- System can read all driver locations for matching
CREATE POLICY "System can read driver locations"
    ON driver_locations
    FOR SELECT
    USING (true);

-- Add indexes for trip matching performance
CREATE INDEX IF NOT EXISTS idx_trips_asap_matching 
    ON trips(pickup_time_preference, status, created_at) 
    WHERE pickup_time_preference = 'asap';

CREATE INDEX IF NOT EXISTS idx_driver_profiles_availability 
    ON driver_profiles(is_online, availability_status, max_weight_capacity) 
    WHERE is_online = true AND availability_status = 'available';

-- Add comments
COMMENT ON TABLE trip_requests IS 'Real-time trip requests for ASAP driver matching - Uber-style dispatch';
COMMENT ON TABLE driver_locations IS 'Real-time driver location tracking for proximity-based matching';
COMMENT ON FUNCTION cleanup_expired_trip_requests IS 'Cleans up expired trip requests that were not accepted in time';
