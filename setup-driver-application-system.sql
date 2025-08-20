-- Professional Driver Application & Approval System
-- Adds missing fields for proper admin workflow

-- Add approval and verification fields to driver_profiles
ALTER TABLE driver_profiles
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create driver applications table for tracking the full application process
CREATE TABLE IF NOT EXISTS driver_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    driver_profile_id UUID REFERENCES driver_profiles(id),
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address JSONB NOT NULL, -- {street, city, state, postal_code, country}
    date_of_birth DATE,
    
    -- Driver License Information
    license_number VARCHAR(50) NOT NULL,
    license_class VARCHAR(10) NOT NULL, -- CDL, etc.
    license_expiry_date DATE NOT NULL,
    license_state VARCHAR(50) NOT NULL,
    
    -- Experience & Qualifications
    years_experience INTEGER NOT NULL,
    specializations JSONB, -- Same as driver_profiles
    previous_employers JSONB, -- Array of employer objects
    certifications JSONB, -- Array of certification objects
    
    -- Vehicle Information (if providing own vehicle)
    owns_vehicle BOOLEAN DEFAULT FALSE,
    vehicle_info JSONB, -- {make, model, year, license_plate, insurance_policy}
    
    -- Application Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, under_review, approved, rejected
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES auth.users(id),
    
    -- Admin Decision
    is_approved BOOLEAN DEFAULT FALSE,
    rejection_reason TEXT,
    admin_notes TEXT,
    
    -- Document References
    documents JSONB, -- Array of document objects with file URLs
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create document storage table for driver application documents
CREATE TABLE IF NOT EXISTS driver_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_application_id UUID REFERENCES driver_applications(id),
    driver_profile_id UUID REFERENCES driver_profiles(id),
    
    -- Document Information
    document_type VARCHAR(50) NOT NULL, -- license, vehicle_registration, insurance, inspection, etc.
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Verification Status
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES auth.users(id),
    verification_notes TEXT,
    
    -- Expiry for time-sensitive documents
    expires_at DATE,
    
    -- Timestamps
    uploaded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create vehicle verification table for professional vehicle management
CREATE TABLE IF NOT EXISTS vehicle_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID REFERENCES trucks(id),
    driver_profile_id UUID REFERENCES driver_profiles(id),
    
    -- Verification Details
    verification_type VARCHAR(50) NOT NULL, -- registration, insurance, inspection, safety
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES auth.users(id),
    
    -- Document Reference
    document_id UUID REFERENCES driver_documents(id),
    
    -- Verification Notes
    notes TEXT,
    rejection_reason TEXT,
    
    -- Expiry Information
    expires_at DATE,
    renewal_required BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_applications_user_id ON driver_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_applications_status ON driver_applications(status);
CREATE INDEX IF NOT EXISTS idx_driver_documents_application_id ON driver_documents(driver_application_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_type ON driver_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_verifications_truck_id ON vehicle_verifications(truck_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_verifications_status ON vehicle_verifications(status);

-- Update existing driver profiles to have proper approval status
UPDATE driver_profiles 
SET 
    is_approved = TRUE,
    verification_status = 'approved',
    application_submitted_at = created_at,
    approved_at = created_at
WHERE id IS NOT NULL;

-- Add RLS policies for driver applications
ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_verifications ENABLE ROW LEVEL SECURITY;

-- Drivers can view and edit their own applications
CREATE POLICY "Drivers can view own applications" ON driver_applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Drivers can create applications" ON driver_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own pending applications" ON driver_applications
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Drivers can manage their own documents
CREATE POLICY "Drivers can view own documents" ON driver_documents
    FOR SELECT USING (
        driver_application_id IN (
            SELECT id FROM driver_applications WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Drivers can upload documents" ON driver_documents
    FOR INSERT WITH CHECK (
        driver_application_id IN (
            SELECT id FROM driver_applications WHERE user_id = auth.uid()
        )
    );

-- Admin policies (will be added when admin system is ready)
-- CREATE POLICY "Admins can manage all applications" ON driver_applications
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

COMMENT ON TABLE driver_applications IS 'Driver application submissions for admin review and approval';
COMMENT ON TABLE driver_documents IS 'Documents uploaded by drivers for verification';
COMMENT ON TABLE vehicle_verifications IS 'Vehicle verification records for professional fleet management';
