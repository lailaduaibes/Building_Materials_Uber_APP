-- CHECK CURRENT RLS POLICIES FOR TRUCKS AND TRUCK_TYPES
-- Run this to see what access is currently allowed

-- 1. Check truck_types table policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'truck_types';

-- 2. Check trucks table policies  
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'trucks';

-- 3. Check what data is exposed in trucks table
SELECT 
    'EXAMPLE TRUCK DATA VISIBLE TO USERS:' as warning,
    license_plate,
    make,
    model,
    current_latitude,
    current_longitude,
    current_address,
    current_driver_id,
    is_available
FROM trucks 
LIMIT 3;

-- 4. Suggested improved RLS policies for trucks table
-- (Don't run this yet - just for review)

/*
-- OPTION 1: Customers can only see basic truck availability (RECOMMENDED)
CREATE POLICY "Customers can view basic truck info" ON trucks
FOR SELECT USING (
    -- Only show basic info needed for orders, hide sensitive driver data
    true  -- We'll filter columns in the application layer instead
);

-- OPTION 2: Customers can only see trucks that are available and not assigned to drivers
CREATE POLICY "Customers can view available trucks only" ON trucks  
FOR SELECT USING (
    is_available = true 
    AND current_driver_id IS NULL
);

-- OPTION 3: No direct truck access for customers (MOST SECURE)
-- Customers only see truck_types, admins handle truck assignment
CREATE POLICY "Only admins can view trucks" ON trucks
FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' 
    OR auth.jwt() ->> 'role' = 'service_role'
);
*/
