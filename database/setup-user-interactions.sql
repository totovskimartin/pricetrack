-- Complete User Interactions System for PriceTrack Bulgaria
-- Run this in your Supabase SQL Editor

-- 1. User Favorites Table
DROP TABLE IF EXISTS public.user_favorites CASCADE;

CREATE TABLE public.user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- 2. User Product Tracking Table (for price alerts)
DROP TABLE IF EXISTS public.user_tracking CASCADE;

CREATE TABLE public.user_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    target_price_bgn DECIMAL(10,2), -- Optional target price for alerts
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- 3. Product Comments/Discussions Table
DROP TABLE IF EXISTS public.product_comments CASCADE;

CREATE TABLE public.product_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.product_comments(id) ON DELETE CASCADE, -- For replies
    upvotes INTEGER DEFAULT 0 NOT NULL,
    downvotes INTEGER DEFAULT 0 NOT NULL,
    is_pinned BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Comment Votes Table (to track who voted on what)
DROP TABLE IF EXISTS public.comment_votes CASCADE;

CREATE TABLE public.comment_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.product_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id)
);

-- 5. Add RLS (Row Level Security) for all tables
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for user_favorites
CREATE POLICY "Users can view own favorites" ON public.user_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON public.user_favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON public.user_favorites
    FOR DELETE USING (auth.uid() = user_id);

-- 7. RLS Policies for user_tracking
CREATE POLICY "Users can view own tracking" ON public.user_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking" ON public.user_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracking" ON public.user_tracking
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracking" ON public.user_tracking
    FOR DELETE USING (auth.uid() = user_id);

-- 8. RLS Policies for product_comments (public read, authenticated write)
CREATE POLICY "Anyone can view comments" ON public.product_comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.product_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own comments" ON public.product_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.product_comments
    FOR DELETE USING (auth.uid() = user_id);

-- 9. RLS Policies for comment_votes
CREATE POLICY "Anyone can view votes" ON public.comment_votes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON public.comment_votes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own votes" ON public.comment_votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON public.comment_votes
    FOR DELETE USING (auth.uid() = user_id);

-- 10. Create indexes for better performance
CREATE INDEX idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX idx_user_favorites_product_id ON public.user_favorites(product_id);
CREATE INDEX idx_user_favorites_created_at ON public.user_favorites(created_at DESC);

CREATE INDEX idx_user_tracking_user_id ON public.user_tracking(user_id);
CREATE INDEX idx_user_tracking_product_id ON public.user_tracking(product_id);
CREATE INDEX idx_user_tracking_active ON public.user_tracking(is_active) WHERE is_active = true;

CREATE INDEX idx_product_comments_product_id ON public.product_comments(product_id);
CREATE INDEX idx_product_comments_user_id ON public.product_comments(user_id);
CREATE INDEX idx_product_comments_parent ON public.product_comments(parent_comment_id);
CREATE INDEX idx_product_comments_created_at ON public.product_comments(created_at DESC);

CREATE INDEX idx_comment_votes_comment_id ON public.comment_votes(comment_id);
CREATE INDEX idx_comment_votes_user_id ON public.comment_votes(user_id);

-- 11. Create updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_user_tracking_updated_at
    BEFORE UPDATE ON public.user_tracking
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_product_comments_updated_at
    BEFORE UPDATE ON public.product_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 12. Create functions to update vote counts
CREATE OR REPLACE FUNCTION public.update_comment_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'upvote' THEN
            UPDATE public.product_comments 
            SET upvotes = upvotes + 1 
            WHERE id = NEW.comment_id;
        ELSE
            UPDATE public.product_comments 
            SET downvotes = downvotes + 1 
            WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'upvote' THEN
            UPDATE public.product_comments 
            SET upvotes = upvotes - 1 
            WHERE id = OLD.comment_id;
        ELSE
            UPDATE public.product_comments 
            SET downvotes = downvotes - 1 
            WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle vote type change
        IF OLD.vote_type = 'upvote' AND NEW.vote_type = 'downvote' THEN
            UPDATE public.product_comments 
            SET upvotes = upvotes - 1, downvotes = downvotes + 1 
            WHERE id = NEW.comment_id;
        ELSIF OLD.vote_type = 'downvote' AND NEW.vote_type = 'upvote' THEN
            UPDATE public.product_comments 
            SET upvotes = upvotes + 1, downvotes = downvotes - 1 
            WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 13. Create triggers for vote count updates
CREATE TRIGGER update_comment_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.comment_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_comment_vote_counts();

-- 14. Grant necessary permissions
GRANT ALL ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_tracking TO authenticated;
GRANT ALL ON public.product_comments TO authenticated;
GRANT ALL ON public.comment_votes TO authenticated;

GRANT SELECT ON public.user_favorites TO anon;
GRANT SELECT ON public.user_tracking TO anon;
GRANT SELECT ON public.product_comments TO anon;
GRANT SELECT ON public.comment_votes TO anon;

-- 15. Create a view for product statistics
CREATE OR REPLACE VIEW public.product_stats AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    COALESCE(favorites.count, 0) as favorites_count,
    COALESCE(tracking.count, 0) as tracking_count,
    COALESCE(comments.count, 0) as comments_count,
    COALESCE(comments.total_upvotes, 0) as total_upvotes
FROM public.products p
LEFT JOIN (
    SELECT product_id, COUNT(*) as count
    FROM public.user_favorites
    GROUP BY product_id
) favorites ON p.id = favorites.product_id
LEFT JOIN (
    SELECT product_id, COUNT(*) as count
    FROM public.user_tracking
    WHERE is_active = true
    GROUP BY product_id
) tracking ON p.id = tracking.product_id
LEFT JOIN (
    SELECT 
        product_id, 
        COUNT(*) as count,
        SUM(upvotes) as total_upvotes
    FROM public.product_comments
    WHERE parent_comment_id IS NULL -- Only count top-level comments
    GROUP BY product_id
) comments ON p.id = comments.product_id;

-- Grant access to the view
GRANT SELECT ON public.product_stats TO authenticated;
GRANT SELECT ON public.product_stats TO anon;
