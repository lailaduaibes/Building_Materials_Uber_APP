-- =============================================================================
-- FIX NOTIFICATION RLS POLICIES
-- =============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Create a policy that allows authenticated users to insert notifications
-- This is needed for the notification service to work from the app
CREATE POLICY "Authenticated users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Also allow service role to insert notifications (for backend services)
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Check current policies
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'notifications';

-- Test notification insert with actual user ID
-- Since auth.uid() returns null in database context, use Alaa's user ID directly
INSERT INTO notifications (user_id, title, message, type) 
VALUES ('4ab16336-a414-4b73-8dc9-ab97d0eed1a7', 'Test Notification', 'This is a test notification', 'info');

-- Verify the test notification was inserted
SELECT id, user_id, title, message, type, created_at 
FROM notifications 
WHERE title = 'Test Notification';

-- Clean up test data
DELETE FROM notifications WHERE title = 'Test Notification';
