-- Check what values are allowed in the role and user_type CHECK constraints
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name IN ('users_role_check', 'users_user_type_check');

-- Also check existing valid values in the users table
SELECT DISTINCT role, user_type, COUNT(*) as count
FROM public.users 
GROUP BY role, user_type
ORDER BY role, user_type;
