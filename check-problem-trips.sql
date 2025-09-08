-- Check the actual status of these problematic trips
SELECT 
    id,
    LEFT(id::text, 8) as short_id,
    status,
    assigned_driver_id,
    pickup_time_preference,
    acceptance_deadline,
    special_requirements,
    created_at,
    CASE 
        WHEN status = 'offering_to_driver' THEN '✅ Correct - Being offered'
        WHEN status = 'assigned' AND assigned_driver_id IS NOT NULL THEN '❌ Old system - Auto-assigned'
        WHEN status = 'pending' THEN '⚠️ Trigger never fired'
        ELSE '❓ Unknown: ' || status
    END as diagnosis
FROM trip_requests 
WHERE id::text LIKE 'fcc16bd5%' 
   OR id::text LIKE '456108f6%' 
   OR id::text LIKE '8590a2f7%'
ORDER BY created_at DESC;
