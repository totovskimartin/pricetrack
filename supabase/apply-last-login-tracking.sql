-- Add last login tracking to users table
-- Run this in your Supabase SQL Editor

-- Add last_login_at column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Create function to update last login timestamp
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the last_login_at timestamp for the user (only if user exists)
    UPDATE public.users
    SET last_login_at = NOW()
    WHERE id = NEW.user_id;

    -- Don't fail if user doesn't exist (they might be deleted)
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the trigger
        RAISE WARNING 'Failed to update last_login_at for user %: %', NEW.user_id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.sessions to track logins
-- This trigger fires when a new session is created (user logs in)
DROP TRIGGER IF EXISTS on_auth_session_created ON auth.sessions;
CREATE TRIGGER on_auth_session_created
    AFTER INSERT ON auth.sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_login();

-- Also create a function to manually update last login (for API calls)
CREATE OR REPLACE FUNCTION public.update_user_last_login(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users 
    SET last_login_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.update_user_last_login(UUID) TO authenticated;

-- Update existing users to have a reasonable last_login_at (set to created_at for now)
UPDATE public.users 
SET last_login_at = created_at 
WHERE last_login_at IS NULL;

-- Create index for better performance when querying by last login
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON public.users(last_login_at DESC);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND column_name = 'last_login_at';

-- Show some sample data
SELECT id, email, username, created_at, last_login_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;
