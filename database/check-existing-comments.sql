-- Check existing comments and discussions
-- Run this to see what data exists in your system

-- 1. Check if discussions table has data
SELECT 'Discussions Table' as table_name,
       COUNT(*) as row_count
FROM public.discussions;

-- 2. Check if discussion_comments table has data  
SELECT 'Discussion Comments Table' as table_name,
       COUNT(*) as row_count
FROM public.discussion_comments;

-- 3. Check if product_comments table has data
SELECT 'Product Comments Table' as table_name,
       COUNT(*) as row_count
FROM public.product_comments;

-- 4. Show sample discussions if they exist
SELECT 'Sample Discussions' as info,
       id,
       product_id,
       title,
       content,
       created_at
FROM public.discussions
ORDER BY created_at DESC
LIMIT 5;

-- 5. Show sample discussion comments if they exist
SELECT 'Sample Discussion Comments' as info,
       id,
       discussion_id,
       content,
       created_at
FROM public.discussion_comments
ORDER BY created_at DESC
LIMIT 5;

-- 6. Show sample product comments if they exist
SELECT 'Sample Product Comments' as info,
       id,
       product_id,
       content,
       parent_comment_id,
       created_at
FROM public.product_comments
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check which products have discussions
SELECT 'Products with Discussions' as info,
       p.name as product_name,
       COUNT(d.id) as discussion_count
FROM public.products p
LEFT JOIN public.discussions d ON p.id = d.product_id
GROUP BY p.id, p.name
HAVING COUNT(d.id) > 0
ORDER BY discussion_count DESC
LIMIT 10;
