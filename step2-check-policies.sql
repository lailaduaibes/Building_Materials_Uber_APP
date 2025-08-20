-- Query 2: Check policies on users table
SELECT 
    'Policy found: ' || policyname as policy_info,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- If no results, try checking if ANY policies exist:
SELECT COUNT(*) as total_policies_in_db FROM pg_policies;
