-- 🚀 Advanced Analytics & Notifications Database Schema
-- Creates tables for analytics tracking, push notifications, and route optimization
-- Run this in Supabase SQL Editor to enable all advanced dashboard features

-- ================================
-- 📊 ANALYTICS TABLES
-- ================================

-- Analytics events tracking
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- 'trip_created', 'trip_completed', 'asap_request', 'driver_online', etc.
    event_category TEXT NOT NULL, -- 'trip', 'driver', 'revenue', 'system'
    user_id UUID REFERENCES users(id),
    driver_id UUID REFERENCES driver_profiles(id),
    trip_id UUID REFERENCES trip_requests(id),
    event_data JSONB DEFAULT '{}', -- Flexible data storage
    revenue_amount DECIMAL(10,2), -- For revenue events
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    
    -- Indexes for fast analytics queries
    INDEX idx_analytics_events_type (event_type),
    INDEX idx_analytics_events_category (event_category),
    INDEX idx_analytics_events_date (created_at),
    INDEX idx_analytics_revenue (revenue_amount) WHERE revenue_amount IS NOT NULL
);

-- Daily analytics aggregations (for faster dashboard loading)
CREATE TABLE IF NOT EXISTS daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    
    -- Trip metrics
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    asap_trips INTEGER DEFAULT 0,
    scheduled_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    
    -- Revenue metrics
    total_revenue DECIMAL(12,2) DEFAULT 0,
    asap_revenue DECIMAL(12,2) DEFAULT 0,
    avg_trip_value DECIMAL(10,2) DEFAULT 0,
    
    -- Driver metrics
    active_drivers INTEGER DEFAULT 0,
    online_drivers INTEGER DEFAULT 0,
    new_drivers INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_delivery_time INTEGER, -- minutes
    avg_response_time INTEGER, -- minutes
    driver_efficiency DECIMAL(5,2), -- percentage
    
    -- System metrics
    api_calls INTEGER DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- 🔔 PUSH NOTIFICATIONS TABLES
-- ================================

-- Push notifications storage
CREATE TABLE IF NOT EXISTS push_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL, -- 'trip_update', 'driver_alert', 'system_notification', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Additional data payload
    priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
    
    -- Targeting
    target_users UUID[] DEFAULT '{}', -- Specific user IDs
    target_roles TEXT[] DEFAULT '{}', -- 'customer', 'driver', 'admin'
    
    -- Delivery tracking
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Optional fields
    expires_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    icon TEXT,
    sound TEXT DEFAULT 'default',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_push_notifications_type (type),
    INDEX idx_push_notifications_status (status),
    INDEX idx_push_notifications_priority (priority),
    INDEX idx_push_notifications_created (created_at),
    INDEX idx_push_notifications_target_users USING GIN (target_users),
    INDEX idx_push_notifications_target_roles USING GIN (target_roles)
);

-- Notification delivery tracking (per user)
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES push_notifications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_token TEXT, -- For push notification services
    delivery_status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'read'
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(notification_id, user_id),
    
    -- Indexes
    INDEX idx_notification_deliveries_user (user_id),
    INDEX idx_notification_deliveries_status (delivery_status),
    INDEX idx_notification_deliveries_notification (notification_id)
);

-- ================================
-- 🗺️ ROUTE OPTIMIZATION TABLES
-- ================================

-- Route optimization sessions
CREATE TABLE IF NOT EXISTS route_optimization_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_name TEXT,
    
    -- Input parameters
    trip_ids UUID[] NOT NULL, -- Trips to optimize
    vehicle_ids UUID[] NOT NULL, -- Available vehicles
    optimization_type TEXT DEFAULT 'ai_genetic', -- 'ai_genetic', 'nearest_neighbor', 'tsp'
    
    -- Optimization settings
    prioritize_asap BOOLEAN DEFAULT TRUE,
    consider_traffic BOOLEAN DEFAULT TRUE,
    max_route_duration INTEGER, -- minutes
    max_stops_per_route INTEGER DEFAULT 10,
    
    -- Results
    optimization_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    total_distance_saved DECIMAL(8,2), -- km
    total_time_saved INTEGER, -- minutes
    total_fuel_saved DECIMAL(6,2), -- liters
    total_cost_saved DECIMAL(10,2), -- ₪
    optimization_score DECIMAL(5,2), -- 0-100
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    
    -- Error handling
    error_message TEXT,
    
    -- Indexes
    INDEX idx_route_optimization_status (optimization_status),
    INDEX idx_route_optimization_created (created_at)
);

-- Optimized routes (results from optimization sessions)
CREATE TABLE IF NOT EXISTS optimized_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    optimization_session_id UUID REFERENCES route_optimization_sessions(id) ON DELETE CASCADE,
    
    -- Route details
    vehicle_id UUID REFERENCES trucks(id),
    driver_id UUID REFERENCES driver_profiles(user_id),
    route_order INTEGER NOT NULL, -- Order of this route in the session
    
    -- Route data
    stops JSONB NOT NULL, -- Array of stops with coordinates, delivery info, etc.
    total_distance DECIMAL(8,2) NOT NULL, -- km
    estimated_duration INTEGER NOT NULL, -- minutes
    fuel_consumption DECIMAL(6,2), -- liters
    estimated_cost DECIMAL(10,2), -- ₪
    
    -- Route status
    status TEXT DEFAULT 'planned', -- 'planned', 'sent_to_driver', 'in_progress', 'completed'
    sent_to_driver_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance tracking
    actual_distance DECIMAL(8,2), -- Actual distance traveled
    actual_duration INTEGER, -- Actual time taken
    optimization_score DECIMAL(5,2), -- How well this route performed vs. prediction
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_optimized_routes_session (optimization_session_id),
    INDEX idx_optimized_routes_vehicle (vehicle_id),
    INDEX idx_optimized_routes_driver (driver_id),
    INDEX idx_optimized_routes_status (status)
);

-- ================================
-- 📈 BUSINESS INTELLIGENCE VIEWS
-- ================================

-- Revenue performance view
CREATE OR REPLACE VIEW revenue_analytics AS
SELECT 
    date_trunc('day', tr.created_at) as date,
    COUNT(*) as total_trips,
    COUNT(*) FILTER (WHERE tr.status = 'delivered') as completed_trips,
    COUNT(*) FILTER (WHERE tr.pickup_time_preference = 'asap') as asap_trips,
    SUM(tr.final_price) FILTER (WHERE tr.status = 'delivered') as total_revenue,
    SUM(tr.final_price) FILTER (WHERE tr.status = 'delivered' AND tr.pickup_time_preference = 'asap') as asap_revenue,
    AVG(tr.final_price) FILTER (WHERE tr.status = 'delivered') as avg_trip_value,
    
    -- ASAP performance metrics
    AVG(tr.final_price) FILTER (WHERE tr.status = 'delivered' AND tr.pickup_time_preference = 'asap') as avg_asap_value,
    AVG(tr.final_price) FILTER (WHERE tr.status = 'delivered' AND tr.pickup_time_preference != 'asap') as avg_regular_value,
    
    -- Completion rates
    ROUND(
        (COUNT(*) FILTER (WHERE tr.status = 'delivered')::decimal / NULLIF(COUNT(*), 0)) * 100, 2
    ) as completion_rate
FROM trip_requests tr
WHERE tr.created_at >= NOW() - INTERVAL '90 days'
GROUP BY date_trunc('day', tr.created_at)
ORDER BY date DESC;

-- Driver performance view
CREATE OR REPLACE VIEW driver_analytics AS
SELECT 
    dp.id as driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    dp.approval_status,
    dp.is_online,
    
    -- Trip metrics
    COUNT(tr.id) as total_trips,
    COUNT(tr.id) FILTER (WHERE tr.status = 'delivered') as completed_trips,
    COUNT(tr.id) FILTER (WHERE tr.pickup_time_preference = 'asap') as asap_trips,
    
    -- Revenue metrics
    SUM(tr.final_price) FILTER (WHERE tr.status = 'delivered') as total_earnings,
    AVG(tr.final_price) FILTER (WHERE tr.status = 'delivered') as avg_trip_earnings,
    
    -- Performance metrics
    ROUND(
        (COUNT(tr.id) FILTER (WHERE tr.status = 'delivered')::decimal / NULLIF(COUNT(tr.id), 0)) * 100, 2
    ) as completion_rate,
    AVG(EXTRACT(EPOCH FROM (tr.delivered_at - tr.accepted_at))/60) as avg_delivery_time_minutes,
    
    -- Rating
    dp.rating,
    
    -- Activity
    dp.last_seen,
    DATE(dp.created_at) as joined_date
    
FROM driver_profiles dp
LEFT JOIN trip_requests tr ON tr.assigned_driver_id = dp.user_id
WHERE dp.created_at >= NOW() - INTERVAL '90 days'
GROUP BY dp.id, dp.first_name, dp.last_name, dp.approval_status, dp.is_online, dp.rating, dp.last_seen, dp.created_at
ORDER BY completed_trips DESC;

-- System performance view
CREATE OR REPLACE VIEW system_analytics AS
WITH daily_stats AS (
    SELECT 
        date_trunc('day', created_at) as date,
        COUNT(*) as total_trips,
        COUNT(*) FILTER (WHERE status = 'delivered') as completed_trips,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_trips,
        AVG(EXTRACT(EPOCH FROM (accepted_at - created_at))/60) FILTER (WHERE accepted_at IS NOT NULL) as avg_response_time_minutes,
        AVG(EXTRACT(EPOCH FROM (delivered_at - accepted_at))/60) FILTER (WHERE delivered_at IS NOT NULL AND accepted_at IS NOT NULL) as avg_delivery_time_minutes
    FROM trip_requests
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY date_trunc('day', created_at)
)
SELECT 
    date,
    total_trips,
    completed_trips,
    cancelled_trips,
    ROUND((completed_trips::decimal / NULLIF(total_trips, 0)) * 100, 2) as completion_rate,
    ROUND((cancelled_trips::decimal / NULLIF(total_trips, 0)) * 100, 2) as cancellation_rate,
    ROUND(avg_response_time_minutes, 1) as avg_response_time_minutes,
    ROUND(avg_delivery_time_minutes, 1) as avg_delivery_time_minutes,
    
    -- System health indicators
    CASE 
        WHEN completed_trips::decimal / NULLIF(total_trips, 0) >= 0.9 THEN 'excellent'
        WHEN completed_trips::decimal / NULLIF(total_trips, 0) >= 0.8 THEN 'good'
        WHEN completed_trips::decimal / NULLIF(total_trips, 0) >= 0.7 THEN 'fair'
        ELSE 'needs_attention'
    END as system_health
FROM daily_stats
ORDER BY date DESC;

-- ================================
-- 🔧 FUNCTIONS & TRIGGERS
-- ================================

-- Function to automatically create analytics events
CREATE OR REPLACE FUNCTION create_analytics_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Trip status change events
    IF TG_TABLE_NAME = 'trip_requests' THEN
        -- Trip created
        IF TG_OP = 'INSERT' THEN
            INSERT INTO analytics_events (
                event_type, 
                event_category, 
                user_id, 
                trip_id, 
                event_data,
                revenue_amount
            ) VALUES (
                'trip_created',
                'trip',
                NEW.user_id,
                NEW.id,
                jsonb_build_object(
                    'pickup_time_preference', NEW.pickup_time_preference,
                    'quoted_price', NEW.quoted_price,
                    'pickup_latitude', NEW.pickup_latitude,
                    'pickup_longitude', NEW.pickup_longitude
                ),
                NEW.quoted_price
            );
        END IF;
        
        -- Trip status updated
        IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
            INSERT INTO analytics_events (
                event_type, 
                event_category, 
                user_id, 
                driver_id,
                trip_id, 
                event_data,
                revenue_amount
            ) VALUES (
                'trip_status_changed',
                'trip',
                NEW.user_id,
                (SELECT user_id FROM driver_profiles WHERE id = NEW.assigned_driver_id),
                NEW.id,
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'final_price', NEW.final_price
                ),
                CASE WHEN NEW.status = 'delivered' THEN NEW.final_price ELSE NULL END
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for analytics events
DROP TRIGGER IF EXISTS trip_analytics_trigger ON trip_requests;
CREATE TRIGGER trip_analytics_trigger
    AFTER INSERT OR UPDATE ON trip_requests
    FOR EACH ROW EXECUTE FUNCTION create_analytics_event();

-- Function to update daily analytics
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS VOID AS $$
DECLARE
    target_date DATE := CURRENT_DATE;
BEGIN
    INSERT INTO daily_analytics (
        date,
        total_trips,
        completed_trips,
        asap_trips,
        scheduled_trips,
        cancelled_trips,
        total_revenue,
        asap_revenue,
        avg_trip_value,
        active_drivers,
        online_drivers
    )
    SELECT 
        target_date,
        COUNT(*) as total_trips,
        COUNT(*) FILTER (WHERE status = 'delivered') as completed_trips,
        COUNT(*) FILTER (WHERE pickup_time_preference = 'asap') as asap_trips,
        COUNT(*) FILTER (WHERE pickup_time_preference = 'scheduled') as scheduled_trips,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_trips,
        COALESCE(SUM(final_price) FILTER (WHERE status = 'delivered'), 0) as total_revenue,
        COALESCE(SUM(final_price) FILTER (WHERE status = 'delivered' AND pickup_time_preference = 'asap'), 0) as asap_revenue,
        COALESCE(AVG(final_price) FILTER (WHERE status = 'delivered'), 0) as avg_trip_value,
        (SELECT COUNT(*) FROM driver_profiles WHERE approval_status = 'approved') as active_drivers,
        (SELECT COUNT(*) FROM driver_profiles WHERE approval_status = 'approved' AND is_online = true) as online_drivers
    FROM trip_requests
    WHERE DATE(created_at) = target_date
    
    ON CONFLICT (date) DO UPDATE SET
        total_trips = EXCLUDED.total_trips,
        completed_trips = EXCLUDED.completed_trips,
        asap_trips = EXCLUDED.asap_trips,
        scheduled_trips = EXCLUDED.scheduled_trips,
        cancelled_trips = EXCLUDED.cancelled_trips,
        total_revenue = EXCLUDED.total_revenue,
        asap_revenue = EXCLUDED.asap_revenue,
        avg_trip_value = EXCLUDED.avg_trip_value,
        active_drivers = EXCLUDED.active_drivers,
        online_drivers = EXCLUDED.online_drivers,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 🔐 ROW LEVEL SECURITY (RLS)
-- ================================

-- Enable RLS on new tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_optimization_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimized_routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_events
CREATE POLICY "Admin can view all analytics events" ON analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- RLS Policies for push_notifications
CREATE POLICY "Users can view their own notifications" ON push_notifications
    FOR SELECT USING (
        auth.uid() = ANY(target_users) OR
        (SELECT role FROM users WHERE id = auth.uid()) = ANY(target_roles) OR
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "Admin can manage all notifications" ON push_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- RLS Policies for notification_deliveries
CREATE POLICY "Users can view their own notification deliveries" ON notification_deliveries
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notification status" ON notification_deliveries
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for route optimization
CREATE POLICY "Admin and dispatchers can manage route optimization" ON route_optimization_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'dispatcher')
        )
    );

CREATE POLICY "Drivers can view their assigned routes" ON optimized_routes
    FOR SELECT USING (
        driver_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'dispatcher')
        )
    );

-- ================================
-- 🎯 SAMPLE DATA & INITIAL SETUP
-- ================================

-- Insert initial daily analytics for the past 7 days
DO $$
DECLARE
    i INTEGER;
    target_date DATE;
BEGIN
    FOR i IN 0..6 LOOP
        target_date := CURRENT_DATE - i;
        PERFORM update_daily_analytics();
    END LOOP;
END $$;

-- Create sample push notification templates
INSERT INTO push_notifications (
    type, title, message, priority, target_roles, status, sent_at
) VALUES 
    ('system_notification', '🚀 Advanced Dashboard Activated', 'Your YouMats dashboard now includes advanced analytics, route optimization, and real-time notifications!', 'normal', ARRAY['admin'], 'sent', NOW()),
    ('system_notification', '📊 Analytics Available', 'View detailed business insights, revenue trends, and performance metrics in your new analytics dashboard.', 'normal', ARRAY['admin'], 'sent', NOW()),
    ('system_notification', '🤖 AI Route Optimization Ready', 'Optimize delivery routes automatically to save time and fuel costs.', 'normal', ARRAY['admin'], 'sent', NOW())
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Advanced Analytics & Notifications schema created successfully!';
    RAISE NOTICE '📊 Features enabled: Analytics tracking, Push notifications, Route optimization';
    RAISE NOTICE '🔔 Dashboard ready: Visit your enhanced admin dashboard to view analytics';
    RAISE NOTICE '🚀 Next steps: Configure push notification service and start using AI route optimization';
END $$;
