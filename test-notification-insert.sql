-- Test notification insertion to debug RLS issue

-- 1. Try to insert a test notification as current user (postgres)
INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    data
) VALUES (
    '4ab16336-a414-4b73-8dc9-ab97d0eed1a7', -- Alaa's user ID
    'Test Notification',
    'This is a test notification',
    'test',
    '{"test": true}'::jsonb
);

-- 2. Check if the insertion worked
SELECT id, user_id, title, message, type, created_at
FROM notifications 
WHERE title = 'Test Notification';

-- 3. Clean up test data
DELETE FROM notifications WHERE title = 'Test Notification';
