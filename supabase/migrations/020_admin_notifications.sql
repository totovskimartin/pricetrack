-- Admin Notifications Migration
-- This migration adds admin notification system for price suggestions

-- 1. Create admin_notifications table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('price_suggestion', 'new_user', 'new_discussion', 'new_comment', 'system_alert')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data related to the notification
    target_id UUID, -- ID of the related entity (price_suggestion_id, user_id, etc.)
    target_type TEXT, -- Type of the related entity
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_for_role TEXT DEFAULT 'admin' CHECK (created_for_role IN ('admin', 'super_admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    read_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 2. Add indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_for_role ON public.admin_notifications(created_for_role);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_target ON public.admin_notifications(target_type, target_id);

-- 3. Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for admin_notifications
DROP POLICY IF EXISTS "Admins can view notifications for their role" ON public.admin_notifications;
CREATE POLICY "Admins can view notifications for their role" ON public.admin_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND (
                (role = 'admin' AND created_for_role IN ('admin', 'moderator')) OR
                (role = 'super_admin' AND created_for_role IN ('admin', 'super_admin', 'moderator')) OR
                (role = 'moderator' AND created_for_role = 'moderator')
            )
        )
    );

DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update notifications" ON public.admin_notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'moderator')
        )
    );

-- 5. Function to create admin notification
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

-- 6. Function to mark notification as read
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

-- 7. Function to get unread notification count for user role
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

-- 8. Trigger function to create notification when price suggestion is submitted
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

-- 9. Create trigger for price suggestions
DROP TRIGGER IF EXISTS price_suggestion_notification_trigger ON public.price_suggestions;
CREATE TRIGGER price_suggestion_notification_trigger
    AFTER INSERT ON public.price_suggestions
    FOR EACH ROW EXECUTE FUNCTION notify_admin_price_suggestion();

-- 10. Function to clean up old notifications (optional, for maintenance)
DROP FUNCTION IF EXISTS cleanup_old_notifications(INTEGER);
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.admin_notifications
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND is_read = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
