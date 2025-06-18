-- Price Tracking Enhancements Migration
-- This migration adds comprehensive price tracking features

-- 1. Create price_suggestions table for user-submitted price suggestions
CREATE TABLE public.price_suggestions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    supermarket_id UUID REFERENCES public.supermarkets(id) ON DELETE CASCADE NOT NULL,
    suggested_price_bgn DECIMAL(10,2) NOT NULL CHECK (suggested_price_bgn >= 0),
    suggested_price_eur DECIMAL(10,2) GENERATED ALWAYS AS (ROUND(suggested_price_bgn / 1.95583, 2)) STORED,
    current_price_bgn DECIMAL(10,2), -- Price at time of suggestion for comparison
    notes TEXT, -- Optional notes from user
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
    suggested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Create price_analytics table for storing calculated statistics
CREATE TABLE public.price_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    supermarket_id UUID REFERENCES public.supermarkets(id) ON DELETE CASCADE,
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    min_price DECIMAL(10,2) NOT NULL,
    max_price DECIMAL(10,2) NOT NULL,
    avg_price DECIMAL(10,2) NOT NULL,
    price_count INTEGER NOT NULL DEFAULT 0,
    volatility DECIMAL(5,4), -- Price volatility coefficient
    trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')),
    trend_percentage DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure unique analytics per product/supermarket/period
    UNIQUE(product_id, supermarket_id, period_type, period_start)
);

-- 3. Create price_alerts table for tracking price change notifications
CREATE TABLE public.price_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    supermarket_id UUID REFERENCES public.supermarkets(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('price_drop', 'target_reached', 'significant_change')),
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2) NOT NULL,
    target_price DECIMAL(10,2),
    percentage_change DECIMAL(5,2),
    is_sent BOOLEAN DEFAULT false NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Add indexes for better performance
CREATE INDEX idx_price_suggestions_product_id ON public.price_suggestions(product_id);
CREATE INDEX idx_price_suggestions_supermarket_id ON public.price_suggestions(supermarket_id);
CREATE INDEX idx_price_suggestions_status ON public.price_suggestions(status);
CREATE INDEX idx_price_suggestions_suggested_by ON public.price_suggestions(suggested_by);
CREATE INDEX idx_price_suggestions_created_at ON public.price_suggestions(created_at DESC);

CREATE INDEX idx_price_analytics_product_id ON public.price_analytics(product_id);
CREATE INDEX idx_price_analytics_supermarket_id ON public.price_analytics(supermarket_id);
CREATE INDEX idx_price_analytics_period ON public.price_analytics(period_type, period_start);
CREATE INDEX idx_price_analytics_created_at ON public.price_analytics(created_at DESC);

CREATE INDEX idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX idx_price_alerts_product_id ON public.price_alerts(product_id);
CREATE INDEX idx_price_alerts_is_sent ON public.price_alerts(is_sent) WHERE is_sent = false;
CREATE INDEX idx_price_alerts_created_at ON public.price_alerts(created_at DESC);

-- 5. Add updated_at triggers
CREATE TRIGGER update_price_suggestions_updated_at BEFORE UPDATE ON public.price_suggestions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_analytics_updated_at BEFORE UPDATE ON public.price_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Create function to calculate price statistics
CREATE OR REPLACE FUNCTION calculate_price_statistics(
    p_product_id UUID,
    p_supermarket_id UUID DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    avg_price DECIMAL(10,2),
    current_price DECIMAL(10,2),
    price_change DECIMAL(10,2),
    price_change_percent DECIMAL(5,2),
    volatility DECIMAL(5,4),
    trend_direction TEXT,
    price_count INTEGER
) AS $$
DECLARE
    start_date DATE := CURRENT_DATE - INTERVAL '1 day' * p_days;
    prices_data RECORD;
    price_variance DECIMAL(10,4);
    price_stddev DECIMAL(10,4);
BEGIN
    -- Get price statistics
    SELECT
        MIN(price_bgn) as min_val,
        MAX(price_bgn) as max_val,
        AVG(price_bgn) as avg_val,
        COUNT(*) as count_val,
        VARIANCE(price_bgn) as var_val,
        STDDEV(price_bgn) as stddev_val
    INTO prices_data
    FROM public.prices p
    WHERE p.product_id = p_product_id
        AND (p_supermarket_id IS NULL OR p.supermarket_id = p_supermarket_id)
        AND p.created_at >= start_date;

    -- Get current and previous prices for trend calculation
    WITH ordered_prices AS (
        SELECT price_bgn, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
        FROM public.prices p
        WHERE p.product_id = p_product_id
            AND (p_supermarket_id IS NULL OR p.supermarket_id = p_supermarket_id)
        ORDER BY created_at DESC
        LIMIT 2
    )
    SELECT
        COALESCE(prices_data.min_val, 0),
        COALESCE(prices_data.max_val, 0),
        COALESCE(prices_data.avg_val, 0),
        COALESCE((SELECT price_bgn FROM ordered_prices WHERE rn = 1), 0),
        COALESCE((SELECT price_bgn FROM ordered_prices WHERE rn = 1), 0) -
            COALESCE((SELECT price_bgn FROM ordered_prices WHERE rn = 2), 0),
        CASE
            WHEN (SELECT price_bgn FROM ordered_prices WHERE rn = 2) > 0 THEN
                ((COALESCE((SELECT price_bgn FROM ordered_prices WHERE rn = 1), 0) -
                  COALESCE((SELECT price_bgn FROM ordered_prices WHERE rn = 2), 0)) /
                 (SELECT price_bgn FROM ordered_prices WHERE rn = 2)) * 100
            ELSE 0
        END,
        CASE
            WHEN prices_data.avg_val > 0 THEN prices_data.stddev_val / prices_data.avg_val
            ELSE 0
        END,
        CASE
            WHEN (SELECT price_bgn FROM ordered_prices WHERE rn = 1) >
                 (SELECT price_bgn FROM ordered_prices WHERE rn = 2) THEN 'up'
            WHEN (SELECT price_bgn FROM ordered_prices WHERE rn = 1) <
                 (SELECT price_bgn FROM ordered_prices WHERE rn = 2) THEN 'down'
            ELSE 'stable'
        END,
        COALESCE(prices_data.count_val, 0);
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to generate price alerts
CREATE OR REPLACE FUNCTION generate_price_alert(
    p_product_id UUID,
    p_supermarket_id UUID,
    p_old_price DECIMAL(10,2),
    p_new_price DECIMAL(10,2)
)
RETURNS VOID AS $$
DECLARE
    tracking_record RECORD;
    price_change_percent DECIMAL(5,2);
    alert_type TEXT;
BEGIN
    -- Calculate percentage change
    IF p_old_price > 0 THEN
        price_change_percent := ((p_new_price - p_old_price) / p_old_price) * 100;
    ELSE
        price_change_percent := 0;
    END IF;

    -- Determine alert type
    IF ABS(price_change_percent) >= 10 THEN
        alert_type := 'significant_change';
    ELSIF p_new_price < p_old_price THEN
        alert_type := 'price_drop';
    ELSE
        RETURN; -- No alert needed for small price increases
    END IF;

    -- Create alerts for users tracking this product
    FOR tracking_record IN
        SELECT user_id, target_price_bgn
        FROM public.user_tracking
        WHERE product_id = p_product_id AND is_active = true
    LOOP
        -- Check if target price alert should be generated
        IF tracking_record.target_price_bgn IS NOT NULL AND
           p_new_price <= tracking_record.target_price_bgn THEN
            INSERT INTO public.price_alerts (
                user_id, product_id, supermarket_id, alert_type,
                old_price, new_price, target_price, percentage_change
            ) VALUES (
                tracking_record.user_id, p_product_id, p_supermarket_id, 'target_reached',
                p_old_price, p_new_price, tracking_record.target_price_bgn, price_change_percent
            );
        ELSIF alert_type IN ('price_drop', 'significant_change') THEN
            INSERT INTO public.price_alerts (
                user_id, product_id, supermarket_id, alert_type,
                old_price, new_price, target_price, percentage_change
            ) VALUES (
                tracking_record.user_id, p_product_id, p_supermarket_id, alert_type,
                p_old_price, p_new_price, tracking_record.target_price_bgn, price_change_percent
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to automatically generate alerts on price changes
CREATE OR REPLACE FUNCTION trigger_price_alert()
RETURNS TRIGGER AS $$
DECLARE
    previous_price DECIMAL(10,2);
BEGIN
    -- Get the most recent price before this one
    SELECT price_bgn INTO previous_price
    FROM public.prices
    WHERE product_id = NEW.product_id
        AND supermarket_id = NEW.supermarket_id
        AND created_at < NEW.created_at
    ORDER BY created_at DESC
    LIMIT 1;

    -- Generate alert if there was a previous price
    IF previous_price IS NOT NULL AND previous_price != NEW.price_bgn THEN
        PERFORM generate_price_alert(NEW.product_id, NEW.supermarket_id, previous_price, NEW.price_bgn);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to prices table
CREATE TRIGGER price_change_alert_trigger
    AFTER INSERT ON public.prices
    FOR EACH ROW EXECUTE FUNCTION trigger_price_alert();

-- 9. Enable RLS on new tables
ALTER TABLE public.price_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for price_suggestions
CREATE POLICY "Anyone can view approved price suggestions" ON public.price_suggestions
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view own price suggestions" ON public.price_suggestions
    FOR SELECT USING (auth.uid() = suggested_by);

CREATE POLICY "Users can insert price suggestions" ON public.price_suggestions
    FOR INSERT WITH CHECK (auth.uid() = suggested_by);

CREATE POLICY "Admins can view all price suggestions" ON public.price_suggestions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'moderator')
        )
    );

CREATE POLICY "Admins can update price suggestions" ON public.price_suggestions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'moderator')
        )
    );

-- 11. RLS Policies for price_analytics (read-only for users)
CREATE POLICY "Anyone can view price analytics" ON public.price_analytics
    FOR SELECT USING (true);

CREATE POLICY "Only system can modify price analytics" ON public.price_analytics
    FOR ALL USING (false);

-- 12. RLS Policies for price_alerts
CREATE POLICY "Users can view own price alerts" ON public.price_alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own price alerts" ON public.price_alerts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert price alerts" ON public.price_alerts
    FOR INSERT WITH CHECK (true);
