-- Update the first user to be an admin so they can access the comments moderation
UPDATE public.users 
SET role = 'admin' 
WHERE role = 'user' 
AND id = (SELECT id FROM public.users WHERE role = 'user' ORDER BY created_at LIMIT 1);

-- Show current users and their roles
SELECT id, email, full_name, role, created_at 
FROM public.users 
ORDER BY created_at;
