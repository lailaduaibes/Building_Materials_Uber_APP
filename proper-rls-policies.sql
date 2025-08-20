-- Better RLS Policies for Driver Profile Management
-- This allows drivers to manage their own profiles while protecting approval fields

-- First, let's see what policies exist
SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'driver_profiles';

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Drivers can read their own profile" ON driver_profiles;
DROP POLICY IF EXISTS "Drivers can update their own profile" ON driver_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON driver_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON driver_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON driver_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON driver_profiles;

-- NEW PROPER POLICIES:

-- 1. Drivers can read their own profile (they need this to see their status)
CREATE POLICY "drivers_can_read_own_profile" ON driver_profiles
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 2. Drivers can INSERT their initial profile when they register
CREATE POLICY "drivers_can_create_profile" ON driver_profiles
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id AND
        -- Set safe defaults for approval fields
        is_approved = FALSE AND
        approval_status = 'pending'
    );

-- 3. Drivers can UPDATE their basic info BUT NOT approval fields
CREATE POLICY "drivers_can_update_basic_info" ON driver_profiles
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND
        -- Drivers CANNOT change approval-related fields
        OLD.is_approved = NEW.is_approved AND
        OLD.approval_status = NEW.approval_status AND
        OLD.approved_at = NEW.approved_at AND
        OLD.approved_by = NEW.approved_by AND
        OLD.rejection_reason = NEW.rejection_reason AND
        OLD.admin_notes = NEW.admin_notes AND
        -- But they CAN update their personal/vehicle info
        NEW.user_id = OLD.user_id  -- Cannot change user_id
    );

-- 4. Service role (admin dashboard) can do everything
CREATE POLICY "admin_full_access" ON driver_profiles
    FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. Dispatchers can read all profiles (for trip assignment)
CREATE POLICY "dispatchers_can_read_all" ON driver_profiles
    FOR SELECT 
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        -- Add dispatcher role check here if you have user roles table
        TRUE  -- For now allow reading, you can restrict this later
    );

-- Enable RLS on the table
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Verify the new policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'driver_profiles'
ORDER BY policyname;
