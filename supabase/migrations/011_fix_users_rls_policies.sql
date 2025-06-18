-- Fix RLS policies for users table to allow reading user names in discussions
-- This fixes the issue where non-admin users see "Anonymous" for discussion authors

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Only admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow all authenticated users to read basic user info (for discussions, comments, etc.)
-- This is essential for showing author names in discussions and comments
CREATE POLICY "Allow reading user profiles for discussions"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Only allow user creation through triggers or admin functions
-- This prevents direct user creation but allows our sync functions to work
CREATE POLICY "Allow user creation through functions"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is creating their own record
  auth.uid() = id
  OR
  -- Allow if user is admin/super_admin
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Policy 4: Only admins can delete users
CREATE POLICY "Only admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Grant necessary permissions
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Create a function to get user display info (for public use)
CREATE OR REPLACE FUNCTION get_user_display_info(user_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.full_name, u.email
  FROM public.users u
  WHERE u.id = user_id
  AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_display_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_display_info(UUID) TO anon;

-- Update the discussions view to ensure it works with the new policies
-- Create a view that includes author information
CREATE OR REPLACE VIEW public.discussions_with_authors AS
SELECT 
  d.*,
  u.full_name as author_name,
  u.email as author_email
FROM public.discussions d
LEFT JOIN public.users u ON d.created_by = u.id
WHERE d.is_approved = true;

-- Grant access to the view
GRANT SELECT ON public.discussions_with_authors TO authenticated;
GRANT SELECT ON public.discussions_with_authors TO anon;

-- Create a similar view for discussion comments
CREATE OR REPLACE VIEW public.discussion_comments_with_authors AS
SELECT 
  dc.*,
  u.full_name as author_name,
  u.email as author_email
FROM public.discussion_comments dc
LEFT JOIN public.users u ON dc.created_by = u.id
WHERE dc.is_approved = true;

-- Grant access to the comments view
GRANT SELECT ON public.discussion_comments_with_authors TO authenticated;
GRANT SELECT ON public.discussion_comments_with_authors TO anon;

-- Test the policies by checking if we can read user data
DO $$
DECLARE
  user_count INTEGER;
  discussion_count INTEGER;
BEGIN
  -- Count users
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  -- Count discussions with authors
  SELECT COUNT(*) INTO discussion_count 
  FROM public.discussions d
  LEFT JOIN public.users u ON d.created_by = u.id;
  
  RAISE NOTICE 'RLS Policy Update Complete:';
  RAISE NOTICE '- Total users: %', user_count;
  RAISE NOTICE '- Discussions with author data: %', discussion_count;
  RAISE NOTICE '- Users table now allows reading user profiles for all authenticated users';
  RAISE NOTICE '- This should fix the "Anonymous" issue in discussions';
END $$;
