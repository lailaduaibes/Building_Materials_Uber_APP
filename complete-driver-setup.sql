-- COMPLETE FIXED Driver Account Setup for Supabase
-- This handles the password_hash constraint properly

-- STEP 1: First, check your users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: Check if user exists in auth.users
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'yayajiji1412@gmail.com';

-- STEP 3: Update user metadata in auth.users
UPDATE auth.users 
SET 
    raw_user_meta_data = raw_user_meta_data || '{"role": "driver", "first_name": "Ahmed", "last_name": "Driver"}'::jsonb
WHERE email = 'yayajiji1412@gmail.com';

-- STEP 4: Delete existing user from public.users if exists (to avoid conflicts)
DELETE FROM public.users WHERE email = 'yayajiji1412@gmail.com';

-- STEP 5: Create user in public.users table with password_hash
-- Option A: If password_hash is required but not used (recommended)
INSERT INTO public.users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    phone,
    role,
    user_type,
    is_verified,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    'managed_by_supabase_auth', -- Placeholder since real auth is in auth.users
    'Ahmed',
    'Driver',
    '+966 50 123 4567',
    'driver',
    'driver',
    true,
    now(),
    now()
FROM auth.users au
WHERE au.email = 'yayajiji1412@gmail.com';

-- STEP 6: Create driver profile
INSERT INTO public.driver_profiles (
    user_id,
    years_experience,
    specializations,
    rating,
    total_trips,
    total_earnings,
    is_available,
    max_distance_km,
    preferred_truck_types,
    created_at,
    updated_at
)
SELECT 
    id,
    3,
    '["Heavy Materials", "Construction Equipment", "Long Distance Delivery"]'::jsonb,
    4.8,
    156,
    2450.75,
    true,
    50,
    '["Flatbed Truck", "Crane Truck", "Heavy Duty Truck"]'::jsonb,
    now(),
    now()
FROM public.users 
WHERE email = 'yayajiji1412@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
    years_experience = 3,
    specializations = '["Heavy Materials", "Construction Equipment", "Long Distance Delivery"]'::jsonb,
    rating = 4.8,
    total_trips = 156,
    total_earnings = 2450.75,
    is_available = true,
    max_distance_km = 50,
    preferred_truck_types = '["Flatbed Truck", "Crane Truck", "Heavy Duty Truck"]'::jsonb,
    updated_at = now();

-- STEP 7: Verification - Check everything is set up correctly
SELECT 
    'AUTH USER' as source,
    au.id,
    au.email,
    CASE WHEN au.email_confirmed_at IS NOT NULL THEN 'CONFIRMED' ELSE 'NOT_CONFIRMED' END as status,
    au.raw_user_meta_data->>'role' as role,
    au.raw_user_meta_data->>'first_name' as first_name
FROM auth.users au
WHERE au.email = 'yayajiji1412@gmail.com'

UNION ALL

SELECT 
    'PUBLIC USER' as source,
    u.id,
    u.email,
    CASE WHEN u.is_verified THEN 'VERIFIED' ELSE 'NOT_VERIFIED' END as status,
    u.role,
    u.first_name
FROM public.users u
WHERE u.email = 'yayajiji1412@gmail.com'

UNION ALL

SELECT 
    'DRIVER PROFILE' as source,
    dp.user_id as id,
    u.email,
    CASE WHEN dp.is_available THEN 'AVAILABLE' ELSE 'NOT_AVAILABLE' END as status,
    CAST(dp.rating as text) as role,
    CAST(dp.total_trips as text) as first_name
FROM public.driver_profiles dp
JOIN public.users u ON dp.user_id = u.id
WHERE u.email = 'yayajiji1412@gmail.com';

-- STEP 8: Final check - everything should be properly linked
SELECT 
    au.email,
    au.email_confirmed_at IS NOT NULL as auth_confirmed,
    u.role as public_role,
    dp.rating as driver_rating,
    dp.total_trips as total_trips,
    dp.is_available as available
FROM auth.users au
JOIN public.users u ON au.id = u.id
LEFT JOIN public.driver_profiles dp ON u.id = dp.user_id
WHERE au.email = 'yayajiji1412@gmail.com';
