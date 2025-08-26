-- =============================================================================
-- COMMUNICATION FEATURES DATABASE SETUP
-- Driver-Customer Messaging, Photo Confirmations, Call Logs
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TRIP MESSAGES TABLE - Driver-Customer Communication
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trip and participants
    trip_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'driver')),
    
    -- Message content
    message_type VARCHAR(30) NOT NULL DEFAULT 'text' CHECK (message_type IN (
        'text', 'image', 'location', 'voice', 'system', 'eta_update'
    )),
    content TEXT NOT NULL,
    image_url TEXT,
    location_data JSONB, -- {lat, lng, address}
    voice_url TEXT,
    voice_duration INTEGER, -- seconds
    
    -- Delivery status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_messages_trip_id ON trip_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_messages_sender ON trip_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_trip_messages_created_at ON trip_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_messages_unread ON trip_messages(trip_id, is_read) WHERE is_read = false;

-- =============================================================================
-- 2. TRIP PHOTOS TABLE - Photo Confirmations & Documentation
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trip reference
    trip_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    taken_by_id UUID NOT NULL REFERENCES auth.users(id),
    taken_by_type VARCHAR(20) NOT NULL CHECK (taken_by_type IN ('customer', 'driver')),
    
    -- Photo details
    photo_type VARCHAR(30) NOT NULL CHECK (photo_type IN (
        'pickup_before',     -- Before loading materials
        'pickup_after',      -- After loading materials  
        'delivery_before',   -- Before unloading
        'delivery_after',    -- After unloading/delivery complete
        'damage_report',     -- If there's damage
        'location_proof',    -- GPS location verification
        'signature',         -- Digital signature
        'general'           -- General trip documentation
    )),
    
    -- File details
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size INTEGER, -- bytes
    image_width INTEGER,
    image_height INTEGER,
    
    -- Location and context
    location_data JSONB, -- {lat, lng, address, accuracy}
    description TEXT,
    is_required BOOLEAN DEFAULT false, -- Was this a required photo?
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON trip_photos(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_type ON trip_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_trip_photos_taken_by ON trip_photos(taken_by_id);

-- =============================================================================
-- 3. CALL LOGS TABLE - Voice Communication Tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trip and participants
    trip_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES auth.users(id),
    receiver_id UUID NOT NULL REFERENCES auth.users(id),
    caller_type VARCHAR(20) NOT NULL CHECK (caller_type IN ('customer', 'driver')),
    
    -- Call details
    call_type VARCHAR(30) NOT NULL DEFAULT 'voice' CHECK (call_type IN (
        'voice', 'emergency', 'support'
    )),
    call_status VARCHAR(30) NOT NULL CHECK (call_status IN (
        'initiated', 'ringing', 'answered', 'ended', 'missed', 'failed'
    )),
    
    -- Duration and quality
    duration_seconds INTEGER DEFAULT 0,
    call_quality VARCHAR(20), -- 'excellent', 'good', 'fair', 'poor'
    
    -- Technical details
    call_id VARCHAR(255), -- External provider call ID
    provider VARCHAR(50) DEFAULT 'system', -- 'twilio', 'system', 'direct'
    
    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_call_logs_trip_id ON trip_call_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_call_logs_participants ON trip_call_logs(caller_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_trip_call_logs_status ON trip_call_logs(call_status);

-- =============================================================================
-- 4. COMMUNICATION PREFERENCES
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_communication_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Communication preferences
    allow_messages BOOLEAN DEFAULT true,
    allow_voice_calls BOOLEAN DEFAULT true,
    allow_photos BOOLEAN DEFAULT true,
    
    -- Notification preferences for communication
    notify_new_message BOOLEAN DEFAULT true,
    notify_missed_call BOOLEAN DEFAULT true,
    notify_photo_request BOOLEAN DEFAULT true,
    
    -- Privacy settings
    auto_delete_messages_days INTEGER DEFAULT 30, -- Delete messages after X days
    share_location_in_messages BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 5. RLS POLICIES - Security for Communication
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_communication_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (avoid conflicts)
DROP POLICY IF EXISTS "Users can view messages for their trips" ON trip_messages;
DROP POLICY IF EXISTS "Users can send messages for their trips" ON trip_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON trip_messages;
DROP POLICY IF EXISTS "Users can view photos for their trips" ON trip_photos;
DROP POLICY IF EXISTS "Users can upload photos for their trips" ON trip_photos;
DROP POLICY IF EXISTS "Users can view call logs for their trips" ON trip_call_logs;
DROP POLICY IF EXISTS "Users can create call logs for their calls" ON trip_call_logs;
DROP POLICY IF EXISTS "Users can manage their own communication preferences" ON user_communication_preferences;

-- Trip Messages Policies
CREATE POLICY "trip_messages_select_policy" ON trip_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_requests 
            WHERE id = trip_messages.trip_id 
            AND (customer_id = auth.uid() OR assigned_driver_id = auth.uid())
        )
    );

CREATE POLICY "trip_messages_insert_policy" ON trip_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM trip_requests 
            WHERE id = trip_messages.trip_id 
            AND (customer_id = auth.uid() OR assigned_driver_id = auth.uid())
        )
    );

CREATE POLICY "trip_messages_update_policy" ON trip_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Trip Photos Policies
CREATE POLICY "trip_photos_select_policy" ON trip_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_requests 
            WHERE id = trip_photos.trip_id 
            AND (customer_id = auth.uid() OR assigned_driver_id = auth.uid())
        )
    );

CREATE POLICY "trip_photos_insert_policy" ON trip_photos
    FOR INSERT WITH CHECK (
        taken_by_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM trip_requests 
            WHERE id = trip_photos.trip_id 
            AND (customer_id = auth.uid() OR assigned_driver_id = auth.uid())
        )
    );

-- Call Logs Policies
CREATE POLICY "trip_call_logs_select_policy" ON trip_call_logs
    FOR SELECT USING (
        caller_id = auth.uid() OR receiver_id = auth.uid()
    );

CREATE POLICY "trip_call_logs_insert_policy" ON trip_call_logs
    FOR INSERT WITH CHECK (
        caller_id = auth.uid() OR receiver_id = auth.uid()
    );

-- Communication Preferences Policies
CREATE POLICY "user_communication_preferences_policy" ON user_communication_preferences
    FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- 6. TRIGGERS - Automatic Updates
-- =============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
DROP TRIGGER IF EXISTS update_trip_messages_updated_at ON trip_messages;
CREATE TRIGGER update_trip_messages_updated_at
    BEFORE UPDATE ON trip_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_communication_preferences_updated_at ON user_communication_preferences;
CREATE TRIGGER update_user_communication_preferences_updated_at
    BEFORE UPDATE ON user_communication_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. NOTIFICATION TEMPLATES FOR COMMUNICATION
-- =============================================================================

-- Insert communication notification templates
INSERT INTO notification_templates (id, title_template, message_template, type, category) VALUES
('new_message', 'New Message', 'You have a new message from your {{sender_type}}', 'info', 'communication'),
('photo_requested', 'Photo Requested', 'Your {{sender_type}} requested a {{photo_type}} photo', 'info', 'communication'),
('photo_uploaded', 'Photo Uploaded', '{{sender_type}} uploaded a {{photo_type}} photo', 'success', 'communication'),
('call_missed', 'Missed Call', 'You missed a call from your {{caller_type}}', 'warning', 'communication'),
('eta_updated_message', 'ETA Update', 'Your driver sent an ETA update: {{message}}', 'info', 'eta_update')
ON CONFLICT (id) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    message_template = EXCLUDED.message_template;

-- =============================================================================
-- 8. HELPER FUNCTIONS
-- =============================================================================

-- Function to get trip participants
CREATE OR REPLACE FUNCTION get_trip_participants(trip_uuid UUID)
RETURNS TABLE(customer_id UUID, driver_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT t.customer_id, t.assigned_driver_id
    FROM trip_requests t
    WHERE t.id = trip_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(trip_uuid UUID, user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE trip_messages 
    SET is_read = true, read_at = NOW()
    WHERE trip_id = trip_uuid 
      AND sender_id != user_uuid 
      AND is_read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count for user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM trip_messages tm
    JOIN trip_requests tr ON tm.trip_id = tr.id
    WHERE tm.is_read = false
      AND tm.sender_id != user_uuid
      AND (tr.customer_id = user_uuid OR tr.assigned_driver_id = user_uuid);
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. SAMPLE DATA FOR TESTING
-- =============================================================================

-- Create default communication preferences for existing users
INSERT INTO user_communication_preferences (user_id)
SELECT DISTINCT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_communication_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- SETUP COMPLETE
-- =============================================================================

SELECT 
    'Communication features setup complete!' as status,
    'Tables: trip_messages, trip_photos, trip_call_logs, user_communication_preferences' as tables_created,
    'Features: Messaging, Photo confirmations, Call logs, Preferences' as features_enabled;
