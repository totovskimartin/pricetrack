-- Fix Supabase Security Advisor Issues
-- This script addresses all the security issues identified by the Supabase Security Advisor

-- ============================================================================
-- 1. ENABLE ROW LEVEL SECURITY ON TABLES THAT HAVE POLICIES BUT RLS DISABLED
-- ============================================================================

-- Enable RLS on users table (has policies but RLS disabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admin_notifications table (has policies but RLS disabled)
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on price_suggestions table (has policies but RLS disabled)
ALTER TABLE public.price_suggestions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on price_analytics table (has policies but RLS disabled)
ALTER TABLE public.price_analytics ENABLE ROW LEVEL SECURITY;

-- Enable RLS on price_alerts table (has policies but RLS disabled)
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. FIX EXPOSED AUTH.USERS DATA IN USER_PROFILES VIEW
-- ============================================================================

-- Drop the existing user_profiles view that exposes auth.users data
DROP VIEW IF EXISTS public.user_profiles;

-- Create a secure user_profiles view that doesn't expose sensitive auth.users data
-- and uses SECURITY INVOKER instead of SECURITY DEFINER
CREATE VIEW public.user_profiles
WITH (security_invoker = true) AS
SELECT
  u.id,
  u.email,
  u.username,
  u.full_name,
  u.first_name,
  u.last_name,
  u.avatar_url,
  u.role,
  u.is_active,
  u.created_at,
  u.updated_at
FROM public.users u
WHERE u.is_active = true;

-- Grant appropriate permissions to the new view
GRANT SELECT ON public.user_profiles TO authenticated;

-- Remove anon access to prevent exposure of user data
REVOKE ALL ON public.user_profiles FROM anon;

-- ============================================================================
-- 3. FIX SECURITY DEFINER VIEWS - CHANGE TO SECURITY INVOKER
-- ============================================================================

-- Fix price_comparison view
DROP VIEW IF EXISTS public.price_comparison;
CREATE VIEW public.price_comparison
WITH (security_invoker = true) AS
SELECT
    p.id as product_id,
    p.name as product_name,
    p.category,
    s.id as supermarket_id,
    s.name as supermarket_name,
    pr.price_bgn,
    pr.price_eur,
    pr.created_at as price_date,
    pr.is_verified,
    ROW_NUMBER() OVER (PARTITION BY p.id, s.id ORDER BY pr.created_at DESC) as rn
FROM public.products p
CROSS JOIN public.supermarkets s
LEFT JOIN public.prices pr ON p.id = pr.product_id AND s.id = pr.supermarket_id
WHERE p.is_approved = true AND s.is_active = true;

-- Fix products_with_prices view
DROP VIEW IF EXISTS public.products_with_prices;
CREATE VIEW public.products_with_prices
WITH (security_invoker = true) AS
SELECT
    p.*,
    COALESCE(latest_prices.min_price_bgn, 0) as min_price_bgn,
    COALESCE(latest_prices.max_price_bgn, 0) as max_price_bgn,
    COALESCE(latest_prices.avg_price_bgn, 0) as avg_price_bgn,
    COALESCE(latest_prices.min_price_eur, 0) as min_price_eur,
    COALESCE(latest_prices.max_price_eur, 0) as max_price_eur,
    COALESCE(latest_prices.avg_price_eur, 0) as avg_price_eur,
    COALESCE(latest_prices.price_count, 0) as price_count,
    latest_prices.last_updated
FROM public.products p
LEFT JOIN (
    SELECT
        product_id,
        MIN(price_bgn) as min_price_bgn,
        MAX(price_bgn) as max_price_bgn,
        AVG(price_bgn) as avg_price_bgn,
        MIN(price_eur) as min_price_eur,
        MAX(price_eur) as max_price_eur,
        AVG(price_eur) as avg_price_eur,
        COUNT(*) as price_count,
        MAX(created_at) as last_updated
    FROM public.prices
    WHERE is_verified = true
    GROUP BY product_id
) latest_prices ON p.id = latest_prices.product_id
WHERE p.is_approved = true;

-- Fix trending_products view
DROP VIEW IF EXISTS public.trending_products;
CREATE VIEW public.trending_products
WITH (security_invoker = true) AS
SELECT
    p.id,
    p.name,
    p.category,
    p.description,
    p.image_url,
    COUNT(DISTINCT pr.id) as price_count,
    COUNT(DISTINCT up.user_id) as tracking_count,
    AVG(pr.price_bgn) as avg_price_bgn,
    AVG(pr.price_eur) as avg_price_eur,
    MAX(pr.created_at) as last_price_update
FROM public.products p
LEFT JOIN public.prices pr ON p.id = pr.product_id AND pr.is_verified = true
LEFT JOIN public.user_products up ON p.id = up.product_id
WHERE p.is_approved = true
GROUP BY p.id, p.name, p.category, p.description, p.image_url
HAVING COUNT(DISTINCT pr.id) > 0 OR COUNT(DISTINCT up.user_id) > 0
ORDER BY (COUNT(DISTINCT pr.id) + COUNT(DISTINCT up.user_id)) DESC;

-- Grant appropriate permissions to the updated views
GRANT SELECT ON public.price_comparison TO authenticated;
GRANT SELECT ON public.products_with_prices TO authenticated;
GRANT SELECT ON public.trending_products TO authenticated;

-- Allow anon users to view these product-related views (they contain public product data)
GRANT SELECT ON public.price_comparison TO anon;
GRANT SELECT ON public.products_with_prices TO anon;
GRANT SELECT ON public.trending_products TO anon;

-- ============================================================================
-- 4. VERIFY RLS POLICIES EXIST FOR ALL TABLES
-- ============================================================================

-- Ensure basic RLS policies exist for price_suggestions if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'price_suggestions'
        AND policyname = 'Users can view own price suggestions'
    ) THEN
        CREATE POLICY "Users can view own price suggestions" ON public.price_suggestions
            FOR SELECT USING (auth.uid() = suggested_by);
    END IF;
END $$;

-- Ensure basic RLS policies exist for price_analytics if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'price_analytics'
        AND policyname = 'Anyone can view price analytics'
    ) THEN
        CREATE POLICY "Anyone can view price analytics" ON public.price_analytics
            FOR SELECT TO authenticated, anon USING (true);
    END IF;
END $$;

-- Ensure basic RLS policies exist for price_alerts if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'price_alerts'
        AND policyname = 'Users can view own price alerts'
    ) THEN
        CREATE POLICY "Users can view own price alerts" ON public.price_alerts
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Check RLS status on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'admin_notifications', 'price_suggestions', 'price_analytics', 'price_alerts')
ORDER BY tablename;

-- Check view security settings
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('user_profiles', 'price_comparison', 'products_with_prices', 'trending_products')
ORDER BY viewname;

-- Success message
SELECT 'Security Advisor issues have been fixed!' as status;