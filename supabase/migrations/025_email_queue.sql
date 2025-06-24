-- Email Queue System
-- This migration creates the email queue table and related functionality

-- Create email queue table
CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    email_type TEXT NOT NULL CHECK (email_type IN ('price_alert', 'admin_notification', 'welcome', 'system')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attempts INTEGER DEFAULT 0 NOT NULL,
    max_attempts INTEGER DEFAULT 3 NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON public.email_queue(priority);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_for ON public.email_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_email_type ON public.email_queue(email_type);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at);

-- Create composite index for queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_processing 
ON public.email_queue(status, priority DESC, created_at ASC) 
WHERE status = 'pending';

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_queue_updated_at
    BEFORE UPDATE ON public.email_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_email_queue_updated_at();

-- Email statistics table for tracking delivery metrics
CREATE TABLE IF NOT EXISTS public.email_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    email_type TEXT NOT NULL,
    total_sent INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(date, email_type)
);

-- Create indexes for email stats
CREATE INDEX IF NOT EXISTS idx_email_stats_date ON public.email_stats(date);
CREATE INDEX IF NOT EXISTS idx_email_stats_type ON public.email_stats(email_type);

-- User email preferences table
CREATE TABLE IF NOT EXISTS public.user_email_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    price_alerts_enabled BOOLEAN DEFAULT true NOT NULL,
    admin_notifications_enabled BOOLEAN DEFAULT true NOT NULL,
    marketing_emails_enabled BOOLEAN DEFAULT false NOT NULL,
    email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'never')),
    unsubscribe_token TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- Generate unsubscribe token function
CREATE OR REPLACE FUNCTION generate_unsubscribe_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unsubscribe_token IS NULL THEN
        NEW.unsubscribe_token = encode(gen_random_bytes(32), 'hex');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_unsubscribe_token
    BEFORE INSERT ON public.user_email_preferences
    FOR EACH ROW
    EXECUTE FUNCTION generate_unsubscribe_token();

-- Update timestamp trigger for email preferences
CREATE TRIGGER trigger_user_email_preferences_updated_at
    BEFORE UPDATE ON public.user_email_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_email_queue_updated_at();

-- Create indexes for user email preferences
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_user_id ON public.user_email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_token ON public.user_email_preferences(unsubscribe_token);

-- RLS Policies
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- Email queue policies (admin only)
CREATE POLICY "Admins can view email queue" ON public.email_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can manage email queue" ON public.email_queue
    FOR ALL USING (auth.role() = 'service_role');

-- Email stats policies (admin only)
CREATE POLICY "Admins can view email stats" ON public.email_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can manage email stats" ON public.email_stats
    FOR ALL USING (auth.role() = 'service_role');

-- User email preferences policies
CREATE POLICY "Users can view own email preferences" ON public.user_email_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences" ON public.user_email_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email preferences" ON public.user_email_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage email preferences" ON public.user_email_preferences
    FOR ALL USING (auth.role() = 'service_role');

-- Function to get user email preferences with defaults
CREATE OR REPLACE FUNCTION get_user_email_preferences(user_uuid UUID)
RETURNS TABLE (
    price_alerts_enabled BOOLEAN,
    admin_notifications_enabled BOOLEAN,
    marketing_emails_enabled BOOLEAN,
    email_frequency TEXT,
    unsubscribe_token TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(uep.price_alerts_enabled, true) as price_alerts_enabled,
        COALESCE(uep.admin_notifications_enabled, true) as admin_notifications_enabled,
        COALESCE(uep.marketing_emails_enabled, false) as marketing_emails_enabled,
        COALESCE(uep.email_frequency, 'immediate') as email_frequency,
        uep.unsubscribe_token
    FROM public.user_email_preferences uep
    WHERE uep.user_id = user_uuid
    UNION ALL
    SELECT true, true, false, 'immediate', NULL
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_email_preferences 
        WHERE user_id = user_uuid
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default email preferences for new users
CREATE OR REPLACE FUNCTION create_default_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_email_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default email preferences for new users
CREATE TRIGGER trigger_create_default_email_preferences
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_email_preferences();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.user_email_preferences TO anon, authenticated;
GRANT INSERT, UPDATE ON public.user_email_preferences TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.email_queue IS 'Queue for outgoing emails with retry logic';
COMMENT ON TABLE public.email_stats IS 'Email delivery and engagement statistics';
COMMENT ON TABLE public.user_email_preferences IS 'User preferences for email notifications';
COMMENT ON FUNCTION get_user_email_preferences(UUID) IS 'Get user email preferences with fallback to defaults';
COMMENT ON FUNCTION create_default_email_preferences() IS 'Create default email preferences for new users';
