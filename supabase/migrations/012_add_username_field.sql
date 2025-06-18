-- Add username field to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create index for username
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Function to generate unique username from email or name
CREATE OR REPLACE FUNCTION generate_unique_username(base_name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
    candidate_username TEXT;
    counter INTEGER := 0;
BEGIN
    -- Clean the base name: remove spaces, convert to lowercase, remove special chars
    base_name := LOWER(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9]', '', 'g'));
    
    -- Ensure minimum length
    IF LENGTH(base_name) < 3 THEN
        base_name := 'user' || SUBSTRING(user_id::TEXT, 1, 8);
    END IF;
    
    -- Limit length to 20 characters
    base_name := SUBSTRING(base_name, 1, 20);
    
    candidate_username := base_name;
    
    -- Keep trying until we find a unique username
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = candidate_username AND id != user_id) LOOP
        counter := counter + 1;
        candidate_username := base_name || counter::TEXT;
    END LOOP;
    
    RETURN candidate_username;
END;
$$ LANGUAGE plpgsql;

-- Update existing users with usernames
UPDATE public.users 
SET username = generate_unique_username(
    COALESCE(
        full_name,
        SPLIT_PART(email, '@', 1),
        'user'
    ),
    id
)
WHERE username IS NULL;

-- Update existing users with first_name and last_name from full_name
UPDATE public.users 
SET 
    first_name = CASE 
        WHEN full_name IS NOT NULL AND POSITION(' ' IN full_name) > 0 
        THEN SPLIT_PART(full_name, ' ', 1)
        ELSE full_name
    END,
    last_name = CASE 
        WHEN full_name IS NOT NULL AND POSITION(' ' IN full_name) > 0 
        THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
        ELSE NULL
    END
WHERE first_name IS NULL AND last_name IS NULL;

-- Make username required and unique
ALTER TABLE public.users 
ALTER COLUMN username SET NOT NULL,
ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Update the user creation function to handle username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    generated_username TEXT;
BEGIN
    -- Generate username from metadata or email
    generated_username := generate_unique_username(
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            NEW.raw_user_meta_data->>'full_name',
            CONCAT(
                NEW.raw_user_meta_data->>'first_name', 
                NEW.raw_user_meta_data->>'last_name'
            ),
            NEW.raw_user_meta_data->>'name',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        NEW.id
    );

    INSERT INTO public.users (id, email, username, full_name, first_name, last_name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        generated_username,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            CONCAT(
                NEW.raw_user_meta_data->>'first_name', 
                ' ', 
                NEW.raw_user_meta_data->>'last_name'
            ),
            NEW.raw_user_meta_data->>'name'
        ),
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        'user',
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = COALESCE(EXCLUDED.username, public.users.username),
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        updated_at = timezone('utc'::text, now());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the user_profiles view to include username
DROP VIEW IF EXISTS public.user_profiles;
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
    u.id,
    u.email,
    u.username,
    u.full_name,
    u.first_name,
    u.last_name,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_unique_username(TEXT, UUID) TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;
