-- Setup User Features for PriceTrack Bulgaria
-- Run this in your Supabase SQL Editor

-- 1. First, let's check and update the user_products table structure
-- Drop the existing table if it doesn't have the right columns
DROP TABLE IF EXISTS public.user_products CASCADE;

-- Create user_products table with proper structure
CREATE TABLE public.user_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    is_tracking BOOLEAN DEFAULT false NOT NULL,
    is_favorite BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- Add RLS (Row Level Security) for user_products
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own user_products
CREATE POLICY "Users can view own user_products" ON public.user_products
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own user_products
CREATE POLICY "Users can insert own user_products" ON public.user_products
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own user_products
CREATE POLICY "Users can update own user_products" ON public.user_products
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own user_products
CREATE POLICY "Users can delete own user_products" ON public.user_products
    FOR DELETE USING (auth.uid() = user_id);

-- 2. Create discussions table if it doesn't exist properly
DROP TABLE IF EXISTS public.discussion_comments CASCADE;
DROP TABLE IF EXISTS public.discussions CASCADE;

-- Create discussions table
CREATE TABLE public.discussions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0 NOT NULL,
    downvotes INTEGER DEFAULT 0 NOT NULL,
    is_pinned BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create discussion_comments table
CREATE TABLE public.discussion_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0 NOT NULL,
    downvotes INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS for discussions
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;

-- Discussions policies (public read, authenticated write)
CREATE POLICY "Anyone can view discussions" ON public.discussions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create discussions" ON public.discussions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own discussions" ON public.discussions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own discussions" ON public.discussions
    FOR DELETE USING (auth.uid() = user_id);

-- Comments policies (public read, authenticated write)
CREATE POLICY "Anyone can view comments" ON public.discussion_comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.discussion_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own comments" ON public.discussion_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.discussion_comments
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Create indexes for better performance
CREATE INDEX idx_user_products_user_id ON public.user_products(user_id);
CREATE INDEX idx_user_products_product_id ON public.user_products(product_id);
CREATE INDEX idx_user_products_tracking ON public.user_products(is_tracking) WHERE is_tracking = true;
CREATE INDEX idx_user_products_favorite ON public.user_products(is_favorite) WHERE is_favorite = true;

CREATE INDEX idx_discussions_product_id ON public.discussions(product_id);
CREATE INDEX idx_discussions_user_id ON public.discussions(user_id);
CREATE INDEX idx_discussions_created_at ON public.discussions(created_at DESC);

CREATE INDEX idx_comments_discussion_id ON public.discussion_comments(discussion_id);
CREATE INDEX idx_comments_user_id ON public.discussion_comments(user_id);
CREATE INDEX idx_comments_created_at ON public.discussion_comments(created_at DESC);

-- 4. Create updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER handle_user_products_updated_at
    BEFORE UPDATE ON public.user_products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_discussions_updated_at
    BEFORE UPDATE ON public.discussions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_comments_updated_at
    BEFORE UPDATE ON public.discussion_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Insert some sample data for testing (optional)
-- Note: This requires actual user IDs from auth.users table
-- You can run this after creating some test users

/*
-- Sample discussions (uncomment and modify user_ids after creating test users)
INSERT INTO public.discussions (product_id, user_id, title, content) VALUES
(
    (SELECT id FROM public.products LIMIT 1),
    'YOUR_USER_ID_HERE',
    'Отлична цена в Lidl!',
    'Намерих този продукт на много добра цена в Lidl. Препоръчвам!'
);

-- Sample comments
INSERT INTO public.discussion_comments (discussion_id, user_id, content) VALUES
(
    (SELECT id FROM public.discussions LIMIT 1),
    'YOUR_USER_ID_HERE',
    'Благодаря за информацията! Ще проверя и аз.'
);
*/

-- Grant necessary permissions
GRANT ALL ON public.user_products TO authenticated;
GRANT ALL ON public.discussions TO authenticated;
GRANT ALL ON public.discussion_comments TO authenticated;

GRANT SELECT ON public.user_products TO anon;
GRANT SELECT ON public.discussions TO anon;
GRANT SELECT ON public.discussion_comments TO anon;
