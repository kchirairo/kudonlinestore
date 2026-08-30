-- ==============================================================================
-- KUD Store Marketing & Social Commerce Analytics Migration
-- Tracks attribution from Instagram, Facebook, and TikTok across the shopping funnel
-- ==============================================================================

-- 1. Create marketing_events table to log product views, cart additions, checkout initiations, and confirmed purchases
CREATE TABLE IF NOT EXISTS public.marketing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'view_product', 'add_to_cart', 'initiate_checkout', 'purchase'
  platform TEXT NOT NULL DEFAULT 'direct', -- 'instagram', 'facebook', 'tiktok', 'whatsapp', 'google', 'direct', 'other'
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  product_id TEXT,
  product_name TEXT,
  order_id TEXT,
  order_number TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  user_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance indexes for fast date-range filtering, platform queries, and campaign aggregation
CREATE INDEX IF NOT EXISTS idx_marketing_events_created_at ON public.marketing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_events_platform ON public.marketing_events(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_events_event_type ON public.marketing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_marketing_events_campaign ON public.marketing_events(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_marketing_events_session ON public.marketing_events(session_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_product_id ON public.marketing_events(product_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone (visitors, customers, checkout sessions) to insert marketing events
DROP POLICY IF EXISTS "Allow public insert to marketing_events" ON public.marketing_events;
CREATE POLICY "Allow public insert to marketing_events"
  ON public.marketing_events
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users and admins to read events
DROP POLICY IF EXISTS "Allow authenticated read marketing_events" ON public.marketing_events;
CREATE POLICY "Allow authenticated read marketing_events"
  ON public.marketing_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous read for public storefront analytics if needed
DROP POLICY IF EXISTS "Allow anon read marketing_events" ON public.marketing_events;
CREATE POLICY "Allow anon read marketing_events"
  ON public.marketing_events
  FOR SELECT
  TO anon
  USING (true);

-- 4. Add attribution columns to public.orders table to preserve campaign lineage upon purchase
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'traffic_source') THEN
    ALTER TABLE public.orders ADD COLUMN traffic_source TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'utm_source') THEN
    ALTER TABLE public.orders ADD COLUMN utm_source TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'utm_medium') THEN
    ALTER TABLE public.orders ADD COLUMN utm_medium TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'utm_campaign') THEN
    ALTER TABLE public.orders ADD COLUMN utm_campaign TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'utm_content') THEN
    ALTER TABLE public.orders ADD COLUMN utm_content TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'utm_term') THEN
    ALTER TABLE public.orders ADD COLUMN utm_term TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'session_id') THEN
    ALTER TABLE public.orders ADD COLUMN session_id TEXT;
  END IF;
END $$;
