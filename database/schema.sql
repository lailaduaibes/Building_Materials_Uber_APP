-- Building Materials Delivery App Database Schema
-- PostgreSQL Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'driver', 'dispatcher', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('small_truck', 'medium_truck', 'large_truck', 'flatbed', 'crane_truck', 'mixer_truck', 'van')),
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    max_weight DECIMAL(10,2) NOT NULL, -- in kg
    max_volume DECIMAL(10,2) NOT NULL, -- in m³
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'inactive')),
    equipment JSONB, -- stores equipment details like crane, forklift, etc.
    current_driver_id UUID REFERENCES users(id),
    location JSONB, -- stores lat, lng, address, lastUpdated
    fuel_type VARCHAR(20) NOT NULL,
    insurance_expiry DATE NOT NULL,
    registration_expiry DATE NOT NULL,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers table (extends users with driver-specific info)
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_license JSONB NOT NULL, -- license number, type, expiry, state
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'on_duty', 'off_duty', 'on_break', 'inactive')),
    current_vehicle_id UUID REFERENCES vehicles(id),
    current_order_id UUID, -- will reference orders(id)
    location JSONB, -- lat, lng, address, lastUpdated
    working_hours_start TIME,
    working_hours_end TIME,
    rating DECIMAL(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
    total_deliveries INTEGER DEFAULT 0,
    is_available_for_assignment BOOLEAN DEFAULT true,
    special_skills JSONB, -- array of skills like crane_operation, hazmat, etc.
    emergency_contact JSONB NOT NULL, -- name, phone, relationship
    hire_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('internal_delivery', 'external_delivery')),
    customer_id UUID REFERENCES users(id), -- nullable for internal orders without registered customer
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed')),
    total_weight DECIMAL(10,2) NOT NULL,
    total_volume DECIMAL(10,2) NOT NULL,
    pickup_address JSONB NOT NULL,
    delivery_address JSONB NOT NULL,
    scheduled_pickup_time TIMESTAMP WITH TIME ZONE,
    scheduled_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    driver_id UUID REFERENCES users(id),
    vehicle_id UUID REFERENCES vehicles(id),
    special_requirements JSONB, -- array of special requirements
    estimated_distance DECIMAL(10,2), -- in km
    estimated_duration INTEGER, -- in minutes
    delivery_fee DECIMAL(10,2),
    notes TEXT,
    sales_order_id VARCHAR(100), -- for internal orders from sales app
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    material_type VARCHAR(50) NOT NULL CHECK (material_type IN ('cement', 'steel', 'bricks', 'sand', 'gravel', 'concrete_blocks', 'lumber', 'pipes', 'tiles', 'other')),
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- kg, tons, pieces, m³, etc.
    weight DECIMAL(10,2) NOT NULL, -- in kg
    volume DECIMAL(10,2), -- in m³
    special_handling TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for current_order_id in drivers table
ALTER TABLE drivers ADD CONSTRAINT fk_drivers_current_order FOREIGN KEY (current_order_id) REFERENCES orders(id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(is_available_for_assignment);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_vehicle ON orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_material ON order_items(material_type);

-- Sample data for testing (optional)
-- Insert admin user
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES ('admin@buildingmaterials.com', '$2a$12$example_hash_here', 'Admin', 'User', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample vehicle
INSERT INTO vehicles (license_plate, type, brand, model, year, max_weight, max_volume, equipment, fuel_type, insurance_expiry, registration_expiry)
VALUES ('ABC-123', 'medium_truck', 'Ford', 'F-150', 2022, 3000.00, 15.00, '{"hasCrane": false, "hasForklift": true, "hasTailgate": true, "hasGPS": true}', 'diesel', '2025-12-31', '2025-06-30')
ON CONFLICT (license_plate) DO NOTHING;
