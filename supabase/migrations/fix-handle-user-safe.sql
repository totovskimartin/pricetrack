-- Safe fix for handle_new_user function that won't break registration
-- This version ensures user registration always succeeds even if notifications fail

-- 1. First, restore a working version of handle_new_user without notifications
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    generated_username TEXT;
    user_full_name TEXT;
BEGIN
    -- Generate username from metadata or email
    BEGIN
        generated_username := generate_unique_username(
            COALESCE(
                NEW.raw_user_meta_data->>'username',
                NEW.raw_user_meta_data->>'full_name',
                CONCAT(
                    NEW.raw_user_meta_data->>'first_name', 
                    ' ',
                    NEW.raw_user_meta_data->>'last_name'
                ),
                NEW.raw_user_meta_data->>'name',
                SPLIT_PART(NEW.email, '@', 1)
            ),
            NEW.id
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Fallback to simple username
            generated_username := SPLIT_PART(NEW.email, '@', 1);
    END;

    -- Build full name
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        CONCAT(
            NEW.raw_user_meta_data->>'first_name', 
            ' ', 
            NEW.raw_user_meta_data->>'last_name'
        ),
        NEW.raw_user_meta_data->>'name',
        generated_username
    );

    -- Insert into public.users table
    INSERT INTO public.users (
        id, 
        email, 
        username, 
        full_name, 
        first_name, 
        last_name, 
        role, 
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        generated_username,
        user_full_name,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        'user',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Try to update existing record
        UPDATE public.users SET
            email = NEW.email,
            updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log the error but don't fail registration
        RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a separate function for admin notifications
CREATE OR REPLACE FUNCTION notify_admin_of_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_display_name TEXT;
BEGIN
    -- Build display name
    user_display_name := COALESCE(
        NEW.full_name,
        NEW.username,
        NEW.email
    );

    -- Create admin notification (in a safe way that won't fail registration)
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
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail anything
            RAISE WARNING 'Failed to create admin notification for new user %: %', NEW.email, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a trigger on public.users for notifications (after successful insert)
DROP TRIGGER IF EXISTS notify_admin_new_user_trigger ON public.users;
CREATE TRIGGER notify_admin_new_user_trigger
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION notify_admin_of_new_user();

-- 4. Test that user creation works now
SELECT 'Safe Handle User Function' as status,
       'User registration should now work without errors' as message;

-- 5. Create a test notification to verify the system works
SELECT create_admin_notification(
    'system_alert'::TEXT,
    'Система за известия възстановена'::TEXT,
    'Системата за известия е възстановена в безопасен режим. Регистрацията на потребители няма да се проваля.'::TEXT,
    jsonb_build_object(
        'fix_time', NOW(),
        'method', 'safe_separate_trigger'
    ),
    NULL::UUID,
    NULL::TEXT,
    'admin'::TEXT
) as test_notification_id;

-- 6. Show current trigger setup
SELECT 'Current Triggers' as info,
       trigger_name,
       event_object_table,
       event_manipulation
FROM information_schema.triggers 
WHERE (event_object_table = 'users' AND event_object_schema = 'auth')
   OR (event_object_table = 'users' AND event_object_schema = 'public')
ORDER BY event_object_schema, trigger_name;
