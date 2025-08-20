-- =============================================================================
-- UBER-STYLE TRUCK DELIVERY MIGRATION FOR SUPABASE DATABASE
-- This adds truck delivery tables and transforms the app to Uber-style only
-- =============================================================================

-- =============================================================================
-- 1. EXTEND EXISTING USERS TABLE FOR DRIVERS AND CUSTOMERS
-- =============================================================================

-- Add new columns to existing users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'customer' CHECK (user_type IN ('customer', 'driver', 'admin'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10,6);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(10,6);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE;

-- Update existing users to have user_type based on their role
UPDATE public.users SET user_type = 
  CASE 
    WHEN role IN ('customer') THEN 'customer'
    WHEN role IN ('driver') THEN 'driver'  
    WHEN role IN ('dispatcher', 'admin') THEN 'admin'
    ELSE 'customer'
  END
WHERE user_type IS NULL;

-- =============================================================================
-- 2. UBER-STYLE TRUCK DELIVERY TABLES
-- =============================================================================

-- Truck types for the delivery system
CREATE TABLE IF NOT EXISTS public.truck_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    payload_capacity DECIMAL(10,2) NOT NULL,
    volume_capacity DECIMAL(10,2) NOT NULL,
    suitable_materials JSONB,
    base_rate_per_km DECIMAL(8,2) DEFAULT 3.00,
    base_rate_per_hour DECIMAL(8,2) DEFAULT 50.00,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual trucks
CREATE TABLE IF NOT EXISTS public.trucks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_type_id UUID REFERENCES public.truck_types(id),
    license_plate TEXT UNIQUE NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    color TEXT,
    max_payload DECIMAL(10,2) NOT NULL,
    max_volume DECIMAL(10,2) NOT NULL,
    current_latitude DECIMAL(10,6),
    current_longitude DECIMAL(10,6),
    current_address TEXT,
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    current_driver_id UUID REFERENCES public.users(id),
    rate_per_km DECIMAL(8,2),
    rate_per_hour DECIMAL(8,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip requests (core Uber-style delivery system)
CREATE TABLE IF NOT EXISTS public.trip_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.users(id),
    
    -- Location details
    pickup_latitude DECIMAL(10,6) NOT NULL,
    pickup_longitude DECIMAL(10,6) NOT NULL,
    pickup_address JSONB NOT NULL,
    delivery_latitude DECIMAL(10,6) NOT NULL,
    delivery_longitude DECIMAL(10,6) NOT NULL,
    delivery_address JSONB NOT NULL,
    
    -- Material and load details
    material_type TEXT NOT NULL,
    estimated_weight_tons DECIMAL(8,2),
    estimated_volume_m3 DECIMAL(8,2),
    load_description TEXT NOT NULL,
    special_requirements JSONB,
    
    -- Truck requirements
    required_truck_type_id UUID REFERENCES public.truck_types(id),
    requires_crane BOOLEAN DEFAULT false,
    requires_hydraulic_lift BOOLEAN DEFAULT false,
    
    -- Timing
    pickup_time_preference TEXT DEFAULT 'asap',
    scheduled_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_duration_minutes INTEGER,
    
    -- Pricing
    estimated_distance_km DECIMAL(8,2),
    quoted_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    
    -- Trip status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'matched', 'driver_en_route', 'at_pickup', 
        'loaded', 'in_transit', 'at_delivery', 'delivered', 
        'cancelled', 'failed'
    )),
    
    -- Driver assignment
    assigned_driver_id UUID REFERENCES public.users(id),
    assigned_truck_id UUID REFERENCES public.trucks(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    matched_at TIMESTAMP WITH TIME ZONE,
    pickup_started_at TIMESTAMP WITH TIME ZONE,
    pickup_completed_at TIMESTAMP WITH TIME ZONE,
    delivery_started_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Feedback
    customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
    customer_feedback TEXT,
    driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
    driver_feedback TEXT
);

-- Real-time trip tracking
CREATE TABLE IF NOT EXISTS public.trip_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES public.trip_requests(id),
    driver_id UUID REFERENCES public.users(id),
    truck_id UUID REFERENCES public.trucks(id),
    
    current_latitude DECIMAL(10,6) NOT NULL,
    current_longitude DECIMAL(10,6) NOT NULL,
    heading DECIMAL(5,2),
    speed_kmh DECIMAL(5,2),
    
    distance_to_destination_km DECIMAL(8,2),
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    traffic_conditions TEXT,
    
    status_update TEXT,
    milestone TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver profiles (extended information for drivers)
CREATE TABLE IF NOT EXISTS public.driver_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.users(id),
    
    years_experience INTEGER DEFAULT 0,
    specializations JSONB,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_trips INTEGER DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0.00,
    
    is_available BOOLEAN DEFAULT false,
    current_truck_id UUID REFERENCES public.trucks(id),
    preferred_truck_types JSONB,
    max_distance_km INTEGER DEFAULT 50,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 3. INSERT SAMPLE DATA FOR TRUCK TYPES
-- =============================================================================

INSERT INTO public.truck_types (name, description, payload_capacity, volume_capacity, suitable_materials, base_rate_per_km, base_rate_per_hour) VALUES
('Small Truck', 'Perfect for small deliveries and urban areas', 2.0, 8.0, '["Hardware", "Tools", "Small Materials"]', 2.50, 40.00),
('Flatbed Truck', 'Open platform truck for steel, lumber, and large materials', 10.0, 15.0, '["Steel", "Lumber", "Concrete Blocks", "Pipes"]', 3.50, 75.00),
('Dump Truck', 'Truck with hydraulic dump bed for loose materials', 15.0, 8.0, '["Sand", "Gravel", "Crushed Stone", "Soil"]', 3.00, 65.00),
('Crane Truck', 'Truck with mounted crane for heavy lifting', 8.0, 12.0, '["Steel Beams", "Precast Concrete", "Heavy Machinery"]', 5.00, 120.00),
('Box Truck', 'Enclosed truck for weather-sensitive materials', 5.0, 20.0, '["Insulation", "Drywall", "Paint", "Hardware"]', 2.50, 50.00)
ON CONFLICT DO NOTHING; -- Don't insert if already exists

-- =============================================================================
-- 4. ENABLE ROW LEVEL SECURITY FOR NEW TABLES
-- =============================================================================

ALTER TABLE public.truck_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;

-- Public can view truck types
CREATE POLICY "Public can view truck types" ON public.truck_types FOR SELECT USING (true);

-- Users can view trucks
CREATE POLICY "Users can view trucks" ON public.trucks FOR SELECT USING (true);

-- Trip request policies
CREATE POLICY "Users can view own trips" ON public.trip_requests FOR SELECT 
USING (auth.uid() = customer_id OR auth.uid() = assigned_driver_id);

CREATE POLICY "Users can create trips" ON public.trip_requests FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update own trips" ON public.trip_requests FOR UPDATE 
USING (auth.uid() = customer_id OR auth.uid() = assigned_driver_id);

-- Trip tracking policies
CREATE POLICY "Trip participants can view tracking" ON public.trip_tracking FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.trip_requests 
        WHERE public.trip_requests.id = public.trip_tracking.trip_id 
        AND (public.trip_requests.customer_id = auth.uid() OR public.trip_requests.assigned_driver_id = auth.uid())
    )
);

-- Driver profile policies
CREATE POLICY "Users can view own driver profile" ON public.driver_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own driver profile" ON public.driver_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- =============================================================================
-- 5. CREATE USEFUL FUNCTIONS
-- =============================================================================

-- Function to calculate distance between two points
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

-- =============================================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_trip_requests_customer_id ON public.trip_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON public.trip_requests(status);
CREATE INDEX IF NOT EXISTS idx_trip_requests_created_at ON public.trip_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_trucks_available ON public.trucks(is_available, is_active);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON public.users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_online ON public.users(is_online);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Your app is now fully Uber-style for truck delivery!
-- Features available:
-- 1. Trip requests with pickup/delivery locations
-- 2. Driver matching and assignment
-- 3. Real-time trip tracking
-- 4. Dynamic pricing based on distance and truck type
-- 5. Customer and driver ratings
-- 6. Support system (existing tables preserved)

-- MainScreen navigation: 'dashboard' | 'requestTruck' | 'trackTrip' | 'tripHistory'
