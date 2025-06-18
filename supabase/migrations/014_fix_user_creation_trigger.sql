-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS generate_unique_username(TEXT, UUID);

-- Create a simpler username generation function
CREATE OR REPLACE FUNCTION generate_unique_username(base_name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
    candidate_username TEXT;
    counter INTEGER := 0;
BEGIN
    -- Clean the base name: remove spaces, convert to lowercase, remove special chars
    base_name := LOWER(REGEXP_REPLACE(COALESCE(base_name, ''), '[^a-zA-Z0-9]', '', 'g'));
    
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

-- Create a simpler user creation function
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
    user_full_name := NULL;
    IF NEW.raw_user_meta_data->>'first_name' IS NOT NULL AND NEW.raw_user_meta_data->>'last_name' IS NOT NULL THEN
        user_full_name := NEW.raw_user_meta_data->>'first_name' || ' ' || NEW.raw_user_meta_data->>'last_name';
    ELSIF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
        user_full_name := NEW.raw_user_meta_data->>'full_name';
    ELSIF NEW.raw_user_meta_data->>'name' IS NOT NULL THEN
        user_full_name := NEW.raw_user_meta_data->>'name';
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
        is_active
    )
    VALUES (
        NEW.id,
        NEW.email,
        generated_username,
        user_full_name,
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
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error (this will appear in Supabase logs)
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        -- Re-raise the exception so registration fails with a clear error
        RAISE EXCEPTION 'Database error saving new user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_unique_username(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_unique_username(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Ensure the service role can execute these functions
GRANT EXECUTE ON FUNCTION generate_unique_username(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
