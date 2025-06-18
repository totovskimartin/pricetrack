-- Debug why user registration trigger isn't working
-- Run this to diagnose the issue

-- 1. Check if the trigger exists
SELECT 'User Registration Trigger Status' as check_type,
       trigger_name,
       event_manipulation,
       event_object_table,
       action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'new_user_notification_trigger';

-- 2. Check recent users to see what data we have
SELECT 'Recent Users' as check_type,
       id,
       email,
       username,
       full_name,
       role,
       created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if any admin notifications exist
SELECT 'All Admin Notifications' as check_type,
       type,
       title,
       message,
       created_at
FROM public.admin_notifications
ORDER BY created_at DESC
LIMIT 10;

-- 4. Test the trigger function manually with a fake user
-- First, let's see what the function does when called directly
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
    test_name TEXT := 'Test User';
BEGIN
    -- Try to create a notification manually
    BEGIN
        PERFORM create_admin_notification(
            'new_user'::TEXT,
            'Test - Нов потребител се регистрира'::TEXT,
            ('Потребител ' || test_name || ' се регистрира в системата')::TEXT,
            jsonb_build_object(
                'user_id', test_user_id,
                'user_email', test_email,
                'user_name', test_name,
                'registration_date', NOW()
            ),
            test_user_id,
            'user'::TEXT,
            'admin'::TEXT
        );
        RAISE NOTICE 'Manual notification creation successful';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Manual notification creation failed: %', SQLERRM;
    END;
END $$;

-- 5. Check if the manual test notification was created
SELECT 'Manual Test Result' as check_type,
       type,
       title,
       message,
       created_at
FROM public.admin_notifications
WHERE title LIKE '%Test -%'
ORDER BY created_at DESC
LIMIT 1;

-- 6. Let's also check the users table structure to make sure we're using the right columns
SELECT 'Users Table Structure' as check_type,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'public'
ORDER BY ordinal_position;
