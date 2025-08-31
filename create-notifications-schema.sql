-- Advanced Analytics & Push Notifications Database Schema
-- Creates all necessary tables and policies for the enhanced dashboard

-- ========================================
-- NOTIFICATION SYSTEM TABLES
-- ========================================

-- User notification tokens (push tokens for devices)
CREATE TABLE IF NOT EXISTS user_notification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'driver')),
    push_token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_info JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences for users
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    trip_updates BOOLEAN DEFAULT true,
    driver_status BOOLEAN DEFAULT true,
    asap_alerts BOOLEAN DEFAULT true,
    marketing BOOLEAN DEFAULT false,
    system_notifications BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    vibration_enabled BOOLEAN DEFAULT true,
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '07:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications sent to users
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, -- Custom ID format
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('trip_update', 'driver_status', 'asap_alert', 'system', 'marketing')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read', 'cleared')),
    template_id TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    delivery_count INTEGER DEFAULT 0,
    error_message TEXT
);

-- Delivery receipts for tracking notification delivery
CREATE TABLE IF NOT EXISTS notification_delivery_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    push_token TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'read')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT,
    response_data JSONB DEFAULT '{}'
);

-- ========================================
-- ANALYTICS & METRICS TABLES
-- ========================================

-- Daily analytics aggregations
CREATE TABLE IF NOT EXISTS daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    asap_trips INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    asap_revenue DECIMAL(10,2) DEFAULT 0,
    active_drivers INTEGER DEFAULT 0,
    online_drivers INTEGER DEFAULT 0,
    avg_trip_value DECIMAL(8,2) DEFAULT 0,
    driver_efficiency DECIMAL(5,2) DEFAULT 0,
    fuel_saved_liters DECIMAL(8,2) DEFAULT 0,
    cost_saved_shekels DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip analytics for advanced insights
CREATE TABLE IF NOT EXISTS trip_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES driver_profiles(id),
    pickup_time TIMESTAMP WITH TIME ZONE,
    delivery_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    distance_km DECIMAL(6,2),
    base_price DECIMAL(8,2),
    final_price DECIMAL(8,2),
    asap_multiplier DECIMAL(4,2) DEFAULT 1.0,
    driver_earnings DECIMAL(8,2),
    fuel_cost DECIMAL(6,2),
    route_efficiency DECIMAL(5,2),
    customer_rating INTEGER,
    driver_rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Route optimization logs
CREATE TABLE IF NOT EXISTS route_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    optimization_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    vehicles_count INTEGER NOT NULL,
    trips_count INTEGER NOT NULL,
    total_distance_km DECIMAL(8,2),
    optimized_distance_km DECIMAL(8,2),
    distance_saved_km DECIMAL(8,2),
    time_saved_minutes INTEGER,
    fuel_saved_liters DECIMAL(6,2),
    cost_saved_shekels DECIMAL(8,2),
    efficiency_percentage DECIMAL(5,2),
    algorithm_used TEXT DEFAULT 'genetic_algorithm',
    execution_time_ms INTEGER,
    recommendations JSONB DEFAULT '[]',
    routes_data JSONB DEFAULT '{}'
);

-- Driver performance metrics
CREATE TABLE IF NOT EXISTS driver_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    trips_completed INTEGER DEFAULT 0,
    asap_trips_completed INTEGER DEFAULT 0,
    total_earnings DECIMAL(8,2) DEFAULT 0,
    hours_active DECIMAL(4,1) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    fuel_efficiency_rating DECIMAL(3,2) DEFAULT 0,
    on_time_percentage DECIMAL(5,2) DEFAULT 0,
    cancellation_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, date)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Notification system indexes
CREATE INDEX IF NOT EXISTS idx_user_notification_tokens_user_id ON user_notification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_tokens_active ON user_notification_tokens(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_receipts_notification_id ON notification_delivery_receipts(notification_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_trip_analytics_trip_id ON trip_analytics(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_analytics_driver_id ON trip_analytics(driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_analytics_pickup_time ON trip_analytics(pickup_time DESC);
CREATE INDEX IF NOT EXISTS idx_route_optimizations_date ON route_optimizations(optimization_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_performance_metrics_driver_date ON driver_performance_metrics(driver_id, date DESC);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE user_notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Notification tokens policies
CREATE POLICY "Users can manage their own notification tokens" ON user_notification_tokens
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notification tokens" ON user_notification_tokens
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences" ON user_notification_preferences
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notification preferences" ON user_notification_preferences
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notification status" ON notifications
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status IN ('read', 'cleared'));

CREATE POLICY "Service role can manage all notifications" ON notifications
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Analytics policies (admin/service role only)
CREATE POLICY "Admin can view all analytics" ON daily_analytics
FOR SELECT USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

CREATE POLICY "Service role can manage analytics" ON daily_analytics
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Similar policies for other analytics tables
CREATE POLICY "Admin can view trip analytics" ON trip_analytics
FOR SELECT USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

CREATE POLICY "Service role can manage trip analytics" ON trip_analytics
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admin can view route optimizations" ON route_optimizations
FOR SELECT USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

CREATE POLICY "Service role can manage route optimizations" ON route_optimizations
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Driver performance policies (drivers can see their own, admins see all)
CREATE POLICY "Drivers can view their own performance metrics" ON driver_performance_metrics
FOR SELECT USING (
    driver_id = (SELECT id FROM driver_profiles WHERE user_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

CREATE POLICY "Service role can manage driver performance metrics" ON driver_performance_metrics
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update daily analytics
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS trigger AS $$
BEGIN
    INSERT INTO daily_analytics (
        date,
        total_trips,
        completed_trips,
        asap_trips,
        total_revenue,
        asap_revenue,
        avg_trip_value
    )
    SELECT 
        CURRENT_DATE,
        COUNT(*) as total_trips,
        COUNT(*) FILTER (WHERE status = 'delivered') as completed_trips,
        COUNT(*) FILTER (WHERE pickup_time_preference = 'asap') as asap_trips,
        COALESCE(SUM(final_price) FILTER (WHERE status = 'delivered'), 0) as total_revenue,
        COALESCE(SUM(final_price) FILTER (WHERE status = 'delivered' AND pickup_time_preference = 'asap'), 0) as asap_revenue,
        COALESCE(AVG(final_price) FILTER (WHERE status = 'delivered'), 0) as avg_trip_value
    FROM trip_requests
    WHERE DATE(created_at) = CURRENT_DATE
    ON CONFLICT (date) 
    DO UPDATE SET
        total_trips = EXCLUDED.total_trips,
        completed_trips = EXCLUDED.completed_trips,
        asap_trips = EXCLUDED.asap_trips,
        total_revenue = EXCLUDED.total_revenue,
        asap_revenue = EXCLUDED.asap_revenue,
        avg_trip_value = EXCLUDED.avg_trip_value,
        updated_at = NOW();

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update analytics when trips change
CREATE OR REPLACE TRIGGER trigger_update_daily_analytics
    AFTER INSERT OR UPDATE ON trip_requests
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_daily_analytics();

-- Function to create trip analytics entry
CREATE OR REPLACE FUNCTION create_trip_analytics()
RETURNS trigger AS $$
DECLARE
    pickup_ts TIMESTAMP WITH TIME ZONE;
    delivery_ts TIMESTAMP WITH TIME ZONE;
    duration_mins INTEGER;
    driver_earning DECIMAL(8,2);
    asap_mult DECIMAL(4,2);
BEGIN
    -- Only process completed trips
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        -- Get pickup and delivery timestamps (you may need to adjust based on your schema)
        pickup_ts := NEW.updated_at - INTERVAL '2 hours'; -- Estimate
        delivery_ts := NEW.updated_at;
        duration_mins := EXTRACT(EPOCH FROM (delivery_ts - pickup_ts)) / 60;
        
        -- Calculate ASAP multiplier
        asap_mult := CASE 
            WHEN NEW.pickup_time_preference = 'asap' THEN 1.5
            ELSE 1.0
        END;
        
        -- Calculate driver earnings (85% of final price)
        driver_earning := (NEW.final_price * 0.85);
        
        INSERT INTO trip_analytics (
            trip_id,
            driver_id,
            pickup_time,
            delivery_time,
            duration_minutes,
            base_price,
            final_price,
            asap_multiplier,
            driver_earnings
        ) VALUES (
            NEW.id,
            NEW.assigned_driver_id,
            pickup_ts,
            delivery_ts,
            duration_mins,
            NEW.quoted_price,
            NEW.final_price,
            asap_mult,
            driver_earning
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for trip analytics
CREATE OR REPLACE TRIGGER trigger_create_trip_analytics
    AFTER UPDATE ON trip_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_trip_analytics();

-- Function to clean old notifications (run daily)
CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS void AS $$
BEGIN
    -- Delete read notifications older than 30 days
    DELETE FROM notifications 
    WHERE status = 'read' 
    AND read_at < NOW() - INTERVAL '30 days';
    
    -- Delete failed notifications older than 7 days
    DELETE FROM notifications 
    WHERE status = 'failed' 
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Delete cleared notifications older than 7 days
    DELETE FROM notifications 
    WHERE status = 'cleared' 
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Clean delivery receipts for deleted notifications
    DELETE FROM notification_delivery_receipts 
    WHERE notification_id NOT IN (SELECT id FROM notifications);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VIEWS FOR EASY ACCESS
-- ========================================

-- Analytics dashboard view
CREATE OR REPLACE VIEW analytics_dashboard AS
SELECT 
    CURRENT_DATE as date,
    (SELECT COUNT(*) FROM trip_requests WHERE DATE(created_at) = CURRENT_DATE) as today_trips,
    (SELECT COUNT(*) FROM trip_requests WHERE DATE(created_at) = CURRENT_DATE AND status = 'delivered') as today_completed,
    (SELECT COUNT(*) FROM trip_requests WHERE DATE(created_at) = CURRENT_DATE AND pickup_time_preference = 'asap') as today_asap,
    (SELECT COALESCE(SUM(final_price), 0) FROM trip_requests WHERE DATE(created_at) = CURRENT_DATE AND status = 'delivered') as today_revenue,
    (SELECT COUNT(*) FROM driver_profiles WHERE approval_status = 'approved') as total_drivers,
    (SELECT COUNT(*) FROM driver_profiles WHERE approval_status = 'approved' AND is_online = true) as online_drivers,
    (SELECT AVG(final_price) FROM trip_requests WHERE DATE(created_at) = CURRENT_DATE AND status = 'delivered') as avg_trip_value;

-- Driver performance view
CREATE OR REPLACE VIEW driver_performance_summary AS
SELECT 
    dp.id as driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    dp.phone,
    COUNT(tr.id) as total_trips,
    COUNT(tr.id) FILTER (WHERE tr.status = 'delivered') as completed_trips,
    COUNT(tr.id) FILTER (WHERE tr.pickup_time_preference = 'asap') as asap_trips,
    COALESCE(SUM(tr.final_price) FILTER (WHERE tr.status = 'delivered'), 0) * 0.85 as total_earnings,
    COALESCE(AVG(tr.final_price) FILTER (WHERE tr.status = 'delivered'), 0) as avg_trip_value,
    dp.is_online,
    dp.approval_status
FROM driver_profiles dp
LEFT JOIN trip_requests tr ON dp.id = tr.assigned_driver_id
WHERE dp.approval_status = 'approved'
GROUP BY dp.id, dp.first_name, dp.last_name, dp.phone, dp.is_online, dp.approval_status;

-- Recent notifications view
CREATE OR REPLACE VIEW recent_notifications AS
SELECT 
    n.*,
    u.email as user_email,
    CASE 
        WHEN EXISTS(SELECT 1 FROM driver_profiles WHERE user_id = n.user_id) THEN 'driver'
        ELSE 'customer'
    END as user_type
FROM notifications n
JOIN auth.users u ON n.user_id = u.id
WHERE n.created_at > NOW() - INTERVAL '24 hours'
ORDER BY n.created_at DESC;

-- Grant permissions on views
GRANT SELECT ON analytics_dashboard TO authenticated;
GRANT SELECT ON driver_performance_summary TO authenticated;
GRANT SELECT ON recent_notifications TO authenticated;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert sample daily analytics for the past week
INSERT INTO daily_analytics (date, total_trips, completed_trips, asap_trips, total_revenue, asap_revenue, active_drivers, online_drivers, avg_trip_value, driver_efficiency)
VALUES 
    (CURRENT_DATE - INTERVAL '7 days', 45, 38, 12, 2340.00, 950.00, 25, 15, 61.58, 85.5),
    (CURRENT_DATE - INTERVAL '6 days', 52, 46, 18, 2890.00, 1200.00, 28, 18, 62.83, 87.2),
    (CURRENT_DATE - INTERVAL '5 days', 38, 35, 10, 2150.00, 780.00, 24, 12, 61.43, 82.1),
    (CURRENT_DATE - INTERVAL '4 days', 61, 55, 22, 3420.00, 1450.00, 30, 22, 62.18, 89.3),
    (CURRENT_DATE - INTERVAL '3 days', 49, 44, 15, 2780.00, 1100.00, 27, 17, 63.18, 86.8),
    (CURRENT_DATE - INTERVAL '2 days', 55, 50, 19, 3150.00, 1380.00, 29, 20, 63.00, 88.1),
    (CURRENT_DATE - INTERVAL '1 days', 43, 39, 14, 2450.00, 980.00, 26, 16, 62.82, 84.9)
ON CONFLICT (date) DO NOTHING;

COMMENT ON TABLE user_notification_tokens IS 'Store push notification tokens for users devices';
COMMENT ON TABLE user_notification_preferences IS 'User preferences for different types of notifications';
COMMENT ON TABLE notifications IS 'All notifications sent to users';
COMMENT ON TABLE notification_delivery_receipts IS 'Track delivery status of individual notifications';
COMMENT ON TABLE daily_analytics IS 'Daily aggregated analytics for dashboard';
COMMENT ON TABLE trip_analytics IS 'Detailed analytics for each trip';
COMMENT ON TABLE route_optimizations IS 'Log of route optimization runs';
COMMENT ON TABLE driver_performance_metrics IS 'Daily performance metrics for each driver';

COMMIT;
