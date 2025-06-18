-- Diagnose how user registration actually works
-- Run this to understand the user registration flow

-- 1. Check if there are any other triggers on the users table
SELECT 'All Triggers on Users Table' as info,
       trigger_name,
       event_manipulation,
       action_timing,
       action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- 2. Check the most recent users to see their data
SELECT 'Most Recent Users' as info,
       id,
       email,
       username,
       full_name,
       role,
       created_at,
       updated_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if there's an auth.users table (Supabase Auth)
SELECT 'Auth Users Table Check' as info,
       COUNT(*) as auth_users_count
FROM information_schema.tables
WHERE table_schema = 'auth' 
  AND table_name = 'users';

-- 4. If auth.users exists, check recent auth users
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'Auth users table exists - checking recent entries';
        -- This will show in the messages/notices
    ELSE
        RAISE NOTICE 'No auth.users table found';
    END IF;
END $$;

-- 5. Check for any functions that might handle user creation
SELECT 'User Related Functions' as info,
       routine_name,
       routine_type,
       routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name ILIKE '%user%' 
    OR routine_definition ILIKE '%users%'
    OR routine_name ILIKE '%auth%'
  )
ORDER BY routine_name;

-- 6. Check if there are any RLS policies on users table that might affect triggers
SELECT 'Users Table RLS Policies' as info,
       schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- 7. Let's also check if our trigger function has the right permissions
SELECT 'Trigger Function Info' as info,
       proname as function_name,
       proowner,
       proacl as permissions
FROM pg_proc
WHERE proname = 'notify_admin_new_user';

-- 8. Test if we can see trigger execution by enabling logging
-- First check current log settings
SHOW log_statement;
SHOW log_min_messages;

-- 9. Create a simple test to see if triggers fire at all on users table
CREATE OR REPLACE FUNCTION test_user_trigger()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'TEST TRIGGER FIRED: User % with email % was inserted', NEW.id, NEW.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a test trigger
DROP TRIGGER IF EXISTS test_user_trigger ON public.users;
CREATE TRIGGER test_user_trigger
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION test_user_trigger();

-- 10. Show all triggers on users table now
SELECT 'All User Triggers After Test' as info,
       trigger_name,
       event_manipulation,
       action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users'
  AND event_object_schema = 'public'
ORDER BY trigger_name;
