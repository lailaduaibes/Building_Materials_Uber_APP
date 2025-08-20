-- Working Quick Database Update for Proper Approval System
-- Run this in Supabase SQL Editor

-- Step 1: The approval fields already exist, just ensure they have proper constraints
ALTER TABLE driver_profiles 
ADD CONSTRAINT check_approval_status 
CHECK (approval_status IN ('pending', 'under_review', 'approved', 'rejected'));

-- Step 2: Migrate existing data from specializations workaround (if needed)
UPDATE driver_profiles 
SET 
    is_approved = TRUE,
    approval_status = 'approved',
    approved_at = NOW(),
    application_submitted_at = created_at
WHERE specializations::text LIKE '%APPROVED_BY_ADMIN%' 
  AND (approval_status != 'approved' OR is_approved != TRUE);

-- Step 3: Set proper defaults for pending drivers
UPDATE driver_profiles 
SET 
    approval_status = 'pending',
    is_approved = FALSE,
    application_submitted_at = COALESCE(application_submitted_at, created_at)
WHERE approval_status IS NULL OR approval_status = '';

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_driver_profiles_approval_status ON driver_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_approved ON driver_profiles(is_approved);

-- Step 5: Drop problematic policies and create working ones
DROP POLICY IF EXISTS "Drivers can read their own profile" ON driver_profiles;
DROP POLICY IF EXISTS "Drivers can update their own profile" ON driver_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON driver_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON driver_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON driver_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON driver_profiles;
DROP POLICY IF EXISTS "drivers_can_read_own_profile" ON driver_profiles;
DROP POLICY IF EXISTS "drivers_can_create_profile" ON driver_profiles;
DROP POLICY IF EXISTS "drivers_can_update_basic_info" ON driver_profiles;
DROP POLICY IF EXISTS "admin_full_access" ON driver_profiles;

-- Step 6: Create working RLS policies

-- 1. Drivers can read their own profile
CREATE POLICY "drivers_read_own" ON driver_profiles
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 2. Drivers can create their profile
CREATE POLICY "drivers_create_profile" ON driver_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 3. Service role has full access (for admin dashboard)
CREATE POLICY "service_role_full_access" ON driver_profiles
    FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Create a function for safe driver updates (prevents approval field changes)
CREATE OR REPLACE FUNCTION safe_update_driver_profile(
    profile_first_name TEXT DEFAULT NULL,
    profile_last_name TEXT DEFAULT NULL,
    profile_phone TEXT DEFAULT NULL,
    profile_years_experience INTEGER DEFAULT NULL,
    profile_vehicle_model TEXT DEFAULT NULL,
    profile_vehicle_plate TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    updated_profile JSON;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Update only safe fields, never approval fields
    UPDATE driver_profiles 
    SET 
        first_name = COALESCE(profile_first_name, first_name),
        last_name = COALESCE(profile_last_name, last_name),
        phone = COALESCE(profile_phone, phone),
        years_experience = COALESCE(profile_years_experience, years_experience),
        vehicle_model = COALESCE(profile_vehicle_model, vehicle_model),
        vehicle_plate = COALESCE(profile_vehicle_plate, vehicle_plate),
        updated_at = NOW()
    WHERE user_id = current_user_id
    RETURNING to_json(driver_profiles.*) INTO updated_profile;
    
    IF updated_profile IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;
    
    RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Enable RLS
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Step 8: Create admin approval functions
CREATE OR REPLACE FUNCTION approve_driver_application(driver_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE driver_profiles 
    SET 
        is_approved = TRUE,
        approval_status = 'approved',
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = driver_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_driver_application(driver_id UUID, reason TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE driver_profiles 
    SET 
        is_approved = FALSE,
        approval_status = 'rejected',
        rejection_reason = reason,
        updated_at = NOW()
    WHERE id = driver_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Verify everything works
SELECT 
    'Setup completed successfully!' as status,
    COUNT(*) as total_drivers,
    COUNT(*) FILTER (WHERE is_approved = TRUE) as approved_drivers,
    COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_drivers
FROM driver_profiles;
