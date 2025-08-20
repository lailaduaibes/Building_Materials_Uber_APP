-- Fix inconsistent truck type storage in driver_profiles
-- Some drivers have JSON strings like "[\"small_truck\"]" 
-- Others have actual arrays like ["Flatbed Truck", "Crane Truck"]

-- First, let's see the current state
SELECT 
  id, 
  first_name, 
  last_name, 
  preferred_truck_types,
  pg_typeof(preferred_truck_types) as data_type
FROM driver_profiles 
WHERE preferred_truck_types IS NOT NULL
AND preferred_truck_types != '[]'
AND preferred_truck_types != 'null'
ORDER BY first_name;

-- Fix the JSON string format issues
-- Convert string arrays to proper JSONB arrays
UPDATE driver_profiles 
SET preferred_truck_types = 
  CASE 
    WHEN pg_typeof(preferred_truck_types) = 'text'::regtype 
      AND preferred_truck_types LIKE '[%]' 
    THEN preferred_truck_types::jsonb
    ELSE preferred_truck_types
  END
WHERE preferred_truck_types IS NOT NULL
AND preferred_truck_types != '[]'
AND preferred_truck_types != 'null';

-- Verify the fix
SELECT 
  id, 
  first_name, 
  last_name, 
  preferred_truck_types,
  pg_typeof(preferred_truck_types) as data_type
FROM driver_profiles 
WHERE preferred_truck_types IS NOT NULL
AND preferred_truck_types != '[]'
AND preferred_truck_types != 'null'
ORDER BY first_name;
