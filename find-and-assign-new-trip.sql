-- Get the trip ID you just created and assign it to your driver
-- First, find your new trip
SELECT 
    'Your new trip details:' as info,
    id,
    created_at,
    status,
    assigned_driver_id,
    pickup_time_preference
FROM trip_requests 
WHERE customer_id = 'e5310d01-f653-4865-b201-83e29dfa8f44'
AND pickup_time_preference = 'asap'
ORDER BY created_at DESC 
LIMIT 1;

-- Now call the matching function on your new trip
-- Replace the trip ID with the actual ID from the result above
-- You'll need to run this after seeing the trip ID from the query above
