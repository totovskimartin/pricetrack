-- Simple Favorites System for PriceTrack Bulgaria
-- Run this in your Supabase SQL Editor

-- Create a simple user_favorites table (minimal version)
DROP TABLE IF EXISTS public.user_favorites CASCADE;

CREATE TABLE public.user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- Add RLS (Row Level Security) for user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own favorites
CREATE POLICY "Users can view own favorites" ON public.user_favorites
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can insert own favorites" ON public.user_favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete own favorites" ON public.user_favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX idx_user_favorites_product_id ON public.user_favorites(product_id);
CREATE INDEX idx_user_favorites_created_at ON public.user_favorites(created_at DESC);

-- Grant necessary permissions
GRANT ALL ON public.user_favorites TO authenticated;
GRANT SELECT ON public.user_favorites TO anon;

-- Insert some sample data for testing (optional)
-- Note: Replace 'YOUR_USER_ID_HERE' with actual user ID after creating a test user
/*
INSERT INTO public.user_favorites (user_id, product_id) VALUES
(
    'YOUR_USER_ID_HERE',
    (SELECT id FROM public.products LIMIT 1)
);
*/
