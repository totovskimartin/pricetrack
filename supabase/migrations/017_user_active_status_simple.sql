-- Simple migration to add user active status checking functions
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON public.users(email, is_active);
CREATE INDEX IF NOT EXISTS idx_users_username_active ON public.users(username, is_active);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_active_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active_by_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_active_status(UUID) TO authenticated;

-- Grant execute permissions to anonymous users for login checks
GRANT EXECUTE ON FUNCTION public.is_user_active_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.is_user_active_by_username(TEXT) TO anon;
