-- Fix likes count issues
-- This script will manually update the like_count for all discussions

-- First, let's update all discussion like counts manually
UPDATE public.discussions 
SET like_count = (
    SELECT COUNT(*) 
    FROM public.discussion_likes 
    WHERE discussion_id = discussions.id
)
WHERE TRUE;

-- Update all comment like counts manually  
UPDATE public.discussion_comments 
SET like_count = (
    SELECT COUNT(*) 
    FROM public.comment_likes 
    WHERE comment_id = discussion_comments.id
)
WHERE TRUE;

-- Update all discussion comment counts manually
UPDATE public.discussions 
SET comment_count = (
    SELECT COUNT(*) 
    FROM public.discussion_comments 
    WHERE discussion_id = discussions.id AND is_approved = true
)
WHERE TRUE;

-- Check if the triggers exist and recreate them if needed
DROP TRIGGER IF EXISTS update_discussion_like_stats ON public.discussion_likes;
DROP TRIGGER IF EXISTS update_comment_like_stats ON public.comment_likes;

-- Recreate the like count update triggers
CREATE TRIGGER update_discussion_like_stats
    AFTER INSERT OR DELETE ON public.discussion_likes
    FOR EACH ROW EXECUTE FUNCTION update_discussion_stats();

CREATE TRIGGER update_comment_like_stats
    AFTER INSERT OR DELETE ON public.comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_discussion_stats();

-- Create a simpler refresh function that works
CREATE OR REPLACE FUNCTION refresh_discussion_counts()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update discussion like counts
    UPDATE public.discussions 
    SET like_count = (
        SELECT COUNT(*) 
        FROM public.discussion_likes 
        WHERE discussion_id = discussions.id
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Update discussion comment counts
    UPDATE public.discussions 
    SET comment_count = (
        SELECT COUNT(*) 
        FROM public.discussion_comments 
        WHERE discussion_id = discussions.id AND is_approved = true
    );
    
    -- Update comment like counts
    UPDATE public.discussion_comments 
    SET like_count = (
        SELECT COUNT(*) 
        FROM public.comment_likes 
        WHERE comment_id = discussion_comments.id
    );
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_discussion_counts() TO authenticated;
