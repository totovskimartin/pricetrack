-- Comprehensive diagnostic query for price suggestion issues
-- Run this in your Supabase SQL Editor and share the results

-- 1. Check table existence
SELECT 'Tables Check' as category, table_name, 'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('price_suggestions', 'users', 'products', 'supermarkets', 'admin_notifications')
ORDER BY table_name;

-- 2. Check price_suggestions table structure
SELECT 'price_suggestions structure' as category, 
       column_name, 
       data_type, 
       is_nullable, 
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'price_suggestions'
ORDER BY ordinal_position;

-- 3. Check users table structure
SELECT 'users structure' as category, 
       column_name, 
       data_type, 
       is_nullable, 
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. Check triggers
SELECT 'Triggers' as category, 
       trigger_name, 
       event_object_table, 
       event_manipulation,
       action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
    AND (event_object_table = 'price_suggestions' OR trigger_name LIKE '%price%');

-- 5. Check functions
SELECT 'Functions' as category, 
       routine_name, 
       routine_type,
       data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND (routine_name LIKE '%price%' OR routine_name LIKE '%notification%');

-- 6. Check RLS policies
SELECT 'RLS Policies' as category, 
       tablename, 
       policyname, 
       cmd, 
       permissive,
       qual
FROM pg_policies 
WHERE tablename IN ('price_suggestions', 'users');

-- 7. Check foreign key constraints
SELECT 'Foreign Keys' as category,
       tc.table_name, 
       kcu.column_name, 
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'price_suggestions';

-- 8. Check test user
SELECT 'Test User' as category,
       id::text,
       email,
       username,
       role::text,
       is_active::text
FROM public.users
WHERE id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Test User' as category,
       'NOT_FOUND' as id,
       'NOT_FOUND' as email,
       'NOT_FOUND' as username,
       'NOT_FOUND' as role,
       'NOT_FOUND' as is_active
WHERE NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = '00000000-0000-0000-0000-000000000001'
);

-- 9. Check sample data
SELECT 'Sample Data' as category, 
       'price_suggestions' as table_name, 
       count(*) as record_count
FROM public.price_suggestions
UNION ALL
SELECT 'Sample Data' as category, 
       'users' as table_name, 
       count(*) as record_count
FROM public.users
UNION ALL
SELECT 'Sample Data' as category, 
       'products' as table_name, 
       count(*) as record_count
FROM public.products
UNION ALL
SELECT 'Sample Data' as category, 
       'supermarkets' as table_name, 
       count(*) as record_count
FROM public.supermarkets;
