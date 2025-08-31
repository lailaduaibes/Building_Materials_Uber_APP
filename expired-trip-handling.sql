-- ========================================
-- What Happens When a Trip Expires?
-- ========================================
-- Complete business logic for expired trips

-- 1. Check current expired trips and their details
SELECT 
    'EXPIRED TRIPS ANALYSIS' as section,
    id,
    customer_id,
    pickup_time_preference,
    scheduled_pickup_time,
    created_at,
    quoted_price,
    material_type,
    load_description,
    EXTRACT(HOUR FROM (NOW() - created_at)) as hours_since_created,
    CASE 
        WHEN pickup_time_preference = 'asap' THEN 'ASAP trip - no drivers available'
        WHEN pickup_time_preference = 'scheduled' THEN 'Scheduled trip - time passed'
        ELSE 'Unknown reason'
    END as expiration_reason
FROM trip_requests 
WHERE status = 'expired'
ORDER BY created_at DESC;

-- 2. Check if customers should be notified about expired trips
SELECT 
    'CUSTOMERS TO NOTIFY' as section,
    tr.customer_id,
    u.first_name,
    u.last_name,
    u.phone,
    u.email,
    COUNT(*) as expired_trips_count,
    MAX(tr.created_at) as last_expired_trip,
    STRING_AGG(tr.material_type, ', ') as materials_attempted
FROM trip_requests tr
JOIN users u ON tr.customer_id = u.id
WHERE tr.status = 'expired'
AND tr.created_at > NOW() - INTERVAL '24 hours' -- Recent expirations
GROUP BY tr.customer_id, u.first_name, u.last_name, u.phone, u.email
ORDER BY expired_trips_count DESC;

-- 3. Business actions that should happen:

-- A) Create customer notification records
INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    created_at
)
SELECT 
    customer_id,
    'trip_expired',
    'Trip Request Expired',
    CASE 
        WHEN pickup_time_preference = 'asap' 
        THEN 'Your immediate delivery request for ' || material_type || ' could not be matched with available drivers. Please try again or schedule for a specific time.'
        ELSE 'Your scheduled delivery for ' || TO_CHAR(scheduled_pickup_time, 'MM/DD/YYYY at HH:MI AM') || ' has expired. Please create a new request.'
    END,
    jsonb_build_object(
        'trip_id', id,
        'material_type', material_type,
        'expiration_reason', 
        CASE 
            WHEN pickup_time_preference = 'asap' THEN 'no_drivers_available'
            ELSE 'time_passed'
        END
    ),
    NOW()
FROM trip_requests 
WHERE status = 'expired'
AND created_at > NOW() - INTERVAL '1 hour' -- Only recent expirations
AND NOT EXISTS (
    -- Don't create duplicate notifications
    SELECT 1 FROM notifications n 
    WHERE n.user_id = trip_requests.customer_id 
    AND n.type = 'trip_expired'
    AND n.data->>'trip_id' = trip_requests.id::text
);

-- B) Create analytics/reporting entries
INSERT INTO trip_analytics (
    trip_id,
    customer_id,
    event_type,
    event_data,
    created_at
)
SELECT 
    id,
    customer_id,
    'trip_expired',
    jsonb_build_object(
        'pickup_time_preference', pickup_time_preference,
        'scheduled_pickup_time', scheduled_pickup_time,
        'material_type', material_type,
        'quoted_price', quoted_price,
        'time_to_expiration_hours', EXTRACT(HOUR FROM (NOW() - created_at)),
        'expiration_reason', 
        CASE 
            WHEN pickup_time_preference = 'asap' THEN 'no_drivers_available'
            ELSE 'time_passed'
        END
    ),
    NOW()
FROM trip_requests 
WHERE status = 'expired'
AND created_at > NOW() - INTERVAL '1 hour'
AND NOT EXISTS (
    SELECT 1 FROM trip_analytics ta 
    WHERE ta.trip_id = trip_requests.id 
    AND ta.event_type = 'trip_expired'
);

-- 4. Check what should be cleaned up after expiration
SELECT 
    'CLEANUP NEEDED' as section,
    'Consider these actions' as action_type,
    COUNT(*) FILTER (WHERE status = 'expired' AND created_at < NOW() - INTERVAL '30 days') as old_expired_trips_to_archive,
    COUNT(*) FILTER (WHERE status = 'expired' AND quoted_price IS NOT NULL) as expired_with_quotes_to_analyze,
    COUNT(*) FILTER (WHERE status = 'expired' AND pickup_time_preference = 'asap') as asap_failures_to_review
FROM trip_requests;
