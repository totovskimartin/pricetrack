-- Alternative: Temporarily disable the price suggestion trigger to test if it's causing the error
-- Run this in your Supabase SQL Editor if the main fix doesn't work

-- Step 1: Create test user if it doesn't exist
INSERT INTO public.users (
    id,
    email,
    username,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'testuser@pricetrack.bg',
    'testuser',
    'Test User',
    'user',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Disable the problematic trigger temporarily
DROP TRIGGER IF EXISTS price_suggestion_notification_trigger ON public.price_suggestions;

-- Step 3: Create a simple trigger that just logs without notifications (optional)
CREATE OR REPLACE FUNCTION simple_price_suggestion_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Just log the insertion without creating notifications
    RAISE NOTICE 'Price suggestion inserted: % for product % in supermarket %',
                 NEW.suggested_price_bgn, NEW.product_id, NEW.supermarket_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a simple trigger for testing (optional)
CREATE TRIGGER simple_price_suggestion_trigger
    AFTER INSERT ON public.price_suggestions
    FOR EACH ROW EXECUTE FUNCTION simple_price_suggestion_log();

-- Verify the setup
SELECT 'Test user exists:' as check_type, count(*) as result
FROM public.users
WHERE id = '00000000-0000-0000-0000-000000000001';
