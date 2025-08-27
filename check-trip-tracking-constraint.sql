-- Check the trip_tracking status constraint values
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'trip_tracking_status_check';

-- Also check existing status values in trip_tracking table
SELECT DISTINCT status, COUNT(*) as count
FROM trip_tracking 
GROUP BY status
ORDER BY status;

-- Check what statuses are used in the trips table
SELECT DISTINCT status, COUNT(*) as count
FROM trips 
GROUP BY status
ORDER BY status;
