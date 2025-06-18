-- Check what happened with the recent user registration
-- Run this to see if the user was created and why no notification appeared

-- 1. Check the most recent users created
SELECT 'Recent Users (Last 2 Hours)' as info,
       id,
       email,
       username,
       full_name,
       role,
       created_at,
       updated_at
FROM public.users
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check recent admin notifications
SELECT 'Recent Admin Notifications (Last 2 Hours)' as info,
       type,
       title,
       LEFT(message, 50) || '...' as message_preview,
       created_at
FROM public.admin_notifications
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if our trigger exists and is active
SELECT 'Notification Trigger Status' as info,
       trigger_name,
       event_manipulation,
       action_timing,
       event_object_table,
       event_object_schema
FROM information_schema.triggers 
WHERE trigger_name = 'notify_admin_new_user_trigger';

-- 4. Check if the notification function exists
SELECT 'Notification Function Status' as info,
       routine_name,
       routine_type,
       LEFT(routine_definition, 100) || '...' as definition_preview
FROM information_schema.routines
WHERE routine_name = 'notify_admin_of_new_user'
  AND routine_schema = 'public';

-- 5. Manually test the notification function with the most recent user
DO $$
DECLARE
    recent_user RECORD;
BEGIN
    -- Get the most recent user
    SELECT * INTO recent_user
    FROM public.users
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF recent_user.id IS NOT NULL THEN
        RAISE NOTICE 'Testing notification for recent user: % (ID: %)', recent_user.email, recent_user.id;
        
        -- Try to create a test notification for this user
        BEGIN
            PERFORM create_admin_notification(
                'new_user'::TEXT,
                'TEST - Нов потребител се регистрира'::TEXT,
                ('TEST - Потребител ' || COALESCE(recent_user.full_name, recent_user.username, recent_user.email) || ' се регистрира в системата')::TEXT,
                jsonb_build_object(
                    'user_id', recent_user.id,
                    'user_email', recent_user.email,
                    'user_name', COALESCE(recent_user.full_name, recent_user.username),
                    'username', recent_user.username,
                    'registration_date', recent_user.created_at,
                    'test_mode', true
                ),
                recent_user.id,
                'user'::TEXT,
                'admin'::TEXT
            );
            RAISE NOTICE 'Test notification created successfully';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Test notification failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No users found in the database';
    END IF;
END $$;

-- 6. Check if the test notification was created
SELECT 'Test Notification Result' as info,
       type,
       title,
       message,
       created_at
FROM public.admin_notifications
WHERE title LIKE 'TEST -%'
ORDER BY created_at DESC
LIMIT 1;

-- 7. Show all triggers on public.users table
SELECT 'All Triggers on Public Users' as info,
       trigger_name,
       event_manipulation,
       action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users'
  AND event_object_schema = 'public'
ORDER BY trigger_name;
