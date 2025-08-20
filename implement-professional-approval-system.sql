-- PROFESSIONAL DRIVER APPROVAL SYSTEM - DATABASE UPDATES
-- Execute these commands in Supabase SQL Editor

-- 1. Add approval fields to existing driver_profiles table
ALTER TABLE driver_profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS documents_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vehicle_verified BOOLEAN DEFAULT FALSE;

-- 2. Create driver_applications table for tracking application process
CREATE TABLE IF NOT EXISTS driver_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    driver_profile_id UUID REFERENCES driver_profiles(id) ON DELETE CASCADE,
    application_type TEXT NOT NULL DEFAULT 'new_driver', -- new_driver, vehicle_addition, profile_update
    status TEXT NOT NULL DEFAULT 'pending', -- pending, under_review, approved, rejected, requires_changes
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES auth.users(id),
    application_data JSONB, -- Store form data, preferences, etc.
    admin_feedback TEXT,
    priority_level INTEGER DEFAULT 1, -- 1=normal, 2=high, 3=urgent
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create driver_documents table for document management
CREATE TABLE IF NOT EXISTS driver_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    application_id UUID REFERENCES driver_applications(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- driving_license, commercial_license, insurance, vehicle_registration, identity_card, criminal_background
    document_url TEXT NOT NULL, -- Supabase Storage URL
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    verification_status TEXT DEFAULT 'pending', -- pending, verified, rejected, expired
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES auth.users(id),
    expiry_date DATE, -- For licenses and insurance
    verification_notes TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create vehicle_verifications table for vehicle inspections
CREATE TABLE IF NOT EXISTS vehicle_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL, -- initial_inspection, periodic_inspection, damage_report, maintenance_check
    status TEXT DEFAULT 'pending', -- pending, scheduled, in_progress, passed, failed, requires_repair
    inspector_id UUID REFERENCES auth.users(id), -- Admin who inspects
    inspection_date TIMESTAMP,
    inspection_location TEXT,
    inspection_notes TEXT,
    safety_rating INTEGER, -- 1-5 scale
    condition_rating INTEGER, -- 1-5 scale
    issues_found JSONB, -- Array of issues/problems
    repair_required BOOLEAN DEFAULT FALSE,
    repair_deadline DATE,
    next_inspection_date DATE,
    certification_url TEXT, -- PDF certificate
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create admin_notifications table for admin alerts
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- new_application, document_uploaded, verification_required, urgent_review
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID, -- ID of related record (application, driver, etc.)
    related_type TEXT, -- application, driver_profile, document, vehicle
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    is_read BOOLEAN DEFAULT FALSE,
    action_required BOOLEAN DEFAULT FALSE,
    action_url TEXT, -- Deep link to admin dashboard
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_profiles_verification_status ON driver_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_approved ON driver_profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_driver_applications_status ON driver_applications(status);
CREATE INDEX IF NOT EXISTS idx_driver_applications_user_id ON driver_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_profile_id ON driver_documents(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_verification_status ON driver_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_verifications_truck_id ON vehicle_verifications(truck_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_verifications_status ON vehicle_verifications(status);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_id ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);

-- 7. Add RLS policies for security

-- Driver Profiles: Drivers can read their own, admins can read all
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view their own profile" ON driver_profiles;
CREATE POLICY "Drivers can view their own profile" ON driver_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Drivers can update their own profile" ON driver_profiles;
CREATE POLICY "Drivers can update their own profile" ON driver_profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON driver_profiles;
CREATE POLICY "Admins can view all profiles" ON driver_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- Driver Applications: Users can view their own, admins can view all
ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own applications" ON driver_applications;
CREATE POLICY "Users can view their own applications" ON driver_applications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own applications" ON driver_applications;
CREATE POLICY "Users can create their own applications" ON driver_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all applications" ON driver_applications;
CREATE POLICY "Admins can manage all applications" ON driver_applications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- Driver Documents: Users can manage their own, admins can view all
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own documents" ON driver_documents;
CREATE POLICY "Users can manage their own documents" ON driver_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM driver_profiles 
            WHERE driver_profiles.id = driver_documents.driver_profile_id 
            AND driver_profiles.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all documents" ON driver_documents;
CREATE POLICY "Admins can manage all documents" ON driver_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- Vehicle Verifications: Drivers can view their own, admins can manage all
ALTER TABLE vehicle_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view their vehicle verifications" ON vehicle_verifications;
CREATE POLICY "Drivers can view their vehicle verifications" ON vehicle_verifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM driver_profiles 
            WHERE driver_profiles.id = vehicle_verifications.driver_profile_id 
            AND driver_profiles.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all vehicle verifications" ON vehicle_verifications;
CREATE POLICY "Admins can manage all vehicle verifications" ON vehicle_verifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- Admin Notifications: Only admins can access
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage their notifications" ON admin_notifications;
CREATE POLICY "Admins can manage their notifications" ON admin_notifications
    FOR ALL USING (
        auth.uid() = admin_id AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- 8. Create functions for common operations

-- Function to update driver approval status
CREATE OR REPLACE FUNCTION approve_driver(
    driver_id UUID,
    approved_by_admin UUID,
    admin_notes_text TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE driver_profiles 
    SET 
        is_approved = TRUE,
        verification_status = 'approved',
        approved_at = NOW(),
        approved_by = approved_by_admin,
        admin_notes = admin_notes_text,
        updated_at = NOW()
    WHERE id = driver_id;
    
    -- Create notification for driver
    INSERT INTO admin_notifications (
        admin_id, 
        notification_type, 
        title, 
        message, 
        related_id, 
        related_type
    ) VALUES (
        approved_by_admin,
        'driver_approved',
        'Driver Approved Successfully',
        'Driver has been approved and can now accept trips',
        driver_id,
        'driver_profile'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject driver application
CREATE OR REPLACE FUNCTION reject_driver(
    driver_id UUID,
    rejected_by_admin UUID,
    rejection_reason_text TEXT,
    admin_notes_text TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE driver_profiles 
    SET 
        is_approved = FALSE,
        verification_status = 'rejected',
        rejection_reason = rejection_reason_text,
        approved_by = rejected_by_admin,
        admin_notes = admin_notes_text,
        updated_at = NOW()
    WHERE id = driver_id;
    
    -- Create notification for admin
    INSERT INTO admin_notifications (
        admin_id, 
        notification_type, 
        title, 
        message, 
        related_id, 
        related_type
    ) VALUES (
        rejected_by_admin,
        'driver_rejected',
        'Driver Application Rejected',
        'Driver application has been rejected: ' || rejection_reason_text,
        driver_id,
        'driver_profile'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update existing driver to test the system
UPDATE driver_profiles 
SET 
    verification_status = 'under_review',
    application_submitted_at = NOW(),
    documents_verified = FALSE,
    vehicle_verified = FALSE
WHERE first_name = 'Ahmed' AND last_name = 'Driver';

-- 10. Insert sample admin notifications
INSERT INTO admin_notifications (
    admin_id,
    notification_type,
    title,
    message,
    related_type,
    priority,
    action_required
) 
SELECT 
    u.id,
    'new_driver_pending',
    'New Driver Application Pending Review',
    'Ahmed Driver has submitted application and requires verification',
    'driver_profile',
    'high',
    TRUE
FROM users u 
WHERE u.user_type = 'admin' 
LIMIT 1;

COMMENT ON TABLE driver_applications IS 'Tracks driver application submissions and review process';
COMMENT ON TABLE driver_documents IS 'Stores uploaded documents for driver verification';
COMMENT ON TABLE vehicle_verifications IS 'Vehicle inspection and certification records';
COMMENT ON TABLE admin_notifications IS 'Admin dashboard notifications and alerts';

-- Success message
SELECT 'Professional driver approval system database schema created successfully!' AS status;
