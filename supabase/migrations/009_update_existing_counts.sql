-- Update existing discussions with correct comment and like counts
-- This ensures all existing data has accurate counts

-- Update comment counts for all discussions
UPDATE public.discussions 
SET comment_count = (
    SELECT COUNT(*) 
    FROM public.discussion_comments 
    WHERE discussion_id = discussions.id AND is_approved = true
)
WHERE comment_count IS NULL OR comment_count != (
    SELECT COUNT(*) 
    FROM public.discussion_comments 
    WHERE discussion_id = discussions.id AND is_approved = true
);

-- Update like counts for all discussions
UPDATE public.discussions 
SET like_count = (
    SELECT COUNT(*) 
    FROM public.discussion_likes 
    WHERE discussion_id = discussions.id
)
WHERE like_count IS NULL OR like_count != (
    SELECT COUNT(*) 
    FROM public.discussion_likes 
    WHERE discussion_id = discussions.id
);

-- Update like counts for all comments
UPDATE public.discussion_comments 
SET like_count = (
    SELECT COUNT(*) 
    FROM public.comment_likes 
    WHERE comment_id = discussion_comments.id
)
WHERE like_count IS NULL OR like_count != (
    SELECT COUNT(*) 
    FROM public.comment_likes 
    WHERE comment_id = discussion_comments.id
);

-- Create a function to refresh all counts (useful for maintenance)
CREATE OR REPLACE FUNCTION refresh_all_counts()
RETURNS VOID AS $$
BEGIN
    -- Update discussion comment counts
    UPDATE public.discussions 
    SET comment_count = (
        SELECT COUNT(*) 
        FROM public.discussion_comments 
        WHERE discussion_id = discussions.id AND is_approved = true
    );
    
    -- Update discussion like counts
    UPDATE public.discussions 
    SET like_count = (
        SELECT COUNT(*) 
        FROM public.discussion_likes 
        WHERE discussion_id = discussions.id
    );
    
    -- Update comment like counts
    UPDATE public.discussion_comments 
    SET like_count = (
        SELECT COUNT(*) 
        FROM public.comment_likes 
        WHERE comment_id = discussion_comments.id
    );
    
    RAISE NOTICE 'All counts have been refreshed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to super admins only
REVOKE EXECUTE ON FUNCTION refresh_all_counts() FROM PUBLIC;
-- This function should only be called manually by super admins when needed
