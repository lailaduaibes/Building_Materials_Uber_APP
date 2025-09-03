-- Create database trigger to automatically create push notifications when customers send messages to drivers
-- This ensures drivers get notified even if the app is closed

-- First, let's create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION notify_driver_of_customer_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if this is a customer message (not driver message)
  IF NEW.sender_type = 'customer' THEN
    -- Insert notification for the driver
    INSERT INTO notifications (
      user_id,           -- Driver's user ID (we need to find this from the trip)
      trip_id,
      title,
      message,
      type,
      priority,
      data,
      push_sent
    )
    SELECT 
      tr.assigned_driver_id,  -- Driver's user ID from trip_requests
      NEW.trip_id,
      '💬 New Message from Customer',
      CASE 
        WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 50) || '...'
        ELSE NEW.content
      END,
      'customer_message',
      'normal',
      json_build_object(
        'message_id', NEW.id,
        'sender_type', NEW.sender_type,
        'message_type', NEW.message_type,
        'trip_id', NEW.trip_id,
        'timestamp', NEW.created_at
      )::jsonb,
      false  -- Push not sent yet
    FROM trip_requests tr
    WHERE tr.id = NEW.trip_id
      AND tr.assigned_driver_id IS NOT NULL;  -- Only if driver is assigned
      
    RAISE NOTICE 'Created notification for customer message: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_notify_driver_of_customer_message ON trip_messages;

CREATE TRIGGER trigger_notify_driver_of_customer_message
  AFTER INSERT ON trip_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_driver_of_customer_message();

-- Test the trigger by inserting a test customer message
-- First, let's find a trip with an assigned driver
SELECT 
    id as trip_id,
    assigned_driver_id,
    status,
    load_description
FROM trip_requests 
WHERE assigned_driver_id IS NOT NULL 
    AND status IN ('matched', 'pickup_started', 'in_transit')
LIMIT 3;

-- Insert a test customer message (use one of the trip IDs from above)
INSERT INTO trip_messages (
    trip_id,
    sender_id,
    sender_type,
    message_type,
    content,
    is_read,
    delivered_at
) VALUES (
    (SELECT id FROM trip_requests WHERE assigned_driver_id IS NOT NULL LIMIT 1), -- Use an active trip
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c', -- Customer user ID
    'customer',
    'text',
    'Hi! I have a question about the delivery time. When will you arrive?',
    false,
    NOW()
);

-- Check if the notification was created
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.data,
    n.created_at,
    tm.content as original_message
FROM notifications n
JOIN trip_messages tm ON n.data->>'message_id' = tm.id
WHERE n.type = 'customer_message'
ORDER BY n.created_at DESC
LIMIT 1;
