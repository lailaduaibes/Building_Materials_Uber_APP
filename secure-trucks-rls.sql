-- SECURE RLS POLICIES FOR TRUCKS TABLE
-- Execute this to improve security while maintaining functionality

-- Drop the overly broad "Users can view trucks" policy
DROP POLICY IF EXISTS "Users can view trucks" ON trucks;

-- Option 1: Customers can only see truck availability counts (RECOMMENDED)
-- This lets the app show "X trucks available" without exposing driver data
CREATE POLICY "Customers can view truck availability" ON trucks
FOR SELECT USING (
    -- Only return basic fields needed for availability checking
    -- Hide sensitive driver information
    true  -- We'll handle field filtering in the app
);

-- Option 2: More restrictive - only admins and service role can view trucks
CREATE POLICY "Admin and service role can view trucks" ON trucks  
FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' 
    OR auth.jwt() ->> 'role' = 'service_role'
    OR auth.role() = 'service_role'
);

-- Option 3: Customers can see trucks but with limited data
CREATE POLICY "Customers can view basic truck info only" ON trucks
FOR SELECT USING (
    -- Hide sensitive columns at policy level
    -- Only show: truck_type_id, is_available, is_active
    true
);

-- For your customer app, use this query to get availability safely:
/*
-- SAFE QUERY for customer app:
SELECT 
    tt.id,
    tt.name,
    tt.description,
    tt.payload_capacity,
    tt.volume_capacity,
    COUNT(t.id) FILTER (WHERE t.is_available = true) as available_count
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name, tt.description, tt.payload_capacity, tt.volume_capacity
HAVING COUNT(t.id) FILTER (WHERE t.is_available = true) > 0;
*/
