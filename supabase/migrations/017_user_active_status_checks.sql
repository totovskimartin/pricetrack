-- Migration to add user active status checks and functions
-- This ensures disabled users cannot login

-- Function to check if a user is active by email
CREATE OR REPLACE FUNCTION public.is_user_active_by_email(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE email = user_email AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is active by username
CREATE OR REPLACE FUNCTION public.is_user_active_by_username(user_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE username = user_username AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is active by user ID
CREATE OR REPLACE FUNCTION public.is_user_active_by_id(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user active status with details
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

-- Create an index on is_active for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- Create a composite index for email and active status
CREATE INDEX IF NOT EXISTS idx_users_email_active ON public.users(email, is_active);

-- Create a composite index for username and active status
CREATE INDEX IF NOT EXISTS idx_users_username_active ON public.users(username, is_active);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_active_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active_by_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_active_status(UUID) TO authenticated;

-- Grant execute permissions to anonymous users for login checks
GRANT EXECUTE ON FUNCTION public.is_user_active_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.is_user_active_by_username(TEXT) TO anon;

-- First, let's check if RLS is already enabled and handle policies carefully
-- We need to be careful about the order of operations

-- Temporarily disable RLS to avoid conflicts during setup
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Add a trigger to log when users are deactivated
CREATE OR REPLACE FUNCTION public.log_user_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log when is_active changes
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
        -- Only insert if admin_logs table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_logs' AND table_schema = 'public') THEN
            INSERT INTO public.admin_logs (
                admin_id,
                action,
                entity_type,
                entity_id,
                details,
                created_at
            ) VALUES (
                NEW.id, -- For now, log as self-change; this should be updated by admin functions
                CASE WHEN NEW.is_active THEN 'activate_user' ELSE 'deactivate_user' END,
                'user',
                NEW.id,
                jsonb_build_object(
                    'previous_status', OLD.is_active,
                    'new_status', NEW.is_active,
                    'email', NEW.email,
                    'username', NEW.username
                ),
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the trigger
        RAISE WARNING 'Failed to log user status change: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_user_status_change ON public.users;
CREATE TRIGGER on_user_status_change
    AFTER UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.log_user_status_change();

-- Now enable RLS and set up policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all user data" ON public.users;
DROP POLICY IF EXISTS "Admins can update user data" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Super admins can do anything" ON public.users;

-- Policy for users to read their own data
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Policy for admins to read all user data
CREATE POLICY "Admins can read all user data" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u2
            WHERE u2.id = auth.uid()
            AND u2.role IN ('admin', 'super_admin')
        )
    );

-- Policy for admins to update user data
CREATE POLICY "Admins can update user data" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u2
            WHERE u2.id = auth.uid()
            AND u2.role IN ('admin', 'super_admin')
        )
    );

-- Policy for users to update their own non-critical data
-- Note: We'll be more permissive here and rely on application logic for restrictions
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Policy for super admins to do anything
CREATE POLICY "Super admins can do anything" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u2
            WHERE u2.id = auth.uid()
            AND u2.role = 'super_admin'
        )
    );
