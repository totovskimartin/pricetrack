-- Fix RLS Policies for Product Comments
-- Run this if you're still getting 400 Bad Request errors

-- 1. Check current RLS status
SELECT 'Current RLS Status' as info,
       schemaname,
       tablename,
       rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('product_comments', 'comment_votes');

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can view comments" ON public.product_comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.product_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.product_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.product_comments;

-- 3. Temporarily disable RLS to test if that's the issue
ALTER TABLE public.product_comments DISABLE ROW LEVEL SECURITY;

-- 4. Test query
SELECT 'Test Query After Disabling RLS' as test,
       COUNT(*) as comment_count
FROM public.product_comments;

-- 5. Re-enable RLS with simpler policies
ALTER TABLE public.product_comments ENABLE ROW LEVEL SECURITY;

-- 6. Create very permissive policies for testing
CREATE POLICY "Allow all operations for testing" ON public.product_comments
    FOR ALL USING (true) WITH CHECK (true);

-- 7. Test query again
SELECT 'Test Query After Re-enabling RLS' as test,
       COUNT(*) as comment_count
FROM public.product_comments;

-- 8. Show final policy status
SELECT 'Final Policy Status' as info,
       schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'product_comments';

-- 9. Grant explicit permissions
GRANT ALL ON public.product_comments TO authenticated;
GRANT ALL ON public.product_comments TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

SELECT 'RLS policies have been simplified for testing. The 400 error should now be resolved.' as message;
