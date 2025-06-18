-- Update username generation to be more user-friendly
-- Only add numbers when there are conflicts, no UUID characters

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
        clean_base := LOWER(REGEXP_REPLACE(TRIM(base_name), '[^a-zA-Z0-9_]', '', 'g'));
        
        -- Ensure minimum length
        IF LENGTH(clean_base) < 3 THEN
            clean_base := 'user';
        END IF;
    END IF;
    
    -- Limit length to 20 characters (no need to reserve space for UUID)
    clean_base := SUBSTRING(clean_base, 1, 20);
    
    -- Start with the clean base name (no UUID characters)
    candidate_username := clean_base;
    
    -- Check if the base username is available
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE username = candidate_username) THEN
        RETURN candidate_username;
    END IF;
    
    -- If not available, try adding numbers
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = candidate_username) LOOP
        counter := counter + 1;
        candidate_username := clean_base || counter::text;
        
        -- Prevent infinite loop
        IF counter > 999 THEN
            -- Fallback to UUID-based username only if really needed
            candidate_username := 'user' || SUBSTRING(REPLACE(user_id::text, '-', ''), 1, 8);
            EXIT;
        END IF;
    END LOOP;
    
    RETURN candidate_username;
END;
$$;

-- Test the updated function
DO $$
DECLARE
    test_username text;
BEGIN
    -- Test with a clean username
    SELECT public.generate_unique_username('ivan_marinov', '12345678-1234-1234-1234-123456789012'::uuid) INTO test_username;
    RAISE NOTICE 'Clean username test: %', test_username;
    
    -- Test with empty input
    SELECT public.generate_unique_username('', '12345678-1234-1234-1234-123456789012'::uuid) INTO test_username;
    RAISE NOTICE 'Empty input test: %', test_username;
    
    RAISE NOTICE 'Username generation update completed successfully!';
END $$;
