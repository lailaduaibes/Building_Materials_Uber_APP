-- Fix foreign key constraint issue for driver_locations table
-- The constraint is pointing to driver_profiles.id but should point to driver_profiles.user_id

-- First, let's check the current structure
SELECT 
    'Current driver_profiles structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
AND column_name IN ('id', 'user_id')
ORDER BY column_name;

-- Check what the current foreign key is referencing
SELECT 
    'Current foreign key setup:' as info,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
WHERE c.conname = 'driver_locations_driver_id_fkey';

-- Drop the incorrect foreign key constraint
ALTER TABLE driver_locations 
DROP CONSTRAINT IF EXISTS driver_locations_driver_id_fkey;

-- Create the correct foreign key constraint pointing to user_id
ALTER TABLE driver_locations 
ADD CONSTRAINT driver_locations_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES driver_profiles(user_id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Verify the fix
SELECT 
    'Fixed foreign key constraint:' as info,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
WHERE c.conname = 'driver_locations_driver_id_fkey';

-- Test the constraint by attempting an insert
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at) 
VALUES ('2bd7bd97-5cf9-431f-adfc-4ec4448be52c', 32.388841, 35.321979, NOW())
ON CONFLICT (driver_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = EXCLUDED.updated_at;

-- Verify the insert worked
SELECT 
    'Test insert result:' as info,
    driver_id,
    latitude,
    longitude,
    updated_at
FROM driver_locations 
WHERE driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

SELECT 'Foreign key constraint fixed successfully!' as status;
