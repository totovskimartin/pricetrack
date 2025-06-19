-- Fix username preservation during registration
-- Users should be able to login with the exact username they provided during registration

-- Drop existing functions and trigger to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_unique_username(text, uuid) CASCADE;

-- Create a new username validation and generation function
-- This function preserves the user's intended username if it's valid and available
CREATE OR REPLACE FUNCTION public.generate_or_validate_username(provided_username text, fallback_base text, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    candidate_username text;
    counter integer := 0;
    clean_base text;
BEGIN
    -- If a username was explicitly provided, try to use it as-is
    IF provided_username IS NOT NULL AND LENGTH(TRIM(provided_username)) >= 3 THEN
        candidate_username := TRIM(provided_username);
        
        -- Basic validation: only allow alphanumeric characters and underscores
        IF candidate_username ~ '^[a-zA-Z0-9_]+$' AND LENGTH(candidate_username) <= 30 THEN
            -- Check if it's available
            IF NOT EXISTS (SELECT 1 FROM public.users WHERE username = candidate_username) THEN
                RETURN candidate_username;
            END IF;
            
            -- If not available, try adding numbers to the provided username
            WHILE EXISTS (SELECT 1 FROM public.users WHERE username = candidate_username) LOOP
                counter := counter + 1;
                candidate_username := TRIM(provided_username) || counter::text;
                
                -- Prevent infinite loop
                IF counter > 999 THEN
                    EXIT;
                END IF;
            END LOOP;
            
            -- If we found a variation, return it
            IF NOT EXISTS (SELECT 1 FROM public.users WHERE username = candidate_username) THEN
                RETURN candidate_username;
            END IF;
        END IF;
    END IF;
    
    -- Fallback: generate username from fallback_base (usually email prefix)
    IF fallback_base IS NULL OR LENGTH(TRIM(fallback_base)) = 0 THEN
        clean_base := 'user';
    ELSE
        -- Clean the fallback base: remove special chars, convert to lowercase
        clean_base := LOWER(REGEXP_REPLACE(TRIM(fallback_base), '[^a-zA-Z0-9_]', '', 'g'));
        
        -- Ensure minimum length
        IF LENGTH(clean_base) < 3 THEN
            clean_base := 'user';
        END IF;
    END IF;
    
    -- Limit length to 20 characters
    clean_base := SUBSTRING(clean_base, 1, 20);
    candidate_username := clean_base;
    
    -- Find an available username based on the fallback
    counter := 0;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = candidate_username) LOOP
        counter := counter + 1;
        candidate_username := clean_base || counter::text;
        
        -- Prevent infinite loop
        IF counter > 999 THEN
            -- Ultimate fallback: use UUID
            candidate_username := 'user' || SUBSTRING(REPLACE(user_id::text, '-', ''), 1, 8);
            EXIT;
        END IF;
    END LOOP;
    
    RETURN candidate_username;
END;
$$;

-- Create the improved user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    final_username text;
    user_full_name text;
BEGIN
    -- Use the new function that preserves provided usernames
    final_username := public.generate_or_validate_username(
        NEW.raw_user_meta_data->>'username',  -- Provided username (preserved if valid)
        SPLIT_PART(NEW.email, '@', 1),        -- Fallback to email prefix
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
        final_username,
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
        username = COALESCE(EXCLUDED.username, public.users.username), -- Don't overwrite existing username
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise with a clear message
        RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        RAISE EXCEPTION 'Database error saving new user: %', SQLERRM;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_or_validate_username(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_or_validate_username(text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_or_validate_username(text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_or_validate_username(text, text, uuid) TO postgres;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- Test the new function
DO $$
DECLARE
    test_username text;
BEGIN
    -- Test 1: Provided username should be preserved
    SELECT public.generate_or_validate_username('myusername123', 'fallback', '12345678-1234-1234-1234-123456789012'::uuid) INTO test_username;
    IF test_username != 'myusername123' THEN
        RAISE EXCEPTION 'Test 1 failed: Expected myusername123, got %', test_username;
    END IF;
    
    -- Test 2: Invalid username should fall back
    SELECT public.generate_or_validate_username('invalid@username!', 'fallback', '12345678-1234-1234-1234-123456789012'::uuid) INTO test_username;
    IF test_username != 'fallback' THEN
        RAISE EXCEPTION 'Test 2 failed: Expected fallback, got %', test_username;
    END IF;
    
    -- Test 3: Empty username should fall back
    SELECT public.generate_or_validate_username('', 'emailprefix', '12345678-1234-1234-1234-123456789012'::uuid) INTO test_username;
    IF test_username != 'emailprefix' THEN
        RAISE EXCEPTION 'Test 3 failed: Expected emailprefix, got %', test_username;
    END IF;
    
    RAISE NOTICE 'All username generation tests passed!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Username generation test failed: %', SQLERRM;
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
    
    RAISE NOTICE 'Username preservation fix applied successfully!';
END $$;
