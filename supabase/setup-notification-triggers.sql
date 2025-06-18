-- Complete setup for admin notification triggers
-- Run this in your Supabase SQL Editor

-- 1. First, ensure the admin_notifications table allows all notification types
ALTER TABLE public.admin_notifications 
DROP CONSTRAINT IF EXISTS admin_notifications_type_check;

ALTER TABLE public.admin_notifications 
ADD CONSTRAINT admin_notifications_type_check 
CHECK (type IN ('price_suggestion', 'new_user', 'new_product', 'new_discussion', 'new_comment', 'system_alert'));

-- 2. Create the create_admin_notification function if it doesn't exist
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

-- 3. Create trigger function for new user registrations
CREATE OR REPLACE FUNCTION notify_admin_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification for regular users, not admin accounts
    IF COALESCE(NEW.role, 'user') = 'user' AND NEW.email IS NOT NULL THEN
        BEGIN
            PERFORM create_admin_notification(
                'new_user',
                'Нов потребител се регистрира',
                'Потребител ' || COALESCE(NEW.full_name, NEW.username, NEW.email) || ' се регистрира в системата',
                jsonb_build_object(
                    'user_id', NEW.id,
                    'user_email', NEW.email,
                    'user_name', COALESCE(NEW.full_name, NEW.username),
                    'registration_date', NEW.created_at
                ),
                NEW.id,
                'user',
                'admin'
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the user registration
                RAISE WARNING 'Failed to create admin notification for new user %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger function for new product submissions
CREATE OR REPLACE FUNCTION notify_admin_new_product()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Get user name
    SELECT COALESCE(full_name, username, email) INTO user_name
    FROM public.users
    WHERE id = NEW.created_by;
    
    -- Create notification for admins when a new product is submitted for approval
    BEGIN
        PERFORM create_admin_notification(
            'new_product',
            'Нов продукт за одобрение',
            'Потребител ' || COALESCE(user_name, 'Неизвестен') || ' добави продукт "' || NEW.name || '" за одобрение',
            jsonb_build_object(
                'product_id', NEW.id,
                'product_name', NEW.name,
                'product_brand', NEW.brand,
                'product_category', NEW.category,
                'user_id', NEW.created_by,
                'user_name', user_name,
                'is_approved', NEW.is_approved
            ),
            NEW.id,
            'product',
            'admin'
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create admin notification for new product %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger function for new discussion submissions
CREATE OR REPLACE FUNCTION notify_admin_new_discussion()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Get user name
    SELECT COALESCE(full_name, username, email) INTO user_name
    FROM public.users
    WHERE id = NEW.created_by;
    
    -- Create notification for admins when a new discussion is submitted for approval
    BEGIN
        PERFORM create_admin_notification(
            'new_discussion',
            'Нова дискусия за одобрение',
            'Потребител ' || COALESCE(user_name, 'Неизвестен') || ' създаде дискусия "' || NEW.title || '" за одобрение',
            jsonb_build_object(
                'discussion_id', NEW.id,
                'discussion_title', NEW.title,
                'discussion_category', NEW.category,
                'user_id', NEW.created_by,
                'user_name', user_name,
                'is_approved', NEW.is_approved
            ),
            NEW.id,
            'discussion',
            'admin'
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create admin notification for new discussion %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger function for new comments
CREATE OR REPLACE FUNCTION notify_admin_new_comment()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    discussion_title TEXT;
BEGIN
    -- Get user name
    SELECT COALESCE(full_name, username, email) INTO user_name
    FROM public.users
    WHERE id = NEW.created_by;
    
    -- Get discussion title
    SELECT title INTO discussion_title
    FROM public.discussions
    WHERE id = NEW.discussion_id;
    
    -- Create notification for admins when a new comment is posted for approval
    BEGIN
        PERFORM create_admin_notification(
            'new_comment',
            'Нов коментар за одобрение',
            'Потребител ' || COALESCE(user_name, 'Неизвестен') || ' добави коментар в дискусия "' || COALESCE(discussion_title, 'Неизвестна дискусия') || '"',
            jsonb_build_object(
                'comment_id', NEW.id,
                'discussion_id', NEW.discussion_id,
                'discussion_title', discussion_title,
                'comment_content', LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
                'user_id', NEW.created_by,
                'user_name', user_name,
                'is_approved', NEW.is_approved
            ),
            NEW.id,
            'comment',
            'admin'
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create admin notification for new comment %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create all triggers
DROP TRIGGER IF EXISTS new_user_notification_trigger ON public.users;
CREATE TRIGGER new_user_notification_trigger
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION notify_admin_new_user();

DROP TRIGGER IF EXISTS new_product_notification_trigger ON public.products;
CREATE TRIGGER new_product_notification_trigger
    AFTER INSERT ON public.products
    FOR EACH ROW 
    WHEN (NEW.is_approved = false)
    EXECUTE FUNCTION notify_admin_new_product();

DROP TRIGGER IF EXISTS new_discussion_notification_trigger ON public.discussions;
CREATE TRIGGER new_discussion_notification_trigger
    AFTER INSERT ON public.discussions
    FOR EACH ROW 
    WHEN (NEW.is_approved = false)
    EXECUTE FUNCTION notify_admin_new_discussion();

DROP TRIGGER IF EXISTS new_comment_notification_trigger ON public.discussion_comments;
CREATE TRIGGER new_comment_notification_trigger
    AFTER INSERT ON public.discussion_comments
    FOR EACH ROW 
    WHEN (NEW.is_approved = false)
    EXECUTE FUNCTION notify_admin_new_comment();

-- 8. Test that all triggers were created successfully
SELECT 'Notification Triggers Setup Complete' as status,
       trigger_name,
       event_manipulation,
       event_object_table
FROM information_schema.triggers 
WHERE trigger_name IN (
    'new_user_notification_trigger',
    'new_product_notification_trigger', 
    'new_discussion_notification_trigger',
    'new_comment_notification_trigger',
    'price_suggestion_notification_trigger'
)
ORDER BY trigger_name;

-- 9. Create a test notification to verify the system works
SELECT create_admin_notification(
    'system_alert'::TEXT,
    'Система за известия активирана'::TEXT,
    'Системата за административни известия е настроена успешно. Ще получавате известия за нови потребители, продукти, дискусии и коментари.'::TEXT,
    ('{"setup_date": "' || NOW()::text || '"}')::JSONB,
    NULL::UUID,
    NULL::TEXT,
    'admin'::TEXT
) as test_notification_id;
