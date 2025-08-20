-- Simple and Working RLS Policies for Driver Approval System
-- This version avoids the OLD/NEW reference issues

-- Step 1: Drop existing policies
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

-- Step 2: Create simple working policies

-- 1. Drivers can read their own profile
CREATE POLICY "drivers_read_own" ON driver_profiles
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 2. Drivers can create their initial profile
CREATE POLICY "drivers_create_profile" ON driver_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 3. Service role (admin) has full access
CREATE POLICY "admin_full_access" ON driver_profiles
    FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Create a secure function for driver updates
CREATE OR REPLACE FUNCTION update_driver_basic_info(
    profile_id UUID,
    new_first_name TEXT DEFAULT NULL,
    new_last_name TEXT DEFAULT NULL,
    new_phone TEXT DEFAULT NULL,
    new_years_experience INTEGER DEFAULT NULL,
    new_vehicle_model TEXT DEFAULT NULL,
    new_vehicle_plate TEXT DEFAULT NULL,
    new_vehicle_year INTEGER DEFAULT NULL,
    new_license_number TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Verify the profile belongs to the current user
    IF NOT EXISTS (
        SELECT 1 FROM driver_profiles 
        WHERE id = profile_id AND user_id = current_user_id
    ) THEN
        RAISE EXCEPTION 'Profile not found or access denied';
    END IF;
    
    -- Update only allowed fields
    UPDATE driver_profiles 
    SET 
        first_name = COALESCE(new_first_name, first_name),
        last_name = COALESCE(new_last_name, last_name),
        phone = COALESCE(new_phone, phone),
        years_experience = COALESCE(new_years_experience, years_experience),
        vehicle_model = COALESCE(new_vehicle_model, vehicle_model),
        vehicle_plate = COALESCE(new_vehicle_plate, vehicle_plate),
        vehicle_year = COALESCE(new_vehicle_year, vehicle_year),
        license_number = COALESCE(new_license_number, license_number),
        updated_at = NOW()
    WHERE id = profile_id AND user_id = current_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Enable RLS
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE driver_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION update_driver_basic_info TO authenticated;

-- Test the setup
SELECT 'RLS policies created successfully!' as status;
