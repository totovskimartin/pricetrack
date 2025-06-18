-- Create view for products with latest prices
CREATE OR REPLACE VIEW public.products_with_prices AS
SELECT 
    p.*,
    (
        SELECT json_agg(
            json_build_object(
                'id', pr.id,
                'price_bgn', pr.price_bgn,
                'price_eur', pr.price_eur,
                'supermarket_id', pr.supermarket_id,
                'supermarket_name', s.name,
                'supermarket_slug', s.slug,
                'is_verified', pr.is_verified,
                'created_at', pr.created_at
            ) ORDER BY pr.created_at DESC
        )
        FROM public.prices pr
        JOIN public.supermarkets s ON s.id = pr.supermarket_id
        WHERE pr.product_id = p.id
        AND pr.created_at >= CURRENT_DATE - INTERVAL '30 days'
    ) as recent_prices,
    (
        SELECT COUNT(*)
        FROM public.user_products up
        WHERE up.product_id = p.id
    ) as tracking_count,
    (
        SELECT 0
    ) as discussion_count
FROM public.products p;

-- Create view for price comparison across supermarkets
CREATE OR REPLACE VIEW public.price_comparison AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.category,
    p.unit,
    json_agg(
        json_build_object(
            'supermarket_id', s.id,
            'supermarket_name', s.name,
            'supermarket_slug', s.slug,
            'price_bgn', latest_prices.price_bgn,
            'price_eur', latest_prices.price_eur,
            'last_updated', latest_prices.created_at
        ) ORDER BY latest_prices.price_bgn ASC
    ) as supermarket_prices
FROM public.products p
JOIN LATERAL (
    SELECT DISTINCT ON (pr.supermarket_id)
        pr.supermarket_id,
        pr.price_bgn,
        pr.price_eur,
        pr.created_at
    FROM public.prices pr
    WHERE pr.product_id = p.id
    ORDER BY pr.supermarket_id, pr.created_at DESC
) latest_prices ON true
JOIN public.supermarkets s ON s.id = latest_prices.supermarket_id
WHERE p.is_approved = true AND s.is_active = true
GROUP BY p.id, p.name, p.category, p.unit;

-- Create view for trending products
CREATE OR REPLACE VIEW public.trending_products AS
SELECT 
    p.*,
    recent_activity.price_count,
    recent_activity.tracking_count,
    0 as discussion_count,
    (recent_activity.price_count * 2 + recent_activity.tracking_count * 3) as trend_score
FROM public.products p
JOIN (
    SELECT 
        p.id,
        COUNT(DISTINCT pr.id) as price_count,
        COUNT(DISTINCT up.id) as tracking_count,
        0 as discussion_count
    FROM public.products p
    LEFT JOIN public.prices pr ON pr.product_id = p.id
        AND pr.created_at >= CURRENT_DATE - INTERVAL '7 days'
    LEFT JOIN public.user_products up ON up.product_id = p.id
        AND up.created_at >= CURRENT_DATE - INTERVAL '7 days'
    WHERE p.is_approved = true
    GROUP BY p.id
) recent_activity ON recent_activity.id = p.id
ORDER BY trend_score DESC;

-- Function to search products
CREATE OR REPLACE FUNCTION public.search_products(
    search_query TEXT DEFAULT '',
    category_filter TEXT DEFAULT NULL,
    supermarket_filter UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    category TEXT,
    brand TEXT,
    image_url TEXT,
    unit TEXT,
    min_price_bgn DECIMAL,
    max_price_bgn DECIMAL,
    avg_price_bgn DECIMAL,
    tracking_count BIGINT,
    discussion_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.category,
        p.brand,
        p.image_url,
        p.unit,
        price_stats.min_price_bgn,
        price_stats.max_price_bgn,
        price_stats.avg_price_bgn,
        COALESCE(tracking_stats.tracking_count, 0) as tracking_count,
        0 as discussion_count
    FROM public.products p
    LEFT JOIN (
        SELECT
            pr.product_id,
            MIN(pr.price_bgn) as min_price_bgn,
            MAX(pr.price_bgn) as max_price_bgn,
            ROUND(AVG(pr.price_bgn), 2) as avg_price_bgn
        FROM public.prices pr
        WHERE (supermarket_filter IS NULL OR pr.supermarket_id = supermarket_filter)
        AND pr.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY pr.product_id
    ) price_stats ON price_stats.product_id = p.id
    LEFT JOIN (
        SELECT
            up.product_id,
            COUNT(*) as tracking_count
        FROM public.user_products up
        GROUP BY up.product_id
    ) tracking_stats ON tracking_stats.product_id = p.id
    WHERE p.is_approved = true
    AND (search_query = '' OR p.name ILIKE '%' || search_query || '%' OR p.brand ILIKE '%' || search_query || '%')
    AND (category_filter IS NULL OR p.category = category_filter)
    ORDER BY 
        CASE WHEN search_query != '' THEN 
            similarity(p.name, search_query) + similarity(COALESCE(p.brand, ''), search_query)
        ELSE 0 END DESC,
        tracking_count DESC,
        p.name ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get price history for a product
CREATE OR REPLACE FUNCTION public.get_price_history(
    product_uuid UUID,
    supermarket_uuid UUID DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    price_bgn DECIMAL,
    price_eur DECIMAL,
    supermarket_id UUID,
    supermarket_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.created_at::DATE as date,
        pr.price_bgn,
        pr.price_eur,
        pr.supermarket_id,
        s.name as supermarket_name
    FROM public.prices pr
    JOIN public.supermarkets s ON s.id = pr.supermarket_id
    WHERE pr.product_id = product_uuid
    AND (supermarket_uuid IS NULL OR pr.supermarket_id = supermarket_uuid)
    AND pr.created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's tracked products with latest prices
CREATE OR REPLACE FUNCTION public.get_user_tracked_products(user_uuid UUID)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_slug TEXT,
    category TEXT,
    unit TEXT,
    tracked_since TIMESTAMP WITH TIME ZONE,
    latest_prices JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as product_id,
        p.name as product_name,
        p.slug as product_slug,
        p.category,
        p.unit,
        up.created_at as tracked_since,
        (
            SELECT json_agg(
                json_build_object(
                    'supermarket_name', s.name,
                    'price_bgn', latest_price.price_bgn,
                    'price_eur', latest_price.price_eur,
                    'updated_at', latest_price.created_at
                ) ORDER BY latest_price.price_bgn ASC
            )
            FROM (
                SELECT DISTINCT ON (pr.supermarket_id)
                    pr.supermarket_id,
                    pr.price_bgn,
                    pr.price_eur,
                    pr.created_at
                FROM public.prices pr
                WHERE pr.product_id = p.id
                ORDER BY pr.supermarket_id, pr.created_at DESC
            ) latest_price
            JOIN public.supermarkets s ON s.id = latest_price.supermarket_id
            WHERE s.is_active = true
        ) as latest_prices
    FROM public.user_products up
    JOIN public.products p ON p.id = up.product_id
    WHERE up.user_id = user_uuid
    AND p.is_approved = true
    ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable the pg_trgm extension for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes for text search
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON public.products USING gin (brand gin_trgm_ops);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.search_products TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_price_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tracked_products TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
