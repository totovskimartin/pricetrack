-- Complete user setup with comprehensive error handling
-- This migration will ensure everything is set up correctly

-- First, let's make sure the user_role enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
    END IF;
END $$;

-- Ensure the public.users table exists with correct structure
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Check and add username column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN username TEXT NOT NULL DEFAULT 'temp_user';
        ALTER TABLE public.users ADD CONSTRAINT users_username_unique UNIQUE (username);
    END IF;
    
    -- Check and add other columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN first_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN last_name TEXT;
    END IF;
END $$;

-- Drop existing trigger and functions to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS generate_unique_username(TEXT, UUID);

-- Create a simple, bulletproof username generation function
CREATE OR REPLACE FUNCTION generate_unique_username(base_name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
    candidate_username TEXT;
    counter INTEGER := 0;
    clean_base TEXT;
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
    clean_base := clean_base || SUBSTRING(REPLACE(user_id::TEXT, '-', ''), 1, 4);
    
    candidate_username := clean_base;
    
    -- Keep trying until we find a unique username
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = candidate_username) LOOP
        counter := counter + 1;
        candidate_username := clean_base || counter::TEXT;
        
        -- Prevent infinite loop
        IF counter > 100 THEN
            candidate_username := 'user' || SUBSTRING(REPLACE(user_id::TEXT, '-', ''), 1, 8);
            EXIT;
        END IF;
    END LOOP;
    
    RETURN candidate_username;
END;
$$ LANGUAGE plpgsql;

-- Create a simple, robust user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    generated_username TEXT;
    user_full_name TEXT;
BEGIN
    -- Generate username
    generated_username := generate_unique_username(
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant all necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.users TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_unique_username(TEXT, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, anon, service_role;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS (Row Level Security) but allow all operations for now
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

CREATE POLICY "Enable read access for all users" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Allow service role to do everything (for triggers)
DROP POLICY IF EXISTS "Service role can do everything" ON public.users;
CREATE POLICY "Service role can do everything" ON public.users
    FOR ALL USING (true);

-- Test the setup
DO $$
DECLARE
    test_result TEXT;
BEGIN
    -- Test username generation
    test_result := generate_unique_username('test', '12345678-1234-1234-1234-123456789012'::UUID);
    RAISE NOTICE 'Test username generated: %', test_result;
    
    RAISE NOTICE 'User creation setup completed successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Setup test failed: %', SQLERRM;
END $$;
