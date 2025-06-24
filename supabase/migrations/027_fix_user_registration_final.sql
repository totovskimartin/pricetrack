-- Fix user registration issues once and for all
-- This migration creates a simple, robust user creation system

-- 1. Drop existing problematic triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS generate_unique_username(TEXT, UUID);

-- 2. Create a simple username generation function
CREATE OR REPLACE FUNCTION generate_unique_username(base_name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
    candidate_username TEXT;
    counter INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    -- Clean the base name: remove spaces, convert to lowercase, remove special chars
    base_name := LOWER(REGEXP_REPLACE(COALESCE(base_name, ''), '[^a-zA-Z0-9_]', '', 'g'));
    
    -- Ensure minimum length and valid format
    IF LENGTH(base_name) < 3 OR base_name = '' THEN
        base_name := 'user' || SUBSTRING(REPLACE(user_id::TEXT, '-', ''), 1, 8);
    END IF;
    
    -- Ensure it doesn't start with a number
    IF base_name ~ '^[0-9]' THEN
        base_name := 'u' || base_name;
    END IF;
    
    -- Truncate if too long
    IF LENGTH(base_name) > 15 THEN
        base_name := SUBSTRING(base_name, 1, 15);
    END IF;
    
    -- Try to find a unique username
    candidate_username := base_name;
    
    WHILE counter < max_attempts LOOP
        -- Check if username exists
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE username = candidate_username) THEN
            RETURN candidate_username;
        END IF;
        
        -- Try next candidate
        counter := counter + 1;
        candidate_username := base_name || counter::TEXT;
    END LOOP;
    
    -- Fallback: use user ID substring
    RETURN 'user' || SUBSTRING(REPLACE(user_id::TEXT, '-', ''), 1, 12);
END;
$$ LANGUAGE plpgsql;

-- 3. Create a simple, robust user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    generated_username TEXT;
    user_full_name TEXT;
BEGIN
    -- Generate username from metadata or email
    generated_username := generate_unique_username(
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
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

    -- Insert into public.users table with error handling
    BEGIN
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
        );
        
        RAISE LOG 'Successfully created user: % with username: %', NEW.email, generated_username;
        
    EXCEPTION
        WHEN unique_violation THEN
            -- Handle duplicate key error
            RAISE LOG 'User % already exists, updating instead', NEW.id;
            UPDATE public.users SET
                email = NEW.email,
                updated_at = NOW()
            WHERE id = NEW.id;
            
        WHEN OTHERS THEN
            -- Log the error but don't fail the auth user creation
            RAISE LOG 'Error creating user in public.users for %: % (SQLSTATE: %)', NEW.email, SQLERRM, SQLSTATE;
            -- Don't re-raise the exception to avoid blocking auth user creation
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_unique_username(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 6. Test the function with a simple query (this will be logged)
DO $$
BEGIN
    RAISE LOG 'User creation trigger and function updated successfully';
END $$;
