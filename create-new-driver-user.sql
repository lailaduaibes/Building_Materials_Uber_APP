-- Alternative: Create New Driver User
-- Run this in Supabase SQL Editor if the password reset doesn't work

-- Step 1: Delete existing user if needed (uncomment if necessary)
-- DELETE FROM auth.users WHERE email = 'yayajiji1412@gmail.com';
-- DELETE FROM public.users WHERE email = 'yayajiji1412@gmail.com';

-- Step 2: Create new user through auth.users (this might not work directly)
-- You should instead use the Supabase Dashboard to create the user

-- Manual Creation Steps for Supabase Dashboard:
-- 1. Go to Authentication → Users
-- 2. Click "Add User"
-- 3. Email: yayajiji1412@gmail.com
-- 4. Password: Hatelove@1412
-- 5. Email Confirm: Yes
-- 6. User Metadata: {"role": "driver", "first_name": "Ahmed", "last_name": "Driver"}

-- Step 3: After creating user in dashboard, run this SQL to complete setup
INSERT INTO public.users (
    id,
    email,
    role,
    user_type,
    first_name,
    last_name,
    phone,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    'driver',
    'driver',
    'Ahmed',
    'Driver',
    '+966 50 123 4567',
    now(),
    now()
FROM auth.users au
WHERE au.email = 'yayajiji1412@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'driver',
    user_type = 'driver',
    first_name = 'Ahmed',
    last_name = 'Driver',
    phone = '+966 50 123 4567',
    updated_at = now();

-- Step 4: Create driver profile
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
    years_experience = EXCLUDED.years_experience,
    specializations = EXCLUDED.specializations,
    rating = EXCLUDED.rating,
    total_trips = EXCLUDED.total_trips,
    total_earnings = EXCLUDED.total_earnings,
    is_available = EXCLUDED.is_available,
    max_distance_km = EXCLUDED.max_distance_km,
    preferred_truck_types = EXCLUDED.preferred_truck_types,
    updated_at = now();
