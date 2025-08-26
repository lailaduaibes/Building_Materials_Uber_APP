-- Find the actual trip/order tables being used
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name ILIKE '%trip%' OR 
    table_name ILIKE '%order%' OR 
    table_name ILIKE '%delivery%' OR
    table_name ILIKE '%request%'
)
ORDER BY table_name;

-- =============================================================================

-- Check trip_requests table structure (seems to be our main table)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================================================

-- Check current statuses in trip_requests
SELECT 
    status,
    COUNT(*) as count
FROM trip_requests 
GROUP BY status 
ORDER BY count DESC;

-- =============================================================================

-- Check trip_tracking table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'trip_tracking' 
AND table_schema = 'public'
ORDER BY ordinal_position;
