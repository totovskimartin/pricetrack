-- Complete fix for price suggestion functionality
-- Run this in your Supabase SQL Editor

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

-- Step 2: Fix the trigger function to avoid format() error
DROP FUNCTION IF EXISTS notify_admin_price_suggestion();
CREATE OR REPLACE FUNCTION notify_admin_price_suggestion()
RETURNS TRIGGER AS $$
DECLARE
    product_name TEXT;
    user_name TEXT;
    supermarket_name TEXT;
BEGIN
    -- Get related information
    SELECT name INTO product_name
    FROM public.products
    WHERE id = NEW.product_id;

    SELECT COALESCE(full_name, username, email) INTO user_name
    FROM public.users
    WHERE id = NEW.suggested_by;

    SELECT name INTO supermarket_name
    FROM public.supermarkets
    WHERE id = NEW.supermarket_id;

    -- Create notification for admins using string concatenation instead of format()
    PERFORM create_admin_notification(
        'price_suggestion',
        'Ново предложение за цена',
        'Потребител ' || COALESCE(user_name, 'Неизвестен') || ' предложи цена ' || NEW.suggested_price_bgn::text || ' лв. за "' || COALESCE(product_name, 'Неизвестен продукт') || '" в ' || COALESCE(supermarket_name, 'Неизвестен магазин'),
        jsonb_build_object(
            'price_suggestion_id', NEW.id,
            'product_id', NEW.product_id,
            'product_name', product_name,
            'supermarket_id', NEW.supermarket_id,
            'supermarket_name', supermarket_name,
            'suggested_price', NEW.suggested_price_bgn,
            'current_price', NEW.current_price_bgn,
            'user_id', NEW.suggested_by,
            'user_name', user_name
        ),
        NEW.id,
        'price_suggestion',
        'admin'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate the trigger
DROP TRIGGER IF EXISTS price_suggestion_notification_trigger ON public.price_suggestions;
CREATE TRIGGER price_suggestion_notification_trigger
    AFTER INSERT ON public.price_suggestions
    FOR EACH ROW EXECUTE FUNCTION notify_admin_price_suggestion();

-- Step 4: Verify the fix by checking if everything is set up correctly
SELECT 'Test user exists:' as check_type, count(*) as result
FROM public.users
WHERE id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Trigger function exists:' as check_type, count(*) as result
FROM information_schema.routines
WHERE routine_name = 'notify_admin_price_suggestion'
UNION ALL
SELECT 'Trigger exists:' as check_type, count(*) as result
FROM information_schema.triggers
WHERE trigger_name = 'price_suggestion_notification_trigger';
