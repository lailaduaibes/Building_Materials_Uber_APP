-- Fix the cleanup_expired_trip_requests function to work with RLS
-- This function needs SECURITY DEFINER to bypass RLS restrictions

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS cleanup_expired_trip_requests();

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION cleanup_expired_trip_requests()
RETURNS INTEGER 
SECURITY DEFINER  -- This allows the function to bypass RLS
SET search_path = public  -- Security best practice
LANGUAGE plpgsql
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update expired requests - this will now work with SECURITY DEFINER
    UPDATE trip_requests 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND acceptance_deadline IS NOT NULL 
    AND acceptance_deadline < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log the cleanup operation
    RAISE NOTICE 'Cleaned up % expired trip requests', expired_count;
    
    RETURN expired_count;
END;
$$;

-- Grant execute permission to authenticated users (drivers)
GRANT EXECUTE ON FUNCTION cleanup_expired_trip_requests() TO authenticated;

-- Also grant to anon in case needed
GRANT EXECUTE ON FUNCTION cleanup_expired_trip_requests() TO anon;

-- Test the function
SELECT cleanup_expired_trip_requests() as expired_trips_cleaned;

-- Check if there are any trips with expired status now
SELECT status, COUNT(*) as count
FROM trip_requests 
GROUP BY status 
ORDER BY status;

-- Check for trips that should be expired (for verification)
SELECT 
    id,
    status,
    acceptance_deadline,
    CASE 
        WHEN acceptance_deadline < NOW() THEN 'Should be expired'
        ELSE 'Still valid'
    END as expiry_status,
    created_at
FROM trip_requests 
WHERE status = 'pending'
ORDER BY acceptance_deadline;
