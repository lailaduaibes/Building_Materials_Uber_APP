-- ========================================
-- Fix Missing Acceptance Deadlines
-- ========================================
-- The issue: All trips have acceptance_deadline = NULL
-- This causes them to be filtered out from driver view

-- 1. First, let's see the current state
SELECT 
    'Current acceptance_deadline status' as check_name,
    COUNT(*) as total_pending,
    COUNT(*) FILTER (WHERE acceptance_deadline IS NULL) as null_deadlines,
    COUNT(*) FILTER (WHERE acceptance_deadline IS NOT NULL) as has_deadlines
FROM trip_requests 
WHERE status = 'pending';

-- 2. Fix existing pending trips by setting appropriate acceptance deadlines
UPDATE trip_requests 
SET acceptance_deadline = CASE 
    WHEN pickup_time_preference = 'asap' THEN 
        created_at + INTERVAL '3 minutes'  -- ASAP trips get 3 minutes
    ELSE 
        created_at + INTERVAL '15 minutes' -- Scheduled trips get 15 minutes
END
WHERE status = 'pending' 
AND acceptance_deadline IS NULL;

-- 3. Verify the fix
SELECT 
    'After fixing acceptance deadlines' as check_name,
    COUNT(*) as total_pending,
    COUNT(*) FILTER (WHERE acceptance_deadline IS NULL) as null_deadlines,
    COUNT(*) FILTER (WHERE acceptance_deadline > NOW()) as future_deadlines,
    COUNT(*) FILTER (WHERE acceptance_deadline <= NOW()) as expired_deadlines
FROM trip_requests 
WHERE status = 'pending';

-- 4. Show which trips should now be visible to drivers
SELECT 
    'Trips that should now be visible' as section,
    id,
    pickup_time_preference,
    acceptance_deadline,
    EXTRACT(MINUTE FROM (acceptance_deadline - NOW())) as minutes_until_deadline,
    CASE 
        WHEN acceptance_deadline > NOW() THEN 'SHOULD BE VISIBLE'
        ELSE 'EXPIRED'
    END as driver_visibility
FROM trip_requests 
WHERE status = 'pending'
ORDER BY acceptance_deadline DESC;

-- 5. Clean up any that are now properly expired
UPDATE trip_requests 
SET status = 'expired'
WHERE status = 'pending' 
AND acceptance_deadline <= NOW();

-- 6. Final summary
SELECT 
    'FINAL SUMMARY' as summary,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_trips,
    COUNT(*) FILTER (WHERE status = 'pending' AND acceptance_deadline > NOW()) as visible_to_drivers,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_trips
FROM trip_requests;

-- 7. Create a trigger to auto-set acceptance_deadline for future trips
CREATE OR REPLACE FUNCTION set_acceptance_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set if not already provided
    IF NEW.acceptance_deadline IS NULL THEN
        NEW.acceptance_deadline = CASE 
            WHEN NEW.pickup_time_preference = 'asap' THEN 
                NEW.created_at + INTERVAL '3 minutes'
            ELSE 
                NEW.created_at + INTERVAL '15 minutes'
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
DROP TRIGGER IF EXISTS trigger_set_acceptance_deadline ON trip_requests;
CREATE TRIGGER trigger_set_acceptance_deadline
    BEFORE INSERT ON trip_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_acceptance_deadline();

COMMENT ON FUNCTION set_acceptance_deadline IS 'Automatically sets acceptance_deadline for new trip_requests if not provided';
