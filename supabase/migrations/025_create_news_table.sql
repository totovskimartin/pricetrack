-- Create news/announcements table for admin management
-- This allows administrators to manage the "latest news" section on the dashboard

-- 1. Create news table
CREATE TABLE IF NOT EXISTS public.news (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general' NOT NULL CHECK (type IN ('general', 'announcement', 'system', 'euro_transition', 'feature')),
    priority INTEGER DEFAULT 0 NOT NULL, -- Higher numbers = higher priority
    is_active BOOLEAN DEFAULT true NOT NULL,
    
    -- Styling options for different news types
    border_color VARCHAR(20) DEFAULT 'blue' CHECK (border_color IN ('blue', 'yellow', 'green', 'red', 'purple', 'orange')),
    text_color VARCHAR(20) DEFAULT 'blue' CHECK (text_color IN ('blue', 'yellow', 'green', 'red', 'purple', 'orange')),
    
    -- Publishing schedule
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL means never expires
    
    -- Metadata
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_active_published ON public.news(is_active, published_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_news_priority ON public.news(priority DESC, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_expires_at ON public.news(expires_at) WHERE expires_at IS NOT NULL;

-- 3. Create RLS policies
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active, published news
CREATE POLICY "Anyone can read active news" ON public.news
    FOR SELECT USING (
        is_active = true 
        AND published_at <= NOW() 
        AND (expires_at IS NULL OR expires_at > NOW())
    );

-- Only admins can manage news
CREATE POLICY "Admins can manage news" ON public.news
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'moderator')
        )
    );

-- 4. Create function to get active news
CREATE OR REPLACE FUNCTION public.get_active_news()
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    content TEXT,
    type VARCHAR(50),
    priority INTEGER,
    border_color VARCHAR(20),
    text_color VARCHAR(20),
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        n.id,
        n.title,
        n.content,
        n.type,
        n.priority,
        n.border_color,
        n.text_color,
        n.published_at,
        n.expires_at
    FROM public.news n
    WHERE n.is_active = true 
        AND n.published_at <= NOW() 
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY n.priority DESC, n.published_at DESC
    LIMIT 10;
$$;

-- 5. Insert some default news items (replacing the hardcoded ones)
INSERT INTO public.news (title, content, type, priority, border_color, text_color) VALUES
(
    'Дата на приемане на Евро: 1 януари 2026 г.',
    'Следете промените в цените на продуктите преди и след преминаването към Евро.',
    'euro_transition',
    10,
    'yellow',
    'yellow'
),
(
    'Нова функционалност',
    'Сега можете да сравнявате цени между различни супермаркети в реално време.',
    'feature',
    5,
    'blue',
    'blue'
);

-- 6. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_news_updated_at_trigger
    BEFORE UPDATE ON public.news
    FOR EACH ROW
    EXECUTE FUNCTION public.update_news_updated_at();

-- 7. Grant necessary permissions
GRANT SELECT ON public.news TO anon, authenticated;
GRANT ALL ON public.news TO service_role;
