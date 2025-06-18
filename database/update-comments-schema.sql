-- Update product_comments table to include title field
-- Run this in your Supabase SQL Editor

-- Add title field to product_comments table
ALTER TABLE public.product_comments 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Update existing comments to have a title based on content
UPDATE public.product_comments 
SET title = CASE 
    WHEN LENGTH(content) > 50 THEN LEFT(content, 50) || '...'
    ELSE content
END
WHERE title IS NULL;

-- Create index for title field for better search performance
CREATE INDEX IF NOT EXISTS idx_product_comments_title ON public.product_comments(title);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'product_comments' 
AND table_schema = 'public'
ORDER BY ordinal_position;
