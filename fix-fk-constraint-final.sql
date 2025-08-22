-- FIX FOREIGN KEY CONSTRAINT ISSUE
-- The issue is that trucks.current_driver_id references users.id but the constraint is failing

-- STEP 1: First, let's check which schema the users table is in and verify the constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    tc.table_schema,
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'trucks'
AND kcu.column_name = 'current_driver_id';

-- STEP 2: Check if Laila's user exists in auth.users (Supabase auth schema)
SELECT 
    'AUTH.USERS CHECK' as check_type,
    id, 
    email,
    created_at
FROM auth.users 
WHERE id = '635ba037-656d-4b2f-98da-7d0b609b5886';

-- STEP 3: Check if there are users in public.users (if it exists)
SELECT 
    'PUBLIC.USERS CHECK' as check_type,
    COUNT(*) as total_users
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'users';

-- STEP 4: If public.users exists, check for Laila's record there
-- (This will only run if public.users table exists)

-- STEP 5: Fix the foreign key constraint to point to the correct users table
-- Drop the existing constraint
ALTER TABLE trucks DROP CONSTRAINT IF EXISTS trucks_current_driver_id_fkey;

-- Recreate the constraint pointing to auth.users.id (the correct Supabase users table)
ALTER TABLE trucks ADD CONSTRAINT trucks_current_driver_id_fkey 
    FOREIGN KEY (current_driver_id) REFERENCES auth.users(id);

-- STEP 6: Update the trigger to ensure it works correctly
CREATE OR REPLACE FUNCTION auto_add_approved_driver_truck()
RETURNS TRIGGER 
SECURITY DEFINER -- This bypasses RLS
SET search_path = public
AS $$
DECLARE
    truck_type_id_to_use UUID;
    new_truck_type_id UUID;
    new_truck_id UUID;
    user_exists BOOLEAN := false;
BEGIN
    -- Only proceed if driver was just approved and truck not yet added to fleet
    IF NEW.is_approved = true 
       AND OLD.is_approved = false 
       AND NEW.truck_added_to_fleet = false 
       AND NEW.vehicle_plate IS NOT NULL 
       AND NEW.vehicle_plate != 'TBD'
       AND NEW.user_id IS NOT NULL THEN

        -- ✅ CRITICAL FIX: Verify user exists in auth.users
        SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.user_id) INTO user_exists;
        
        IF NOT user_exists THEN
            RAISE EXCEPTION 'User with ID % does not exist in auth.users table', NEW.user_id;
        END IF;

        RAISE NOTICE 'Starting truck creation for driver: user_id=%, vehicle_plate=%', NEW.user_id, NEW.vehicle_plate;

        -- Case 1: Driver selected existing truck type
        IF NEW.selected_truck_type_id IS NOT NULL AND NEW.has_custom_truck_type = false THEN
            truck_type_id_to_use := NEW.selected_truck_type_id;
            
        -- Case 2: Driver requested custom truck type - create new truck type
        ELSIF NEW.has_custom_truck_type = true AND NEW.custom_truck_type_name IS NOT NULL THEN
            -- Create new truck type based on driver's request
            INSERT INTO truck_types (
                name,
                description,
                payload_capacity,
                volume_capacity,
                suitable_materials,
                base_rate_per_km,
                base_rate_per_hour,
                is_active
            ) VALUES (
                NEW.custom_truck_type_name,
                COALESCE(NEW.custom_truck_description, 'Driver-requested truck type'),
                COALESCE(NEW.vehicle_max_payload, 5.0),
                COALESCE(NEW.vehicle_max_volume, 10.0),
                '["General", "Building Materials"]'::jsonb,
                2.50,
                60.00,
                true
            ) RETURNING id INTO new_truck_type_id;
            
            truck_type_id_to_use := new_truck_type_id;
            
            -- Update driver profile with the new truck type ID
            NEW.selected_truck_type_id := new_truck_type_id;
        ELSE
            -- Fallback: use default Small Truck type
            truck_type_id_to_use := (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1);
        END IF;

        -- ✅ FIXED: Add truck to fleet with verified user_id
        INSERT INTO trucks (
            truck_type_id,
            license_plate,
            make,
            model,
            year,
            max_payload,
            max_volume,
            current_driver_id,
            is_available,
            is_active
        ) VALUES (
            truck_type_id_to_use,
            NEW.vehicle_plate,
            COALESCE(SPLIT_PART(NEW.vehicle_model, ' ', 1), 'Unknown'),
            COALESCE(SUBSTRING(NEW.vehicle_model FROM POSITION(' ' IN NEW.vehicle_model) + 1), NEW.vehicle_model),
            COALESCE(NEW.vehicle_year, 2020),
            COALESCE(NEW.vehicle_max_payload, 5.0),
            COALESCE(NEW.vehicle_max_volume, 10.0),
            NEW.user_id, -- Now references auth.users.id correctly
            NEW.is_available,
            true
        ) RETURNING id INTO new_truck_id;

        -- ✅ KEY FIX: Set current_truck_id in driver profile
        NEW.current_truck_id := new_truck_id;
        NEW.truck_added_to_fleet := true;
        
        RAISE NOTICE '✅ Created truck % and linked to driver % (profile_id: %)', new_truck_id, NEW.user_id, NEW.id;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 7: Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_add_driver_truck ON driver_profiles;
CREATE TRIGGER trigger_auto_add_driver_truck
  BEFORE UPDATE ON driver_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_approved_driver_truck();

-- STEP 8: Verify the fix by checking constraint information
SELECT 
    'CONSTRAINT VERIFICATION' as check_type,
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'trucks'
AND kcu.column_name = 'current_driver_id';

-- STEP 9: Test with pending drivers
SELECT 
  'READY FOR TESTING' as status,
  first_name,
  phone,
  user_id,
  approval_status,
  is_approved,
  truck_added_to_fleet
FROM driver_profiles 
WHERE approval_status = 'pending' OR is_approved = false;
