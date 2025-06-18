-- Fix authentication timeout issues by optimizing RLS policies and database functions
-- This migration addresses the database query timeout errors during page refresh

-- First, ensure the database functions exist and are optimized
CREATE OR REPLACE FUNCTION public.get_user_active_status(user_id UUID)
RETURNS TABLE(
    is_active BOOLEAN,
    role user_role,
    email TEXT,
    username TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.is_active,
        u.role,
        u.email,
        u.username
    FROM public.users u
    WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a faster function for just checking if user is active
CREATE OR REPLACE FUNCTION public.is_user_active_by_id(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optimize the RLS policies to avoid circular dependencies during auth
-- Drop existing policies that might cause issues
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all user data" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

-- Create a more permissive read policy for authenticated users
-- This allows the auth system to check user status without circular dependencies
CREATE POLICY "Authenticated users can read user data" ON public.users
    FOR SELECT TO authenticated
    USING (true);

-- Keep the existing update policies
-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Admins can update user data
CREATE POLICY "Admins can update user data" ON public.users
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u2
            WHERE u2.id = auth.uid()
            AND u2.role IN ('admin', 'super_admin')
            AND u2.is_active = true
        )
    );

-- Super admins can do anything
CREATE POLICY "Super admins can do anything" ON public.users
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u2
            WHERE u2.id = auth.uid()
            AND u2.role = 'super_admin'
            AND u2.is_active = true
        )
    );

-- Grant execute permissions on the functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_active_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active_by_id(UUID) TO authenticated;

-- Create an index on users.id for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_id_active ON public.users(id, is_active);

-- Create an index on users.email for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email_active ON public.users(email, is_active);

-- Create an index on users.username for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username_active ON public.users(username, is_active);

-- Add a comment explaining the policy changes
COMMENT ON POLICY "Authenticated users can read user data" ON public.users IS 
'Allows authenticated users to read user data to avoid circular dependencies during auth checks. Application logic should handle sensitive data filtering.';
