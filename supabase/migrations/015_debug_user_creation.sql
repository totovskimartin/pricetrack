-- Drop existing trigger and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS generate_unique_username(TEXT, UUID);

-- Create a simple username generation function with better error handling
CREATE OR REPLACE FUNCTION generate_unique_username(base_name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
    candidate_username TEXT;
    counter INTEGER := 0;
    clean_base TEXT;
BEGIN
    -- Log the input for debugging
    RAISE LOG 'generate_unique_username called with base_name: %, user_id: %', base_name, user_id;
    
    -- Handle null or empty base_name
    IF base_name IS NULL OR LENGTH(TRIM(base_name)) = 0 THEN
        clean_base := 'user' || SUBSTRING(user_id::TEXT, 1, 8);
    ELSE
        -- Clean the base name: remove spaces, convert to lowercase, remove special chars
        clean_base := LOWER(REGEXP_REPLACE(TRIM(base_name), '[^a-zA-Z0-9]', '', 'g'));
        
        -- Ensure minimum length
        IF LENGTH(clean_base) < 3 THEN
            clean_base := clean_base || SUBSTRING(user_id::TEXT, 1, 8);
        END IF;
    END IF;
    
    -- Limit length to 15 characters to leave room for counter
    clean_base := SUBSTRING(clean_base, 1, 15);
    
    candidate_username := clean_base;
    
    -- Keep trying until we find a unique username
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = candidate_username AND id != user_id) LOOP
        counter := counter + 1;
        candidate_username := clean_base || counter::TEXT;
        
        -- Prevent infinite loop
        IF counter > 1000 THEN
            candidate_username := 'user' || SUBSTRING(user_id::TEXT, 1, 8) || counter::TEXT;
            EXIT;
        END IF;
    END LOOP;
    
    RAISE LOG 'Generated username: %', candidate_username;
    RETURN candidate_username;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in generate_unique_username: %', SQLERRM;
        -- Return a fallback username
        RETURN 'user' || SUBSTRING(user_id::TEXT, 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Create a robust user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    generated_username TEXT;
    user_full_name TEXT;
    first_name_val TEXT;
    last_name_val TEXT;
BEGIN
    -- Log the trigger execution
    RAISE LOG 'handle_new_user triggered for user: %, email: %', NEW.id, NEW.email;
    
    -- Extract metadata values safely
    first_name_val := NEW.raw_user_meta_data->>'first_name';
    last_name_val := NEW.raw_user_meta_data->>'last_name';
    
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

    -- Generate full name safely
    user_full_name := NULL;
    IF first_name_val IS NOT NULL AND last_name_val IS NOT NULL THEN
        user_full_name := first_name_val || ' ' || last_name_val;
    ELSIF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
        user_full_name := NEW.raw_user_meta_data->>'full_name';
    ELSIF NEW.raw_user_meta_data->>'name' IS NOT NULL THEN
        user_full_name := NEW.raw_user_meta_data->>'name';
    END IF;

    -- Log what we're about to insert
    RAISE LOG 'Inserting user with username: %, full_name: %', generated_username, user_full_name;

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
        first_name_val,
        last_name_val,
        'user',
        true,
        NOW(),
        NOW()
    );
    
    RAISE LOG 'Successfully inserted user: %', NEW.id;
    RETURN NEW;
    
EXCEPTION
    WHEN unique_violation THEN
        RAISE LOG 'Unique violation in handle_new_user for user %: %', NEW.id, SQLERRM;
        -- Try to update existing record
        UPDATE public.users SET
            email = NEW.email,
            updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log the detailed error
        RAISE LOG 'Error in handle_new_user for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
        -- Re-raise with user-friendly message
        RAISE EXCEPTION 'Database error saving new user. Please try again or contact support. Error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_unique_username(TEXT, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, anon, service_role;

-- Test the functions (this will help us see if there are any immediate issues)
DO $$
BEGIN
    -- Test username generation
    PERFORM generate_unique_username('test', '00000000-0000-0000-0000-000000000000'::UUID);
    RAISE LOG 'Username generation test passed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Username generation test failed: %', SQLERRM;
END $$;
