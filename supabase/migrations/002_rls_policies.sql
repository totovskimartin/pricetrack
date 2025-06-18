-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarkets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin/moderator
CREATE OR REPLACE FUNCTION is_admin_or_moderator(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id 
        AND role IN ('admin', 'super_admin', 'moderator')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id 
        AND role IN ('admin', 'super_admin')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update user roles" ON public.users
    FOR UPDATE USING (is_admin(auth.uid()));

-- Supermarkets table policies (public read, admin write)
CREATE POLICY "Anyone can view active supermarkets" ON public.supermarkets
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all supermarkets" ON public.supermarkets
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage supermarkets" ON public.supermarkets
    FOR ALL USING (is_admin(auth.uid()));

-- Products table policies
CREATE POLICY "Anyone can view approved products" ON public.products
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view their own products" ON public.products
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Moderators can view all products" ON public.products
    FOR SELECT USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can create products" ON public.products
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own products" ON public.products
    FOR UPDATE USING (auth.uid() = created_by AND is_approved = false);

CREATE POLICY "Moderators can update any product" ON public.products
    FOR UPDATE USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Moderators can delete products" ON public.products
    FOR DELETE USING (is_admin_or_moderator(auth.uid()));

-- Prices table policies
CREATE POLICY "Anyone can view prices for approved products" ON public.prices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products 
            WHERE id = product_id AND is_approved = true
        )
    );

CREATE POLICY "Users can view their own price entries" ON public.prices
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Moderators can view all prices" ON public.prices
    FOR SELECT USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can add prices" ON public.prices
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own unverified prices" ON public.prices
    FOR UPDATE USING (auth.uid() = created_by AND is_verified = false);

CREATE POLICY "Moderators can update any price" ON public.prices
    FOR UPDATE USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Moderators can delete prices" ON public.prices
    FOR DELETE USING (is_admin_or_moderator(auth.uid()));

-- Discussions table policies
CREATE POLICY "Anyone can view approved discussions" ON public.discussions
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view their own discussions" ON public.discussions
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Moderators can view all discussions" ON public.discussions
    FOR SELECT USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can create discussions" ON public.discussions
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own discussions" ON public.discussions
    FOR UPDATE USING (auth.uid() = created_by AND is_approved = false);

CREATE POLICY "Moderators can update any discussion" ON public.discussions
    FOR UPDATE USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Moderators can delete discussions" ON public.discussions
    FOR DELETE USING (is_admin_or_moderator(auth.uid()));

-- Discussion comments table policies
CREATE POLICY "Anyone can view approved comments" ON public.discussion_comments
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view their own comments" ON public.discussion_comments
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Moderators can view all comments" ON public.discussion_comments
    FOR SELECT USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can create comments" ON public.discussion_comments
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own comments" ON public.discussion_comments
    FOR UPDATE USING (auth.uid() = created_by AND is_approved = false);

CREATE POLICY "Moderators can update any comment" ON public.discussion_comments
    FOR UPDATE USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Moderators can delete comments" ON public.discussion_comments
    FOR DELETE USING (is_admin_or_moderator(auth.uid()));

-- User products table policies
CREATE POLICY "Users can view their own tracked products" ON public.user_products
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tracked products" ON public.user_products
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user products" ON public.user_products
    FOR SELECT USING (is_admin(auth.uid()));

-- Admin logs table policies
CREATE POLICY "Admins can view admin logs" ON public.admin_logs
    FOR SELECT USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can create admin logs" ON public.admin_logs
    FOR INSERT WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
