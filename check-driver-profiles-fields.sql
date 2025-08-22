-- Check all fields in the driver_profiles table
-- Execute this to see the current table structure

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
