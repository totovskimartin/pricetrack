-- Thorough investigation of comments system
-- Run this to understand the current state

-- 1. Check what's in product_comments table
SELECT 'Product Comments Table' as info,
       COUNT(*) as total_rows
FROM public.product_comments;

-- 2. Check what's in discussions table  
SELECT 'Discussions Table' as info,
       COUNT(*) as total_rows
FROM public.discussions;

-- 3. Check what's in discussion_comments table
SELECT 'Discussion Comments Table' as info,
       COUNT(*) as total_rows
FROM public.discussion_comments;

-- 4. Show actual data from discussions (if any)
SELECT 'Sample Discussions' as info,
       id,
       title,
       content,
       created_at,
       created_by
FROM public.discussions
ORDER BY created_at DESC
LIMIT 5;

-- 5. Show actual data from discussion_comments (if any)
SELECT 'Sample Discussion Comments' as info,
       id,
       discussion_id,
       content,
       created_at,
       created_by
FROM public.discussion_comments
ORDER BY created_at DESC
LIMIT 5;

-- 6. Show actual data from product_comments (if any)
SELECT 'Sample Product Comments' as info,
       id,
       product_id,
       content,
       created_at,
       user_id,
       parent_comment_id
FROM public.product_comments
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check the specific product we're testing
-- Replace this UUID with the actual product UUID from the URL
SELECT 'Specific Product Check' as info,
       id,
       name,
       slug
FROM public.products 
WHERE id = '0290beff-b9d4-4dbd-b7e7-ae1acd685b4f'
   OR slug = 'balgarski-cheri-domati-250g-0290beff';

-- 8. Check if there are any comments for this specific product
SELECT 'Comments for Specific Product' as info,
       COUNT(*) as comment_count
FROM public.product_comments
WHERE product_id = '0290beff-b9d4-4dbd-b7e7-ae1acd685b4f';

-- 9. Check discussions table schema (since it doesn't have product_id)
SELECT 'Discussions Table Schema' as info,
       column_name,
       data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'discussions'
ORDER BY ordinal_position;

-- 10. Show all tables that might contain comment-like data
SELECT 'All Comment-Related Tables' as info,
       table_name,
       (SELECT COUNT(*) FROM information_schema.tables t2 WHERE t2.table_name = t1.table_name AND t2.table_schema = 'public') as exists_count
FROM information_schema.tables t1
WHERE table_schema = 'public' 
  AND (table_name LIKE '%comment%' OR table_name LIKE '%discussion%')
ORDER BY table_name;
