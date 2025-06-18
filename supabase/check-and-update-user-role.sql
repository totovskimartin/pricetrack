-- Check and update user role to super_admin
-- Run this in your Supabase SQL Editor

-- First, let's see the current user with ID f7142abb-f8fe-46b6-8c8a-61ecc474a794
SELECT id, email, username, full_name, role, is_active, created_at 
FROM public.users 
WHERE id = 'f7142abb-f8fe-46b6-8c8a-61ecc474a794';

-- If the user doesn't exist, let's see all users
SELECT id, email, username, full_name, role, is_active, created_at 
FROM public.users 
ORDER BY created_at;

-- Update the specific user to super_admin
UPDATE public.users 
SET role = 'super_admin' 
WHERE id = 'f7142abb-f8fe-46b6-8c8a-61ecc474a794';

-- If the user doesn't exist in public.users, create them
-- (This might happen if the user was created in auth.users but not synced to public.users)
INSERT INTO public.users (id, email, username, full_name, role, is_active)
SELECT 
    'f7142abb-f8fe-46b6-8c8a-61ecc474a794',
    'test@example.com',
    'testuser',
    'Test User',
    'super_admin',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = 'f7142abb-f8fe-46b6-8c8a-61ecc474a794'
);

-- Verify the change
SELECT id, email, username, full_name, role, is_active, created_at 
FROM public.users 
WHERE id = 'f7142abb-f8fe-46b6-8c8a-61ecc474a794';
