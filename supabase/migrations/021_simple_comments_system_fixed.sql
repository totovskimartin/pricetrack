-- Simple Comments System Migration (Fixed Version)
-- This migration creates a simple comments system with like/dislike functionality

-- 1. Drop existing product_comments table if it exists (to start fresh)
DROP TABLE IF EXISTS public.product_comments CASCADE;
DROP TABLE IF EXISTS public.comment_votes CASCADE;

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

-- 4. Add indexes for better performance
CREATE INDEX idx_product_comments_product_id ON public.product_comments(product_id);
CREATE INDEX idx_product_comments_user_id ON public.product_comments(user_id);
CREATE INDEX idx_product_comments_parent_id ON public.product_comments(parent_comment_id);
CREATE INDEX idx_product_comments_created_at ON public.product_comments(created_at DESC);
CREATE INDEX idx_product_comments_likes ON public.product_comments(likes DESC);
CREATE INDEX idx_product_comments_dislikes ON public.product_comments(dislikes DESC);

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

CREATE POLICY "Admins can view all comments" ON public.product_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'moderator')
        )
    );

CREATE POLICY "Admins can update all comments" ON public.product_comments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'moderator')
        )
    );

-- 7. RLS Policies for comment_votes
CREATE POLICY "Users can view all comment votes" ON public.comment_votes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own votes" ON public.comment_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON public.comment_votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON public.comment_votes
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Add updated_at triggers
CREATE TRIGGER update_product_comments_updated_at BEFORE UPDATE ON public.product_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comment_votes_updated_at BEFORE UPDATE ON public.comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Function to update comment vote counts
CREATE OR REPLACE FUNCTION update_comment_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment the appropriate count
        IF NEW.vote_type = 'like' THEN
            UPDATE public.product_comments 
            SET likes = likes + 1 
            WHERE id = NEW.comment_id;
        ELSIF NEW.vote_type = 'dislike' THEN
            UPDATE public.product_comments 
            SET dislikes = dislikes + 1 
            WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle vote type change
        IF OLD.vote_type != NEW.vote_type THEN
            -- Decrement old vote type
            IF OLD.vote_type = 'like' THEN
                UPDATE public.product_comments 
                SET likes = GREATEST(0, likes - 1) 
                WHERE id = OLD.comment_id;
            ELSIF OLD.vote_type = 'dislike' THEN
                UPDATE public.product_comments 
                SET dislikes = GREATEST(0, dislikes - 1) 
                WHERE id = OLD.comment_id;
            END IF;
            
            -- Increment new vote type
            IF NEW.vote_type = 'like' THEN
                UPDATE public.product_comments 
                SET likes = likes + 1 
                WHERE id = NEW.comment_id;
            ELSIF NEW.vote_type = 'dislike' THEN
                UPDATE public.product_comments 
                SET dislikes = dislikes + 1 
                WHERE id = NEW.comment_id;
            END IF;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement the appropriate count
        IF OLD.vote_type = 'like' THEN
            UPDATE public.product_comments 
            SET likes = GREATEST(0, likes - 1) 
            WHERE id = OLD.comment_id;
        ELSIF OLD.vote_type = 'dislike' THEN
            UPDATE public.product_comments 
            SET dislikes = GREATEST(0, dislikes - 1) 
            WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers for automatic vote count updates
CREATE TRIGGER comment_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_comment_vote_counts();

-- 11. Function to get comment statistics
CREATE OR REPLACE FUNCTION get_comment_statistics(p_product_id UUID)
RETURNS TABLE (
    total_comments INTEGER,
    total_likes INTEGER,
    total_dislikes INTEGER,
    avg_likes DECIMAL(5,2),
    avg_dislikes DECIMAL(5,2),
    most_liked_comment_id UUID,
    most_disliked_comment_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_comments,
        COALESCE(SUM(likes), 0)::INTEGER as total_likes,
        COALESCE(SUM(dislikes), 0)::INTEGER as total_dislikes,
        COALESCE(AVG(likes), 0)::DECIMAL(5,2) as avg_likes,
        COALESCE(AVG(dislikes), 0)::DECIMAL(5,2) as avg_dislikes,
        (SELECT id FROM public.product_comments 
         WHERE product_id = p_product_id AND parent_comment_id IS NULL 
         ORDER BY likes DESC LIMIT 1) as most_liked_comment_id,
        (SELECT id FROM public.product_comments 
         WHERE product_id = p_product_id AND parent_comment_id IS NULL 
         ORDER BY dislikes DESC LIMIT 1) as most_disliked_comment_id
    FROM public.product_comments
    WHERE product_id = p_product_id 
    AND parent_comment_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 12. Function to get user's vote for a comment
CREATE OR REPLACE FUNCTION get_user_vote(p_comment_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    vote_result TEXT;
BEGIN
    SELECT vote_type INTO vote_result
    FROM public.comment_votes
    WHERE comment_id = p_comment_id AND user_id = p_user_id;
    
    RETURN vote_result;
END;
$$ LANGUAGE plpgsql;

-- 13. Insert some test data (optional)
-- Uncomment the following lines if you want to add test comments

/*
INSERT INTO public.product_comments (product_id, user_id, content, likes, dislikes) VALUES
((SELECT id FROM public.products LIMIT 1), (SELECT id FROM public.users LIMIT 1), 'Отличен продукт! Препоръчвам го.', 5, 0),
((SELECT id FROM public.products LIMIT 1), (SELECT id FROM public.users LIMIT 1), 'Добро качество за цената.', 3, 1),
((SELECT id FROM public.products LIMIT 1), (SELECT id FROM public.users LIMIT 1), 'Не съм доволен от покупката.', 1, 4);
*/

-- Success message
SELECT 'Simple Comments System successfully installed! 🎉' as message;
