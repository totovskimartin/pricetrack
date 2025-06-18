-- Comprehensive fix for user registration notifications
-- This covers all possible ways users can be created

-- 1. First, let's see how users are actually being created
SELECT 'Recent User Creation Analysis' as info,
       id,
       email,
       username,
       created_at,
       updated_at,
       CASE 
           WHEN created_at = updated_at THEN 'NEW_INSERT'
           ELSE 'UPDATED_EXISTING'
       END as creation_type
FROM public.users
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- 2. Create a more comprehensive trigger that catches both INSERT and UPDATE
CREATE OR REPLACE FUNCTION notify_admin_of_user_activity()
RETURNS TRIGGER AS $$
DECLARE
    user_display_name TEXT;
    is_new_user BOOLEAN := FALSE;
BEGIN
    -- Build display name
    user_display_name := COALESCE(
        NEW.full_name,
        NEW.username,
        NEW.email
    );

    -- Determine if this is a new user
    IF TG_OP = 'INSERT' THEN
        is_new_user := TRUE;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if this looks like a new user being set up
        -- (sometimes users are inserted with minimal data then updated)
        IF OLD.username IS NULL AND NEW.username IS NOT NULL THEN
            is_new_user := TRUE;
        ELSIF OLD.full_name IS NULL AND NEW.full_name IS NOT NULL THEN
            is_new_user := TRUE;
        ELSIF NEW.created_at > NOW() - INTERVAL '5 minutes' THEN
            -- If user was created very recently and is being updated, treat as new
            is_new_user := TRUE;
        END IF;
    END IF;

    -- Create admin notification for new users
    IF is_new_user THEN
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
                    'registration_date', NEW.created_at,
                    'trigger_operation', TG_OP,
                    'detection_method', CASE 
                        WHEN TG_OP = 'INSERT' THEN 'direct_insert'
                        ELSE 'update_detection'
                    END
                ),
                NEW.id,
                'user'::TEXT,
                'admin'::TEXT
            );
            
            RAISE NOTICE 'Admin notification created for user: % via %', user_display_name, TG_OP;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to create admin notification for user %: %', NEW.email, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Replace the existing trigger with the comprehensive one
DROP TRIGGER IF EXISTS notify_admin_new_user_trigger ON public.users;
CREATE TRIGGER notify_admin_comprehensive_user_trigger
    AFTER INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION notify_admin_of_user_activity();

-- 4. Also create a trigger on auth.users to catch registrations there
CREATE OR REPLACE FUNCTION notify_admin_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    user_display_name TEXT;
BEGIN
    -- Build display name from auth user data
    user_display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'username',
        NEW.raw_user_meta_data->>'name',
        NEW.email
    );

    -- Create admin notification for auth user registration
    BEGIN
        PERFORM create_admin_notification(
            'new_user'::TEXT,
            'Нов потребител се регистрира (Auth)'::TEXT,
            ('Потребител ' || user_display_name || ' се регистрира в системата')::TEXT,
            jsonb_build_object(
                'auth_user_id', NEW.id,
                'user_email', NEW.email,
                'user_name', user_display_name,
                'registration_date', NEW.created_at,
                'source', 'auth_users_trigger',
                'metadata', NEW.raw_user_meta_data
            ),
            NEW.id,
            'auth_user'::TEXT,
            'admin'::TEXT
        );
        
        RAISE NOTICE 'Admin notification created for auth user: %', user_display_name;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create admin notification for auth user %: %', NEW.email, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger on auth.users (if we have permission)
DO $$
BEGIN
    -- Try to create the auth trigger
    BEGIN
        DROP TRIGGER IF EXISTS notify_admin_auth_user_trigger ON auth.users;
        CREATE TRIGGER notify_admin_auth_user_trigger
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION notify_admin_auth_user();
        RAISE NOTICE 'Auth users trigger created successfully';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not create auth users trigger (this is OK): %', SQLERRM;
    END;
END $$;

-- 6. Create a manual notification for any users created in the last hour
-- that might have been missed
DO $$
DECLARE
    missed_user RECORD;
    notification_exists BOOLEAN;
BEGIN
    FOR missed_user IN 
        SELECT * FROM public.users 
        WHERE created_at > NOW() - INTERVAL '1 hour'
        ORDER BY created_at DESC
    LOOP
        -- Check if we already have a notification for this user
        SELECT EXISTS(
            SELECT 1 FROM public.admin_notifications 
            WHERE type = 'new_user' 
            AND (data->>'user_id')::uuid = missed_user.id
        ) INTO notification_exists;
        
        -- If no notification exists, create one
        IF NOT notification_exists THEN
            BEGIN
                PERFORM create_admin_notification(
                    'new_user'::TEXT,
                    'Нов потребител се регистрира (Възстановен)'::TEXT,
                    ('Потребител ' || COALESCE(missed_user.full_name, missed_user.username, missed_user.email) || ' се регистрира в системата')::TEXT,
                    jsonb_build_object(
                        'user_id', missed_user.id,
                        'user_email', missed_user.email,
                        'user_name', COALESCE(missed_user.full_name, missed_user.username),
                        'username', missed_user.username,
                        'registration_date', missed_user.created_at,
                        'recovery_notification', true
                    ),
                    missed_user.id,
                    'user'::TEXT,
                    'admin'::TEXT
                );
                RAISE NOTICE 'Recovery notification created for user: %', missed_user.email;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to create recovery notification for user %: %', missed_user.email, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- 7. Show the current trigger setup
SELECT 'Updated Trigger Setup' as info,
       trigger_name,
       event_object_table,
       event_object_schema,
       event_manipulation,
       action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%'
   OR (event_object_table = 'users' AND event_object_schema IN ('public', 'auth'))
ORDER BY event_object_schema, event_object_table, trigger_name;

-- 8. Create a final test notification
SELECT create_admin_notification(
    'system_alert'::TEXT,
    'Система за известия подобрена'::TEXT,
    'Системата за известия е подобрена да улавя всички начини за създаване на потребители. Включени са тригери за INSERT, UPDATE и auth.users.'::TEXT,
    jsonb_build_object(
        'improvement_time', NOW(),
        'coverage', 'comprehensive'
    ),
    NULL::UUID,
    NULL::TEXT,
    'admin'::TEXT
) as final_test_notification_id;
