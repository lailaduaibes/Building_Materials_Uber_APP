-- Add push notification token fields to driver_profiles table
-- This allows the backend to send push notifications to drivers

-- Add push token fields
ALTER TABLE driver_profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT,
ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster push token lookups
CREATE INDEX IF NOT EXISTS idx_driver_profiles_push_token 
ON driver_profiles(user_id) 
WHERE push_token IS NOT NULL;

-- Create driver_notifications table for real-time notifications
CREATE TABLE IF NOT EXISTS driver_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trip_requests(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('asap_assignment', 'trip_update', 'trip_cancelled', 'customer_message', 'system_alert')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_notifications_driver_id ON driver_notifications(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_notifications_trip_id ON driver_notifications(trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_notifications_type ON driver_notifications(type);
CREATE INDEX IF NOT EXISTS idx_driver_notifications_sent_at ON driver_notifications(sent_at);

-- Enable RLS
ALTER TABLE driver_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for driver_notifications
CREATE POLICY "Drivers can view their own notifications" ON driver_notifications
    FOR SELECT USING (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own notifications" ON driver_notifications
    FOR UPDATE USING (driver_id = auth.uid());

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications" ON driver_notifications
    FOR INSERT WITH CHECK (true);

-- Service role can select all notifications
CREATE POLICY "Service role can select all notifications" ON driver_notifications
    FOR SELECT USING (true);

-- Show the updated structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
    AND (column_name LIKE '%push%' OR column_name LIKE '%token%')
ORDER BY column_name;
