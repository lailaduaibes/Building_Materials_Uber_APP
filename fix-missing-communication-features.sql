-- =============================================================================
-- FIX MISSING COMMUNICATION FEATURES
-- Run this ONLY if the check script shows missing components
-- =============================================================================

-- If trip_messages table is missing:
CREATE TABLE IF NOT EXISTS trip_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'driver')),
    message_type VARCHAR(30) NOT NULL DEFAULT 'text' CHECK (message_type IN (
        'text', 'image', 'location', 'voice', 'system', 'eta_update'
    )),
    content TEXT NOT NULL,
    image_url TEXT,
    location_data JSONB,
    voice_url TEXT,
    voice_duration INTEGER,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If trip_photos table is missing:
CREATE TABLE IF NOT EXISTS trip_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    taken_by_id UUID NOT NULL REFERENCES auth.users(id),
    taken_by_type VARCHAR(20) NOT NULL CHECK (taken_by_type IN ('customer', 'driver')),
    photo_type VARCHAR(30) NOT NULL CHECK (photo_type IN (
        'pickup_before', 'pickup_after', 'delivery_before', 'delivery_after',
        'damage_report', 'location_proof', 'signature', 'general'
    )),
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size INTEGER,
    image_width INTEGER,
    image_height INTEGER,
    location_data JSONB,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If trip_call_logs table is missing:
CREATE TABLE IF NOT EXISTS trip_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES auth.users(id),
    receiver_id UUID NOT NULL REFERENCES auth.users(id),
    caller_type VARCHAR(20) NOT NULL CHECK (caller_type IN ('customer', 'driver')),
    call_type VARCHAR(30) NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'emergency', 'support')),
    call_status VARCHAR(30) NOT NULL CHECK (call_status IN ('initiated', 'ringing', 'answered', 'ended', 'missed', 'failed')),
    duration_seconds INTEGER DEFAULT 0,
    call_quality VARCHAR(20),
    call_id VARCHAR(255),
    provider VARCHAR(50) DEFAULT 'system',
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If user_communication_preferences table is missing:
CREATE TABLE IF NOT EXISTS user_communication_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    allow_messages BOOLEAN DEFAULT true,
    allow_voice_calls BOOLEAN DEFAULT true,
    allow_photos BOOLEAN DEFAULT true,
    notify_new_message BOOLEAN DEFAULT true,
    notify_missed_call BOOLEAN DEFAULT true,
    notify_photo_request BOOLEAN DEFAULT true,
    auto_delete_messages_days INTEGER DEFAULT 30,
    share_location_in_messages BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_communication_preferences ENABLE ROW LEVEL SECURITY;

-- Create indexes if missing
CREATE INDEX IF NOT EXISTS idx_trip_messages_trip_id ON trip_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_messages_sender ON trip_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_trip_messages_created_at ON trip_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_messages_unread ON trip_messages(trip_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON trip_photos(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_type ON trip_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_trip_photos_taken_by ON trip_photos(taken_by_id);

CREATE INDEX IF NOT EXISTS idx_trip_call_logs_trip_id ON trip_call_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_call_logs_participants ON trip_call_logs(caller_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_trip_call_logs_status ON trip_call_logs(call_status);

-- Helper functions
CREATE OR REPLACE FUNCTION get_trip_participants(trip_uuid UUID)
RETURNS TABLE(customer_id UUID, driver_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT t.customer_id, t.assigned_driver_id
    FROM trip_requests t
    WHERE t.id = trip_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Insert default preferences for existing users
INSERT INTO user_communication_preferences (user_id)
SELECT DISTINCT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_communication_preferences)
ON CONFLICT (user_id) DO NOTHING;

SELECT 'Communication features repair completed!' as status;
