-- =============================================================================
-- LIVE DEBUG: Monitor notification flow in real-time
-- =============================================================================

-- Run this BEFORE clicking "Start Trip" in the driver app

-- 1. Check current trip status
SELECT 
    tr.id,
    tr.customer_id,
    tr.status,
    tr.pickup_started_at,
    tr.delivery_started_at,
    tr.created_at
FROM trip_requests tr
WHERE tr.assigned_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'
AND tr.status NOT IN ('delivered', 'cancelled')
ORDER BY tr.created_at DESC
LIMIT 1;

-- 2. Count current notifications for this customer
SELECT COUNT(*) as notification_count
FROM notifications n
WHERE n.user_id = 'f30c3989-63fb-49da-ab39-168cbe9b6c82'
AND n.created_at >= NOW() - INTERVAL '10 minutes';

-- =============================================================================
-- NOW CLICK "START TRIP" IN THE DRIVER APP
-- =============================================================================

-- 3. Wait 5 seconds, then check if trip status changed
SELECT 
    tr.id,
    tr.customer_id,
    tr.status,
    tr.pickup_started_at,
    tr.delivery_started_at,
    tr.updated_at,
    tr.created_at
FROM trip_requests tr
WHERE tr.assigned_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'
AND tr.status NOT IN ('delivered', 'cancelled')
ORDER BY tr.created_at DESC
LIMIT 1;

-- 4. Check if new notifications were created
SELECT 
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.type,
    n.data,
    n.created_at
FROM notifications n
WHERE n.user_id = 'f30c3989-63fb-49da-ab39-168cbe9b6c82'
AND n.created_at >= NOW() - INTERVAL '2 minutes'
ORDER BY n.created_at DESC;

-- 5. If no notifications found, check what the notification service would generate for 'in_transit' status
-- This simulates what the EnhancedNotificationService.getStatusNotificationContent() would return

WITH status_mapping AS (
  SELECT 
    'in_transit' as input_status,
    CASE 
      WHEN 'in_transit' = 'assigned' THEN 'Driver Assigned'
      WHEN 'in_transit' IN ('en_route_pickup', 'pickup_started', 'start_trip') THEN 'Driver En Route'
      WHEN 'in_transit' = 'arrived_pickup' THEN 'Driver Arrived'
      WHEN 'in_transit' IN ('picked_up', 'pickup_completed', 'materials_loaded') THEN 'Materials Loaded'
      WHEN 'in_transit' IN ('in_transit', 'en_route_delivery') THEN 'On The Way'
      WHEN 'in_transit' = 'arrived_delivery' THEN 'Driver Arriving'
      WHEN 'in_transit' IN ('delivered', 'completed') THEN 'Delivery Complete'
      ELSE 'Trip Update'
    END as expected_title,
    CASE 
      WHEN 'in_transit' = 'assigned' THEN 'Driver Laila has been assigned to your delivery and is heading to pickup location'
      WHEN 'in_transit' IN ('en_route_pickup', 'pickup_started', 'start_trip') THEN 'Driver Laila is on the way to pickup your materials'
      WHEN 'in_transit' = 'arrived_pickup' THEN 'Driver Laila has arrived at pickup location and is loading materials'
      WHEN 'in_transit' IN ('picked_up', 'pickup_completed', 'materials_loaded') THEN 'Materials have been loaded! Driver Laila is now heading to your location'
      WHEN 'in_transit' IN ('in_transit', 'en_route_delivery') THEN 'Driver Laila is heading to your delivery location with your materials'
      WHEN 'in_transit' = 'arrived_delivery' THEN 'Driver Laila is arriving at your location in 2-3 minutes'
      WHEN 'in_transit' IN ('delivered', 'completed') THEN 'Your materials have been successfully delivered! Thank you for using our service'
      ELSE 'Trip status updated: in_transit'
    END as expected_message
)
SELECT * FROM status_mapping;
