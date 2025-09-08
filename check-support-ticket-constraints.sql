-- Check current constraints on support_tickets table
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'support_tickets';

-- Check the current table structure
\d support_tickets;

-- Alternative way to see constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE t.relname = 'support_tickets' 
AND n.nspname = 'public'
AND c.contype = 'c';
