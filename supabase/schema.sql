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

-- 5. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 6. PUBLIC SELECT POLICIES (Allow customers and anonymous visitors to read active products)
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

-- 7. ADMIN / AUTHENTICATED MUTATION POLICIES
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

-- 8. GRANT APPROPRIATE PRIVILEGES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
