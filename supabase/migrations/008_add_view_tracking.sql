-- Add views column to discussions table if it doesn't exist
ALTER TABLE public.discussions 
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Create index for views for better performance when sorting
CREATE INDEX IF NOT EXISTS idx_discussions_views ON public.discussions(views);

-- Create function to increment discussion views atomically
CREATE OR REPLACE FUNCTION increment_discussion_views(discussion_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_view_count INTEGER;
BEGIN
    UPDATE public.discussions
    SET views = COALESCE(views, 0) + 1
    WHERE id = discussion_id
    RETURNING views INTO new_view_count;

    RETURN COALESCE(new_view_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_discussion_views(UUID) TO authenticated;

-- Initialize existing discussions with 0 views if NULL
UPDATE public.discussions 
SET views = 0 
WHERE views IS NULL;
