-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Supermarkets table
CREATE TABLE public.supermarkets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    website_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Products table
CREATE TABLE public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL,
    brand TEXT,
    image_url TEXT,
    barcode TEXT,
    unit TEXT NOT NULL DEFAULT 'piece',
    is_approved BOOLEAN DEFAULT false NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Prices table
CREATE TABLE public.prices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    supermarket_id UUID REFERENCES public.supermarkets(id) ON DELETE CASCADE NOT NULL,
    price_bgn DECIMAL(10,2) NOT NULL CHECK (price_bgn >= 0),
    price_eur DECIMAL(10,2) GENERATED ALWAYS AS (ROUND(price_bgn / 1.95583, 2)) STORED,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Discussions table
CREATE TABLE public.discussions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Discussion comments table
CREATE TABLE public.discussion_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discussion_id UUID REFERENCES public.discussions(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT false NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User products (tracking) table
CREATE TABLE public.user_products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure unique tracking per user per product
    UNIQUE(user_id, product_id)
);

-- Admin logs table
CREATE TABLE public.admin_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_is_approved ON public.products(is_approved);
CREATE INDEX idx_products_created_by ON public.products(created_by);
CREATE INDEX idx_prices_product_id ON public.prices(product_id);
CREATE INDEX idx_prices_supermarket_id ON public.prices(supermarket_id);
CREATE INDEX idx_prices_created_at ON public.prices(created_at);
CREATE INDEX idx_discussions_product_id ON public.discussions(product_id);
CREATE INDEX idx_discussions_is_approved ON public.discussions(is_approved);
CREATE INDEX idx_discussion_comments_discussion_id ON public.discussion_comments(discussion_id);
CREATE INDEX idx_discussion_comments_parent_id ON public.discussion_comments(parent_id);
CREATE INDEX idx_user_products_user_id ON public.user_products(user_id);
CREATE INDEX idx_user_products_product_id ON public.user_products(product_id);
CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supermarkets_updated_at BEFORE UPDATE ON public.supermarkets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.discussions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_comments_updated_at BEFORE UPDATE ON public.discussion_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check daily price uniqueness
CREATE OR REPLACE FUNCTION check_daily_price_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if a price already exists for this product/supermarket on the same day
    IF EXISTS (
        SELECT 1 FROM public.prices
        WHERE product_id = NEW.product_id
        AND supermarket_id = NEW.supermarket_id
        AND created_at::DATE = NEW.created_at::DATE
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
        RAISE EXCEPTION 'A price for this product at this supermarket already exists for today. Please update the existing price instead.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to enforce daily price uniqueness
CREATE TRIGGER enforce_daily_price_uniqueness
    BEFORE INSERT OR UPDATE ON public.prices
    FOR EACH ROW EXECUTE FUNCTION check_daily_price_uniqueness();
