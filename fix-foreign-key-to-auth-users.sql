-- FIX: Update foreign key constraint to point to auth.users instead of public.users
-- This is the root cause - the FK is pointing to wrong table!

-- Step 1: Drop the incorrect foreign key constraint
ALTER TABLE trucks DROP CONSTRAINT trucks_current_driver_id_fkey;

-- Step 2: Add the correct foreign key constraint pointing to auth.users
ALTER TABLE trucks ADD CONSTRAINT trucks_current_driver_id_fkey 
    FOREIGN KEY (current_driver_id) REFERENCES auth.users(id);

-- Step 3: Verify the fix
SELECT 
    'FIXED_FK_CONSTRAINT' as check_type,
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

-- Step 4: Test - show pending drivers ready for approval
SELECT 
  'READY_FOR_APPROVAL' as status,
  first_name,
  phone,
  user_id,
  approval_status,
  is_approved,
  truck_added_to_fleet,
  vehicle_plate
FROM driver_profiles 
WHERE approval_status = 'pending' OR is_approved = false;
