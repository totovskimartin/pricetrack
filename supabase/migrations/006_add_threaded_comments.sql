-- Add parent_id column to discussion_comments for threaded conversations
ALTER TABLE public.discussion_comments 
ADD COLUMN parent_id UUID REFERENCES public.discussion_comments(id) ON DELETE CASCADE;

-- Create index for parent_id
CREATE INDEX idx_discussion_comments_parent_id ON public.discussion_comments(parent_id);

-- Add like_count and dislike_count columns to discussions for better performance
ALTER TABLE public.discussions 
ADD COLUMN like_count INTEGER DEFAULT 0,
ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Add like_count column to discussion_comments for better performance
ALTER TABLE public.discussion_comments 
ADD COLUMN like_count INTEGER DEFAULT 0;

-- Create function to update discussion stats
CREATE OR REPLACE FUNCTION update_discussion_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update comment count for discussions
    IF TG_TABLE_NAME = 'discussion_comments' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.discussions 
            SET comment_count = comment_count + 1 
            WHERE id = NEW.discussion_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.discussions 
            SET comment_count = comment_count - 1 
            WHERE id = OLD.discussion_id;
        END IF;
    END IF;
    
    -- Update like count for discussions
    IF TG_TABLE_NAME = 'discussion_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.discussions 
            SET like_count = like_count + 1 
            WHERE id = NEW.discussion_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.discussions 
            SET like_count = like_count - 1 
            WHERE id = OLD.discussion_id;
        END IF;
    END IF;
    
    -- Update like count for comments
    IF TG_TABLE_NAME = 'comment_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.discussion_comments 
            SET like_count = like_count + 1 
            WHERE id = NEW.comment_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.discussion_comments 
            SET like_count = like_count - 1 
            WHERE id = OLD.comment_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update stats
CREATE TRIGGER update_discussion_comment_stats
    AFTER INSERT OR DELETE ON public.discussion_comments
    FOR EACH ROW EXECUTE FUNCTION update_discussion_stats();

CREATE TRIGGER update_discussion_like_stats
    AFTER INSERT OR DELETE ON public.discussion_likes
    FOR EACH ROW EXECUTE FUNCTION update_discussion_stats();

CREATE TRIGGER update_comment_like_stats
    AFTER INSERT OR DELETE ON public.comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_discussion_stats();

-- Initialize existing counts
UPDATE public.discussions 
SET comment_count = (
    SELECT COUNT(*) 
    FROM public.discussion_comments 
    WHERE discussion_id = discussions.id AND is_approved = true
);

UPDATE public.discussions 
SET like_count = (
    SELECT COUNT(*) 
    FROM public.discussion_likes 
    WHERE discussion_id = discussions.id
);

UPDATE public.discussion_comments 
SET like_count = (
    SELECT COUNT(*) 
    FROM public.comment_likes 
    WHERE comment_id = discussion_comments.id
);
