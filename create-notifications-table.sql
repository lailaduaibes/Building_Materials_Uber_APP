-- =============================================================================
-- CREATE NOTIFICATIONS TABLE AND INFRASTRUCTURE
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) NOT NULL,
  trip_id uuid REFERENCES trip_requests(id),
  order_id uuid REFERENCES orders(id),
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'status_update', 'eta_update', 'arrival')),
  data jsonb DEFAULT '{}',
  push_sent boolean DEFAULT false,
  push_sent_at timestamp,
  read_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- =============================================================================

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_trip_id ON notifications(trip_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- =============================================================================

-- 3. Create RLS (Row Level Security) policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users see own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- System can insert notifications for any user (for backend services)
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- =============================================================================

-- 4. Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- =============================================================================

-- 5. Create notification templates table for consistency
CREATE TABLE IF NOT EXISTS notification_templates (
  id text PRIMARY KEY,
  title_template text NOT NULL,
  message_template text NOT NULL,
  type text NOT NULL,
  category text NOT NULL, -- 'trip_status', 'eta_update', 'driver_action', etc.
  created_at timestamp DEFAULT now()
);

-- =============================================================================

-- 6. Insert default notification templates
INSERT INTO notification_templates (id, title_template, message_template, type, category) VALUES
-- Trip Status Updates
('trip_matched', 'Driver Found!', 'Your driver {driver_name} is on the way to pickup location', 'success', 'trip_status'),
('trip_en_route_pickup', 'Driver En Route', '{driver_name} is heading to pickup location. ETA: {eta_minutes} minutes', 'info', 'trip_status'),
('trip_arrived_pickup', 'Driver Arrived', 'Your driver has arrived at the pickup location', 'success', 'trip_status'),
('trip_pickup_started', 'Loading Started', 'Driver is loading your materials', 'info', 'trip_status'),
('trip_en_route_delivery', 'On The Way!', 'Materials loaded! Driver is heading to delivery location', 'success', 'trip_status'),
('trip_arrived_delivery', 'Driver Arrived', 'Your driver has arrived at the delivery location', 'success', 'trip_status'),
('trip_delivered', 'Delivery Complete', 'Your materials have been delivered successfully!', 'success', 'trip_status'),

-- ETA Updates
('eta_delay', 'Delivery Delayed', 'Your delivery is running {delay_minutes} minutes late due to {reason}', 'warning', 'eta_update'),
('eta_update', 'ETA Updated', 'New estimated arrival time: {new_eta}', 'info', 'eta_update'),

-- Driver Actions
('driver_calling', 'Driver Calling', '{driver_name} is trying to reach you', 'info', 'driver_action'),
('driver_message', 'Message from Driver', '{driver_name}: {message}', 'info', 'driver_action'),

-- Payment & Completion
('payment_processed', 'Payment Complete', 'Payment of R{amount} processed successfully', 'success', 'payment'),
('rating_request', 'Rate Your Experience', 'How was your delivery? Please rate {driver_name}', 'info', 'rating')

ON CONFLICT (id) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  type = EXCLUDED.type,
  category = EXCLUDED.category;

-- =============================================================================

-- 7. Create function to send notification with template
CREATE OR REPLACE FUNCTION send_notification_with_template(
  p_user_id uuid,
  p_template_id text,
  p_trip_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_variables jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  template_record notification_templates%ROWTYPE;
  final_title text;
  final_message text;
  notification_id uuid;
  var_key text;
  var_value text;
BEGIN
  -- Get template
  SELECT * INTO template_record FROM notification_templates WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification template % not found', p_template_id;
  END IF;
  
  -- Start with template strings
  final_title := template_record.title_template;
  final_message := template_record.message_template;
  
  -- Replace variables
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    final_title := replace(final_title, '{' || var_key || '}', var_value);
    final_message := replace(final_message, '{' || var_key || '}', var_value);
  END LOOP;
  
  -- Insert notification
  INSERT INTO notifications (user_id, trip_id, order_id, title, message, type, data)
  VALUES (p_user_id, p_trip_id, p_order_id, final_title, final_message, template_record.type, p_variables)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================

-- 8. Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer 
    FROM notifications 
    WHERE user_id = p_user_id AND read_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================

-- 9. Test the notification system
DO $$
DECLARE
  test_user_id uuid := '550e8400-e29b-41d4-a716-446655440000'; -- Replace with real user ID
  test_trip_id uuid := gen_random_uuid();
  notification_id uuid;
BEGIN
  -- Test sending a notification
  notification_id := send_notification_with_template(
    test_user_id,
    'trip_matched',
    test_trip_id,
    NULL,
    '{"driver_name": "John Smith", "eta_minutes": "15"}'::jsonb
  );
  
  RAISE NOTICE 'Test notification created with ID: %', notification_id;
END $$;

-- =============================================================================
-- SETUP COMPLETE! 
-- Next steps:
-- 1. Run this SQL in Supabase
-- 2. Install React Native notification dependencies
-- 3. Create NotificationService in both apps
-- 4. Integrate with existing tracking screens
-- =============================================================================
