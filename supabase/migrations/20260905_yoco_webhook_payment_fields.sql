-- ==============================================================================
-- KUD Store - Yoco Webhook Payment Reconciliation Migration
-- Adds payment_provider and payment_reference columns with performance indexes
-- ==============================================================================

-- 1. Ensure orders table has payment provider and verified payment reference fields
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'yoco';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS yoco_checkout_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 2. Indexes for instant lookup by payment reference and checkout ID
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON public.orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_payment_provider ON public.orders(payment_provider);
CREATE INDEX IF NOT EXISTS idx_orders_yoco_checkout_id ON public.orders(yoco_checkout_id);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON public.orders(paid_at DESC);

-- 3. Comment descriptors
COMMENT ON COLUMN public.orders.payment_provider IS 'Identifier of the payment gateway processing the charge (e.g., yoco).';
COMMENT ON COLUMN public.orders.payment_reference IS 'Verified external payment ID or transaction reference returned by Yoco.';
