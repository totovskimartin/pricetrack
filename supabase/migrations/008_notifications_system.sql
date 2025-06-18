-- Create notifications system for PriceTrack Bulgaria
-- This includes notifications for replies, reactions, and price changes

-- Create notification types enum
CREATE TYPE notification_type AS ENUM (
    'comment_reply',
    'discussion_reply', 
    'comment_like',
    'discussion_like',
    'price_drop',
    'price_increase',
    'product_approved',
    'discussion_approved',
    'comment_approved'
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    
    -- Related entity references (nullable for flexibility)
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    discussion_id UUID REFERENCES public.discussions(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
    price_id UUID REFERENCES public.prices(id) ON DELETE CASCADE,
    
    -- Additional data as JSON for flexibility
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user notification preferences table
CREATE TABLE public.user_notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Email notification preferences
    email_comment_replies BOOLEAN DEFAULT true NOT NULL,
    email_discussion_replies BOOLEAN DEFAULT true NOT NULL,
    email_likes BOOLEAN DEFAULT false NOT NULL,
    email_price_changes BOOLEAN DEFAULT true NOT NULL,
    email_approvals BOOLEAN DEFAULT true NOT NULL,
    
    -- In-app notification preferences
    app_comment_replies BOOLEAN DEFAULT true NOT NULL,
    app_discussion_replies BOOLEAN DEFAULT true NOT NULL,
    app_likes BOOLEAN DEFAULT true NOT NULL,
    app_price_changes BOOLEAN DEFAULT true NOT NULL,
    app_approvals BOOLEAN DEFAULT true NOT NULL,
    
    -- Price change thresholds
    price_drop_threshold_percent DECIMAL(5,2) DEFAULT 10.00, -- Notify on 10%+ price drops
    price_increase_threshold_percent DECIMAL(5,2) DEFAULT 20.00, -- Notify on 20%+ price increases
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for notification preferences
CREATE POLICY "Users can view own preferences" ON public.user_notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON public.notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at 
    BEFORE UPDATE ON public.user_notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type notification_type,
    p_title VARCHAR(255),
    p_message TEXT,
    p_product_id UUID DEFAULT NULL,
    p_discussion_id UUID DEFAULT NULL,
    p_comment_id UUID DEFAULT NULL,
    p_price_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    user_prefs RECORD;
BEGIN
    -- Get user preferences
    SELECT * INTO user_prefs 
    FROM public.user_notification_preferences 
    WHERE user_id = p_user_id;
    
    -- If no preferences exist, create default ones
    IF user_prefs IS NULL THEN
        INSERT INTO public.user_notification_preferences (user_id)
        VALUES (p_user_id);
        
        SELECT * INTO user_prefs 
        FROM public.user_notification_preferences 
        WHERE user_id = p_user_id;
    END IF;
    
    -- Check if user wants this type of notification
    CASE p_type
        WHEN 'comment_reply', 'discussion_reply' THEN
            IF NOT user_prefs.app_comment_replies THEN
                RETURN NULL;
            END IF;
        WHEN 'comment_like', 'discussion_like' THEN
            IF NOT user_prefs.app_likes THEN
                RETURN NULL;
            END IF;
        WHEN 'price_drop', 'price_increase' THEN
            IF NOT user_prefs.app_price_changes THEN
                RETURN NULL;
            END IF;
        WHEN 'product_approved', 'discussion_approved', 'comment_approved' THEN
            IF NOT user_prefs.app_approvals THEN
                RETURN NULL;
            END IF;
    END CASE;
    
    -- Create the notification
    INSERT INTO public.notifications (
        user_id, type, title, message, 
        product_id, discussion_id, comment_id, price_id, metadata
    )
    VALUES (
        p_user_id, p_type, p_title, p_message,
        p_product_id, p_discussion_id, p_comment_id, p_price_id, p_metadata
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications 
    SET is_read = true, updated_at = timezone('utc'::text, now())
    WHERE id = notification_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
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

-- Function to get unread notification count
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
