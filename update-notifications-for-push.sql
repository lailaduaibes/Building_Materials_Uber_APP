-- Update notifications system for driver push notifications
-- The existing notifications table is good but needs some enhancements

-- 1. Add 'asap_assignment' and other driver notification types to the type constraint
-- First, let's check the current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND conname = 'notifications_type_check';

-- Drop the existing constraint and recreate with new types
ALTER TABLE notifications 
DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'info'::text, 
  'success'::text, 
  'warning'::text, 
  'error'::text, 
  'status_update'::text, 
  'eta_update'::text, 
  'arrival'::text,
  'asap_assignment'::text,      -- NEW: For ASAP trip assignments
  'trip_update'::text,          -- NEW: For trip status changes
  'trip_cancelled'::text,       -- NEW: For trip cancellations
  'customer_message'::text,     -- NEW: For customer messages
  'system_alert'::text          -- NEW: For system alerts
]));

-- 2. Add push token fields to driver_profiles (if they don't exist)
DO $$ 
BEGIN
  -- Check if push_token column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'driver_profiles' 
    AND column_name = 'push_token'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN push_token TEXT;
  END IF;
  
  -- Check if push_token_updated_at column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'driver_profiles' 
    AND column_name = 'push_token_updated_at'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN push_token_updated_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 3. Create index for faster push token lookups
CREATE INDEX IF NOT EXISTS idx_driver_profiles_push_token 
ON driver_profiles(user_id) 
WHERE push_token IS NOT NULL;

-- 4. Add priority field to notifications for urgent ASAP trips
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'normal' 
    CHECK (priority IN ('low', 'normal', 'high', 'critical'));
  END IF;
END $$;

-- 5. Update RLS policies to allow drivers to receive notifications
-- First check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'notifications';

-- Add policy for drivers to see their own notifications
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Drivers can view their notifications'
  ) THEN
    EXECUTE 'CREATE POLICY "Drivers can view their notifications" ON notifications
      FOR SELECT USING (user_id = auth.uid())';
  END IF;
END $$;

-- Add policy for drivers to mark notifications as read
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Drivers can update their notifications'
  ) THEN
    EXECUTE 'CREATE POLICY "Drivers can update their notifications" ON notifications
      FOR UPDATE USING (user_id = auth.uid())';
  END IF;
END $$;

-- 6. Show updated table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Test creating an ASAP notification
INSERT INTO notifications (
    user_id,
    trip_id,
    title,
    message,
    type,
    priority,
    data,
    push_sent
) VALUES (
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c', -- Test driver user ID
    (SELECT id FROM trip_requests WHERE status = 'pending' LIMIT 1), -- Any pending trip
    '🚨 URGENT: New ASAP Trip!',
    'Pickup from Test Location • Est. 45₪ • Tap to accept',
    'asap_assignment',
    'critical',
    '{"pickup_location": "Test Location", "estimated_earnings": 45, "urgency": "asap"}'::jsonb,
    false
) 
ON CONFLICT DO NOTHING; -- Avoid duplicate if already exists

-- 8. Show the test notification
SELECT 
    id,
    title,
    message,
    type,
    priority,
    data,
    created_at
FROM notifications 
WHERE type = 'asap_assignment'
ORDER BY created_at DESC
LIMIT 1;
