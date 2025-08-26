-- =============================================================================
-- COMPLETE FIXES FOR PAYMENT AND NOTIFICATION SYSTEMS
-- Run these in Supabase SQL Editor to fix both issues
-- =============================================================================

-- 1. FIX PAYMENT_METHODS INSERT POLICY
-- Drop the current problematic INSERT policy
DROP POLICY IF EXISTS "Users can insert own payment methods" ON payment_methods;

-- Create a proper INSERT policy with WITH CHECK constraint
CREATE POLICY "Users can insert own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. FIX NOTIFICATION RLS POLICIES
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Create a policy that allows authenticated users to insert notifications
CREATE POLICY "Authenticated users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 3. VERIFY BOTH FIXES
-- Check payment_methods policies
SELECT 'PAYMENT_METHODS POLICIES:' as section;
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'payment_methods';

-- Check notifications policies  
SELECT 'NOTIFICATIONS POLICIES:' as section;
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications';

-- 4. TEST BOTH SYSTEMS
-- Test payment_methods access
SELECT 'PAYMENT_METHODS TEST:' as test_section, COUNT(*) as count FROM payment_methods;

-- Test notifications access
SELECT 'NOTIFICATIONS TEST:' as test_section, COUNT(*) as count FROM notifications;
