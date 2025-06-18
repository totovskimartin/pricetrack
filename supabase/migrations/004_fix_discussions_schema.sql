-- Check if columns exist and add them if missing
DO $$ 
BEGIN
    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'discussions' AND column_name = 'category') THEN
        ALTER TABLE public.discussions ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'Общи';
    END IF;
    
    -- Add slug column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'discussions' AND column_name = 'slug') THEN
        ALTER TABLE public.discussions ADD COLUMN slug VARCHAR(250) NOT NULL DEFAULT '';
    END IF;
    
    -- Add is_approved column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'discussions' AND column_name = 'is_approved') THEN
        ALTER TABLE public.discussions ADD COLUMN is_approved BOOLEAN DEFAULT false;
    END IF;
    
    -- Add views column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'discussions' AND column_name = 'views') THEN
        ALTER TABLE public.discussions ADD COLUMN views INTEGER DEFAULT 0;
    END IF;
    
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'discussions' AND column_name = 'created_by') THEN
        ALTER TABLE public.discussions ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'discussions' AND column_name = 'updated_at') THEN
        ALTER TABLE public.discussions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
    -- Drop existing category constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints
               WHERE constraint_name = 'discussions_category_valid') THEN
        ALTER TABLE public.discussions DROP CONSTRAINT discussions_category_valid;
    END IF;

    -- Add category constraint with exact categories from the form
    ALTER TABLE public.discussions ADD CONSTRAINT discussions_category_valid
    CHECK (category IN (
        'Общи',
        'Цени и промоции',
        'Качество на продукти',
        'Супермаркети',
        'Съвети за пазаруване',
        'Рецепти и готвене',
        'Здравословно хранене',
        'Бюджет и спестявания',
        'Други'
    ));
    
    -- Add title length constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'discussions_title_length') THEN
        ALTER TABLE public.discussions ADD CONSTRAINT discussions_title_length 
        CHECK (char_length(title) >= 5);
    END IF;
    
    -- Add content length constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'discussions_content_length') THEN
        ALTER TABLE public.discussions ADD CONSTRAINT discussions_content_length 
        CHECK (char_length(content) >= 10);
    END IF;
END $$;

-- Create discussion_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.discussion_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    CONSTRAINT discussion_comments_content_length CHECK (char_length(content) >= 3)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_discussions_approved ON public.discussions(is_approved);
CREATE INDEX IF NOT EXISTS idx_discussions_category ON public.discussions(category);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON public.discussions(created_at);
CREATE INDEX IF NOT EXISTS idx_discussions_created_by ON public.discussions(created_by);
CREATE INDEX IF NOT EXISTS idx_discussions_slug ON public.discussions(slug);

CREATE INDEX IF NOT EXISTS idx_discussion_comments_discussion_id ON public.discussion_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_approved ON public.discussion_comments(is_approved);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_created_at ON public.discussion_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_created_by ON public.discussion_comments(created_by);

-- Enable Row Level Security if not already enabled
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Anyone can view approved discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can view their own discussions" ON public.discussions;
DROP POLICY IF EXISTS "Authenticated users can create discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can update their own discussions" ON public.discussions;
DROP POLICY IF EXISTS "Admins can manage all discussions" ON public.discussions;

-- RLS Policies for discussions
CREATE POLICY "Anyone can view approved discussions" ON public.discussions
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view their own discussions" ON public.discussions
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create discussions" ON public.discussions
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own discussions" ON public.discussions
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all discussions" ON public.discussions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Drop existing comment policies if they exist and recreate them
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Users can view their own comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Admins can manage all comments" ON public.discussion_comments;

-- RLS Policies for discussion_comments
CREATE POLICY "Anyone can view approved comments" ON public.discussion_comments
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view their own comments" ON public.discussion_comments
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create comments" ON public.discussion_comments
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own comments" ON public.discussion_comments
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all comments" ON public.discussion_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers if they don't exist
DROP TRIGGER IF EXISTS update_discussions_updated_at ON public.discussions;
CREATE TRIGGER update_discussions_updated_at 
    BEFORE UPDATE ON public.discussions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discussion_comments_updated_at ON public.discussion_comments;
CREATE TRIGGER update_discussion_comments_updated_at 
    BEFORE UPDATE ON public.discussion_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update existing discussions to have proper slugs if they're empty
UPDATE public.discussions 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^\w\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug = '' OR slug IS NULL;

-- Insert some sample discussions if the table is empty
INSERT INTO public.discussions (title, slug, content, category, is_approved, created_by) 
SELECT * FROM (VALUES
    ('Добро качество на цени в Lidl тази седмица', 'dobro-kachestvo-na-tseni-v-lidl-tazi-sedmitsa', 'Забелязах, че Lidl има много добри промоции тази седмица. Особено впечатляващи са цените на месото и зеленчуците. Някой друг забеляза ли това?', 'Цени и промоции', true, (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin') LIMIT 1)),
    ('Съвети за пестене на пари при пазаруване', 'saveti-za-pestene-na-pari-pri-pazaruvane', 'Искам да споделя няколко съвета за пестене на пари при пазаруване:\n\n1. Винаги правете списък преди да отидете в магазина\n2. Сравнявайте цените в различни супермаркети\n3. Купувайте сезонни продукти\n4. Използвайте промоции и купони\n\nКакви други съвети имате?', 'Съвети за пазаруване', true, (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin') LIMIT 1)),
    ('Кой супермаркет предлага най-добро качество месо?', 'koy-supermarket-predlaga-nay-dobro-kachestvo-meso', 'Търся препоръки за супермаркет с добро качество месо. Досега съм пазарувал от Fantastico, но искам да опитам и други места. Какво мислите за Billa и Kaufland?', 'Качество на продукти', true, (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin') LIMIT 1))
) AS sample_data(title, slug, content, category, is_approved, created_by)
WHERE NOT EXISTS (SELECT 1 FROM public.discussions LIMIT 1)
AND EXISTS (SELECT 1 FROM public.users WHERE role IN ('admin', 'super_admin'));
