-- Fix user registration trigger that's causing database errors
-- Run this to fix the registration issue

-- 1. First, drop the problematic trigger
DROP TRIGGER IF EXISTS new_user_notification_trigger ON public.users;

-- 2. Create a safer version of the notification function
CREATE OR REPLACE FUNCTION notify_admin_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification for regular users, not admin accounts
    -- And only if the user has a proper email (not system accounts)
    IF NEW.email IS NOT NULL AND NEW.email != '' AND COALESCE(NEW.role, 'user') = 'user' THEN
        BEGIN
            -- Create notification for admins when a new user registers
            PERFORM create_admin_notification(
                'new_user',
                'Нов потребител се регистрира',
                'Потребител ' || COALESCE(NEW.full_name, NEW.username, NEW.email) || ' се регистрира в системата',
                jsonb_build_object(
                    'user_id', NEW.id,
                    'user_email', NEW.email,
                    'user_name', COALESCE(NEW.full_name, NEW.username),
                    'registration_date', NEW.created_at
                ),
                NEW.id,
                'user',
                'admin'
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the user registration
                RAISE WARNING 'Failed to create admin notification for new user %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate the trigger with better conditions
CREATE TRIGGER new_user_notification_trigger
    AFTER INSERT ON public.users
    FOR EACH ROW 
    EXECUTE FUNCTION notify_admin_new_user();

-- 4. Test that the trigger was created successfully
SELECT 'User Registration Trigger Fixed' as status,
       trigger_name,
       event_manipulation,
       event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'new_user_notification_trigger';

-- 5. Check if create_admin_notification function exists
SELECT 'Admin Notification Function Status' as status,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM pg_proc 
               WHERE proname = 'create_admin_notification'
           ) THEN 'EXISTS'
           ELSE 'MISSING - Need to run admin notification setup first'
       END as function_status;
