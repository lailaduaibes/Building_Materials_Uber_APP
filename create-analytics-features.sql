-- =============================================================================
-- ANALYTICS FEATURES DATABASE SETUP
-- Delivery Tracking Dashboard, Performance Metrics, ETA Predictions
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TRIP ANALYTICS TABLE - Performance Tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trip reference
    trip_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES auth.users(id),
    customer_id UUID REFERENCES auth.users(id),
    
    -- Performance metrics
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    duration_variance_minutes INTEGER, -- actual - estimated
    
    estimated_distance_km DECIMAL(8,2),
    actual_distance_km DECIMAL(8,2),
    distance_variance_km DECIMAL(8,2),
    
    -- ETA tracking
    initial_eta TIMESTAMP WITH TIME ZONE,
    final_eta TIMESTAMP WITH TIME ZONE,
    actual_completion_time TIMESTAMP WITH TIME ZONE,
    eta_accuracy_minutes INTEGER, -- how close final ETA was
    
    -- Driver performance
    response_time_seconds INTEGER, -- time to accept order
    pickup_time_minutes INTEGER, -- time at pickup location
    delivery_time_minutes INTEGER, -- time at delivery location
    
    -- Route efficiency
    optimal_route_distance_km DECIMAL(8,2),
    actual_route_distance_km DECIMAL(8,2),
    route_efficiency_percent DECIMAL(5,2), -- optimal/actual * 100
    
    -- Customer satisfaction indicators
    customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
    driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
    
    -- Communication stats
    messages_sent INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    photos_taken INTEGER DEFAULT 0,
    
    -- Status change timestamps
    matched_at TIMESTAMP WITH TIME ZONE,
    pickup_started_at TIMESTAMP WITH TIME ZONE,
    pickup_completed_at TIMESTAMP WITH TIME ZONE,
    delivery_started_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Calculated fields
    total_trip_time_minutes INTEGER,
    waiting_time_minutes INTEGER,
    driving_time_minutes INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_trip_analytics_trip_id ON trip_analytics(trip_id);
CREATE INDEX idx_trip_analytics_driver_id ON trip_analytics(driver_id);
CREATE INDEX idx_trip_analytics_customer_id ON trip_analytics(customer_id);
CREATE INDEX idx_trip_analytics_delivered_at ON trip_analytics(delivered_at);
CREATE INDEX idx_trip_analytics_duration_variance ON trip_analytics(duration_variance_minutes);

-- =============================================================================
-- 2. DRIVER PERFORMANCE METRICS
-- =============================================================================

CREATE TABLE IF NOT EXISTS driver_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
    
    -- Overall statistics
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Time-based performance
    average_response_time_seconds INTEGER DEFAULT 0,
    average_trip_duration_minutes INTEGER DEFAULT 0,
    average_delay_minutes INTEGER DEFAULT 0,
    
    -- Efficiency metrics
    average_route_efficiency_percent DECIMAL(5,2) DEFAULT 100,
    total_distance_driven_km DECIMAL(10,2) DEFAULT 0,
    fuel_efficiency_score DECIMAL(5,2) DEFAULT 0,
    
    -- Customer satisfaction
    average_customer_rating DECIMAL(3,2) DEFAULT 0,
    total_customer_ratings INTEGER DEFAULT 0,
    five_star_ratings INTEGER DEFAULT 0,
    
    -- Communication metrics
    average_messages_per_trip DECIMAL(5,2) DEFAULT 0,
    total_calls_made INTEGER DEFAULT 0,
    photos_uploaded INTEGER DEFAULT 0,
    
    -- Time period tracking
    last_30_days_trips INTEGER DEFAULT 0,
    last_7_days_trips INTEGER DEFAULT 0,
    current_month_trips INTEGER DEFAULT 0,
    
    -- Performance scores (0-100)
    punctuality_score DECIMAL(5,2) DEFAULT 100,
    communication_score DECIMAL(5,2) DEFAULT 100,
    efficiency_score DECIMAL(5,2) DEFAULT 100,
    overall_performance_score DECIMAL(5,2) DEFAULT 100,
    
    -- Status and ranking
    performance_tier VARCHAR(20) DEFAULT 'bronze', -- bronze, silver, gold, platinum
    ranking_position INTEGER,
    
    -- Timestamps
    last_trip_at TIMESTAMP WITH TIME ZONE,
    metrics_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_driver_performance_driver_id ON driver_performance_metrics(driver_id);
CREATE INDEX idx_driver_performance_score ON driver_performance_metrics(overall_performance_score DESC);
CREATE INDEX idx_driver_performance_tier ON driver_performance_metrics(performance_tier);

-- =============================================================================
-- 3. ETA PREDICTION DATA
-- =============================================================================

CREATE TABLE IF NOT EXISTS eta_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trip reference
    trip_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    
    -- Prediction details
    prediction_type VARCHAR(30) NOT NULL CHECK (prediction_type IN (
        'initial', 'updated', 'real_time', 'final'
    )),
    
    predicted_eta TIMESTAMP WITH TIME ZONE NOT NULL,
    confidence_score DECIMAL(5,2), -- 0-100% confidence
    
    -- Factors used in prediction
    traffic_factor DECIMAL(5,2) DEFAULT 1.0,
    weather_factor DECIMAL(5,2) DEFAULT 1.0,
    driver_performance_factor DECIMAL(5,2) DEFAULT 1.0,
    historical_data_factor DECIMAL(5,2) DEFAULT 1.0,
    
    -- Prediction accuracy (filled after trip completion)
    actual_completion_time TIMESTAMP WITH TIME ZONE,
    accuracy_minutes INTEGER, -- difference between prediction and actual
    accuracy_percentage DECIMAL(5,2),
    
    -- Algorithm information
    algorithm_version VARCHAR(20) DEFAULT '1.0',
    input_parameters JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_eta_predictions_trip_id ON eta_predictions(trip_id);
CREATE INDEX idx_eta_predictions_type ON eta_predictions(prediction_type);
CREATE INDEX idx_eta_predictions_accuracy ON eta_predictions(accuracy_minutes);

-- =============================================================================
-- 4. CUSTOMER ANALYTICS
-- =============================================================================

CREATE TABLE IF NOT EXISTS customer_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
    
    -- Order statistics
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    
    -- Financial metrics
    total_spent DECIMAL(12,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    
    -- Satisfaction metrics
    average_driver_rating DECIMAL(3,2) DEFAULT 0,
    total_driver_ratings INTEGER DEFAULT 0,
    
    -- Communication preferences
    preferred_communication_method VARCHAR(20) DEFAULT 'messages',
    messages_sent INTEGER DEFAULT 0,
    calls_initiated INTEGER DEFAULT 0,
    
    -- Usage patterns
    most_common_pickup_area VARCHAR(255),
    most_common_delivery_area VARCHAR(255),
    most_ordered_material_type VARCHAR(100),
    
    -- Timing patterns
    preferred_delivery_time VARCHAR(20), -- 'morning', 'afternoon', 'evening'
    average_advance_booking_hours INTEGER DEFAULT 0,
    
    -- Loyalty metrics
    first_order_date TIMESTAMP WITH TIME ZONE,
    last_order_date TIMESTAMP WITH TIME ZONE,
    customer_lifetime_days INTEGER DEFAULT 0,
    retention_score DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_analytics_customer_id ON customer_analytics(customer_id);
CREATE INDEX idx_customer_analytics_total_spent ON customer_analytics(total_spent DESC);
CREATE INDEX idx_customer_analytics_retention_score ON customer_analytics(retention_score DESC);

-- =============================================================================
-- 5. SYSTEM PERFORMANCE METRICS
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Time period
    date_recorded DATE NOT NULL,
    hour_recorded INTEGER CHECK (hour_recorded BETWEEN 0 AND 23),
    
    -- Order metrics
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    pending_orders INTEGER DEFAULT 0,
    
    -- Driver metrics
    active_drivers INTEGER DEFAULT 0,
    available_drivers INTEGER DEFAULT 0,
    busy_drivers INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_matching_time_seconds INTEGER DEFAULT 0,
    average_eta_accuracy_minutes INTEGER DEFAULT 0,
    system_uptime_percentage DECIMAL(5,2) DEFAULT 100,
    
    -- User activity
    new_customers INTEGER DEFAULT 0,
    new_drivers INTEGER DEFAULT 0,
    active_customers INTEGER DEFAULT 0,
    
    -- Revenue metrics
    total_revenue DECIMAL(12,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    
    -- Geographic distribution
    orders_by_city JSONB,
    popular_routes JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_system_performance_date ON system_performance_metrics(date_recorded, hour_recorded);
CREATE UNIQUE INDEX idx_system_performance_unique ON system_performance_metrics(date_recorded, hour_recorded);

-- =============================================================================
-- 6. RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE trip_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE eta_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "trip_analytics_policy" ON trip_analytics;
DROP POLICY IF EXISTS "driver_performance_policy" ON driver_performance_metrics;
DROP POLICY IF EXISTS "eta_predictions_policy" ON eta_predictions;
DROP POLICY IF EXISTS "customer_analytics_policy" ON customer_analytics;
DROP POLICY IF EXISTS "system_performance_policy" ON system_performance_metrics;

-- Trip Analytics - Users can view their own trip analytics
CREATE POLICY "trip_analytics_policy" ON trip_analytics
    FOR SELECT USING (
        driver_id = auth.uid() OR 
        customer_id = auth.uid()
    );

-- Driver Performance - Drivers can view their own metrics
CREATE POLICY "driver_performance_policy" ON driver_performance_metrics
    FOR SELECT USING (driver_id = auth.uid());

-- ETA Predictions - Users can view predictions for their trips
CREATE POLICY "eta_predictions_policy" ON eta_predictions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_requests 
            WHERE id = eta_predictions.trip_id 
            AND (customer_id = auth.uid() OR assigned_driver_id = auth.uid())
        )
    );

-- Customer Analytics - Customers can view their own analytics
CREATE POLICY "customer_analytics_policy" ON customer_analytics
    FOR SELECT USING (customer_id = auth.uid());

-- System Performance - Read-only for all authenticated users
CREATE POLICY "system_performance_policy" ON system_performance_metrics
    FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- 7. ANALYTICS FUNCTIONS
-- =============================================================================

-- Function to calculate driver performance scores
CREATE OR REPLACE FUNCTION calculate_driver_performance_score(driver_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    performance_score DECIMAL(5,2) DEFAULT 100;
    avg_delay INTEGER;
    completion_rate DECIMAL(5,2);
    avg_rating DECIMAL(3,2);
BEGIN
    -- Get metrics
    SELECT 
        COALESCE(AVG(duration_variance_minutes), 0),
        COALESCE(COUNT(*) FILTER (WHERE delivered_at IS NOT NULL) * 100.0 / NULLIF(COUNT(*), 0), 100),
        COALESCE(AVG(customer_rating), 5)
    INTO avg_delay, completion_rate, avg_rating
    FROM trip_analytics 
    WHERE driver_id = driver_uuid 
    AND created_at > NOW() - INTERVAL '30 days';
    
    -- Calculate score based on metrics
    performance_score := GREATEST(0, 100 - (avg_delay * 0.5) + (completion_rate * 0.3) + (avg_rating * 10));
    
    RETURN LEAST(100, performance_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to predict ETA based on historical data
CREATE OR REPLACE FUNCTION predict_eta(
    trip_uuid UUID,
    base_duration_minutes INTEGER
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    predicted_eta TIMESTAMP WITH TIME ZONE;
    traffic_factor DECIMAL(5,2) DEFAULT 1.0;
    driver_factor DECIMAL(5,2) DEFAULT 1.0;
    adjusted_duration INTEGER;
BEGIN
    -- Simple prediction logic (can be enhanced with ML)
    -- Traffic factor based on time of day
    traffic_factor := CASE 
        WHEN EXTRACT(hour FROM NOW()) BETWEEN 7 AND 9 THEN 1.3
        WHEN EXTRACT(hour FROM NOW()) BETWEEN 17 AND 19 THEN 1.2
        ELSE 1.0
    END;
    
    -- Driver performance factor
    SELECT COALESCE(AVG(duration_variance_minutes / NULLIF(estimated_duration_minutes, 0)), 0)
    INTO driver_factor
    FROM trip_analytics ta
    JOIN trip_requests tr ON ta.trip_id = tr.id
    WHERE tr.assigned_driver_id = (
        SELECT assigned_driver_id FROM trip_requests WHERE id = trip_uuid
    )
    AND ta.created_at > NOW() - INTERVAL '30 days';
    
    driver_factor := GREATEST(0.8, LEAST(1.5, 1 + driver_factor));
    
    adjusted_duration := (base_duration_minutes * traffic_factor * driver_factor)::INTEGER;
    predicted_eta := NOW() + (adjusted_duration || ' minutes')::INTERVAL;
    
    RETURN predicted_eta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update analytics after trip completion
CREATE OR REPLACE FUNCTION update_trip_analytics_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when trip is completed
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        INSERT INTO trip_analytics (
            trip_id,
            driver_id,
            customer_id,
            actual_duration_minutes,
            delivered_at
        ) VALUES (
            NEW.id,
            NEW.assigned_driver_id,
            NEW.customer_id,
            EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 60,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic analytics updates
DROP TRIGGER IF EXISTS trip_completion_analytics_trigger ON trip_requests;
CREATE TRIGGER trip_completion_analytics_trigger
    AFTER UPDATE ON trip_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_analytics_on_completion();

-- =============================================================================
-- 8. ANALYTICS VIEWS
-- =============================================================================

-- Daily performance dashboard view
CREATE OR REPLACE VIEW daily_performance_dashboard AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_trips,
    COUNT(*) FILTER (WHERE status = 'delivered') as completed_trips,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_trips,
    ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60), 2) as avg_duration_minutes,
    ROUND(AVG(final_price), 2) as avg_order_value
FROM trip_requests 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Driver leaderboard view
CREATE OR REPLACE VIEW driver_leaderboard AS
SELECT 
    dp.driver_id,
    dp.overall_performance_score,
    dp.total_trips,
    dp.completion_rate,
    dp.average_customer_rating,
    dp.performance_tier,
    ROW_NUMBER() OVER (ORDER BY dp.overall_performance_score DESC) as rank
FROM driver_performance_metrics dp
WHERE dp.last_30_days_trips > 0
ORDER BY dp.overall_performance_score DESC;

-- =============================================================================
-- SETUP COMPLETE
-- =============================================================================

SELECT 
    'Analytics features setup complete!' as status,
    'Tables: trip_analytics, driver_performance_metrics, eta_predictions, customer_analytics, system_performance_metrics' as tables_created,
    'Features: Performance tracking, ETA predictions, Driver leaderboard, Analytics dashboard' as features_enabled;
