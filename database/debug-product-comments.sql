-- Debug Product Comments Table
-- Run this in Supabase SQL Editor to check the table structure

-- 1. Check if the table exists
SELECT 'Table Existence Check' as check_type,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'product_comments'
           ) THEN 'EXISTS'
           ELSE 'MISSING'
       END as status;

-- 2. Check table structure
SELECT 'Column Information' as check_type,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'product_comments'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT 'RLS Policies' as check_type,
       schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'product_comments';

-- 4. Check if there are any rows
SELECT 'Row Count' as check_type,
       COUNT(*) as total_rows
FROM public.product_comments;

-- 5. Try a simple select to see if basic queries work
SELECT 'Sample Query Test' as check_type,
       'Testing basic select' as note;

-- Try to select from the table (this might fail and show us the real error)
SELECT id, product_id, user_id, content, parent_comment_id
FROM public.product_comments 
LIMIT 1;
