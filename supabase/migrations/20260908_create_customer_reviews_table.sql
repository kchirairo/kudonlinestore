-- ==============================================================================
-- KUD ONLINE STORE - CUSTOMER REVIEWS DATABASE MIGRATION
-- Authoritative Schema: public.reviews with Foreign Key to public.products(id)
-- ==============================================================================

-- 1. Create public.reviews table
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

-- Ensure all columns exist seamlessly if table was already created
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON public.reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);

-- 3. Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 4. Public Select Policy: Anyone can read approved customer reviews
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
    ON public.reviews
    FOR SELECT
    TO anon, authenticated
    USING (is_approved = true);

-- 5. Customer Insert Policy: Authenticated users & guests can insert reviews for valid products
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

-- 6. Customer Update Policy: Only reviewer or admin can update review
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
    ON public.reviews
    FOR UPDATE
    TO authenticated, service_role
    USING (
        auth.uid() = user_id OR
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) OR
        auth.role() = 'service_role'
    )
    WITH CHECK (
        auth.uid() = user_id OR
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) OR
        auth.role() = 'service_role'
    );

-- 7. Admin Delete Policy: Only admins or authors can delete reviews
DROP POLICY IF EXISTS "Admins or authors can delete reviews" ON public.reviews;
CREATE POLICY "Admins or authors can delete reviews"
    ON public.reviews
    FOR DELETE
    TO authenticated, service_role
    USING (
        auth.uid() = user_id OR
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) OR
        auth.role() = 'service_role'
    );

-- 8. Grant privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
