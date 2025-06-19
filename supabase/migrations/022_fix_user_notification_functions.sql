-- Fix user notification functions that were overwritten by admin notifications migration
-- This migration restores the user notification functions and creates separate admin functions

-- 1. Create separate function for admin notifications
DROP FUNCTION IF EXISTS mark_admin_notification_read(UUID, UUID);
CREATE OR REPLACE FUNCTION mark_admin_notification_read(
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

-- 2. Restore the user notification function (overwrites the admin one)
DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID);
CREATE OR REPLACE FUNCTION mark_notification_read(
    notification_id UUID, 
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications 
    SET is_read = true, updated_at = timezone('utc'::text, now())
    WHERE id = notification_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create separate function for admin notification count
DROP FUNCTION IF EXISTS get_admin_unread_notifications_count(TEXT);
CREATE OR REPLACE FUNCTION get_admin_unread_notifications_count(p_user_role TEXT)
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

-- 4. Ensure user notification functions exist and are correct
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM public.notifications
    WHERE user_id = p_user_id AND is_read = false;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.notifications 
    SET is_read = true, updated_at = timezone('utc'::text, now())
    WHERE user_id = p_user_id AND is_read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to mark all admin notifications as read
DROP FUNCTION IF EXISTS mark_all_admin_notifications_read(UUID, TEXT);
CREATE OR REPLACE FUNCTION mark_all_admin_notifications_read(
    p_user_id UUID,
    p_user_role TEXT
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.admin_notifications 
    SET 
        is_read = true, 
        read_at = NOW(),
        read_by = p_user_id
    WHERE is_read = false
    AND (
        (p_user_role = 'admin' AND created_for_role IN ('admin', 'moderator')) OR
        (p_user_role = 'super_admin' AND created_for_role IN ('admin', 'super_admin', 'moderator')) OR
        (p_user_role = 'moderator' AND created_for_role = 'moderator')
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_admin_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_unread_notifications_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_admin_notifications_read TO authenticated;
