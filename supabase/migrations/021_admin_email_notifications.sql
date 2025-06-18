-- Migration: Add email notification support for admin price suggestions
-- This migration adds email notification functionality when price suggestions are submitted

-- 1. Create a function to handle admin email notifications for price suggestions
CREATE OR REPLACE FUNCTION notify_admin_price_suggestion_email()
RETURNS TRIGGER AS $$
DECLARE
    product_name TEXT;
    supermarket_name TEXT;
    user_name TEXT;
    admin_record RECORD;
    notification_payload JSONB;
BEGIN
    -- Get product name
    SELECT name INTO product_name
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- Get supermarket name
    SELECT name INTO supermarket_name
    FROM public.supermarkets
    WHERE id = NEW.supermarket_id;
    
    -- Get user name
    SELECT COALESCE(full_name, username, email) INTO user_name
    FROM public.users
    WHERE id = NEW.suggested_by;
    
    -- Create notification payload
    notification_payload := jsonb_build_object(
        'type', 'admin_price_suggestion_email',
        'suggestion_id', NEW.id,
        'product_id', NEW.product_id,
        'product_name', COALESCE(product_name, 'Неизвестен продукт'),
        'supermarket_id', NEW.supermarket_id,
        'supermarket_name', COALESCE(supermarket_name, 'Неизвестен магазин'),
        'suggested_price', NEW.suggested_price_bgn,
        'current_price', NEW.current_price_bgn,
        'notes', NEW.notes,
        'user_id', NEW.suggested_by,
        'user_name', COALESCE(user_name, 'Неизвестен потребител'),
        'created_at', NEW.created_at
    );
    
    -- Send notification to external service (this would be handled by your application)
    -- For now, we'll insert into a queue table that your application can process
    INSERT INTO public.email_notification_queue (
        type,
        recipient_type,
        payload,
        status,
        created_at
    ) VALUES (
        'admin_price_suggestion',
        'admin',
        notification_payload,
        'pending',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create email notification queue table
CREATE TABLE IF NOT EXISTS public.email_notification_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    recipient_type VARCHAR(20) NOT NULL, -- 'user', 'admin', 'all'
    recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL for admin/all types
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- 'pending', 'sent', 'failed', 'cancelled'
    attempts INTEGER DEFAULT 0 NOT NULL,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Create indexes for the email notification queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_type ON public.email_notification_queue(type);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_notification_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_recipient ON public.email_notification_queue(recipient_type, recipient_id);

-- 4. Create trigger for price suggestion email notifications
CREATE TRIGGER price_suggestion_email_notification_trigger
    AFTER INSERT ON public.price_suggestions
    FOR EACH ROW EXECUTE FUNCTION notify_admin_price_suggestion_email();

-- 5. Add email notification preferences to users table (if not exists)
DO $$
BEGIN
    -- Check if notification_preferences column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'notification_preferences'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN notification_preferences JSONB DEFAULT '{}';
    END IF;
END $$;

-- 6. Function to mark email notifications as sent
CREATE OR REPLACE FUNCTION mark_email_notification_sent(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.email_notification_queue
    SET 
        status = 'sent',
        last_attempt_at = NOW(),
        updated_at = NOW()
    WHERE id = notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to mark email notifications as failed
CREATE OR REPLACE FUNCTION mark_email_notification_failed(
    notification_id UUID,
    error_msg TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.email_notification_queue
    SET 
        status = 'failed',
        attempts = attempts + 1,
        last_attempt_at = NOW(),
        error_message = error_msg,
        updated_at = NOW()
    WHERE id = notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to get pending email notifications
CREATE OR REPLACE FUNCTION get_pending_email_notifications(
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    type VARCHAR(50),
    recipient_type VARCHAR(20),
    recipient_id UUID,
    payload JSONB,
    attempts INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.type,
        n.recipient_type,
        n.recipient_id,
        n.payload,
        n.attempts,
        n.created_at
    FROM public.email_notification_queue n
    WHERE n.status = 'pending'
    AND n.attempts < 3 -- Max 3 attempts
    ORDER BY n.created_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to clean up old email notifications
CREATE OR REPLACE FUNCTION cleanup_old_email_notifications(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.email_notification_queue
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND status IN ('sent', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Set up RLS policies for email notification queue
ALTER TABLE public.email_notification_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can access the email notification queue
CREATE POLICY "Admins can access email notification queue" ON public.email_notification_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'moderator')
            AND users.is_active = true
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_notification_queue TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
