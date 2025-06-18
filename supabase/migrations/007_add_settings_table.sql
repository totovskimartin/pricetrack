-- Create settings table for system configuration
CREATE TABLE public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'string' CHECK (type IN ('string', 'boolean', 'number', 'json')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX idx_settings_key ON public.settings(key);

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings
CREATE POLICY "Anyone can view settings" ON public.settings
    FOR SELECT USING (true);

CREATE POLICY "Only super admins can manage settings" ON public.settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON public.settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO public.settings (key, value, description, type) VALUES
('discussions_require_approval', 'true', 'Whether new discussions require admin approval before being published', 'boolean'),
('comments_require_approval', 'true', 'Whether new comments require admin approval before being published', 'boolean'),
('products_require_approval', 'true', 'Whether user-submitted products require admin approval', 'boolean'),
('allow_anonymous_discussions', 'false', 'Whether anonymous users can create discussions', 'boolean'),
('allow_anonymous_comments', 'false', 'Whether anonymous users can post comments', 'boolean'),
('max_comment_length', '2000', 'Maximum length for comments in characters', 'number'),
('max_discussion_length', '10000', 'Maximum length for discussion content in characters', 'number'),
('site_name', 'PriceTrack BG', 'Name of the website', 'string'),
('site_description', 'Проследяване на цени в български супермаркети', 'Description of the website', 'string'),
('enable_email_notifications', 'true', 'Whether to send email notifications for various events', 'boolean');

-- Create function to get setting value
CREATE OR REPLACE FUNCTION get_setting(setting_key TEXT)
RETURNS TEXT AS $$
DECLARE
    setting_value TEXT;
BEGIN
    SELECT value INTO setting_value 
    FROM public.settings 
    WHERE key = setting_key;
    
    RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update setting value
CREATE OR REPLACE FUNCTION update_setting(setting_key TEXT, setting_value TEXT, user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.settings 
    SET value = setting_value, 
        updated_at = timezone('utc'::text, now()),
        updated_by = user_id
    WHERE key = setting_key;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
