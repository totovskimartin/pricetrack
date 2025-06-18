-- Verification script to check if functions and trigger are working

-- 1. Check if functions exist in the correct schema
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_name IN ('generate_unique_username', 'handle_new_user')
ORDER BY routine_name;

-- 2. Check if trigger exists
SELECT 
    trigger_schema,
    trigger_name,
    event_object_schema,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 3. Test the username generation function directly
SELECT 'Testing username generation function...' as test_step;
SELECT public.generate_unique_username('testuser', '12345678-1234-1234-1234-123456789012'::uuid) as test_result;

-- 4. Check function permissions
SELECT 
    routine_schema,
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name IN ('generate_unique_username', 'handle_new_user')
ORDER BY routine_name, grantee;

-- 5. Check if public.users table has the right structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. Show current user counts
SELECT 
    'Current counts' as info,
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM public.users) as public_users;
