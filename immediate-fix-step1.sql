-- =============================================================================
-- IMMEDIATE FIX - STEP 1: Create Materials Table
-- =============================================================================
-- Run this FIRST in your Supabase SQL Editor to fix order creation issue

CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_materials_category ON materials(category);
CREATE INDEX idx_materials_available ON materials(is_available);
CREATE INDEX idx_materials_name ON materials(name);
