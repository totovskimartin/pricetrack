-- Check if the trigger exists
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if the function exists
SELECT 
    routine_name, 
    routine_type, 
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Check if the generate_unique_username function exists
SELECT 
    routine_name, 
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'generate_unique_username';

-- Check current users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any users in the public.users table
SELECT COUNT(*) as user_count FROM public.users;

-- Check if there are any users in auth.users table
SELECT COUNT(*) as auth_user_count FROM auth.users;
