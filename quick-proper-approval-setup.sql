-- Quick Database Update for Proper Approval System
-- Run this in Supabase SQL Editor to implement proper approval fields

-- Step 1: Add the proper approval fields
ALTER TABLE driver_profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'under_review', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Step 2: Migrate existing data from specializations workaround
UPDATE driver_profiles 
SET 
    is_approved = TRUE,
    approval_status = 'approved',
    approved_at = NOW(),
    application_submitted_at = created_at
WHERE specializations::text LIKE '%APPROVED_BY_ADMIN%';

-- Step 3: Set proper default for new registrations
UPDATE driver_profiles 
SET 
    approval_status = 'pending',
    application_submitted_at = created_at
WHERE approval_status IS NULL;

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_driver_profiles_approval_status ON driver_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_approved ON driver_profiles(is_approved);

-- Step 5: Update RLS policies for proper security
-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Drivers can read their own profile" ON driver_profiles;
DROP POLICY IF EXISTS "Drivers can update their own profile" ON driver_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON driver_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON driver_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON driver_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON driver_profiles;

-- NEW PROPER POLICIES:

-- 1. Drivers can read their own profile (they need this to see their approval status)
CREATE POLICY "drivers_can_read_own_profile" ON driver_profiles
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 2. Drivers can INSERT their initial profile when they register
CREATE POLICY "drivers_can_create_profile" ON driver_profiles
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id AND
        -- Ensure safe defaults for approval fields
        (is_approved IS NULL OR is_approved = FALSE) AND
        (approval_status IS NULL OR approval_status = 'pending')
    );

-- 3. Drivers can UPDATE their basic info BUT NOT approval fields
-- First create a validation function
CREATE OR REPLACE FUNCTION validate_driver_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only apply this check for non-service-role users
    IF current_setting('request.jwt.claims', true)::json ->> 'role' != 'service_role' THEN
        -- Prevent drivers from changing approval fields
        IF OLD.is_approved IS DISTINCT FROM NEW.is_approved OR
           OLD.approval_status IS DISTINCT FROM NEW.approval_status OR
           OLD.approved_at IS DISTINCT FROM NEW.approved_at OR
           OLD.approved_by IS DISTINCT FROM NEW.approved_by OR
           OLD.rejection_reason IS DISTINCT FROM NEW.rejection_reason OR
           OLD.admin_notes IS DISTINCT FROM NEW.admin_notes THEN
            RAISE EXCEPTION 'Drivers cannot modify approval fields';
        END IF;
        
        -- Prevent changing user_id
        IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
            RAISE EXCEPTION 'Cannot change user_id';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_driver_profile_update ON driver_profiles;
CREATE TRIGGER validate_driver_profile_update
    BEFORE UPDATE ON driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_driver_update();

-- Simple RLS policy for updates
CREATE POLICY "drivers_can_update_basic_info" ON driver_profiles
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Service role (admin dashboard) can do everything
CREATE POLICY "admin_full_access" ON driver_profiles
    FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable RLS on the table
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create approval functions for consistency
CREATE OR REPLACE FUNCTION approve_driver(driver_id UUID, admin_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE driver_profiles 
    SET 
        is_approved = TRUE,
        approval_status = 'approved',
        approved_at = NOW(),
        approved_by = admin_user_id,
        updated_at = NOW()
    WHERE id = driver_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_driver(driver_id UUID, reason TEXT, admin_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE driver_profiles 
    SET 
        is_approved = FALSE,
        approval_status = 'rejected',
        rejection_reason = reason,
        approved_by = admin_user_id,
        updated_at = NOW()
    WHERE id = driver_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Verify the changes
SELECT 
    id,
    first_name,
    last_name,
    is_approved,
    approval_status,
    application_submitted_at,
    approved_at,
    specializations
FROM driver_profiles
ORDER BY created_at DESC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Proper approval system implemented successfully!';
    RAISE NOTICE 'Fields added: is_approved, approval_status, application_submitted_at, approved_at, approved_by, rejection_reason, admin_notes';
    RAISE NOTICE 'RLS policies updated for security';
    RAISE NOTICE 'Helper functions created: approve_driver(), reject_driver()';
END $$;
