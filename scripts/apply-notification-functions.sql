-- Apply only the functions and trigger for admin notifications

-- 1. Function to create admin notification
DROP FUNCTION IF EXISTS create_admin_notification(TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION create_admin_notification(
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_target_type TEXT DEFAULT NULL,
    p_created_for_role TEXT DEFAULT 'admin'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.admin_notifications (
        type,
        title,
        message,
        data,
        target_id,
        target_type,
        created_for_role
    ) VALUES (
        p_type,
        p_title,
        p_message,
        p_data,
        p_target_id,
        p_target_type,
        p_created_for_role
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to mark notification as read
DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID);
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.admin_notifications 
    SET 
        is_read = true,
        read_at = NOW(),
        read_by = p_user_id
    WHERE id = p_notification_id
    AND is_read = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get unread notification count for user role
DROP FUNCTION IF EXISTS get_unread_notifications_count(TEXT);
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_role TEXT)
RETURNS INTEGER AS $$
DECLARE
    count_result INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_result
    FROM public.admin_notifications
    WHERE is_read = false
    AND (
        (p_user_role = 'admin' AND created_for_role IN ('admin', 'moderator')) OR
        (p_user_role = 'super_admin' AND created_for_role IN ('admin', 'super_admin', 'moderator')) OR
        (p_user_role = 'moderator' AND created_for_role = 'moderator')
    );
    
    RETURN count_result;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger function to create notification when price suggestion is submitted
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
    
    -- Create notification for admins
    PERFORM create_admin_notification(
        'price_suggestion',
        'Ново предложение за цена',
        format('Потребител %s предложи цена %s лв. за "%s" в %s', 
               COALESCE(user_name, 'Неизвестен'), 
               NEW.suggested_price_bgn::text, 
               COALESCE(product_name, 'Неизвестен продукт'),
               COALESCE(supermarket_name, 'Неизвестен магазин')),
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

-- 5. Create trigger for price suggestions
DROP TRIGGER IF EXISTS price_suggestion_notification_trigger ON public.price_suggestions;
CREATE TRIGGER price_suggestion_notification_trigger
    AFTER INSERT ON public.price_suggestions
    FOR EACH ROW EXECUTE FUNCTION notify_admin_price_suggestion();
