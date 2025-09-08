-- Quick test: What should the driver app see?
-- Replace 'DRIVER_USER_ID_HERE' with the actual driver user_id that should receive notifications

SELECT 
    'TRIPS DRIVER APP SHOULD SEE:' as debug_section,
    id,
    pickup_address,
    delivery_address,
    status,
    assigned_driver_id,
    acceptance_deadline,
    created_at
FROM trip_requests 
WHERE pickup_time_preference = 'asap'
AND status = 'pending' 
AND assigned_driver_id = 'REPLACE_WITH_ACTUAL_DRIVER_USER_ID'
ORDER BY created_at DESC;

-- Also check for any ASAP trips without assignment
SELECT 
    'UNASSIGNED ASAP TRIPS:' as debug_section,
    id,
    pickup_address,
    status,
    assigned_driver_id,
    created_at
FROM trip_requests 
WHERE pickup_time_preference = 'asap'
AND status = 'pending'
AND assigned_driver_id IS NULL
ORDER BY created_at DESC;
