-- Create discussions table
CREATE TABLE public.discussions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(250) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    CONSTRAINT discussions_title_length CHECK (char_length(title) >= 5),
    CONSTRAINT discussions_content_length CHECK (char_length(content) >= 10),
    CONSTRAINT discussions_category_valid CHECK (category IN (
        'Общи',
        'Цени и промоции', 
        'Качество на продукти',
        'Супермаркети',
        'Съвети за пазаруване',
        'Рецепти и готвене',
        'Здравословно хранене',
        'Бюджет и спестявания',
        'Други'
    ))
);

-- Create discussion_comments table
CREATE TABLE public.discussion_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    CONSTRAINT discussion_comments_content_length CHECK (char_length(content) >= 3)
);

-- Create discussion_likes table for future use
CREATE TABLE public.discussion_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(discussion_id, user_id)
);

-- Create comment_likes table for future use
CREATE TABLE public.comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(comment_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_discussions_approved ON public.discussions(is_approved);
CREATE INDEX idx_discussions_category ON public.discussions(category);
CREATE INDEX idx_discussions_created_at ON public.discussions(created_at);
CREATE INDEX idx_discussions_created_by ON public.discussions(created_by);
CREATE INDEX idx_discussions_slug ON public.discussions(slug);

CREATE INDEX idx_discussion_comments_discussion_id ON public.discussion_comments(discussion_id);
CREATE INDEX idx_discussion_comments_approved ON public.discussion_comments(is_approved);
CREATE INDEX idx_discussion_comments_created_at ON public.discussion_comments(created_at);
CREATE INDEX idx_discussion_comments_created_by ON public.discussion_comments(created_by);

CREATE INDEX idx_discussion_likes_discussion_id ON public.discussion_likes(discussion_id);
CREATE INDEX idx_discussion_likes_user_id ON public.discussion_likes(user_id);

CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes(user_id);

-- Enable Row Level Security
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for discussion_likes
CREATE POLICY "Anyone can view discussion likes" ON public.discussion_likes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage their own likes" ON public.discussion_likes
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for comment_likes
CREATE POLICY "Anyone can view comment likes" ON public.comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage their own likes" ON public.comment_likes
    FOR ALL USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_discussions_updated_at 
    BEFORE UPDATE ON public.discussions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_comments_updated_at 
    BEFORE UPDATE ON public.discussion_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample discussions (optional)
INSERT INTO public.discussions (title, slug, content, category, is_approved, created_by) VALUES
('Добро качество на цени в Lidl тази седмица', 'dobro-kachestvo-na-tseni-v-lidl-tazi-sedmitsa', 'Забелязах, че Lidl има много добри промоции тази седмица. Особено впечатляващи са цените на месото и зеленчуците. Някой друг забеляза ли това?', 'Цени и промоции', true, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
('Съвети за пестене на пари при пазаруване', 'saveti-za-pestene-na-pari-pri-pazaruvane', 'Искам да споделя няколко съвета за пестене на пари при пазаруване:\n\n1. Винаги правете списък преди да отидете в магазина\n2. Сравнявайте цените в различни супермаркети\n3. Купувайте сезонни продукти\n4. Използвайте промоции и купони\n\nКакви други съвети имате?', 'Съвети за пазаруване', true, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
('Кой супермаркет предлага най-добро качество месо?', 'koy-supermarket-predlaga-nay-dobro-kachestvo-meso', 'Търся препоръки за супермаркет с добро качество месо. Досега съм пазарувал от Fantastico, но искам да опитам и други места. Какво мислите за Billa и Kaufland?', 'Качество на продукти', true, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1));
