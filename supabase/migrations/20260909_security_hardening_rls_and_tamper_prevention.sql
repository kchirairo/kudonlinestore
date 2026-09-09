-- ============================================================================
-- KUD STORE: AUTHORITATIVE SECURITY HARDENING & TAMPER PREVENTIONS
-- Migration: 20260909_security_hardening_rls_and_tamper_prevention.sql
-- ============================================================================

-- 1. VERIFY AND HARDEN public.is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_role TEXT;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = v_uid;

  RETURN (COALESCE(v_role, '') = 'admin');
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 2. HARDEN PRODUCTS & PRODUCT MEDIA
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Product Read: Storefront visitors can only view active products. Admins view all.
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
    ON public.products
    FOR SELECT
    TO anon, authenticated, service_role
    USING (is_active = true OR public.is_admin() OR auth.role() = 'service_role');

-- Product Mutation: ONLY verified admins or service_role can insert/update/delete.
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
    ON public.products
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- Product Media Read & Manage
DROP POLICY IF EXISTS "Public can view product media" ON public.product_media;
CREATE POLICY "Public can view product media"
    ON public.product_media
    FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Admins can manage product media" ON public.product_media;
CREATE POLICY "Admins can manage product media"
    ON public.product_media
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- Legacy Product Images Read & Manage
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;
CREATE POLICY "Public can view product images"
    ON public.product_images
    FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images"
    ON public.product_images
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- 3. HARDEN CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
    ON public.categories
    FOR SELECT
    TO anon, authenticated, service_role
    USING (is_active = true OR public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
    ON public.categories
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- Support public.product_categories if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_categories') THEN
    EXECUTE 'ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view product categories" ON public.product_categories';
    EXECUTE 'CREATE POLICY "Public can view product categories" ON public.product_categories FOR SELECT TO anon, authenticated, service_role USING (is_active = true OR public.is_admin() OR auth.role() = ''service_role'')';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage product categories" ON public.product_categories';
    EXECUTE 'CREATE POLICY "Admins can manage product categories" ON public.product_categories FOR ALL TO authenticated, service_role USING (public.is_admin() OR auth.role() = ''service_role'') WITH CHECK (public.is_admin() OR auth.role() = ''service_role'')';
  END IF;
END $$;

-- 4. HARDEN PROFILES & PREVENT ROLE ESCALATION
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile and admins read all" ON public.profiles;
CREATE POLICY "Users can read own profile and admins read all"
    ON public.profiles
    FOR SELECT
    TO authenticated, service_role
    USING (id = auth.uid() OR public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated, service_role
    WITH CHECK (id = auth.uid() OR public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated, service_role
    USING (id = auth.uid() OR public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (id = auth.uid() OR public.is_admin() OR auth.role() = 'service_role');

-- BEFORE UPDATE trigger preventing customer self-elevation to admin
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

  -- Block any non-admin from modifying role
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

-- BEFORE INSERT trigger ensuring new profiles default to customer unless inserted by admin/service_role
CREATE OR REPLACE FUNCTION public.default_profile_role_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'admin' AND NOT public.is_admin() THEN
    NEW.role := 'customer';
  END IF;

  IF NEW.role IS NULL THEN
    NEW.role := 'customer';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_profile_role_on_insert ON public.profiles;
CREATE TRIGGER trg_default_profile_role_on_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.default_profile_role_on_insert();

-- 5. HARDEN SETTINGS & PROTECT CONFIGURATION
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Raw table is accessible only to admins and backend services
DROP POLICY IF EXISTS "Public read settings" ON public.settings;
DROP POLICY IF EXISTS "Admins and service role can read settings" ON public.settings;
CREATE POLICY "Admins and service role can read settings"
    ON public.settings
    FOR SELECT
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings"
    ON public.settings
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- Secure public view for storefront display (store name, currency, delivery fee, threshold, branding)
-- NEVER includes settings_data or sensitive credentials
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

-- 6. HARDEN ORDERS & PAYMENT STATUS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order Read: Admins and service_role see all orders. Registered customers see ONLY their own orders.
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

-- Order Mutation: ONLY admins or service_role can update or delete orders.
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

-- Order Insert: Customers and checkout sessions can insert orders, BUT only with initial pending status.
-- Cannot insert an order pre-marked as 'paid' or 'completed'.
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

-- Tamper-prevention trigger on public.orders:
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

  -- Block non-service-role from marking an order as paid
  IF (NEW.payment_status IN ('paid', 'completed') AND OLD.payment_status NOT IN ('paid', 'completed')) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security Policy Violation: Orders can only be marked as paid via verified Yoco webhook or server-side payment service.';
    END IF;
  END IF;

  -- Block non-admin from altering the financial total of an existing order
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

-- 7. SECURE GUEST ORDER TRACKING RPC
CREATE OR REPLACE FUNCTION public.get_guest_order_by_reference(
    p_order_identifier TEXT,
    p_contact_email_or_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_id TEXT;
    v_clean_contact TEXT;
    v_order RECORD;
BEGIN
    v_clean_id := trim(replace(p_order_identifier, '#', ''));
    v_clean_contact := lower(trim(p_contact_email_or_phone));

    IF length(v_clean_id) = 0 OR length(v_clean_contact) = 0 THEN
        RETURN NULL;
    END IF;

    SELECT 
        id,
        order_number,
        status,
        payment_status,
        payment_method,
        subtotal,
        shipping_fee,
        discount,
        total,
        currency,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        items,
        tracking_number,
        created_at,
        paid_at
    INTO v_order
    FROM public.orders
    WHERE (id::text = v_clean_id OR lower(order_number) = lower(v_clean_id))
      AND (lower(customer_email) = v_clean_contact OR customer_phone = p_contact_email_or_phone)
    LIMIT 1;

    IF v_order.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN to_jsonb(v_order);
END;
$$;

REVOKE ALL ON FUNCTION public.get_guest_order_by_reference FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_order_by_reference TO anon, authenticated, service_role;

-- 8. HARDEN REVIEWS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
    ON public.reviews
    FOR SELECT
    TO anon, authenticated, service_role
    USING (is_approved = true OR public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Customers can insert reviews" ON public.reviews;
CREATE POLICY "Customers can insert reviews"
    ON public.reviews
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (
        product_id IS NOT NULL AND
        rating >= 1 AND rating <= 5 AND
        length(customer_name) > 0 AND
        length(comment) > 0 AND
        (user_id IS NULL OR user_id = auth.uid() OR public.is_admin())
    );

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
    ON public.reviews
    FOR UPDATE
    TO authenticated, service_role
    USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        public.is_admin() OR
        auth.role() = 'service_role'
    )
    WITH CHECK (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        public.is_admin() OR
        auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Admins or authors can delete reviews" ON public.reviews;
CREATE POLICY "Admins or authors can delete reviews"
    ON public.reviews
    FOR DELETE
    TO authenticated, service_role
    USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        public.is_admin() OR
        auth.role() = 'service_role'
    );

-- Trigger: Non-admins cannot alter is_approved status on reviews
CREATE OR REPLACE FUNCTION public.prevent_customer_review_approval_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security Policy Violation: Only store administrators can approve or moderate customer reviews.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_customer_review_approval_tampering ON public.reviews;
CREATE TRIGGER trg_prevent_customer_review_approval_tampering
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.prevent_customer_review_approval_tampering();

-- 9. HARDEN MARKETING EVENTS
ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read marketing_events" ON public.marketing_events;
DROP POLICY IF EXISTS "Allow anon read marketing_events" ON public.marketing_events;
CREATE POLICY "Admins and service role can read marketing events"
    ON public.marketing_events
    FOR SELECT
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow public insert to marketing_events" ON public.marketing_events;
CREATE POLICY "Allow public insert to marketing_events"
    ON public.marketing_events
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (
        event_type IN ('view_product', 'add_to_cart', 'initiate_checkout', 'purchase', 'page_view', 'category_view', 'search')
        AND length(session_id) > 0 AND length(session_id) <= 128
        AND length(platform) <= 64
        AND pg_column_size(metadata) < 10000
    );

CREATE POLICY "Admins can manage marketing events"
    ON public.marketing_events
    FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');
