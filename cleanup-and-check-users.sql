-- Clean up the test insert
DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001';

-- Also check if there are any existing users to understand the table structure
SELECT 
    id, 
    email, 
    role, 
    user_type,
    created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;
