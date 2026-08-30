-- ==============================================================================
-- KUD Store: Advanced E-Commerce Product Management Database Migration
-- Adds full native PostgreSQL column support for variants, multi-media, category attributes,
-- cost pricing & profit calculation, inventory threshold tracking, SEO, and shipping specifications.
-- ==============================================================================

-- 1. Extend public.products table with advanced e-commerce fields
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS profit_margin NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allow_backorders BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_attributes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dimensions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_class TEXT DEFAULT 'Standard Courier';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_free_shipping BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS requires_shipping BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS focus_keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_alt_texts JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_status TEXT DEFAULT 'active';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- 2. Performance indexes for SKU uniqueness and fast lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_product_status ON public.products (product_status);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products (stock);
