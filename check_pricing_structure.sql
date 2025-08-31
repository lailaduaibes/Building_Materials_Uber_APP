-- ===================================================
-- COMPREHENSIVE PRICING STRUCTURE ANALYSIS
-- Check trip_requests, truck_types, and trucks tables
-- ===================================================

-- 1. CHECK TRIP_REQUESTS TABLE STRUCTURE (Pricing Fields)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
    AND (column_name ILIKE '%price%' OR column_name ILIKE '%fare%' OR column_name ILIKE '%cost%' OR column_name ILIKE '%earning%')
ORDER BY ordinal_position;

-- 2. CHECK TRUCK_TYPES TABLE STRUCTURE (Rate Fields)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'truck_types' 
    AND (column_name ILIKE '%rate%' OR column_name ILIKE '%price%' OR column_name ILIKE '%cost%')
ORDER BY ordinal_position;

-- 3. SAMPLE TRIP_REQUESTS DATA WITH PRICING
SELECT 
    id,
    customer_name,
    pickup_time_preference,
    quoted_price,
    status,
    estimated_distance_km,
    estimated_weight_tons,
    required_truck_type_id,
    created_at,
    assigned_at
FROM trip_requests 
WHERE quoted_price IS NOT NULL
ORDER BY created_at DESC 
LIMIT 15;

-- 4. TRUCK_TYPES PRICING DATA
SELECT 
    id,
    name,
    base_rate_per_km,
    base_rate_per_hour,
    payload_capacity,
    volume_capacity,
    description
FROM truck_types 
ORDER BY base_rate_per_km ASC;

-- 5. ASAP vs SCHEDULED PRICING COMPARISON
SELECT 
    pickup_time_preference,
    COUNT(*) as trip_count,
    AVG(quoted_price) as avg_price,
    MIN(quoted_price) as min_price,
    MAX(quoted_price) as max_price,
    AVG(estimated_distance_km) as avg_distance
FROM trip_requests 
WHERE quoted_price IS NOT NULL
GROUP BY pickup_time_preference;

-- 6. DETAILED PRICING BREAKDOWN WITH TRUCK TYPES
SELECT 
    tr.id as trip_id,
    tr.customer_name,
    tr.pickup_time_preference,
    tr.quoted_price,
    tr.estimated_distance_km,
    tr.estimated_weight_tons,
    tt.name as truck_type,
    tt.base_rate_per_km,
    tt.base_rate_per_hour,
    -- Calculate what the price SHOULD be based on current formula
    ROUND((tr.estimated_distance_km * tt.base_rate_per_km) + 
          ((tr.estimated_distance_km / 40) * tt.base_rate_per_hour), 2) as calculated_base_price,
    -- Weight multiplier calculation (10% extra per ton over 5 tons)
    CASE 
        WHEN tr.estimated_weight_tons > 5 THEN
            ROUND(((tr.estimated_distance_km * tt.base_rate_per_km) + 
                   ((tr.estimated_distance_km / 40) * tt.base_rate_per_hour)) * 
                  (1 + (tr.estimated_weight_tons - 5) * 0.1), 2)
        ELSE 
            ROUND((tr.estimated_distance_km * tt.base_rate_per_km) + 
                  ((tr.estimated_distance_km / 40) * tt.base_rate_per_hour), 2)
    END as calculated_with_weight,
    -- Price difference analysis
    ROUND(tr.quoted_price - ((tr.estimated_distance_km * tt.base_rate_per_km) + 
          ((tr.estimated_distance_km / 40) * tt.base_rate_per_hour)), 2) as price_difference,
    tr.status,
    tr.created_at
FROM trip_requests tr
LEFT JOIN truck_types tt ON tr.required_truck_type_id = tt.id::text
WHERE tr.quoted_price IS NOT NULL
ORDER BY tr.created_at DESC
LIMIT 20;

-- 7. IDENTIFY POTENTIAL ASAP PREMIUM PATTERNS
SELECT 
    tr.pickup_time_preference,
    tt.name as truck_type,
    COUNT(*) as trips,
    AVG(tr.quoted_price) as avg_quoted_price,
    AVG((tr.estimated_distance_km * tt.base_rate_per_km) + 
        ((tr.estimated_distance_km / 40) * tt.base_rate_per_hour)) as avg_calculated_base,
    ROUND(AVG(tr.quoted_price) - AVG((tr.estimated_distance_km * tt.base_rate_per_km) + 
        ((tr.estimated_distance_km / 40) * tt.base_rate_per_hour)), 2) as avg_premium
FROM trip_requests tr
LEFT JOIN truck_types tt ON tr.required_truck_type_id = tt.id::text
WHERE tr.quoted_price IS NOT NULL 
    AND tr.estimated_distance_km IS NOT NULL
GROUP BY tr.pickup_time_preference, tt.name, tt.base_rate_per_km, tt.base_rate_per_hour
ORDER BY avg_premium DESC;

-- 8. CHECK FOR ANY EXISTING ASAP MULTIPLIERS OR SURGE PRICING
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('trip_requests', 'truck_types') 
    AND (column_name ILIKE '%surge%' OR column_name ILIKE '%multiplier%' OR 
         column_name ILIKE '%premium%' OR column_name ILIKE '%asap%')
ORDER BY table_name, column_name;
