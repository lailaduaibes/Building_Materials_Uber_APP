-- WHERE ARE TRUCK DETAILS STORED WHEN DRIVERS REGISTER?
-- Let's examine the complete driver registration data flow

-- 1. DRIVER PROFILES TABLE - Where driver's vehicle info is stored during registration
SELECT 
  'DRIVER_PROFILES TABLE' as table_name,
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
  AND column_name LIKE '%vehicle%'
ORDER BY ordinal_position;

-- 2. Check actual driver data with vehicle information
SELECT 
  dp.id as driver_id,
  dp.first_name,
  dp.last_name,
  dp.vehicle_model,
  dp.vehicle_year, 
  dp.vehicle_plate,
  dp.approval_status,
  dp.is_approved
FROM driver_profiles dp
ORDER BY dp.created_at DESC
LIMIT 5;

-- 3. TRUCKS TABLE - Where company fleet vehicles are stored
SELECT 
  'TRUCKS TABLE' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'trucks'
ORDER BY ordinal_position;

-- 4. THE KEY DIFFERENCE EXPLAINED:
-- When drivers register, their vehicle info goes to DRIVER_PROFILES table
-- Company fleet vehicles go to TRUCKS table
-- The question is: Should driver vehicles also create entries in TRUCKS table?

-- 5. Current truck fleet vs driver vehicles
SELECT 
  'COMPANY FLEET' as source,
  COUNT(*) as count,
  'trucks table' as location
FROM trucks
WHERE is_available = true

UNION ALL

SELECT 
  'DRIVER VEHICLES' as source,
  COUNT(*) as count,
  'driver_profiles table' as location  
FROM driver_profiles 
WHERE vehicle_plate IS NOT NULL 
  AND vehicle_plate != 'TBD'
  AND is_approved = true;
