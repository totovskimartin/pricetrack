-- Find how users are actually created in public.users table
-- Run this to understand the user creation mechanism

-- 1. Check if there are any functions that handle user creation from auth
SELECT 'User Creation Functions' as info,
       routine_name,
       routine_type,
       LEFT(routine_definition, 200) || '...' as definition_preview
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_definition ILIKE '%auth.users%' 
    OR routine_definition ILIKE '%insert%users%'
    OR routine_name ILIKE '%handle%user%'
    OR routine_name ILIKE '%create%user%'
  )
ORDER BY routine_name;

-- 2. Check for triggers on auth.users table (if accessible)
SELECT 'Auth Users Triggers' as info,
       trigger_name,
       event_manipulation,
       action_timing,
       LEFT(action_statement, 100) || '...' as action_preview
FROM information_schema.triggers 
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- 3. Look for any RPC functions that might handle user registration
SELECT 'RPC Functions' as info,
       routine_name,
       routine_type,
       LEFT(routine_definition, 150) || '...' as definition_preview
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND (
    routine_name ILIKE '%register%'
    OR routine_name ILIKE '%signup%'
    OR routine_name ILIKE '%create_user%'
  )
ORDER BY routine_name;

-- 4. Check recent entries in both auth.users and public.users to compare timing
-- This will help us understand the flow
DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
BEGIN
    -- Check if we can access auth.users
    BEGIN
        SELECT COUNT(*) INTO auth_count FROM auth.users WHERE created_at > NOW() - INTERVAL '1 hour';
        RAISE NOTICE 'Recent auth.users in last hour: %', auth_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Cannot access auth.users table: %', SQLERRM;
    END;
    
    -- Check public.users
    SELECT COUNT(*) INTO public_count FROM public.users WHERE created_at > NOW() - INTERVAL '1 hour';
    RAISE NOTICE 'Recent public.users in last hour: %', public_count;
END $$;

-- 5. Create a more comprehensive trigger that logs everything
CREATE OR REPLACE FUNCTION debug_user_creation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'USER CREATION DEBUG - Operation: %, User ID: %, Email: %, Username: %, Full Name: %, Role: %', 
                 TG_OP, NEW.id, NEW.email, NEW.username, NEW.full_name, NEW.role;
    
    -- Try to create the admin notification
    BEGIN
        PERFORM create_admin_notification(
            'new_user'::TEXT,
            'DEBUG - Нов потребител се регистрира'::TEXT,
            ('DEBUG - Потребител ' || COALESCE(NEW.full_name, NEW.username, NEW.email) || ' се регистрира в системата')::TEXT,
            jsonb_build_object(
                'user_id', NEW.id,
                'user_email', NEW.email,
                'user_name', COALESCE(NEW.full_name, NEW.username),
                'registration_date', NEW.created_at,
                'debug_mode', true
            ),
            NEW.id,
            'user'::TEXT,
            'admin'::TEXT
        );
        RAISE NOTICE 'Admin notification created successfully for user: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Failed to create admin notification: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace our existing trigger with the debug version
DROP TRIGGER IF EXISTS new_user_notification_trigger ON public.users;
CREATE TRIGGER new_user_notification_trigger
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION debug_user_creation();

-- 6. Also create a trigger for UPDATE operations in case users are created then updated
CREATE OR REPLACE FUNCTION debug_user_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'USER UPDATE DEBUG - User ID: %, Email: %, Old Email: %', 
                 NEW.id, NEW.email, OLD.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS debug_user_update_trigger ON public.users;
CREATE TRIGGER debug_user_update_trigger
    AFTER UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION debug_user_update();

-- 7. Check if there's a handle_new_user function (common in Supabase setups)
SELECT 'Handle New User Function Check' as info,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM information_schema.routines 
               WHERE routine_name = 'handle_new_user' 
               AND routine_schema = 'public'
           ) THEN 'handle_new_user function EXISTS'
           ELSE 'handle_new_user function NOT FOUND'
       END as status;

-- 8. Show the current trigger setup
SELECT 'Current Trigger Setup' as info,
       trigger_name,
       event_manipulation,
       action_timing,
       event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'users'
  AND event_object_schema = 'public'
  AND trigger_name LIKE '%user%'
ORDER BY trigger_name;

-- Instructions for next steps
SELECT 'NEXT STEPS' as info,
       'After running this script, register a new user and check the Supabase logs/notices for DEBUG messages. This will tell us exactly when and how users are created.' as instructions;
