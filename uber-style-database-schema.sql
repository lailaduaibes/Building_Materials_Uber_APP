-- =============================================================================
-- UBER-STYLE TRUCK DELIVERY PLATFORM - SUPABASE SCHEMA
-- Transform e-commerce orders into on-demand trip requests
-- Compatible with existing authentication and users table
-- =============================================================================

-- =============================================================================
-- 1. EXTEND EXISTING USERS TABLE FOR DRIVERS
-- =============================================================================

-- Add driver-specific columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'customer' CHECK (user_type IN ('customer', 'driver', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10,6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(10,6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE;

-- =============================================================================
-- 2. TRUCK TYPES AND VEHICLES
-- =============================================================================

-- Vehicle/Truck types for different materials
CREATE TABLE IF NOT EXISTS truck_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Small Truck, Flatbed, Dump Truck, Crane Truck, etc.
    description TEXT,
    payload_capacity DECIMAL(10,2), -- in tons
    volume_capacity DECIMAL(10,2), -- in m³ 
    suitable_materials JSONB, -- array of material types this truck can carry
    base_rate_per_km DECIMAL(8,2) DEFAULT 3.00, -- base pricing per kilometer
    base_rate_per_hour DECIMAL(8,2) DEFAULT 50.00, -- base pricing per hour
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual trucks/vehicles
CREATE TABLE IF NOT EXISTS trucks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_type_id UUID REFERENCES truck_types(id),
    license_plate TEXT UNIQUE NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    color TEXT,
    
    -- Capacity specifications
    max_payload DECIMAL(10,2) NOT NULL, -- maximum weight in tons
    max_volume DECIMAL(10,2) NOT NULL, -- maximum volume in m³
    
    -- Current status and location
    current_latitude DECIMAL(10,6), -- GPS coordinates
    current_longitude DECIMAL(10,6),
    current_address TEXT,
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    -- Driver assignment
    current_driver_id UUID REFERENCES users(id),
    
    -- Pricing
    rate_per_km DECIMAL(8,2),
    rate_per_hour DECIMAL(8,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 3. TRIP REQUESTS (Replaces traditional orders)
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Customer information
    customer_id UUID REFERENCES users(id),
    
    -- Location details (using separate lat/lng columns for Supabase compatibility)
    pickup_latitude DECIMAL(10,6) NOT NULL,
    pickup_longitude DECIMAL(10,6) NOT NULL,
    pickup_address JSONB NOT NULL, -- Full address details
    
    delivery_latitude DECIMAL(10,6) NOT NULL,
    delivery_longitude DECIMAL(10,6) NOT NULL,
    delivery_address JSONB NOT NULL,
    
    -- Material and load details
    material_type TEXT NOT NULL, -- 'Steel', 'Concrete', 'Sand', etc.
    estimated_weight_tons DECIMAL(8,2),
    estimated_volume_m3 DECIMAL(8,2),
    load_description TEXT NOT NULL,
    special_requirements JSONB,
    
    -- Truck requirements
    required_truck_type_id UUID REFERENCES truck_types(id),
    requires_crane BOOLEAN DEFAULT false,
    requires_hydraulic_lift BOOLEAN DEFAULT false,
    
    -- Timing
    pickup_time_preference TEXT DEFAULT 'asap', -- 'asap', 'scheduled'
    scheduled_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_duration_minutes INTEGER,
    
    -- Pricing
    estimated_distance_km DECIMAL(8,2),
    quoted_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    
    -- Trip status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',          -- Waiting for driver match
        'matched',          -- Driver assigned
        'driver_en_route',  -- Driver heading to pickup
        'at_pickup',        -- Driver arrived at pickup location
        'loaded',           -- Materials loaded
        'in_transit',       -- Driving to delivery location
        'at_delivery',      -- Arrived at delivery location
        'delivered',        -- Trip completed successfully
        'cancelled',        -- Trip cancelled
        'failed'            -- Trip failed
    )),
    
    -- Driver assignment
    assigned_driver_id UUID REFERENCES users(id),
    assigned_truck_id UUID REFERENCES trucks(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    matched_at TIMESTAMP WITH TIME ZONE,
    pickup_started_at TIMESTAMP WITH TIME ZONE,
    pickup_completed_at TIMESTAMP WITH TIME ZONE,
    delivery_started_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Customer feedback
    customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
    customer_feedback TEXT,
    driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
    driver_feedback TEXT
);

-- =============================================================================
-- 4. REAL-TIME TRIP TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trip_requests(id),
    driver_id UUID REFERENCES users(id),
    truck_id UUID REFERENCES trucks(id),
    
    -- Real-time location data
    current_latitude DECIMAL(10,6) NOT NULL,
    current_longitude DECIMAL(10,6) NOT NULL,
    heading DECIMAL(5,2), -- Compass direction 0-360
    speed_kmh DECIMAL(5,2),
    
    -- Navigation data
    distance_to_destination_km DECIMAL(8,2),
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    traffic_conditions TEXT, -- 'light', 'moderate', 'heavy'
    
    -- Status updates
    status_update TEXT,
    milestone TEXT, -- 'departed', 'arrived_pickup', 'loaded', 'en_route_delivery', 'arrived_delivery'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 5. SAMPLE DATA FOR TESTING
-- =============================================================================

-- Insert truck types
INSERT INTO truck_types (name, description, payload_capacity, volume_capacity, suitable_materials, base_rate_per_km, base_rate_per_hour) VALUES
('Small Truck', 'Perfect for small deliveries and urban areas', 2.0, 8.0, '["Hardware", "Tools", "Small Materials"]', 2.50, 40.00),
('Flatbed Truck', 'Open platform truck for steel, lumber, and large materials', 10.0, 15.0, '["Steel", "Lumber", "Concrete Blocks", "Pipes"]', 3.50, 75.00),
('Dump Truck', 'Truck with hydraulic dump bed for loose materials', 15.0, 8.0, '["Sand", "Gravel", "Crushed Stone", "Soil"]', 3.00, 65.00),
('Crane Truck', 'Truck with mounted crane for heavy lifting', 8.0, 12.0, '["Steel Beams", "Precast Concrete", "Heavy Machinery"]', 5.00, 120.00),
('Box Truck', 'Enclosed truck for weather-sensitive materials', 5.0, 20.0, '["Insulation", "Drywall", "Paint", "Hardware"]', 2.50, 50.00);

-- =============================================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS) FOR SUPABASE
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE truck_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_tracking ENABLE ROW LEVEL SECURITY;

-- Policies for truck_types (public read access)
CREATE POLICY "Public can view truck types" ON truck_types FOR SELECT USING (true);

-- Policies for trip_requests (customers can only see their own trips)
CREATE POLICY "Users can view own trips" ON trip_requests FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = assigned_driver_id);
CREATE POLICY "Users can create trips" ON trip_requests FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can update own trips" ON trip_requests FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = assigned_driver_id);

-- Policies for trip_tracking (only involved parties can see tracking)
CREATE POLICY "Trip participants can view tracking" ON trip_tracking FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM trip_requests 
        WHERE trip_requests.id = trip_tracking.trip_id 
        AND (trip_requests.customer_id = auth.uid() OR trip_requests.assigned_driver_id = auth.uid())
    )
);

-- =============================================================================
-- 7. USEFUL FUNCTIONS FOR THE APP
-- =============================================================================

-- Function to calculate distance between two points (approximate)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL(10,6), 
    lng1 DECIMAL(10,6), 
    lat2 DECIMAL(10,6), 
    lng2 DECIMAL(10,6)
) RETURNS DECIMAL(8,2) AS $$
DECLARE
    distance DECIMAL(8,2);
BEGIN
    -- Simple distance calculation (in km) using Haversine formula approximation
    distance := 6371 * acos(
        cos(radians(lat1)) * cos(radians(lat2)) * 
        cos(radians(lng2) - radians(lng1)) + 
        sin(radians(lat1)) * sin(radians(lat2))
    );
    RETURN distance;
END;
$$ LANGUAGE plpgsql;
    cancellation_rate DECIMAL(5,2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 3. TRIP REQUESTS TABLE (Replaces Orders)
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id),
    
    -- Trip details
    pickup_address JSONB NOT NULL, -- {street, city, state, zipCode, lat, lng}
    delivery_address JSONB NOT NULL, -- {street, city, state, zipCode, lat, lng}
    
    -- Material information
    materials JSONB NOT NULL, -- Array of materials with quantities
    total_weight DECIMAL(10,2), -- Total weight in tons
    total_volume DECIMAL(10,2), -- Total volume in m³
    
    -- Truck requirements
    required_vehicle_type_id UUID REFERENCES vehicle_types(id),
    special_requirements JSONB, -- Crane, hydraulic lift, etc.
    
    -- Trip status
    status VARCHAR(20) DEFAULT 'requested' CHECK (status IN (
        'requested', 'searching', 'driver_assigned', 'driver_enroute', 
        'pickup_arrived', 'loading', 'in_transit', 'delivery_arrived', 
        'unloading', 'completed', 'cancelled'
    )),
    
    -- Driver and truck assignment
    assigned_driver_id UUID REFERENCES users(id),
    assigned_truck_id UUID REFERENCES trucks(id),
    
    -- Timing
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pickup_time TIMESTAMP WITH TIME ZONE,
    delivery_time TIMESTAMP WITH TIME ZONE,
    estimated_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Distance and duration
    estimated_distance_km DECIMAL(8,2),
    estimated_duration_minutes INTEGER,
    actual_distance_km DECIMAL(8,2),
    actual_duration_minutes INTEGER,
    
    -- Pricing
    base_price DECIMAL(10,2),
    distance_price DECIMAL(10,2),
    time_price DECIMAL(10,2),
    surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
    total_price DECIMAL(10,2),
    
    -- Special instructions
    pickup_instructions TEXT,
    delivery_instructions TEXT,
    customer_notes TEXT,
    
    -- Ratings and feedback
    customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
    driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
    customer_feedback TEXT,
    driver_feedback TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 4. REAL-TIME TRIP TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_request_id UUID REFERENCES trip_requests(id),
    driver_id UUID REFERENCES users(id),
    truck_id UUID REFERENCES trucks(id),
    
    -- Location tracking
    current_location POINT NOT NULL,
    heading DECIMAL(5,2), -- Compass direction 0-360
    speed DECIMAL(5,2), -- Speed in km/h
    
    -- Trip progress
    distance_to_pickup DECIMAL(8,2),
    distance_to_delivery DECIMAL(8,2),
    estimated_pickup_arrival TIMESTAMP WITH TIME ZONE,
    estimated_delivery_arrival TIMESTAMP WITH TIME ZONE,
    
    -- Route information
    route_polyline TEXT, -- Encoded polyline for map display
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 5. TRIP STATUS HISTORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_request_id UUID REFERENCES trip_requests(id),
    status VARCHAR(20) NOT NULL,
    previous_status VARCHAR(20),
    
    -- Context
    changed_by UUID REFERENCES users(id), -- Who changed the status
    location POINT, -- Where the status change occurred
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 6. SURGE PRICING AND DEMAND
-- =============================================================================

CREATE TABLE IF NOT EXISTS demand_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(255) NOT NULL,
    zone_polygon POLYGON, -- Geographic area
    
    -- Current demand metrics
    active_requests INTEGER DEFAULT 0,
    available_drivers INTEGER DEFAULT 0,
    surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
    
    -- Time-based patterns
    peak_hours JSONB, -- When this zone typically has high demand
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 7. MATERIALS CATALOG (Updated for truck compatibility)
-- =============================================================================

-- Add truck compatibility to existing materials table
ALTER TABLE materials ADD COLUMN IF NOT EXISTS required_vehicle_types JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS loading_requirements JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS handling_equipment JSONB;

-- =============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- =============================================================================

-- Location-based indexes for real-time matching
CREATE INDEX IF NOT EXISTS idx_trucks_location ON trucks USING gist(current_location);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_location ON driver_profiles USING gist(current_location);
CREATE INDEX IF NOT EXISTS idx_trip_requests_pickup ON trip_requests USING gist(((pickup_address->>'lat')::float, (pickup_address->>'lng')::float));
CREATE INDEX IF NOT EXISTS idx_trip_requests_delivery ON trip_requests USING gist(((delivery_address->>'lat')::float, (delivery_address->>'lng')::float));

-- Status and availability indexes
CREATE INDEX IF NOT EXISTS idx_trucks_available ON trucks(is_available, is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_available ON driver_profiles(is_online, is_available);
CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON trip_requests(status);
CREATE INDEX IF NOT EXISTS idx_trip_requests_customer ON trip_requests(customer_id);

-- Time-based indexes
CREATE INDEX IF NOT EXISTS idx_trip_requests_requested_at ON trip_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_trip_tracking_created_at ON trip_tracking(created_at);

-- =============================================================================
-- 9. SAMPLE DATA FOR VEHICLE TYPES
-- =============================================================================

INSERT INTO vehicle_types (name, description, payload_capacity, volume_capacity, suitable_materials, base_rate_per_km, base_rate_per_hour) VALUES
('Small Pickup Truck', 'Ideal for small loads and light materials', 1.0, 3.0, '["cement", "bricks", "tiles", "hardware"]', 2.50, 45.00),
('Medium Truck', 'Standard delivery truck for most materials', 3.5, 12.0, '["cement", "steel", "bricks", "sand", "lumber", "pipes"]', 3.50, 65.00),
('Flatbed Truck', 'Perfect for steel, lumber, and long materials', 5.0, 15.0, '["steel", "lumber", "concrete_blocks", "pipes"]', 4.00, 75.00),
('Dump Truck', 'Specialized for bulk materials like sand and gravel', 10.0, 8.0, '["sand", "gravel", "concrete_blocks"]', 5.00, 85.00),
('Crane Truck', 'Heavy lifting capability for large materials', 8.0, 10.0, '["steel", "concrete_blocks", "lumber"]', 6.50, 120.00),
('Box Truck', 'Covered transport for weather-sensitive materials', 4.0, 20.0, '["cement", "tiles", "lumber", "other"]', 3.75, 70.00);

-- =============================================================================
-- 10. VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Available trucks with driver information
CREATE OR REPLACE VIEW available_trucks AS
SELECT 
    t.*,
    vt.name as vehicle_type_name,
    vt.suitable_materials,
    dp.user_id as driver_user_id,
    u.first_name as driver_first_name,
    u.last_name as driver_last_name,
    dp.rating as driver_rating,
    dp.is_online as driver_online,
    dp.is_available as driver_available
FROM trucks t
LEFT JOIN vehicle_types vt ON t.vehicle_type_id = vt.id
LEFT JOIN driver_profiles dp ON t.current_driver_id = dp.user_id
LEFT JOIN users u ON dp.user_id = u.id
WHERE t.is_available = true AND t.is_active = true;

-- Trip requests with customer and driver info
CREATE OR REPLACE VIEW trip_requests_detailed AS
SELECT 
    tr.*,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.phone as customer_phone,
    d.first_name as driver_first_name,
    d.last_name as driver_last_name,
    dp.rating as driver_rating,
    t.license_plate as truck_license_plate,
    vt.name as vehicle_type_name
FROM trip_requests tr
LEFT JOIN users c ON tr.customer_id = c.id
LEFT JOIN users d ON tr.assigned_driver_id = d.id
LEFT JOIN driver_profiles dp ON d.id = dp.user_id
LEFT JOIN trucks t ON tr.assigned_truck_id = t.id
LEFT JOIN vehicle_types vt ON t.vehicle_type_id = vt.id;

-- =============================================================================
-- 11. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own trip requests
CREATE POLICY "Customers can access own trips" ON trip_requests
FOR ALL USING (
    customer_id = auth.uid() OR 
    assigned_driver_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'dispatcher'))
);

-- Drivers can access their own profile and assigned trips
CREATE POLICY "Drivers can access own profile" ON driver_profiles
FOR ALL USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'dispatcher'))
);

-- =============================================================================
-- MIGRATION COMPLETE
-- This schema transforms your e-commerce platform into an Uber-style delivery service
-- =============================================================================
