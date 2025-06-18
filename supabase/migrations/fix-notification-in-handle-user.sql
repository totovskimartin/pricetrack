-- Fix notifications by adding them to the handle_new_user function
-- This is where users are actually created successfully

-- 1. First, let's see the current handle_new_user function
SELECT 'Current handle_new_user function' as info,
       routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- 2. Update the handle_new_user function to include admin notifications
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    generated_username TEXT;
    user_full_name TEXT;
    user_display_name TEXT;
    user_inserted BOOLEAN := FALSE;
BEGIN
    -- Generate username from metadata or email
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

    -- Build display name for notification
    user_display_name := COALESCE(
        user_full_name,
        generated_username,
        NEW.email
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
    
    -- Check if this was a new insert (not an update)
    GET DIAGNOSTICS user_inserted = ROW_COUNT;
    
    -- Create admin notification for new user registrations
    -- Only if this was a new user (not an update)
    IF user_inserted > 0 THEN
        BEGIN
            PERFORM create_admin_notification(
                'new_user'::TEXT,
                'Нов потребител се регистрира'::TEXT,
                ('Потребител ' || user_display_name || ' се регистрира в системата')::TEXT,
                jsonb_build_object(
                    'user_id', NEW.id,
                    'user_email', NEW.email,
                    'user_name', user_display_name,
                    'username', generated_username,
                    'registration_date', NOW(),
                    'source', 'auth_trigger'
                ),
                NEW.id,
                'user'::TEXT,
                'admin'::TEXT
            );
            
            RAISE NOTICE 'Admin notification created for new user: % (ID: %)', user_display_name, NEW.id;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the user registration
                RAISE WARNING 'Failed to create admin notification for new user % (ID: %): %', user_display_name, NEW.id, SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'User % already existed, no notification created', NEW.email;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RAISE LOG 'Unique violation in handle_new_user for user %: %', NEW.id, SQLERRM;
        -- Try to update existing record
        UPDATE public.users SET
            email = NEW.email,
            updated_at = NOW()
        WHERE id = NEW.id;
        RAISE NOTICE 'Updated existing user % due to unique violation', NEW.email;
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log the detailed error
        RAISE LOG 'Error in handle_new_user for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
        -- Re-raise with user-friendly message
        RAISE EXCEPTION 'Database error saving new user. Please try again or contact support. Error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Remove the old trigger on public.users since we're now handling notifications in handle_new_user
DROP TRIGGER IF EXISTS new_user_notification_trigger ON public.users;
DROP TRIGGER IF EXISTS debug_user_update_trigger ON public.users;
DROP TRIGGER IF EXISTS test_user_trigger ON public.users;

-- 4. Clean up old functions
DROP FUNCTION IF EXISTS notify_admin_new_user();
DROP FUNCTION IF EXISTS debug_user_creation();
DROP FUNCTION IF EXISTS debug_user_update();
DROP FUNCTION IF EXISTS test_user_trigger();

-- 5. Verify the setup
SELECT 'Updated Function Status' as info,
       'handle_new_user function updated to include admin notifications' as status;

-- 6. Check current triggers on auth.users
SELECT 'Auth Users Triggers' as info,
       trigger_name,
       event_manipulation,
       action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- 7. Test notification creation manually
SELECT create_admin_notification(
    'system_alert'::TEXT,
    'Система за известия обновена'::TEXT,
    'Системата за известия е обновена да работи с handle_new_user функцията. Следващите регистрации ще създават известия.'::TEXT,
    jsonb_build_object(
        'update_time', NOW(),
        'method', 'handle_new_user_integration'
    ),
    NULL::UUID,
    NULL::TEXT,
    'admin'::TEXT
) as test_notification_id;

SELECT 'NEXT STEPS' as info,
       'Now register a new user and check the Известия tab for notifications!' as instructions;
