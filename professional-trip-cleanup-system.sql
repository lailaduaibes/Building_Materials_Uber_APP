-- Professional Trip Status Management System
-- This creates automatic cleanup and expiration functions

-- 1. Function to expire old trips based on business rules
CREATE OR REPLACE FUNCTION cleanup_expired_trips()
RETURNS TABLE(
  trips_expired INTEGER,
  pending_expired INTEGER,
  matched_expired INTEGER,
  details TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_count INTEGER := 0;
  matched_count INTEGER := 0;
  total_count INTEGER := 0;
  result_details TEXT;
BEGIN
  -- Expire pending trips past their acceptance deadline
  UPDATE trip_requests 
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending' 
  AND acceptance_deadline IS NOT NULL 
  AND acceptance_deadline < NOW();
  
  GET DIAGNOSTICS pending_count = ROW_COUNT;

  -- Expire matched trips older than 2 hours (configurable)
  UPDATE trip_requests 
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'matched' 
  AND created_at < NOW() - INTERVAL '2 hours'
  AND assigned_driver_id IS NOT NULL;
  
  GET DIAGNOSTICS matched_count = ROW_COUNT;

  -- Also clean up old considering assignments (from ASAP system)
  UPDATE trip_requests 
  SET 
    considering_driver_id = NULL,
    acceptance_deadline = NULL,
    updated_at = NOW()
  WHERE considering_driver_id IS NOT NULL 
  AND acceptance_deadline IS NOT NULL 
  AND acceptance_deadline < NOW() - INTERVAL '5 minutes';

  total_count := pending_count + matched_count;
  result_details := format('Cleaned up at %s - Pending: %s, Matched: %s', 
                          NOW()::TEXT, pending_count, matched_count);

  -- Log the cleanup activity
  INSERT INTO trip_cleanup_log (
    cleanup_date,
    pending_expired,
    matched_expired,
    total_expired,
    details
  ) VALUES (
    NOW(),
    pending_count,
    matched_expired,
    total_count,
    result_details
  );

  RETURN QUERY SELECT total_count, pending_count, matched_count, result_details;
END;
$$;

-- 2. Create log table for cleanup activities
CREATE TABLE IF NOT EXISTS trip_cleanup_log (
  id SERIAL PRIMARY KEY,
  cleanup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pending_expired INTEGER DEFAULT 0,
  matched_expired INTEGER DEFAULT 0,
  total_expired INTEGER DEFAULT 0,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Function to get real-time trip statistics
CREATE OR REPLACE FUNCTION get_trip_statistics()
RETURNS TABLE(
  status TEXT,
  count BIGINT,
  oldest_created_at TIMESTAMP WITH TIME ZONE,
  newest_created_at TIMESTAMP WITH TIME ZONE,
  avg_age_hours NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    tr.status,
    COUNT(*) as count,
    MIN(tr.created_at) as oldest_created_at,
    MAX(tr.created_at) as newest_created_at,
    ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - tr.created_at))/3600), 2) as avg_age_hours
  FROM trip_requests tr
  GROUP BY tr.status
  ORDER BY count DESC;
$$;

-- 4. Function to identify problematic trips
CREATE OR REPLACE FUNCTION identify_problematic_trips()
RETURNS TABLE(
  trip_id UUID,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  age_hours NUMERIC,
  assigned_driver_id UUID,
  considering_driver_id UUID,
  acceptance_deadline TIMESTAMP WITH TIME ZONE,
  problem_type TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id as trip_id,
    status,
    created_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - created_at))/3600, 2) as age_hours,
    assigned_driver_id,
    considering_driver_id,
    acceptance_deadline,
    CASE 
      WHEN status = 'pending' AND acceptance_deadline < NOW() THEN 'EXPIRED_PENDING'
      WHEN status = 'matched' AND created_at < NOW() - INTERVAL '2 hours' THEN 'OLD_MATCHED'
      WHEN status = 'matched' AND assigned_driver_id IS NULL THEN 'MATCHED_NO_DRIVER'
      WHEN considering_driver_id IS NOT NULL AND acceptance_deadline < NOW() THEN 'EXPIRED_CONSIDERATION'
      WHEN status IN ('pending', 'matched') AND created_at < NOW() - INTERVAL '24 hours' THEN 'VERY_OLD'
      ELSE 'NORMAL'
    END as problem_type
  FROM trip_requests
  WHERE 
    (status = 'pending' AND acceptance_deadline < NOW()) OR
    (status = 'matched' AND created_at < NOW() - INTERVAL '2 hours') OR
    (status = 'matched' AND assigned_driver_id IS NULL) OR
    (considering_driver_id IS NOT NULL AND acceptance_deadline < NOW()) OR
    (status IN ('pending', 'matched') AND created_at < NOW() - INTERVAL '24 hours')
  ORDER BY created_at;
$$;

-- 5. Set up automatic cleanup using pg_cron (if available) or trigger
-- Note: This requires pg_cron extension or can be called via application cron
CREATE OR REPLACE FUNCTION schedule_trip_cleanup()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- This would typically be called by a cron job every 15 minutes
  -- Example cron setup (requires pg_cron extension):
  -- SELECT cron.schedule('cleanup-trips', '*/15 * * * *', 'SELECT cleanup_expired_trips();');
  
  RETURN 'Cleanup function created. Set up cron job to call cleanup_expired_trips() every 15 minutes.';
END;
$$;

-- 6. Emergency cleanup function for immediate use
CREATE OR REPLACE FUNCTION emergency_trip_cleanup()
RETURNS TABLE(
  action TEXT,
  affected_trips INTEGER,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_matched_count INTEGER := 0;
  expired_pending_count INTEGER := 0;
  consideration_cleanup_count INTEGER := 0;
BEGIN
  -- Clean up very old matched trips (older than 1 hour)
  UPDATE trip_requests 
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'matched' 
  AND created_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS old_matched_count = ROW_COUNT;

  -- Clean up expired pending trips
  UPDATE trip_requests 
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending' 
  AND acceptance_deadline < NOW();
  
  GET DIAGNOSTICS expired_pending_count = ROW_COUNT;

  -- Clean up expired considerations
  UPDATE trip_requests 
  SET 
    considering_driver_id = NULL,
    acceptance_deadline = NULL,
    updated_at = NOW()
  WHERE considering_driver_id IS NOT NULL 
  AND acceptance_deadline < NOW();
  
  GET DIAGNOSTICS consideration_cleanup_count = ROW_COUNT;

  -- Return results
  RETURN QUERY 
  SELECT 'OLD_MATCHED_EXPIRED'::TEXT, old_matched_count, format('Expired %s old matched trips', old_matched_count)
  UNION ALL
  SELECT 'PENDING_EXPIRED'::TEXT, expired_pending_count, format('Expired %s pending trips', expired_pending_count)
  UNION ALL
  SELECT 'CONSIDERATIONS_CLEANED'::TEXT, consideration_cleanup_count, format('Cleaned %s expired considerations', consideration_cleanup_count);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_trips() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION get_trip_statistics() TO postgres, service_role, authenticated;
GRANT EXECUTE ON FUNCTION identify_problematic_trips() TO postgres, service_role, authenticated;
GRANT EXECUTE ON FUNCTION emergency_trip_cleanup() TO postgres, service_role;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_trip_requests_status_created_at ON trip_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_trip_requests_acceptance_deadline ON trip_requests(acceptance_deadline) WHERE acceptance_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trip_requests_considering_driver ON trip_requests(considering_driver_id, acceptance_deadline) WHERE considering_driver_id IS NOT NULL;
