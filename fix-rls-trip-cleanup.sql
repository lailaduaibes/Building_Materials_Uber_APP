-- Fix RLS Trip Cleanup Function
-- This function runs with elevated permissions to clean up expired trips

-- Create function to cleanup expired trips (bypasses RLS)
CREATE OR REPLACE FUNCTION cleanup_expired_trips()
RETURNS TABLE(
  expired_asap_count integer,
  expired_scheduled_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  asap_count integer := 0;
  scheduled_count integer := 0;
BEGIN
  -- Mark old ASAP trips as expired (older than 1 hour)
  UPDATE trip_requests 
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending' 
    AND pickup_time_preference = 'asap'
    AND created_at < (NOW() - INTERVAL '1 hour');
  
  GET DIAGNOSTICS asap_count = ROW_COUNT;
  
  -- Mark scheduled trips as expired if their pickup time has passed by more than 2 hours
  UPDATE trip_requests 
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending' 
    AND pickup_time_preference = 'scheduled'
    AND scheduled_pickup_time < (NOW() - INTERVAL '2 hours');
  
  GET DIAGNOSTICS scheduled_count = ROW_COUNT;
  
  -- Return the counts
  RETURN QUERY SELECT asap_count, scheduled_count;
END;
$$;

-- Grant execute permission to authenticated users (drivers)
GRANT EXECUTE ON FUNCTION cleanup_expired_trips() TO authenticated;

-- Alternative: Create a simpler function that drivers can call to check for expired trips without updating
CREATE OR REPLACE FUNCTION get_active_trips_for_driver()
RETURNS TABLE(
  id uuid,
  customer_id uuid,
  status text,
  pickup_time_preference text,
  scheduled_pickup_time timestamptz,
  created_at timestamptz,
  pickup_address jsonb,
  delivery_address jsonb,
  pickup_latitude double precision,
  pickup_longitude double precision,
  delivery_latitude double precision,
  delivery_longitude double precision,
  material_type text,
  load_description text,
  estimated_weight_tons double precision,
  estimated_volume_m3 double precision,
  quoted_price double precision,
  requires_crane boolean,
  requires_hydraulic_lift boolean,
  special_requirements jsonb,
  estimated_distance_km double precision,
  estimated_duration_minutes integer,
  assigned_driver_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return only trips that are not expired based on business rules
  RETURN QUERY 
  SELECT 
    tr.id,
    tr.customer_id,
    tr.status,
    tr.pickup_time_preference,
    tr.scheduled_pickup_time,
    tr.created_at,
    tr.pickup_address,
    tr.delivery_address,
    tr.pickup_latitude,
    tr.pickup_longitude,
    tr.delivery_latitude,
    tr.delivery_longitude,
    tr.material_type,
    tr.load_description,
    tr.estimated_weight_tons,
    tr.estimated_volume_m3,
    tr.quoted_price,
    tr.requires_crane,
    tr.requires_hydraulic_lift,
    tr.special_requirements,
    tr.estimated_distance_km,
    tr.estimated_duration_minutes,
    tr.assigned_driver_id
  FROM trip_requests tr
  WHERE tr.status = 'pending'
    AND (
      -- ASAP trips: not older than 1 hour
      (tr.pickup_time_preference = 'asap' AND tr.created_at > (NOW() - INTERVAL '1 hour'))
      OR
      -- Scheduled trips: pickup time not passed by more than 2 hours
      (tr.pickup_time_preference = 'scheduled' AND tr.scheduled_pickup_time > (NOW() - INTERVAL '2 hours'))
    );
END;
$$;

-- Grant execute permission to authenticated users (drivers)
GRANT EXECUTE ON FUNCTION get_active_trips_for_driver() TO authenticated;
