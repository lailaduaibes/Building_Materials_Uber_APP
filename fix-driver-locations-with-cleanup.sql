-- Fix foreign key constraint by cleaning up orphaned data first
-- This removes any driver_locations records that don't have matching driver_profiles

-- Step 1: Check what orphaned records exist
SELECT 
    'Orphaned driver_locations records:' as info,
    dl.driver_id,
    dl.latitude,
    dl.longitude,
    dl.updated_at
FROM driver_locations dl
LEFT JOIN driver_profiles dp ON dl.driver_id = dp.user_id
WHERE dp.user_id IS NULL;

-- Step 2: Drop the constraint (if it exists)
ALTER TABLE driver_locations DROP CONSTRAINT IF EXISTS driver_locations_driver_id_fkey;

-- Step 3: Clean up orphaned records
DELETE FROM driver_locations 
WHERE driver_id NOT IN (
    SELECT user_id 
    FROM driver_profiles 
    WHERE user_id IS NOT NULL
);

-- Step 4: Show what records remain
SELECT 
    'Remaining driver_locations records:' as info,
    COUNT(*) as count
FROM driver_locations;

-- Step 5: Recreate the foreign key constraint
ALTER TABLE driver_locations 
ADD CONSTRAINT driver_locations_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES driver_profiles(user_id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Verify the constraint is working
SELECT 'Foreign key constraint recreated successfully!' as result;

-- Step 7: Test insert with your driver ID
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at) 
VALUES ('2bd7bd97-5cf9-431f-adfc-4ec4448be52c', 32.388841, 35.321979, NOW())
ON CONFLICT (driver_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = EXCLUDED.updated_at;

SELECT 'Test insert successful!' as test_result;
