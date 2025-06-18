-- Fix the function creation issue
-- This will create the functions in the correct schema with proper permissions

-- First, completely clean up any existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS generate_unique_username(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.generate_unique_username(text, uuid) CASCADE;

-- Create the username generation function in the public schema explicitly
CREATE OR REPLACE FUNCTION public.generate_unique_username(base_name text, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    candidate_username text;
    counter integer := 0;
    clean_base text;
BEGIN
    -- Handle null or empty base_name
    IF base_name IS NULL OR LENGTH(TRIM(base_name)) = 0 THEN
        clean_base := 'user';
    ELSE
        -- Clean the base name: remove spaces, convert to lowercase, remove special chars
        clean_base := LOWER(REGEXP_REPLACE(TRIM(base_name), '[^a-zA-Z0-9]', '', 'g'));
        
        -- Ensure minimum length
        IF LENGTH(clean_base) < 3 THEN
            clean_base := 'user';
        END IF;
    END IF;
    
    -- Limit length to 15 characters to leave room for counter
    clean_base := SUBSTRING(clean_base, 1, 15);
    
    -- Add part of UUID to make it more unique
    clean_base := clean_base || SUBSTRING(REPLACE(user_id::text, '-', ''), 1, 4);
    
    candidate_username := clean_base;
    
    -- Keep trying until we find a unique username
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = candidate_username) LOOP
        counter := counter + 1;
        candidate_username := clean_base || counter::text;
        
        -- Prevent infinite loop
        IF counter > 100 THEN
            candidate_username := 'user' || SUBSTRING(REPLACE(user_id::text, '-', ''), 1, 8);
            EXIT;
        END IF;
    END LOOP;
    
    RETURN candidate_username;
END;
$$;

-- Create the user creation function in the public schema explicitly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    generated_username text;
    user_full_name text;
BEGIN
    -- Generate username using the public schema function explicitly
    generated_username := public.generate_unique_username(
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        NEW.id
    );

    -- Generate full name
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name'
    );
    
    -- If first_name and last_name exist, combine them
    IF NEW.raw_user_meta_data->>'first_name' IS NOT NULL AND NEW.raw_user_meta_data->>'last_name' IS NOT NULL THEN
        user_full_name := NEW.raw_user_meta_data->>'first_name' || ' ' || NEW.raw_user_meta_data->>'last_name';
    END IF;

    -- Insert into public.users table
    INSERT INTO public.users (
        id, 
        email, 
        username, 
        full_name, 
        first_name, 
        last_name, 
        role, 
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        generated_username,
        user_full_name,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        'user',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise with a clear message
        RAISE EXCEPTION 'Database error saving new user: %', SQLERRM;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permissions explicitly to all roles that need it
GRANT EXECUTE ON FUNCTION public.generate_unique_username(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_username(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_unique_username(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_unique_username(text, uuid) TO postgres;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- Test that the function exists and works
DO $$
DECLARE
    test_username text;
BEGIN
    -- Test the function
    SELECT public.generate_unique_username('test', '12345678-1234-1234-1234-123456789012'::uuid) INTO test_username;
    RAISE NOTICE 'Function test successful. Generated username: %', test_username;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Function test failed: %', SQLERRM;
END $$;

-- Verify the trigger exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created' 
        AND event_object_table = 'users'
        AND event_object_schema = 'auth'
    ) THEN
        RAISE EXCEPTION 'Trigger was not created successfully';
    END IF;
    
    RAISE NOTICE 'Trigger verification successful';
END $$;
