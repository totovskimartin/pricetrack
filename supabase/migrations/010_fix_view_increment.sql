-- Update the increment_discussion_views function to return the new count
-- and add better error handling

CREATE OR REPLACE FUNCTION increment_discussion_views(discussion_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_view_count INTEGER;
BEGIN
    -- Update the view count and return the new value
    UPDATE public.discussions 
    SET views = COALESCE(views, 0) + 1 
    WHERE id = discussion_id AND is_approved = true
    RETURNING views INTO new_view_count;
    
    -- Return the new count, or 0 if no row was updated
    RETURN COALESCE(new_view_count, 0);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return 0 on failure
        RAISE WARNING 'Failed to increment views for discussion %: %', discussion_id, SQLERRM;
        RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the function has proper permissions
GRANT EXECUTE ON FUNCTION increment_discussion_views(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_discussion_views(UUID) TO anon;
