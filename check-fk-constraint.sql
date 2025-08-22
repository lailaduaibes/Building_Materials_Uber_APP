-- DIAGNOSE FOREIGN KEY CONSTRAINT ISSUE
-- Check what trucks.current_driver_id actually references

-- STEP 1: Check the foreign key constraint details
SELECT 
    tc.table_name, 
    kcu.column_name, 
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
  AND tc.table_name='trucks' 
  AND kcu.column_name='current_driver_id';

-- STEP 2: Check Laila's driver profile data
SELECT 
  'LAILA PROFILE DATA' as check_type,
  dp.id as driver_profile_id,
  dp.user_id,
  dp.first_name,
  dp.vehicle_plate,
  dp.is_approved,
  dp.truck_added_to_fleet
FROM driver_profiles dp
WHERE dp.phone = '0599313811';

-- STEP 3: Check existing trucks to understand the FK relationship
SELECT 
  'EXISTING TRUCKS FK ANALYSIS' as check_type,
  t.current_driver_id,
  t.license_plate,
  dp.id as driver_profile_id,
  dp.user_id as driver_user_id,
  dp.first_name,
  CASE 
    WHEN t.current_driver_id = dp.id THEN 'FK points to driver_profiles.id' 
    WHEN t.current_driver_id = dp.user_id THEN 'FK points to driver_profiles.user_id'
    ELSE 'No match found'
  END as fk_relationship
FROM trucks t
LEFT JOIN driver_profiles dp ON (t.current_driver_id = dp.id OR t.current_driver_id = dp.user_id)
WHERE t.current_driver_id IS NOT NULL
LIMIT 5;
