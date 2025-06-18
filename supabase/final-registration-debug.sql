-- Final debug to understand exactly what happens during user registration
-- Run this, then register a new user, then check the results

-- 1. Enable detailed logging for all user-related operations
CREATE OR REPLACE FUNCTION debug_all_user_operations()
RETURNS TRIGGER AS $$
BEGIN
    -- Log everything that happens to users table
    IF TG_OP = 'INSERT' THEN
        RAISE NOTICE 'USER INSERT: ID=%, Email=%, Username=%, Full_Name=%, Created_At=%', 
                     NEW.id, NEW.email, NEW.username, NEW.full_name, NEW.created_at;
        
        -- Try to create notification immediately
        BEGIN
            PERFORM create_admin_notification(
                'new_user'::TEXT,
                'DEBUG - Нов потребител (INSERT)'::TEXT,
                ('DEBUG INSERT - Потребител ' || COALESCE(NEW.full_name, NEW.username, NEW.email) || ' се регистрира')::TEXT,
                jsonb_build_object(
                    'user_id', NEW.id,
                    'user_email', NEW.email,
                    'debug_operation', 'INSERT',
                    'timestamp', NOW()
                ),
                NEW.id,
                'user'::TEXT,
                'admin'::TEXT
            );
            RAISE NOTICE 'DEBUG INSERT notification created successfully';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'DEBUG INSERT notification failed: %', SQLERRM;
        END;
        
    ELSIF TG_OP = 'UPDATE' THEN
        RAISE NOTICE 'USER UPDATE: ID=%, Email=% -> %, Username=% -> %, Full_Name=% -> %', 
                     NEW.id, OLD.email, NEW.email, OLD.username, NEW.username, OLD.full_name, NEW.full_name;
        
        -- Check if this looks like a new user setup
        IF (OLD.username IS NULL AND NEW.username IS NOT NULL) OR 
           (OLD.full_name IS NULL AND NEW.full_name IS NOT NULL) THEN
            BEGIN
                PERFORM create_admin_notification(
                    'new_user'::TEXT,
                    'DEBUG - Нов потребител (UPDATE)'::TEXT,
                    ('DEBUG UPDATE - Потребител ' || COALESCE(NEW.full_name, NEW.username, NEW.email) || ' се регистрира')::TEXT,
                    jsonb_build_object(
                        'user_id', NEW.id,
                        'user_email', NEW.email,
                        'debug_operation', 'UPDATE',
                        'old_username', OLD.username,
                        'new_username', NEW.username,
                        'timestamp', NOW()
                    ),
                    NEW.id,
                    'user'::TEXT,
                    'admin'::TEXT
                );
                RAISE NOTICE 'DEBUG UPDATE notification created successfully';
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'DEBUG UPDATE notification failed: %', SQLERRM;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Replace all existing triggers with the debug version
DROP TRIGGER IF EXISTS notify_admin_comprehensive_user_trigger ON public.users;
DROP TRIGGER IF EXISTS notify_admin_new_user_trigger ON public.users;
DROP TRIGGER IF EXISTS notify_admin_of_new_user ON public.users;

CREATE TRIGGER debug_all_user_operations_trigger
    AFTER INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION debug_all_user_operations();

-- 3. Also create a debug trigger for auth.users if possible
CREATE OR REPLACE FUNCTION debug_auth_user_operations()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'AUTH USER INSERT: ID=%, Email=%, Metadata=%', 
                 NEW.id, NEW.email, NEW.raw_user_meta_data;
    
    -- Try to create notification for auth user
    BEGIN
        PERFORM create_admin_notification(
            'new_user'::TEXT,
            'DEBUG - Нов потребител (AUTH)'::TEXT,
            ('DEBUG AUTH - Потребител ' || NEW.email || ' се регистрира в auth.users')::TEXT,
            jsonb_build_object(
                'auth_user_id', NEW.id,
                'user_email', NEW.email,
                'debug_operation', 'AUTH_INSERT',
                'metadata', NEW.raw_user_meta_data,
                'timestamp', NOW()
            ),
            NEW.id,
            'auth_user'::TEXT,
            'admin'::TEXT
        );
        RAISE NOTICE 'DEBUG AUTH notification created successfully';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'DEBUG AUTH notification failed: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Try to create auth trigger
DO $$
BEGIN
    BEGIN
        DROP TRIGGER IF EXISTS debug_auth_user_operations_trigger ON auth.users;
        CREATE TRIGGER debug_auth_user_operations_trigger
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION debug_auth_user_operations();
        RAISE NOTICE 'Auth debug trigger created successfully';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not create auth debug trigger: %', SQLERRM;
    END;
END $$;

-- 4. Show current trigger setup
SELECT 'Current Debug Triggers' as info,
       trigger_name,
       event_object_table,
       event_object_schema,
       event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE '%debug%' 
   OR trigger_name LIKE '%user%'
ORDER BY event_object_schema, event_object_table;

-- 5. Create a marker notification so we know when the debug started
SELECT create_admin_notification(
    'system_alert'::TEXT,
    'DEBUG режим активиран'::TEXT,
    'Системата за debug на регистрации е активирана. Регистрирайте нов потребител сега за да видите какво се случва.'::TEXT,
    jsonb_build_object(
        'debug_start_time', NOW(),
        'instructions', 'Register a new user now and check the logs'
    ),
    NULL::UUID,
    NULL::TEXT,
    'admin'::TEXT
) as debug_start_notification_id;

-- 6. Instructions
SELECT 'INSTRUCTIONS' as info,
       'Now register a new user and then run this query to see what happened:

SELECT * FROM public.admin_notifications 
WHERE title LIKE ''DEBUG%'' 
ORDER BY created_at DESC;

Also check the Supabase logs for NOTICE messages.' as next_steps;
