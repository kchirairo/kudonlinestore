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

-- 2. DEDICATED PRODUCT MEDIA TABLE (Images & Videos with Position, Alt Text, and Primary Flag)
CREATE TABLE IF NOT EXISTS public.product_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text TEXT,
    title TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    size_bytes BIGINT,
    duration_seconds NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON public.product_media (product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_position ON public.product_media (product_id, position);
CREATE INDEX IF NOT EXISTS idx_product_media_is_primary ON public.product_media (product_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_product_media_media_type ON public.product_media (media_type);

-- Legacy product_images table support (backward compatibility)
CREATE TABLE IF NOT EXISTS public.product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images (product_id);

-- 2.3 CUSTOMER REVIEWS TABLE (Authoritative reviews.product_id -> products.id relationship)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT NOT NULL,
    comment TEXT NOT NULL,
    verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON public.reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

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
    confirmation_email_sent BOOLEAN DEFAULT false,
    confirmation_email_sent_at TIMESTAMPTZ,
    confirmation_email_error TEXT,
    confirmation_email_resend_count INTEGER DEFAULT 0,
    confirmation_email_last_attempt_at TIMESTAMPTZ,
    payment_provider TEXT DEFAULT 'yoco',
    payment_reference TEXT,
    yoco_checkout_id TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure orders table receives payment tracking and confirmation email columns safely
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'yoco';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS yoco_checkout_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_error TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_resend_count INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_last_attempt_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON public.orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_payment_provider ON public.orders(payment_provider);
CREATE INDEX IF NOT EXISTS idx_orders_yoco_checkout_id ON public.orders(yoco_checkout_id);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON public.orders(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_confirmation_email_sent ON public.orders(confirmation_email_sent);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

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
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 7. PUBLIC SELECT POLICIES (Allow customers and anonymous visitors to read active products, categories & settings)
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
    ON public.reviews
    FOR SELECT
    TO anon, authenticated
    USING (is_approved = true);

DROP POLICY IF EXISTS "Customers can insert reviews" ON public.reviews;
CREATE POLICY "Customers can insert reviews"
    ON public.reviews
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (
        product_id IS NOT NULL AND
        rating >= 1 AND rating <= 5 AND
        length(customer_name) > 0 AND
        length(comment) > 0
    );
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
    ON public.products
    FOR SELECT
    TO anon, authenticated, service_role
    USING (is_active = true OR public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public can view product media" ON public.product_media;
CREATE POLICY "Public can view product media"
    ON public.product_media
    FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;
CREATE POLICY "Public can view product images"
    ON public.product_images
    FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
    ON public.categories
    FOR SELECT
    TO anon, authenticated, service_role
    USING (is_active = true OR public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read settings" ON public.settings;
DROP POLICY IF EXISTS "Admins and service role can read settings" ON public.settings;
CREATE POLICY "Admins and service role can read settings"
    ON public.settings
    FOR SELECT
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role');

CREATE OR REPLACE VIEW public.store_settings_public AS
SELECT 
    id,
    store_name,
    currency_symbol,
    store_description,
    delivery_fee,
    free_shipping_threshold,
    support_email,
    support_phone,
    logo_url,
    banner_url,
    created_at,
    updated_at
FROM public.settings;

GRANT SELECT ON public.store_settings_public TO anon, authenticated, service_role;

-- 8. ADMIN / AUTHENTICATED MUTATION POLICIES (HARDENED)
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
    ON public.products
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can manage product media" ON public.product_media;
CREATE POLICY "Admins can manage product media"
    ON public.product_media
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images"
    ON public.product_images
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
    ON public.categories
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings"
    ON public.settings
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- Orders: Only own orders for customers, all for admins/service_role
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders and admins view all" ON public.orders;
CREATE POLICY "Users can view own orders and admins view all"
    ON public.orders
    FOR SELECT
    TO authenticated, anon, service_role
    USING (
      public.is_admin() 
      OR auth.role() = 'service_role'
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders"
    ON public.orders
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (
      auth.role() = 'service_role'
      OR public.is_admin()
      OR (
        payment_status IN ('pending', 'unpaid')
        AND status IN ('pending', 'awaiting_payment')
        AND (user_id IS NULL OR user_id = auth.uid())
        AND total >= 0
      )
    );

DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders"
    ON public.orders
    FOR UPDATE
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
    ON public.orders
    FOR DELETE
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role');

-- Order Payment Tamper Prevention Trigger
CREATE OR REPLACE FUNCTION public.prevent_order_payment_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF (NEW.payment_status IN ('paid', 'completed') AND OLD.payment_status NOT IN ('paid', 'completed')) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security Policy Violation: Orders can only be marked as paid via verified Yoco webhook or server-side payment service.';
    END IF;
  END IF;

  IF NEW.total IS DISTINCT FROM OLD.total THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security Policy Violation: Order totals cannot be altered post-checkout.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_order_payment_tampering ON public.orders;
CREATE TRIGGER trg_prevent_order_payment_tampering
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_order_payment_tampering();

-- Profile Role Escalation Prevention Trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security Policy Violation: Customers are strictly forbidden from modifying profile roles.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 9. GRANT APPROPRIATE PRIVILEGES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- 10. CUSTOMER DEMOGRAPHICS & CONTACT DETAILS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;

-- 11. CUSTOMER REFERRAL REWARDS & WALLET ACTIVATION CONTROL
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_rewards_enabled BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_profiles_referral_rewards_enabled ON public.profiles(referral_rewards_enabled);

-- Secure Admin RPC to toggle customer referral rewards & wallet
CREATE OR REPLACE FUNCTION public.admin_set_referral_rewards_enabled(
    target_user_id UUID,
    enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  IF auth.role() = 'service_role' THEN
    v_is_admin := TRUE;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace
    ) THEN
      BEGIN
        EXECUTE 'SELECT public.is_admin()' INTO v_is_admin;
      EXCEPTION WHEN OTHERS THEN
        v_is_admin := FALSE;
      END;
    END IF;

    IF NOT v_is_admin AND auth.uid() IS NOT NULL THEN
      SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
      IF v_caller_role = 'admin' THEN
        v_is_admin := TRUE;
      END IF;
    END IF;
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied. Only store administrators can modify referral and wallet activation status.';
  END IF;

  UPDATE public.profiles
  SET 
    referral_rewards_enabled = enabled,
    referral_rewards = jsonb_set(
      COALESCE(referral_rewards, '{}'::jsonb),
      '{referral_rewards_enabled}',
      to_jsonb(enabled)
    ),
    updated_at = timezone('utc'::text, now())
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer profile not found for target_user_id: %', target_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'target_user_id', target_user_id,
    'referral_rewards_enabled', enabled,
    'updated_at', timezone('utc'::text, now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_referral_rewards_enabled(UUID, BOOLEAN) TO authenticated, service_role;

-- Tamper-prevention trigger on public.profiles
CREATE OR REPLACE FUNCTION public.prevent_customer_referral_rewards_enabled_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.referral_rewards_enabled IS DISTINCT FROM OLD.referral_rewards_enabled THEN
    IF auth.role() != 'service_role' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
      ) THEN
        RAISE EXCEPTION 'Permission denied: Customers cannot modify referral_rewards_enabled.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_customer_referral_rewards_enabled ON public.profiles;
CREATE TRIGGER trg_prevent_customer_referral_rewards_enabled
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_customer_referral_rewards_enabled_modification();
