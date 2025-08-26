-- =============================================================================
-- CHECK EXISTING TRACKING INFRASTRUCTURE
-- Run these queries in Supabase SQL editor to check current state
-- =============================================================================

-- 1. Check if tracking-related tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'trip_tracking',
    'driver_locations', 
    'trip_status_updates',
    'delivery_tracking',
    'notifications'
)
ORDER BY table_name;

-- =============================================================================

-- 2. Check trips table structure and status values
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trips' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================================================

-- 3. Check current trip statuses in use
SELECT 
    status,
    COUNT(*) as count
FROM trips 
GROUP BY status 
ORDER BY count DESC;

-- =============================================================================

-- 4. Check if we have any existing location/tracking columns
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name ILIKE '%location%' OR 
    column_name ILIKE '%lat%' OR 
    column_name ILIKE '%lng%' OR 
    column_name ILIKE '%tracking%' OR
    column_name ILIKE '%gps%'
)
ORDER BY table_name, column_name;

-- =============================================================================

-- 5. Check if we have notification system tables
SELECT 
    table_name,
    column_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('notifications', 'user_notifications', 'push_notifications')
ORDER BY table_name;

-- =============================================================================

-- 6. Check existing enum types for status tracking
SELECT 
    typname as enum_name,
    enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE typname ILIKE '%status%' OR typname ILIKE '%track%'
ORDER BY typname, enumsortorder;

-- =============================================================================

-- 7. Check if we have driver/user location tracking
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('drivers', 'users', 'driver_profiles')
AND (column_name ILIKE '%location%' OR column_name ILIKE '%lat%' OR column_name ILIKE '%lng%')
ORDER BY table_name;

-- =============================================================================

-- 8. Check RLS policies on trips table (for security)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'trips'
ORDER BY policyname;

-- =============================================================================
-- INSTRUCTIONS:
-- Run each section separately and share the results
-- This will help me understand:
-- 1. What tracking infrastructure already exists
-- 2. What needs to be created
-- 3. Current trip status management
-- 4. Location tracking capabilities
-- 5. Notification system status
-- =============================================================================
