-- Fix user deletion issues related to last_login_at trigger
-- Run this in your Supabase SQL Editor

-- First, let's check what constraints and triggers exist
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass;

-- Check existing triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'sessions' 
AND trigger_schema = 'auth';

-- Drop and recreate the trigger with better error handling
DROP TRIGGER IF EXISTS on_auth_session_created ON auth.sessions;

-- Create improved function that handles user deletion gracefully
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if the user still exists in public.users
    -- This prevents errors during user deletion
    IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.user_id) THEN
        UPDATE public.users 
        SET last_login_at = NOW()
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the trigger
        RAISE WARNING 'Failed to update last_login_at for user %: %', NEW.user_id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_session_created
    AFTER INSERT ON auth.sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_login();

-- Also check if there are any orphaned records that might cause issues
SELECT 
    'Orphaned sessions' as issue_type,
    COUNT(*) as count
FROM auth.sessions s
LEFT JOIN public.users u ON s.user_id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT 
    'Users without auth records' as issue_type,
    COUNT(*) as count
FROM public.users u
LEFT JOIN auth.users a ON u.id = a.id
WHERE a.id IS NULL;

-- Clean up any orphaned sessions (optional - be careful with this)
-- DELETE FROM auth.sessions 
-- WHERE user_id NOT IN (SELECT id FROM public.users);

-- Verify the trigger is working
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_session_created';
