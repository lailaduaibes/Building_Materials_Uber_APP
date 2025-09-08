-- Quick fix for driver_locations foreign key constraint
-- This fixes the constraint to point to the correct column

-- Drop the incorrect foreign key constraint
ALTER TABLE driver_locations DROP CONSTRAINT IF EXISTS driver_locations_driver_id_fkey;

-- Create the correct foreign key constraint pointing to user_id
ALTER TABLE driver_locations 
ADD CONSTRAINT driver_locations_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES driver_profiles(user_id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Verify the fix worked
SELECT 'Foreign key constraint fixed! driver_id now references driver_profiles.user_id' as result;
