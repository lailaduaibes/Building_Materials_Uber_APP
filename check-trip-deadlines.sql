-- Check the acceptance deadlines of the assigned trips
SELECT 
    'Trip deadline analysis:' as debug_section,
    id,
    acceptance_deadline,
    NOW() as current_time,
    (acceptance_deadline > NOW()) as is_still_valid,
    EXTRACT(EPOCH FROM (acceptance_deadline - NOW()))::INTEGER as seconds_remaining
FROM trip_requests 
WHERE assigned_driver_id = '04d796a5-8a76-4cff-b84d-40b2b39bd254' 
ORDER BY created_at DESC 
LIMIT 3;
