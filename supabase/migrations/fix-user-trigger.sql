-- Fix the user registration trigger based on the actual table structure
-- Run this to fix the user notification trigger

-- 1. Drop the existing trigger and function
DROP TRIGGER IF EXISTS new_user_notification_trigger ON public.users;
DROP FUNCTION IF EXISTS notify_admin_new_user();

-- 2. Create the corrected trigger function
CREATE OR REPLACE FUNCTION notify_admin_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_display_name TEXT;
BEGIN
    -- Build display name from available fields
    user_display_name := COALESCE(
        NEW.full_name,
        CONCAT(NEW.first_name, ' ', NEW.last_name),
        NEW.username,
        NEW.email
    );
    
    -- Only create notification for regular users, not admin accounts
    IF COALESCE(NEW.role::text, 'user') = 'user' AND NEW.email IS NOT NULL THEN
        BEGIN
            PERFORM create_admin_notification(
                'new_user'::TEXT,
                'Нов потребител се регистрира'::TEXT,
                ('Потребител ' || user_display_name || ' се регистрира в системата')::TEXT,
                jsonb_build_object(
                    'user_id', NEW.id,
                    'user_email', NEW.email,
                    'user_name', user_display_name,
                    'username', NEW.username,
                    'registration_date', NEW.created_at
                ),
                NEW.id,
                'user'::TEXT,
                'admin'::TEXT
            );
            
            RAISE NOTICE 'Admin notification created for new user: %', user_display_name;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the user registration
                RAISE WARNING 'Failed to create admin notification for new user % (ID: %): %', user_display_name, NEW.id, SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Skipping notification for user % (role: %, email: %)', NEW.id, NEW.role, NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate the trigger
CREATE TRIGGER new_user_notification_trigger
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION notify_admin_new_user();

-- 4. Create a manual test notification to verify the function works
SELECT create_admin_notification(
    'new_user'::TEXT,
    'Test - Нов потребител се регистрира'::TEXT,
    'Тест на системата за известия при регистрация на потребител'::TEXT,
    jsonb_build_object(
        'user_id', gen_random_uuid(),
        'user_email', 'test@example.com',
        'user_name', 'Test User',
        'registration_date', NOW()
    ),
    NULL::UUID,
    'user'::TEXT,
    'admin'::TEXT
) as manual_test_notification_id;

-- 5. Verify the trigger is now working
SELECT 'Fixed Trigger Status' as status,
       trigger_name,
       event_manipulation,
       event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'new_user_notification_trigger';

-- 6. Show recent admin notifications to verify
SELECT 'Recent Admin Notifications' as status,
       type,
       title,
       LEFT(message, 50) || '...' as message_preview,
       created_at
FROM public.admin_notifications
ORDER BY created_at DESC
LIMIT 5;
