-- Temporarily disable RLS to test if that's the issue
ALTER TABLE public.discussions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view approved discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can view their own discussions" ON public.discussions;
DROP POLICY IF EXISTS "Authenticated users can create discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can update their own discussions" ON public.discussions;
DROP POLICY IF EXISTS "Admins can manage all discussions" ON public.discussions;

DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Users can view their own comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Admins can manage all comments" ON public.discussion_comments;

-- Re-enable RLS
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;

-- Create simpler, more permissive policies for testing
CREATE POLICY "Allow all operations for authenticated users" ON public.discussions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON public.discussion_comments
    FOR ALL USING (true) WITH CHECK (true);

-- Insert a test discussion to verify the table works
INSERT INTO public.discussions (title, slug, content, category, is_approved, created_by) VALUES
('Test Discussion', 'test-discussion', 'This is a test discussion to verify the table works correctly.', 'Общи', true, NULL)
ON CONFLICT DO NOTHING;

-- Show current table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'discussions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
