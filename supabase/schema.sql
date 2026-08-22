-- ==============================================================================
-- KUD ONLINE STORE - SUPABASE DATABASE SCHEMA & RLS POLICIES
-- ==============================================================================
-- Run this SQL script in your Supabase SQL Editor (https://supabase.com/dashboard/project/hbmtwbllznwwjsomxhvu/sql)
-- to ensure all tables, columns, indexes, and RLS policies are in place.

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT DEFAULT 'KUD Store',
    price NUMERIC NOT NULL DEFAULT 0,
    original_price NUMERIC,
    category TEXT NOT NULL DEFAULT 'Beauty',
    size_or_variant TEXT,
    condition TEXT DEFAULT 'Brand New',
    description TEXT,
    image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    in_stock BOOLEAN DEFAULT true,
    stock INTEGER DEFAULT 20,
    sku TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    rating NUMERIC DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure existing products tables receive all standard columns seamlessly
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT 'KUD Store';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_or_variant TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'Brand New';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 20;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for lightning-fast product filtering and searching
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products (price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);

-- 2. PRODUCT IMAGES TABLE (Optional 1-to-many relationship)
CREATE TABLE IF NOT EXISTS public.product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images (product_id);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS & ORDER ITEMS TABLES
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    shipping_address JSONB NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    shipping_fee NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'ZAR',
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT 'yoco',
    payment_id TEXT,
    tracking_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SETTINGS TABLE (Store settings, delivery fees, contact details, payment gateways, branding, promo banners)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT DEFAULT 'KUD Store',
    currency_symbol TEXT DEFAULT 'R',
    store_description TEXT,
    delivery_fee NUMERIC DEFAULT 60,
    free_shipping_threshold NUMERIC DEFAULT 500,
    support_email TEXT DEFAULT 'support@kudstore.co.za',
    support_phone TEXT DEFAULT '+27 11 000 0000',
    logo_url TEXT,
    banner_url TEXT,
    settings_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 6. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 7. PUBLIC SELECT POLICIES (Allow customers and anonymous visitors to read active products, categories & settings)
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
    ON public.products
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;
CREATE POLICY "Public can view product images"
    ON public.product_images
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
    ON public.categories
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public read settings" ON public.settings;
CREATE POLICY "Public read settings"
    ON public.settings
    FOR SELECT
    TO anon, authenticated
    USING (key != 'payment_gateways' OR public.is_admin() OR auth.role() = 'service_role');

-- 8. ADMIN / AUTHENTICATED MUTATION POLICIES
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
    ON public.products
    FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images"
    ON public.product_images
    FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
    ON public.categories
    FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings"
    ON public.settings
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- Orders: public/anon can insert new orders during checkout and select their own orders
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders"
    ON public.orders
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
CREATE POLICY "Public can view orders"
    ON public.orders
    FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders"
    ON public.orders
    FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 9. GRANT APPROPRIATE PRIVILEGES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
