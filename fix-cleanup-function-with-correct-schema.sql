-- Fix cleanup function with correct table schema
-- The trip_requests table doesn't have updated_at, but has created_at and other timestamp fields

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS cleanup_expired_trip_requests();

-- Create the cleanup function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION cleanup_expired_trip_requests()
RETURNS TABLE(
    cleaned_count INTEGER,
    message TEXT
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    asap_cutoff TIMESTAMP WITH TIME ZONE;
    scheduled_cutoff TIMESTAMP WITH TIME ZONE;
    cleaned_asap INTEGER := 0;
    cleaned_scheduled INTEGER := 0;
    total_cleaned INTEGER := 0;
BEGIN
    -- Set cutoffs based on current time
    -- ASAP trips: 1 hour grace period from creation
    -- Scheduled trips: 2 hours grace period from scheduled pickup time
    asap_cutoff := NOW() - INTERVAL '1 hour';
    scheduled_cutoff := NOW() - INTERVAL '2 hours';
    
    -- Clean up expired ASAP trips (pending status, created more than 1 hour ago)
    UPDATE trip_requests 
    SET status = 'expired'
    WHERE status = 'pending' 
        AND pickup_time_preference = 'asap'
        AND created_at < asap_cutoff;
    
    GET DIAGNOSTICS cleaned_asap = ROW_COUNT;
    
    -- Clean up expired scheduled trips (pending status, scheduled pickup time more than 2 hours ago)
    UPDATE trip_requests 
    SET status = 'expired'
    WHERE status = 'pending' 
        AND pickup_time_preference = 'scheduled'
        AND scheduled_pickup_time IS NOT NULL
        AND scheduled_pickup_time < scheduled_cutoff;
    
    GET DIAGNOSTICS cleaned_scheduled = ROW_COUNT;
    
    total_cleaned := cleaned_asap + cleaned_scheduled;
    
    -- Return results
    RETURN QUERY SELECT 
        total_cleaned as cleaned_count,
        format('Cleaned up %s expired trips (%s ASAP, %s scheduled)', 
               total_cleaned, cleaned_asap, cleaned_scheduled) as message;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_trip_requests() TO authenticated;

-- Test the function (this will show what would be cleaned up)
SELECT * FROM cleanup_expired_trip_requests();
