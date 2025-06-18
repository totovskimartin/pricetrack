-- Upgrade current admin user to super_admin
-- Run this in your Supabase SQL Editor

-- First, let's see all current users and their roles
SELECT id, email, username, full_name, role, is_active, created_at 
FROM public.users 
ORDER BY created_at;

-- Update the first admin user to super_admin (change the WHERE condition as needed)
UPDATE public.users 
SET role = 'super_admin' 
WHERE role = 'admin' 
AND id = (SELECT id FROM public.users WHERE role = 'admin' ORDER BY created_at LIMIT 1);

-- Or if you know your specific user ID, use this instead:
-- UPDATE public.users 
-- SET role = 'super_admin' 
-- WHERE id = 'your-user-id-here';

-- Verify the change
SELECT id, email, username, full_name, role, is_active, created_at 
FROM public.users 
WHERE role = 'super_admin'
ORDER BY created_at;
