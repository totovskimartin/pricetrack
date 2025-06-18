-- Add comprehensive admin notification triggers
-- Run this in your Supabase SQL Editor

-- 0. First, update the admin_notifications table to allow new notification types
ALTER TABLE public.admin_notifications
DROP CONSTRAINT IF EXISTS admin_notifications_type_check;

ALTER TABLE public.admin_notifications
ADD CONSTRAINT admin_notifications_type_check
CHECK (type IN ('price_suggestion', 'new_user', 'new_product', 'new_discussion', 'new_comment', 'system_alert'));

-- 1. Trigger for New User Registrations
CREATE OR REPLACE FUNCTION notify_admin_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for admins when a new user registers
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new users
DROP TRIGGER IF EXISTS new_user_notification_trigger ON public.users;
CREATE TRIGGER new_user_notification_trigger
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION notify_admin_new_user();

-- 2. Trigger for New Product Submissions
CREATE OR REPLACE FUNCTION notify_admin_new_product()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Get user name
    SELECT COALESCE(full_name, username, email) INTO user_name
    FROM public.users
    WHERE id = NEW.created_by;
    
    -- Create notification for admins when a new product is submitted
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new products (only for unapproved products)
DROP TRIGGER IF EXISTS new_product_notification_trigger ON public.products;
CREATE TRIGGER new_product_notification_trigger
    AFTER INSERT ON public.products
    FOR EACH ROW 
    WHEN (NEW.is_approved = false)
    EXECUTE FUNCTION notify_admin_new_product();

-- 3. Trigger for New Discussion Submissions
CREATE OR REPLACE FUNCTION notify_admin_new_discussion()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Get user name
    SELECT COALESCE(full_name, username, email) INTO user_name
    FROM public.users
    WHERE id = NEW.created_by;
    
    -- Create notification for admins when a new discussion is submitted
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new discussions (only for unapproved discussions)
DROP TRIGGER IF EXISTS new_discussion_notification_trigger ON public.discussions;
CREATE TRIGGER new_discussion_notification_trigger
    AFTER INSERT ON public.discussions
    FOR EACH ROW 
    WHEN (NEW.is_approved = false)
    EXECUTE FUNCTION notify_admin_new_discussion();

-- 4. Trigger for New Comments
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
    
    -- Create notification for admins when a new comment is posted
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new comments (only for unapproved comments)
DROP TRIGGER IF EXISTS new_comment_notification_trigger ON public.discussion_comments;
CREATE TRIGGER new_comment_notification_trigger
    AFTER INSERT ON public.discussion_comments
    FOR EACH ROW 
    WHEN (NEW.is_approved = false)
    EXECUTE FUNCTION notify_admin_new_comment();

-- 5. Test the triggers by checking if they were created successfully
SELECT 'Triggers Created Successfully' as status,
       trigger_name,
       event_manipulation,
       event_object_table
FROM information_schema.triggers 
WHERE trigger_name IN (
    'new_user_notification_trigger',
    'new_product_notification_trigger', 
    'new_discussion_notification_trigger',
    'new_comment_notification_trigger'
)
ORDER BY trigger_name;
