-- Fix: Add missing categories 'vehicle' and 'safety' to support_tickets constraint
-- This will allow the app to submit tickets with these categories

-- First, let's check what the current constraint allows (corrected query)
SELECT 
    c.conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE t.relname = 'support_tickets' 
AND n.nspname = 'public'
AND c.contype = 'c'
AND c.conname LIKE '%category%';

-- Then update the constraint to include the missing categories
-- We'll drop the old constraint and recreate it with all categories

-- Step 1: Drop the existing category constraint
ALTER TABLE support_tickets 
DROP CONSTRAINT IF EXISTS support_tickets_category_check;

-- Step 2: Create new constraint with all categories including 'vehicle' and 'safety'
ALTER TABLE support_tickets 
ADD CONSTRAINT support_tickets_category_check 
CHECK (category IN (
    'general',
    'technical', 
    'billing',
    'delivery',
    'complaint',   -- ✅ KEEP: Existing category
    'vehicle',     -- ✅ ADD: Vehicle/Equipment category
    'safety'       -- ✅ ADD: Safety Concern category
));

-- Verify the new constraint is working (corrected query)
SELECT 
    c.conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE t.relname = 'support_tickets' 
AND n.nspname = 'public'
AND c.contype = 'c'
AND c.conname = 'support_tickets_category_check';
