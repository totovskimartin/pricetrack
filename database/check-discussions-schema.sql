-- Check the actual schema of the discussions table
-- Run this to see what columns actually exist

-- 1. Check if discussions table exists
SELECT 'Table Existence' as check_type,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'discussions'
           ) THEN 'EXISTS'
           ELSE 'MISSING'
       END as status;

-- 2. Show actual columns in discussions table
SELECT 'Discussions Table Columns' as info,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'discussions'
ORDER BY ordinal_position;

-- 3. Show sample data from discussions table
SELECT 'Sample Discussions Data' as info,
       *
FROM public.discussions
LIMIT 3;

-- 4. Check if there are any foreign key relationships
SELECT 'Foreign Key Constraints' as info,
       tc.constraint_name,
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
  AND tc.table_name = 'discussions'
  AND tc.table_schema = 'public';

-- 5. Check all tables that might contain product-related discussions
SELECT 'All Tables with Product Relations' as info,
       table_name,
       column_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name LIKE '%product%'
ORDER BY table_name, column_name;
