-- User Interactions Tables Migration
-- This migration creates the missing user_favorites and user_tracking tables

-- 1. Create user_favorites table
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure unique favorite per user per product
    UNIQUE(user_id, product_id)
);

-- 2. Create user_tracking table
CREATE TABLE IF NOT EXISTS public.user_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    target_price_bgn DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure unique tracking per user per product
    UNIQUE(user_id, product_id)
);

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON public.user_favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON public.user_favorites(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_tracking_user_id ON public.user_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracking_product_id ON public.user_tracking(product_id);
CREATE INDEX IF NOT EXISTS idx_user_tracking_is_active ON public.user_tracking(is_active);
CREATE INDEX IF NOT EXISTS idx_user_tracking_target_price ON public.user_tracking(target_price_bgn);
CREATE INDEX IF NOT EXISTS idx_user_tracking_created_at ON public.user_tracking(created_at DESC);

-- 4. Enable RLS on both tables
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tracking ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user_favorites
CREATE POLICY "Users can view their own favorites" ON public.user_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON public.user_favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON public.user_favorites
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all favorites" ON public.user_favorites
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'moderator')
        )
    );

-- 6. RLS Policies for user_tracking
CREATE POLICY "Users can view their own tracking" ON public.user_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracking" ON public.user_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking" ON public.user_tracking
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracking" ON public.user_tracking
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tracking" ON public.user_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'moderator')
        )
    );

-- 7. Add updated_at trigger for user_tracking
CREATE TRIGGER update_user_tracking_updated_at BEFORE UPDATE ON public.user_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Function to get user interaction statistics
CREATE OR REPLACE FUNCTION get_user_interaction_stats(p_user_id UUID)
RETURNS TABLE (
    total_favorites INTEGER,
    total_tracking INTEGER,
    active_tracking INTEGER,
    avg_target_price DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM public.user_favorites WHERE user_id = p_user_id) as total_favorites,
        (SELECT COUNT(*)::INTEGER FROM public.user_tracking WHERE user_id = p_user_id) as total_tracking,
        (SELECT COUNT(*)::INTEGER FROM public.user_tracking WHERE user_id = p_user_id AND is_active = true) as active_tracking,
        (SELECT AVG(target_price_bgn)::DECIMAL(10,2) FROM public.user_tracking WHERE user_id = p_user_id AND target_price_bgn IS NOT NULL) as avg_target_price;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to get product interaction statistics
CREATE OR REPLACE FUNCTION get_product_interaction_stats(p_product_id UUID)
RETURNS TABLE (
    favorites_count INTEGER,
    tracking_count INTEGER,
    active_tracking_count INTEGER,
    comments_count INTEGER,
    total_likes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM public.user_favorites WHERE product_id = p_product_id) as favorites_count,
        (SELECT COUNT(*)::INTEGER FROM public.user_tracking WHERE product_id = p_product_id) as tracking_count,
        (SELECT COUNT(*)::INTEGER FROM public.user_tracking WHERE product_id = p_product_id AND is_active = true) as active_tracking_count,
        (SELECT COUNT(*)::INTEGER FROM public.product_comments WHERE product_id = p_product_id AND parent_comment_id IS NULL) as comments_count,
        (SELECT COALESCE(SUM(likes), 0)::INTEGER FROM public.product_comments WHERE product_id = p_product_id) as total_likes;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to get multiple products interaction statistics (for product lists)
CREATE OR REPLACE FUNCTION get_multiple_products_stats(p_product_ids UUID[])
RETURNS TABLE (
    product_id UUID,
    favorites_count INTEGER,
    tracking_count INTEGER,
    comments_count INTEGER,
    total_likes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as product_id,
        COALESCE(f.favorites_count, 0)::INTEGER as favorites_count,
        COALESCE(t.tracking_count, 0)::INTEGER as tracking_count,
        COALESCE(c.comments_count, 0)::INTEGER as comments_count,
        COALESCE(l.total_likes, 0)::INTEGER as total_likes
    FROM unnest(p_product_ids) AS p(id)
    LEFT JOIN (
        SELECT product_id, COUNT(*) as favorites_count
        FROM public.user_favorites
        WHERE product_id = ANY(p_product_ids)
        GROUP BY product_id
    ) f ON f.product_id = p.id
    LEFT JOIN (
        SELECT product_id, COUNT(*) as tracking_count
        FROM public.user_tracking
        WHERE product_id = ANY(p_product_ids) AND is_active = true
        GROUP BY product_id
    ) t ON t.product_id = p.id
    LEFT JOIN (
        SELECT product_id, COUNT(*) as comments_count
        FROM public.product_comments
        WHERE product_id = ANY(p_product_ids) AND parent_comment_id IS NULL
        GROUP BY product_id
    ) c ON c.product_id = p.id
    LEFT JOIN (
        SELECT product_id, SUM(likes) as total_likes
        FROM public.product_comments
        WHERE product_id = ANY(p_product_ids)
        GROUP BY product_id
    ) l ON l.product_id = p.id;
END;
$$ LANGUAGE plpgsql;

-- 11. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_interaction_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_interaction_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_multiple_products_stats TO authenticated;

-- Success message
SELECT 'User Interactions Tables successfully created! 🎉' as message;
