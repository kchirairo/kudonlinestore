-- ==============================================================================
-- KUD Store: Dedicated Product Media Management Database Migration
-- Creates public.product_media table with full 1-to-many relationship with public.products.
-- Supports individual images and videos with position, primary flag, alt text, and thumbnail.
-- ==============================================================================

-- 1. Create public.product_media table
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

-- Ensure all columns exist seamlessly if table was partially created
ALTER TABLE public.product_media ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.product_media ADD COLUMN IF NOT EXISTS alt_text TEXT;
ALTER TABLE public.product_media ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.product_media ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE public.product_media ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
ALTER TABLE public.product_media ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE public.product_media ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;
ALTER TABLE public.product_media ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.product_media ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON public.product_media (product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_position ON public.product_media (product_id, position);
CREATE INDEX IF NOT EXISTS idx_product_media_is_primary ON public.product_media (product_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_product_media_media_type ON public.product_media (media_type);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

-- 4. Public Select Policy (Allows customers and storefront visitors to view all product media)
DROP POLICY IF EXISTS "Public can view product media" ON public.product_media;
CREATE POLICY "Public can view product media"
    ON public.product_media
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 5. Admin / Authenticated Full Access Policy (Allows store admins and backend services to manage media)
DROP POLICY IF EXISTS "Admins can manage product media" ON public.product_media;
CREATE POLICY "Admins can manage product media"
    ON public.product_media
    FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 6. Permissions Grants
GRANT SELECT ON public.product_media TO anon, authenticated;
GRANT ALL ON public.product_media TO authenticated, service_role;

-- 7. Backfill existing product images from public.products into public.product_media
DO $$
DECLARE
    prod RECORD;
    img_elem JSONB;
    img_idx INT;
    has_media BOOLEAN;
BEGIN
    FOR prod IN SELECT id, images, image_url FROM public.products LOOP
        SELECT EXISTS (
            SELECT 1 FROM public.product_media WHERE product_id = prod.id
        ) INTO has_media;

        IF NOT has_media THEN
            img_idx := 0;
            IF prod.images IS NOT NULL AND jsonb_typeof(prod.images) = 'array' AND jsonb_array_length(prod.images) > 0 THEN
                FOR img_elem IN SELECT * FROM jsonb_array_elements_text(prod.images) LOOP
                    IF img_elem IS NOT NULL AND length(trim(both '"' from img_elem::text)) > 0 THEN
                        INSERT INTO public.product_media (
                            product_id, media_type, media_url, position, is_primary, alt_text
                        ) VALUES (
                            prod.id,
                            'image',
                            trim(both '"' from img_elem::text),
                            img_idx,
                            img_idx = 0,
                            'Product photo ' || (img_idx + 1)
                        );
                        img_idx := img_idx + 1;
                    END IF;
                END LOOP;
            ELSIF prod.image_url IS NOT NULL AND length(trim(prod.image_url)) > 0 THEN
                INSERT INTO public.product_media (
                    product_id, media_type, media_url, position, is_primary, alt_text
                ) VALUES (
                    prod.id,
                    'image',
                    trim(prod.image_url),
                    0,
                    true,
                    'Product photo 1'
                );
            END IF;
        END IF;
    END LOOP;
END $$;
