-- Professional ASAP Auto-Matching System
-- This trigger automatically starts ASAP matching when a trip is created

-- Create the trigger function
CREATE OR REPLACE FUNCTION auto_start_asap_matching()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger for ASAP trips that are newly created
    IF NEW.pickup_time_preference = 'asap' AND NEW.status = 'pending' AND OLD IS NULL THEN
        -- Log the auto-trigger
        RAISE NOTICE 'Auto-triggering ASAP matching for trip: %', NEW.id;
        
        -- Call the ASAP matching function asynchronously
        PERFORM start_asap_matching_uber_style(NEW.id);
        
        RAISE NOTICE 'ASAP matching triggered successfully for trip: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_asap_matching ON trip_requests;
CREATE TRIGGER trigger_auto_asap_matching
    AFTER INSERT ON trip_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_start_asap_matching();

-- Test the trigger
SELECT 'ASAP Auto-Matching Trigger Created Successfully' as status;
