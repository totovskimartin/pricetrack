-- Fix the auth notification permissions issue
-- The auth trigger can't access the create_admin_notification function

-- 1. First, let's check if the function exists and its permissions
SELECT 'Function Permissions Check' as info,
       proname as function_name,
       proowner,
       proacl as permissions,
       prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'create_admin_notification';

-- 2. Recreate the function with SECURITY DEFINER so it can be called from auth context
CREATE OR REPLACE FUNCTION create_admin_notification(
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_target_type TEXT DEFAULT NULL,
    p_created_for_role TEXT DEFAULT 'admin'
)
RETURNS UUID 
SECURITY DEFINER  -- This allows the function to run with the definer's privileges
SET search_path = public  -- Ensure we're using the public schema
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.admin_notifications (
        type,
        title,
        message,
        data,
        target_id,
        target_type,
        created_for_role
    ) VALUES (
        p_type,
        p_title,
        p_message,
        p_data,
        p_target_id,
        p_target_type,
        p_created_for_role
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Grant execute permissions to the auth admin role
GRANT EXECUTE ON FUNCTION create_admin_notification(TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION create_admin_notification(TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_admin_notification(TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT) TO service_role;

-- 4. Also grant permissions on the admin_notifications table
GRANT INSERT ON public.admin_notifications TO supabase_auth_admin;
GRANT INSERT ON public.admin_notifications TO authenticated;
GRANT INSERT ON public.admin_notifications TO service_role;

-- 5. Update the auth trigger function to use the fully qualified function name
CREATE OR REPLACE FUNCTION debug_auth_user_operations()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'AUTH USER INSERT: ID=%, Email=%, Metadata=%', 
                 NEW.id, NEW.email, NEW.raw_user_meta_data;
    
    -- Try to create notification for auth user using fully qualified function
    BEGIN
        PERFORM public.create_admin_notification(
            'new_user'::TEXT,
            'Нов потребител се регистрира'::TEXT,
            ('Потребител ' || NEW.email || ' се регистрира в системата')::TEXT,
            jsonb_build_object(
                'auth_user_id', NEW.id,
                'user_email', NEW.email,
                'registration_date', NEW.created_at,
                'source', 'auth_trigger',
                'metadata', NEW.raw_user_meta_data
            ),
            NEW.id,
            'auth_user'::TEXT,
            'admin'::TEXT
        );
        RAISE NOTICE 'Auth notification created successfully for user: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create auth notification for user %: % (SQLSTATE: %)', NEW.email, SQLERRM, SQLSTATE;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recreate the auth trigger
DROP TRIGGER IF EXISTS debug_auth_user_operations_trigger ON auth.users;
CREATE TRIGGER debug_auth_user_operations_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION debug_auth_user_operations();

-- 7. Test the fixed function
SELECT public.create_admin_notification(
    'system_alert'::TEXT,
    'Известия от Auth поправени'::TEXT,
    'Функцията за създаване на известия е поправена да работи от auth контекста. Следващите регистрации ще създават известия.'::TEXT,
    jsonb_build_object(
        'fix_time', NOW(),
        'method', 'security_definer_permissions'
    ),
    NULL::UUID,
    NULL::TEXT,
    'admin'::TEXT
) as auth_fix_notification_id;

-- 8. Show current permissions
SELECT 'Updated Permissions' as info,
       grantee,
       privilege_type,
       is_grantable
FROM information_schema.routine_privileges 
WHERE routine_name = 'create_admin_notification'
ORDER BY grantee;

-- 9. Show current triggers
SELECT 'Current Triggers' as info,
       trigger_name,
       event_object_table,
       event_object_schema
FROM information_schema.triggers 
WHERE trigger_name LIKE '%auth%' OR trigger_name LIKE '%user%'
ORDER BY event_object_schema, trigger_name;
