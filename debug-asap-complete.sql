-- Comprehensive ASAP System Debug Script
-- Run each section step by step to identify where the issue is

-- ==========================================
-- SECTION 1: Check if trip was created
-- ==========================================
SELECT 'STEP 1: Checking if ASAP trip exists' as debug_step;

SELECT 
    id, 
    customer_id,
    status, 
    assigned_driver_id, 
    pickup_time_preference,
    pickup_latitude,
    pickup_longitude,
    created_at,
    acceptance_deadline
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
ORDER BY created_at DESC 
LIMIT 3;

-- ==========================================
-- SECTION 2: Check available drivers
-- ==========================================
SELECT 'STEP 2: Checking available drivers' as debug_step;

SELECT 
    dp.id as driver_profile_id,
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.status,
    dp.is_available,
    dp.is_approved,
    u.current_latitude,
    u.current_longitude,
    u.last_location_update,
    u.is_online
FROM driver_profiles dp
LEFT JOIN users u ON dp.user_id = u.id
WHERE dp.is_approved = true 
ORDER BY dp.created_at DESC
LIMIT 5;

-- ==========================================
-- SECTION 3: Find nearby drivers for latest trip
-- ==========================================
SELECT 'STEP 3: Testing find_nearby_available_drivers function' as debug_step;

-- Get the latest ASAP trip coordinates
WITH latest_asap AS (
    SELECT pickup_latitude, pickup_longitude, required_truck_type_id
    FROM trip_requests 
    WHERE pickup_time_preference = 'asap' 
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT * FROM find_nearby_available_drivers(
    (SELECT pickup_latitude FROM latest_asap),
    (SELECT pickup_longitude FROM latest_asap),
    50, -- max_distance_km
    1440, -- min_updated_minutes (24 hours)
    (SELECT required_truck_type_id FROM latest_asap)
) LIMIT 10;

-- ==========================================
-- SECTION 4: Manual ASAP matching trigger
-- ==========================================
SELECT 'STEP 4: Manually trigger ASAP matching' as debug_step;

-- Get the latest ASAP trip ID and trigger matching
-- IMPORTANT: Replace the trip ID with the actual ID from STEP 1
-- SELECT start_asap_matching_uber_style('REPLACE_WITH_ACTUAL_TRIP_ID');

-- ==========================================
-- SECTION 5: Check results after matching
-- ==========================================
SELECT 'STEP 5: Check trip assignment after matching' as debug_step;

SELECT 
    id, 
    status, 
    assigned_driver_id, 
    pickup_time_preference,
    acceptance_deadline,
    matching_started_at,
    load_description, -- Contains driver queue
    created_at
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
ORDER BY created_at DESC 
LIMIT 3;

-- ==========================================
-- SECTION 6: Check specific driver assignment
-- ==========================================
SELECT 'STEP 6: Check if trips are assigned to specific driver' as debug_step;

-- Replace with the actual driver user_id that should receive the notification
-- SELECT * FROM trip_requests 
-- WHERE assigned_driver_id = 'REPLACE_WITH_DRIVER_USER_ID'
-- AND pickup_time_preference = 'asap'
-- ORDER BY created_at DESC;

-- ==========================================
-- INSTRUCTIONS
-- ==========================================
/*
TO DEBUG THE ASAP SYSTEM:

1. Run STEP 1 to see if your trip was created
2. Run STEP 2 to see available drivers 
3. Run STEP 3 to test if nearby drivers function works
4. In STEP 4, replace 'REPLACE_WITH_ACTUAL_TRIP_ID' with the trip ID from STEP 1
5. Run the start_asap_matching_uber_style function
6. Run STEP 5 to see if the trip got assigned
7. In STEP 6, replace with the driver user_id to check specific assignment

The driver app will only show trips that are:
- pickup_time_preference = 'asap'
- status = 'pending' 
- assigned_driver_id = current_driver_user_id
- acceptance_deadline > NOW()
*/
