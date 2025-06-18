-- Fix user creation and ensure all auth users have corresponding public.users records
-- This migration ensures that discussions show proper author names instead of "Anonymous"

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      CONCAT(
        NEW.raw_user_meta_data->>'first_name', 
        ' ', 
        NEW.raw_user_meta_data->>'last_name'
      ),
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1) -- Use email username as fallback
    ),
    'user',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(
      EXCLUDED.full_name,
      public.users.full_name,
      SPLIT_PART(EXCLUDED.email, '@', 1)
    ),
    updated_at = timezone('utc'::text, now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to sync existing auth users to public.users
CREATE OR REPLACE FUNCTION sync_auth_users_to_public()
RETURNS INTEGER AS $$
DECLARE
  user_record RECORD;
  synced_count INTEGER := 0;
BEGIN
  -- Loop through all auth users that don't have corresponding public.users records
  FOR user_record IN 
    SELECT 
      au.id,
      au.email,
      au.raw_user_meta_data,
      au.created_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
      AND au.email IS NOT NULL
      AND au.deleted_at IS NULL
  LOOP
    -- Insert missing user
    INSERT INTO public.users (id, email, full_name, role, is_active, created_at)
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(
        user_record.raw_user_meta_data->>'full_name',
        CONCAT(
          user_record.raw_user_meta_data->>'first_name', 
          ' ', 
          user_record.raw_user_meta_data->>'last_name'
        ),
        user_record.raw_user_meta_data->>'name',
        SPLIT_PART(user_record.email, '@', 1)
      ),
      'user',
      true,
      user_record.created_at
    )
    ON CONFLICT (id) DO NOTHING;
    
    synced_count := synced_count + 1;
  END LOOP;
  
  RETURN synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update users with missing full_name
CREATE OR REPLACE FUNCTION fix_missing_user_names()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update users who have null or empty full_name
  UPDATE public.users 
  SET 
    full_name = COALESCE(
      NULLIF(full_name, ''),
      SPLIT_PART(email, '@', 1),
      'Потребител'
    ),
    updated_at = timezone('utc'::text, now())
  WHERE full_name IS NULL 
     OR full_name = '' 
     OR full_name = 'User';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync functions to fix existing data
SELECT sync_auth_users_to_public() as synced_users;
SELECT fix_missing_user_names() as updated_names;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_auth_users_to_public() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_missing_user_names() TO authenticated;

-- Create a view for easier user management
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.avatar_url,
  u.role,
  u.is_active,
  u.created_at,
  u.updated_at,
  au.last_sign_in_at,
  au.email_confirmed_at
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.deleted_at IS NULL;

-- Grant access to the view
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- Add RLS policy for the view
ALTER VIEW public.user_profiles SET (security_invoker = true);

-- Update existing discussions to ensure they have proper created_by references
-- This will help with any orphaned discussions
UPDATE public.discussions 
SET updated_at = timezone('utc'::text, now())
WHERE created_by IS NOT NULL 
  AND EXISTS (SELECT 1 FROM public.users WHERE id = discussions.created_by);

-- Update existing comments to ensure they have proper created_by references
UPDATE public.discussion_comments 
SET updated_at = timezone('utc'::text, now())
WHERE created_by IS NOT NULL 
  AND EXISTS (SELECT 1 FROM public.users WHERE id = discussion_comments.created_by);

-- Create an index on users.full_name for better performance
CREATE INDEX IF NOT EXISTS idx_users_full_name ON public.users(full_name);

-- Log the results
DO $$
DECLARE
  total_users INTEGER;
  users_with_names INTEGER;
  discussions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.users;
  SELECT COUNT(*) INTO users_with_names FROM public.users WHERE full_name IS NOT NULL AND full_name != '';
  SELECT COUNT(*) INTO discussions_count FROM public.discussions WHERE created_by IS NOT NULL;
  
  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '- Total users in public.users: %', total_users;
  RAISE NOTICE '- Users with full names: %', users_with_names;
  RAISE NOTICE '- Discussions with valid authors: %', discussions_count;
END $$;
