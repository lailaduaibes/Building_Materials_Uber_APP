-- Updated Professional Trip Cleanup Function
-- This fixes the issue where matched trips never expire

CREATE OR REPLACE FUNCTION cleanup_expired_trip_requests()
RETURNS TABLE(cleaned_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    asap_cutoff TIMESTAMP WITH TIME ZONE;
    scheduled_cutoff TIMESTAMP WITH TIME ZONE;
    matched_cutoff TIMESTAMP WITH TIME ZONE;
    cleaned_asap INTEGER := 0;
    cleaned_scheduled INTEGER := 0;
    cleaned_matched INTEGER := 0;
    total_cleaned INTEGER := 0;
BEGIN
    -- Set cutoffs based on current time
    -- ASAP trips: 1 hour grace period from creation
    -- Scheduled trips: 2 hours grace period from scheduled pickup time
    -- Matched trips: 2 hours grace period from creation (NEW!)
    asap_cutoff := NOW() - INTERVAL '1 hour';
    scheduled_cutoff := NOW() - INTERVAL '2 hours';
    matched_cutoff := NOW() - INTERVAL '2 hours';
    
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
    
    -- 🔧 NEW: Clean up old matched trips that were never accepted
    -- These are trips assigned to drivers but not accepted within 2 hours
    UPDATE trip_requests 
    SET status = 'expired'
    WHERE status = 'matched' 
        AND created_at < matched_cutoff
        AND assigned_driver_id IS NOT NULL;
    
    GET DIAGNOSTICS cleaned_matched = ROW_COUNT;
    
    total_cleaned := cleaned_asap + cleaned_scheduled + cleaned_matched;
    
    -- Return results
    RETURN QUERY SELECT 
        total_cleaned as cleaned_count,
        format('Cleaned up %s expired trips (%s ASAP, %s scheduled, %s matched)', 
               total_cleaned, cleaned_asap, cleaned_scheduled, cleaned_matched) as message;
END;
$$;
