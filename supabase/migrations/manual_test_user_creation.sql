-- Manual test to verify user creation trigger works
-- Run this AFTER running the migration

-- Step 1: Check if everything is set up correctly
SELECT 'Checking public.users table structure...' as step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

SELECT 'Checking if trigger exists...' as step;
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT 'Checking if functions exist...' as step;
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'generate_unique_username');

-- Step 2: Test username generation function directly
SELECT 'Testing username generation...' as step;
SELECT generate_unique_username('testuser', '12345678-1234-1234-1234-123456789012'::UUID) as generated_username;
SELECT generate_unique_username('', '12345678-1234-1234-1234-123456789012'::UUID) as generated_username_empty;
SELECT generate_unique_username(NULL, '12345678-1234-1234-1234-123456789012'::UUID) as generated_username_null;

-- Step 3: Check current user counts
SELECT 'Current user counts...' as step;
SELECT 
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM public.users) as public_users;

-- Step 4: Check RLS policies
SELECT 'Checking RLS policies...' as step;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users';

-- Step 5: Test permissions
SELECT 'Testing permissions...' as step;
SELECT 
    grantee, 
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY grantee, privilege_type;

-- If you want to test the trigger manually (DANGEROUS - only for testing):
-- DO NOT RUN THIS IN PRODUCTION!
/*
-- This would simulate what happens when a user registers
INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '99999999-9999-9999-9999-999999999999'::UUID,
    'test@example.com',
    'dummy_password',
    NOW(),
    '{"username": "testuser123"}'::jsonb,
    NOW(),
    NOW()
);

-- Check if it created a public.users record
SELECT * FROM public.users WHERE id = '99999999-9999-9999-9999-999999999999'::UUID;

-- Clean up test data
DELETE FROM auth.users WHERE id = '99999999-9999-9999-9999-999999999999'::UUID;
*/
