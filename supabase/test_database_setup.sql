-- Test 1: Check if public.users table exists and has correct structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Test 2: Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Test 3: Check if the functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'generate_unique_username');

-- Test 4: Check permissions on public.users table
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' AND table_name = 'users';

-- Test 5: Try to manually test username generation (if functions exist)
-- SELECT generate_unique_username('testuser', '12345678-1234-1234-1234-123456789012'::UUID);

-- Test 6: Check if there are any existing users
SELECT COUNT(*) as total_users FROM public.users;
SELECT COUNT(*) as total_auth_users FROM auth.users;

-- Test 7: Check the user_role enum type
SELECT 
    enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role');

-- Test 8: Check constraints on users table
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' AND table_name = 'users';
