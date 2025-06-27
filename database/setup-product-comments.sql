-- Setup Product Comments System
-- Run this in your Supabase SQL Editor to fix the "Error fetching comment count" issue

-- 1. Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS public.comment_votes CASCADE;
DROP TABLE IF EXISTS public.product_comments CASCADE;

-- 2. Create product_comments table
CREATE TABLE public.product_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0 NOT NULL,
    dislikes INTEGER DEFAULT 0 NOT NULL,
    parent_comment_id UUID REFERENCES public.product_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Create comment_votes table for tracking user votes
CREATE TABLE public.comment_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    comment_id UUID REFERENCES public.product_comments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure one vote per user per comment
    UNIQUE(comment_id, user_id)
);

-- 4. Create indexes for better performance
CREATE INDEX idx_product_comments_product_id ON public.product_comments(product_id);
CREATE INDEX idx_product_comments_user_id ON public.product_comments(user_id);
CREATE INDEX idx_product_comments_parent_id ON public.product_comments(parent_comment_id);
CREATE INDEX idx_product_comments_created_at ON public.product_comments(created_at DESC);

CREATE INDEX idx_comment_votes_comment_id ON public.comment_votes(comment_id);
CREATE INDEX idx_comment_votes_user_id ON public.comment_votes(user_id);
CREATE INDEX idx_comment_votes_vote_type ON public.comment_votes(vote_type);

-- 5. Enable RLS on both tables
ALTER TABLE public.product_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for product_comments
CREATE POLICY "Anyone can view comments" ON public.product_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments" ON public.product_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.product_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.product_comments
    FOR DELETE USING (auth.uid() = user_id);

-- 7. RLS Policies for comment_votes
CREATE POLICY "Anyone can view votes" ON public.comment_votes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own votes" ON public.comment_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON public.comment_votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON public.comment_votes
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Create function to update comment vote counts
CREATE OR REPLACE FUNCTION public.update_comment_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'like' THEN
            UPDATE public.product_comments 
            SET likes = likes + 1 
            WHERE id = NEW.comment_id;
        ELSE
            UPDATE public.product_comments 
            SET dislikes = dislikes + 1 
            WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'like' THEN
            UPDATE public.product_comments 
            SET likes = likes - 1 
            WHERE id = OLD.comment_id;
        ELSE
            UPDATE public.product_comments 
            SET dislikes = dislikes - 1 
            WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle vote type change
        IF OLD.vote_type = 'like' THEN
            UPDATE public.product_comments 
            SET likes = likes - 1 
            WHERE id = OLD.comment_id;
        ELSE
            UPDATE public.product_comments 
            SET dislikes = dislikes - 1 
            WHERE id = OLD.comment_id;
        END IF;
        
        IF NEW.vote_type = 'like' THEN
            UPDATE public.product_comments 
            SET likes = likes + 1 
            WHERE id = NEW.comment_id;
        ELSE
            UPDATE public.product_comments 
            SET dislikes = dislikes + 1 
            WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for vote count updates
CREATE TRIGGER comment_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.comment_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_comment_vote_counts();

-- 10. Grant permissions
GRANT ALL ON public.product_comments TO authenticated;
GRANT ALL ON public.comment_votes TO authenticated;
GRANT SELECT ON public.product_comments TO anon;
GRANT SELECT ON public.comment_votes TO anon;

-- 11. Success message
SELECT 'Product Comments System successfully installed! 🎉' as message,
       'You can now view product pages without the comment count error.' as note;

-- 12. Verify the setup
SELECT 'Tables created:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('product_comments', 'comment_votes')
ORDER BY table_name;
