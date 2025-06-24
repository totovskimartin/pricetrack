-- Temporarily disable the problematic trigger to allow user registration
-- We'll handle user creation manually in the application code

-- 1. Drop the trigger that's causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Keep the function for potential future use but don't trigger it automatically
-- The function is still there, we just won't auto-trigger it

-- 3. Add a comment for future reference
COMMENT ON FUNCTION public.handle_new_user() IS 'User creation function - currently disabled due to trigger issues. User creation handled manually in application code.';

-- 4. Log the change
DO $$
BEGIN
    RAISE LOG 'User creation trigger disabled temporarily. User creation will be handled manually in application code.';
END $$;
