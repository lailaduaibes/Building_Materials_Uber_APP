-- Create SQL function for getting trips that need customer rating
-- This function will handle the JOIN properly and avoid relationship issues

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.get_trips_needing_rating(uuid);

-- Create the function with correct column names based on actual schema
CREATE OR REPLACE FUNCTION public.get_trips_needing_rating(customer_id uuid)
RETURNS TABLE (
    trip_id uuid,
    driver_name text,
    driver_photo text,
    pickup_location text,
    delivery_location text,
    completed_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id as trip_id,
        COALESCE(dp.first_name || ' ' || dp.last_name, 'Driver') as driver_name,
        dp.profile_image_url as driver_photo,
        (tr.pickup_address->>'formatted_address')::text as pickup_location,
        (tr.delivery_address->>'formatted_address')::text as delivery_location,
        tr.delivered_at as completed_at
    FROM trip_requests tr
    LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
    WHERE tr.customer_id = get_trips_needing_rating.customer_id
        AND tr.status = 'delivered'
        AND tr.customer_rating IS NULL
        AND tr.assigned_driver_id IS NOT NULL
        AND tr.delivered_at IS NOT NULL
    ORDER BY tr.delivered_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_trips_needing_rating(uuid) TO anon, authenticated;

-- Test the function with a sample customer_id
-- Replace with actual customer ID from your data
-- SELECT * FROM public.get_trips_needing_rating('your-customer-uuid-here');

-- Create another function for customer rating history with correct schema
DROP FUNCTION IF EXISTS public.get_customer_rating_history(uuid);

CREATE OR REPLACE FUNCTION public.get_customer_rating_history(customer_id uuid)
RETURNS TABLE (
    trip_id uuid,
    driver_name text,
    rating integer,
    feedback text,
    created_at timestamptz,
    pickup_location text,
    delivery_location text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id as trip_id,
        COALESCE(dp.first_name || ' ' || dp.last_name, 'Driver') as driver_name,
        tr.customer_rating as rating,
        tr.customer_feedback as feedback,
        tr.delivered_at as created_at,
        (tr.pickup_address->>'formatted_address')::text as pickup_location,
        (tr.delivery_address->>'formatted_address')::text as delivery_location
    FROM trip_requests tr
    LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
    WHERE tr.customer_id = get_customer_rating_history.customer_id
        AND tr.customer_rating IS NOT NULL
        AND tr.assigned_driver_id IS NOT NULL
    ORDER BY tr.delivered_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_customer_rating_history(uuid) TO anon, authenticated;

-- Create function to get driver rating statistics
DROP FUNCTION IF EXISTS public.get_driver_rating_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_driver_rating_stats(driver_user_id uuid)
RETURNS TABLE (
    average_rating numeric,
    total_ratings bigint,
    rating_5 bigint,
    rating_4 bigint,
    rating_3 bigint,
    rating_2 bigint,
    rating_1 bigint,
    recent_feedback jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(tr.driver_rating)::numeric, 1) as average_rating,
        COUNT(tr.driver_rating) as total_ratings,
        COUNT(CASE WHEN tr.driver_rating = 5 THEN 1 END) as rating_5,
        COUNT(CASE WHEN tr.driver_rating = 4 THEN 1 END) as rating_4,
        COUNT(CASE WHEN tr.driver_rating = 3 THEN 1 END) as rating_3,
        COUNT(CASE WHEN tr.driver_rating = 2 THEN 1 END) as rating_2,
        COUNT(CASE WHEN tr.driver_rating = 1 THEN 1 END) as rating_1,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rating', driver_rating,
                    'feedback', driver_feedback,
                    'created_at', rated_at,
                    'trip_id', id
                )
            )
            FROM trip_requests 
            WHERE assigned_driver_id = driver_user_id 
                AND driver_feedback IS NOT NULL 
                AND driver_feedback != ''
            ORDER BY rated_at DESC 
            LIMIT 5
        ) as recent_feedback
    FROM trip_requests tr
    WHERE tr.assigned_driver_id = driver_user_id
        AND tr.driver_rating IS NOT NULL;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_driver_rating_stats(uuid) TO anon, authenticated;

-- Test queries to verify the functions work
-- You can uncomment and run these with actual UUIDs from your database

-- Test 1: Get a sample customer ID
SELECT customer_id, COUNT(*) as trip_count 
FROM trip_requests 
WHERE customer_id IS NOT NULL 
GROUP BY customer_id 
ORDER BY trip_count DESC 
LIMIT 5;

-- Test 2: Get a sample driver user_id
SELECT dp.user_id, dp.full_name, COUNT(tr.id) as trip_count
FROM driver_profiles dp
LEFT JOIN trip_requests tr ON dp.user_id = tr.assigned_driver_id
GROUP BY dp.user_id, dp.full_name
ORDER BY trip_count DESC
LIMIT 5;
