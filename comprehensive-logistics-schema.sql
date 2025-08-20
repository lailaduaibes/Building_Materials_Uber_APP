-- =============================================================================
-- COMPREHENSIVE BUILDING MATERIALS LOGISTICS PLATFORM DATABASE SCHEMA
-- "Uber for Building Materials" - Complete Database Structure
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For advanced location features
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- =============================================================================
-- 1. MATERIALS CATALOG SYSTEM
-- =============================================================================

-- Materials table (enhanced version of what you need to add)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    unit VARCHAR(50) NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    weight_per_unit DECIMAL(10,3), -- kg per unit
    volume_per_unit DECIMAL(10,3), -- m3 per unit
    is_hazardous BOOLEAN DEFAULT false,
    requires_special_handling BOOLEAN DEFAULT false,
    handling_instructions TEXT,
    image_url TEXT,
    supplier_id UUID,
    is_available BOOLEAN DEFAULT true,
    seasonal_availability JSONB, -- {"available_months": [1,2,3,4,5,6,7,8,9,10,11,12]}
    quality_grade VARCHAR(50),
    compliance_certifications JSONB, -- ISO, CE, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material categories lookup
CREATE TABLE IF NOT EXISTS material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Material suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address JSONB,
    rating DECIMAL(3,2), -- 1.00 to 5.00
    is_verified BOOLEAN DEFAULT false,
    payment_terms VARCHAR(100),
    delivery_capacity JSONB, -- max orders per day, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 2. COMPREHENSIVE TRUCK/VEHICLE SYSTEM
-- =============================================================================

-- Vehicle types and specifications
CREATE TABLE IF NOT EXISTS vehicle_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- Flatbed, Dump, Mixer, Crane, etc.
    description TEXT,
    typical_payload_capacity DECIMAL(10,2), -- in tons
    typical_volume_capacity DECIMAL(10,2), -- in m3
    special_equipment JSONB, -- cranes, hydraulics, etc.
    suitable_materials JSONB, -- array of material types
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Individual vehicles/trucks
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_type_id UUID REFERENCES vehicle_types(id),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(30),
    vin VARCHAR(50),
    
    -- Capacity and specifications
    payload_capacity DECIMAL(10,2) NOT NULL, -- max weight in tons
    volume_capacity DECIMAL(10,2) NOT NULL, -- max volume in m3
    bed_length DECIMAL(8,2), -- in meters
    bed_width DECIMAL(8,2), -- in meters
    bed_height DECIMAL(8,2), -- in meters
    
    -- Special equipment and features
    has_crane BOOLEAN DEFAULT false,
    crane_capacity DECIMAL(8,2), -- in tons
    has_hydraulic_lift BOOLEAN DEFAULT false,
    has_side_loader BOOLEAN DEFAULT false,
    has_tail_lift BOOLEAN DEFAULT false,
    is_refrigerated BOOLEAN DEFAULT false,
    has_tarp_cover BOOLEAN DEFAULT false,
    special_equipment JSONB,
    
    -- Vehicle condition and status
    condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 10),
    mileage INTEGER,
    fuel_type VARCHAR(20) CHECK (fuel_type IN ('diesel', 'petrol', 'electric', 'hybrid')),
    fuel_efficiency DECIMAL(5,2), -- km per liter
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    maintenance_notes TEXT,
    
    -- Insurance and legal
    insurance_policy_number VARCHAR(100),
    insurance_expiry DATE,
    registration_expiry DATE,
    safety_inspection_expiry DATE,
    
    -- Location and availability
    current_location POINT, -- GPS coordinates
    current_address TEXT,
    home_depot_id UUID,
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    
    -- Pricing
    base_rate_per_km DECIMAL(8,2),
    base_rate_per_hour DECIMAL(8,2),
    minimum_charge DECIMAL(8,2),
    
    -- Owner/Company info
    owner_id UUID REFERENCES users(id),
    fleet_company VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle maintenance records
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id),
    maintenance_type VARCHAR(50) NOT NULL, -- routine, repair, inspection
    description TEXT NOT NULL,
    cost DECIMAL(10,2),
    service_provider VARCHAR(255),
    maintenance_date DATE NOT NULL,
    next_service_due DATE,
    is_safety_related BOOLEAN DEFAULT false,
    documents JSONB, -- receipts, certificates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 3. ENHANCED DRIVER SYSTEM
-- =============================================================================

-- Driver profiles (extends users table)
CREATE TABLE IF NOT EXISTS driver_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id),
    
    -- License information
    drivers_license_number VARCHAR(50) NOT NULL,
    license_class VARCHAR(10) NOT NULL, -- A, B, C, CDL, etc.
    license_expiry DATE NOT NULL,
    
    -- Certifications
    hazmat_certified BOOLEAN DEFAULT false,
    hazmat_expiry DATE,
    crane_operator_certified BOOLEAN DEFAULT false,
    crane_certification_expiry DATE,
    heavy_machinery_certified BOOLEAN DEFAULT false,
    first_aid_certified BOOLEAN DEFAULT false,
    other_certifications JSONB,
    
    -- Experience and ratings
    years_experience INTEGER DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 5.00
    rating_count INTEGER DEFAULT 0,
    specializations JSONB, -- types of materials they're expert in
    
    -- Availability and working preferences
    is_available BOOLEAN DEFAULT false,
    working_status VARCHAR(20) DEFAULT 'offline' CHECK (working_status IN ('offline', 'available', 'busy', 'break')),
    max_hours_per_day INTEGER DEFAULT 8,
    preferred_vehicle_types JSONB,
    work_radius_km INTEGER DEFAULT 50,
    
    -- Current assignment
    current_vehicle_id UUID REFERENCES vehicles(id),
    current_location POINT,
    last_location_update TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0.00, -- percentage
    customer_satisfaction_rate DECIMAL(5,2) DEFAULT 0.00,
    safety_score INTEGER DEFAULT 100 CHECK (safety_score BETWEEN 0 AND 100),
    
    -- Emergency contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver availability schedule
CREATE TABLE IF NOT EXISTS driver_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES driver_profiles(id),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    vehicle_id UUID REFERENCES vehicles(id), -- preferred vehicle for this slot
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver-vehicle assignments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS driver_vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES driver_profiles(id),
    vehicle_id UUID REFERENCES vehicles(id),
    assigned_date DATE NOT NULL,
    unassigned_date DATE,
    is_primary BOOLEAN DEFAULT false, -- primary vehicle for this driver
    assignment_type VARCHAR(20) DEFAULT 'temporary' CHECK (assignment_type IN ('permanent', 'temporary', 'shift')),
    shift_start TIME,
    shift_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, vehicle_id, assigned_date)
);

-- =============================================================================
-- 4. ENHANCED ORDER SYSTEM
-- =============================================================================

-- Updated orders table (keeping your existing structure but adding fields)
-- Note: This assumes your current orders table exists, these are additional columns to add
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5);
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source VARCHAR(50) DEFAULT 'customer_app';
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_pickup_duration INTEGER; -- minutes
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_duration INTEGER; -- minutes
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS requires_appointment BOOLEAN DEFAULT false;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5);
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_feedback TEXT;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5);
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_feedback TEXT;

-- Material-vehicle compatibility matrix
CREATE TABLE IF NOT EXISTS material_vehicle_compatibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materials(id),
    vehicle_type_id UUID REFERENCES vehicle_types(id),
    compatibility_score INTEGER CHECK (compatibility_score BETWEEN 1 AND 10), -- 10 = perfect match
    is_compatible BOOLEAN DEFAULT true,
    special_requirements TEXT,
    loading_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(material_id, vehicle_type_id)
);

-- Order tracking and status history
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    status VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50),
    changed_by UUID REFERENCES users(id),
    change_reason TEXT,
    location POINT, -- where the status change occurred
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time order tracking
CREATE TABLE IF NOT EXISTS order_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    driver_id UUID REFERENCES users(id),
    vehicle_id UUID REFERENCES vehicles(id),
    current_location POINT NOT NULL,
    heading DECIMAL(5,2), -- compass direction 0-360
    speed DECIMAL(5,2), -- km/h
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    distance_to_destination DECIMAL(8,2), -- in km
    traffic_conditions VARCHAR(20), -- light, moderate, heavy
    route_polyline TEXT, -- encoded polyline for map display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 5. DYNAMIC PRICING SYSTEM
-- =============================================================================

-- Base pricing rules
CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- base_rate, distance, material, vehicle, time, demand
    material_category VARCHAR(100),
    vehicle_type_id UUID REFERENCES vehicle_types(id),
    distance_min DECIMAL(8,2),
    distance_max DECIMAL(8,2),
    weight_min DECIMAL(8,2),
    weight_max DECIMAL(8,2),
    time_start TIME,
    time_end TIME,
    day_of_week INTEGER, -- 1=Monday, 7=Sunday
    multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    fixed_amount DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- higher priority rules override lower ones
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Surge pricing zones and times
CREATE TABLE IF NOT EXISTS surge_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(255) NOT NULL,
    zone_polygon POLYGON, -- geographic area
    surge_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason VARCHAR(255), -- high_demand, weather, event, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order pricing breakdown
CREATE TABLE IF NOT EXISTS order_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    base_price DECIMAL(10,2) NOT NULL,
    distance_fee DECIMAL(10,2) DEFAULT 0.00,
    weight_fee DECIMAL(10,2) DEFAULT 0.00,
    vehicle_fee DECIMAL(10,2) DEFAULT 0.00,
    time_multiplier DECIMAL(4,2) DEFAULT 1.00,
    surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
    fuel_surcharge DECIMAL(10,2) DEFAULT 0.00,
    loading_fee DECIMAL(10,2) DEFAULT 0.00,
    rush_delivery_fee DECIMAL(10,2) DEFAULT 0.00,
    discount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL,
    pricing_calculation JSONB, -- detailed breakdown for transparency
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 6. LOCATION AND ROUTE MANAGEMENT
-- =============================================================================

-- Service areas and zones
CREATE TABLE IF NOT EXISTS service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_name VARCHAR(255) NOT NULL,
    area_polygon POLYGON NOT NULL,
    area_type VARCHAR(50) DEFAULT 'standard', -- standard, premium, restricted
    base_delivery_fee DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    special_requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Depot/warehouse locations
CREATE TABLE IF NOT EXISTS depots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address JSONB NOT NULL,
    location POINT NOT NULL,
    depot_type VARCHAR(50), -- main, satellite, supplier
    capacity JSONB, -- storage capacity by material type
    operating_hours JSONB, -- {"mon": {"open": "08:00", "close": "17:00"}}
    contact_info JSONB,
    manager_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Route optimization cache
CREATE TABLE IF NOT EXISTS route_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_location POINT NOT NULL,
    to_location POINT NOT NULL,
    vehicle_type_id UUID REFERENCES vehicle_types(id),
    distance_km DECIMAL(8,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    route_polyline TEXT,
    traffic_conditions VARCHAR(20),
    toll_cost DECIMAL(8,2) DEFAULT 0.00,
    fuel_cost DECIMAL(8,2) DEFAULT 0.00,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- 7. COMMUNICATION SYSTEM
-- =============================================================================

-- Messages between customers, drivers, and dispatchers
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, location, voice
    content TEXT NOT NULL,
    media_url TEXT,
    location POINT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_automated BOOLEAN DEFAULT false, -- system-generated messages
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Push notifications log
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB, -- additional data for the app
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 8. PERFORMANCE ANALYTICS
-- =============================================================================

-- Daily operational metrics
CREATE TABLE IF NOT EXISTS daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    total_distance_km DECIMAL(10,2) DEFAULT 0.00,
    average_delivery_time INTEGER, -- in minutes
    customer_satisfaction_avg DECIMAL(3,2),
    driver_utilization_rate DECIMAL(5,2), -- percentage
    vehicle_utilization_rate DECIMAL(5,2), -- percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(metric_date)
);

-- Driver performance metrics
CREATE TABLE IF NOT EXISTS driver_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES driver_profiles(id),
    metric_date DATE NOT NULL,
    hours_worked DECIMAL(4,2) DEFAULT 0.00,
    orders_completed INTEGER DEFAULT 0,
    total_distance_km DECIMAL(8,2) DEFAULT 0.00,
    revenue_generated DECIMAL(10,2) DEFAULT 0.00,
    average_rating DECIMAL(3,2),
    on_time_deliveries INTEGER DEFAULT 0,
    late_deliveries INTEGER DEFAULT 0,
    customer_complaints INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, metric_date)
);

-- =============================================================================
-- 9. INDEXES FOR PERFORMANCE
-- =============================================================================

-- Materials indexes
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_available ON materials(is_available);
CREATE INDEX IF NOT EXISTS idx_materials_name_search ON materials USING gin(name gin_trgm_ops);

-- Vehicle indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_available ON vehicles(is_available);
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles USING gist(current_location);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_id);

-- Driver indexes
CREATE INDEX IF NOT EXISTS idx_driver_profiles_available ON driver_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_rating ON driver_profiles(rating);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_location ON driver_profiles USING gist(current_location);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_vehicle ON orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_created ON order_tracking(created_at);

-- Location-based indexes
CREATE INDEX IF NOT EXISTS idx_service_areas_polygon ON service_areas USING gist(area_polygon);
CREATE INDEX IF NOT EXISTS idx_depots_location ON depots USING gist(location);

-- =============================================================================
-- 10. VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Available vehicles with driver information
CREATE OR REPLACE VIEW available_vehicles AS
SELECT 
    v.*,
    vt.name as vehicle_type_name,
    dp.user_id as driver_user_id,
    u.first_name as driver_first_name,
    u.last_name as driver_last_name,
    dp.rating as driver_rating,
    dp.is_available as driver_available
FROM vehicles v
LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
LEFT JOIN driver_profiles dp ON v.id = dp.current_vehicle_id
LEFT JOIN users u ON dp.user_id = u.id
WHERE v.is_available = true AND v.is_active = true;

-- Order summary with customer and driver info
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.*,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.phone as customer_phone,
    d.first_name as driver_first_name,
    d.last_name as driver_last_name,
    dp.rating as driver_rating,
    v.license_plate as vehicle_license_plate,
    vt.name as vehicle_type_name
FROM orders o
LEFT JOIN users c ON o.customer_id = c.id
LEFT JOIN users d ON o.driver_id = d.id
LEFT JOIN driver_profiles dp ON d.id = dp.user_id
LEFT JOIN vehicles v ON o.vehicle_id = v.id
LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id;

-- =============================================================================
-- 11. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Materials: Public read access
CREATE POLICY "Public can read materials" ON materials
FOR SELECT USING (true);

-- Orders: Users can only see their own orders
CREATE POLICY "Users can read own orders" ON orders
FOR SELECT USING (
    customer_id = auth.uid() OR 
    driver_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'dispatcher'))
);

-- Driver profiles: Drivers can read/update their own profile
CREATE POLICY "Drivers can manage own profile" ON driver_profiles
FOR ALL USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'dispatcher'))
);

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- This schema provides a comprehensive foundation for your "Uber for building materials" platform
-- Run the sections you need based on your current development priorities
-- Remember to add the materials table first to fix your immediate order creation issue
