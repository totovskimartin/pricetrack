-- Insert Bulgarian supermarkets
INSERT INTO public.supermarkets (name, slug, website_url, description, is_active) VALUES
('Lidl', 'lidl', 'https://www.lidl.bg', 'Немска верига дискаунт супермаркети с широк асортимент от качествени продукти на ниски цени.', true),
('Fantastico', 'fantastico', 'https://www.fantastico.bg', 'Българска верига супермаркети с богат избор от местни и международни продукти.', true),
('Billa', 'billa', 'https://www.billa.bg', 'Австрийска верига супермаркети, част от REWE Group, предлагаща качествени продукти и отлично обслужване.', true),
('Kaufland', 'kaufland', 'https://www.kaufland.bg', 'Немска верига хипермаркети с огромен избор от продукти за цялото семейство.', true),
('T-Market', 't-market', 'https://www.tmarket.bg', 'Българска верига супермаркети с фокус върху свежи продукти и конкурентни цени.', true),
('Piccadilly', 'piccadilly', 'https://www.piccadilly.bg', 'Българска верига супермаркети с традиция в търговията с хранителни стоки.', true),
('CBA', 'cba', 'https://www.cba.bg', 'Международна верига супермаркети с местен характер и персонализирано обслужване.', true),
('SPAR', 'spar', 'https://www.spar.bg', 'Международна верига супермаркети с фокус върху удобство и качество.', true),
('Carrefour', 'carrefour', 'https://www.carrefour.bg', 'Френска верига хипермаркети с широк асортимент и конкурентни цени.', true),
('Metro', 'metro', 'https://www.metro.bg', 'Немска верига cash & carry магазини, предназначени за професионални клиенти.', true);

-- Insert product categories (as reference data)
-- Note: In a real application, you might want a separate categories table
-- For now, we'll use these as examples in the products table

-- Insert sample products for demonstration
INSERT INTO public.products (name, slug, description, category, brand, unit, is_approved, created_by) VALUES
('Хляб бял нарязан 500г', 'hlyab-byal-naryazan-500g', 'Пресен бял хляб, нарязан, опакован в найлон', 'bakery', 'Добруджа', 'piece', true, NULL),
('Мляко прясно 3.6% 1л', 'mlyako-pryasno-36-1l', 'Прясно краве мляко с мазнини 3.6%', 'dairy', 'Данон', 'liter', true, NULL),
('Яйца размер L 10бр', 'yaytsa-razmer-l-10br', 'Пресни кокоши яйца, размер L, опаковка 10 броя', 'dairy', 'Авангард', 'pack', true, NULL),
('Банани 1кг', 'banani-1kg', 'Пресни банани, внос от Еквадор', 'fruits', NULL, 'kg', true, NULL),
('Домати 1кг', 'domati-1kg', 'Пресни домати, български произход', 'vegetables', NULL, 'kg', true, NULL),
('Олио слънчогледово 1л', 'olio-slanchogledovo-1l', 'Рафинирано слънчогледово олио', 'food', 'Златна Добруджа', 'liter', true, NULL),
('Ориз басмати 1кг', 'oriz-basmati-1kg', 'Висококачествен басмати ориз', 'food', 'Uncle Ben''s', 'kg', true, NULL),
('Кока-Кола 2л', 'koka-kola-2l', 'Газирана напитка Кока-Кола', 'beverages', 'Coca-Cola', 'liter', true, NULL),
('Минерална вода 1.5л', 'mineralna-voda-15l', 'Природна минерална вода', 'beverages', 'Девин', 'liter', true, NULL),
('Шоколад млечен 100г', 'shokolad-mlechen-100g', 'Млечен шоколад с лешници', 'food', 'Milka', 'piece', true, NULL);

-- Insert sample prices for demonstration
-- Note: In a real application, these would be added by users
INSERT INTO public.prices (product_id, supermarket_id, price_bgn, created_by) 
SELECT 
    p.id,
    s.id,
    CASE 
        WHEN p.name LIKE '%хляб%' THEN ROUND((RANDOM() * 0.5 + 1.2)::numeric, 2)
        WHEN p.name LIKE '%мляко%' THEN ROUND((RANDOM() * 0.3 + 2.8)::numeric, 2)
        WHEN p.name LIKE '%яйца%' THEN ROUND((RANDOM() * 1.0 + 4.5)::numeric, 2)
        WHEN p.name LIKE '%банани%' THEN ROUND((RANDOM() * 0.5 + 3.2)::numeric, 2)
        WHEN p.name LIKE '%домати%' THEN ROUND((RANDOM() * 1.0 + 4.0)::numeric, 2)
        WHEN p.name LIKE '%олио%' THEN ROUND((RANDOM() * 1.0 + 5.5)::numeric, 2)
        WHEN p.name LIKE '%ориз%' THEN ROUND((RANDOM() * 1.5 + 6.0)::numeric, 2)
        WHEN p.name LIKE '%кока%' THEN ROUND((RANDOM() * 0.8 + 3.5)::numeric, 2)
        WHEN p.name LIKE '%вода%' THEN ROUND((RANDOM() * 0.3 + 1.8)::numeric, 2)
        WHEN p.name LIKE '%шоколад%' THEN ROUND((RANDOM() * 0.5 + 2.5)::numeric, 2)
        ELSE ROUND((RANDOM() * 5.0 + 2.0)::numeric, 2)
    END,
    NULL
FROM public.products p
CROSS JOIN public.supermarkets s
WHERE p.is_approved = true AND s.is_active = true;

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = user_id AND is_active = true;
    
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get product statistics
CREATE OR REPLACE FUNCTION public.get_product_stats(product_uuid UUID)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_prices', COUNT(pr.id),
        'avg_price_bgn', ROUND(AVG(pr.price_bgn), 2),
        'min_price_bgn', MIN(pr.price_bgn),
        'max_price_bgn', MAX(pr.price_bgn),
        'last_updated', MAX(pr.created_at),
        'supermarket_count', COUNT(DISTINCT pr.supermarket_id)
    ) INTO stats
    FROM public.prices pr
    WHERE pr.product_id = product_uuid;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get admin dashboard stats
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM public.users WHERE is_active = true),
        'total_products', (SELECT COUNT(*) FROM public.products),
        'approved_products', (SELECT COUNT(*) FROM public.products WHERE is_approved = true),
        'pending_products', (SELECT COUNT(*) FROM public.products WHERE is_approved = false),
        'total_prices', (SELECT COUNT(*) FROM public.prices),
        'total_discussions', (SELECT COUNT(*) FROM public.discussions),
        'pending_discussions', (SELECT COUNT(*) FROM public.discussions WHERE is_approved = false),
        'total_supermarkets', (SELECT COUNT(*) FROM public.supermarkets WHERE is_active = true),
        'active_users_today', (
            SELECT COUNT(DISTINCT created_by) 
            FROM public.prices 
            WHERE created_at >= CURRENT_DATE
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
