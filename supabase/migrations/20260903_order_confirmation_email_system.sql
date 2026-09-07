-- ==============================================================================
-- KUD Store - Purchase Confirmation Email System Database Migration
-- Adds idempotent email tracking, audit metadata, and indexes to public.orders
-- ==============================================================================

-- 1. Add email tracking and payment reconciliation columns to public.orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_error TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_resend_count INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_last_attempt_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS yoco_checkout_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 2. Performance indexes for email status queries, payment verification, and webhook reconciliation
CREATE INDEX IF NOT EXISTS idx_orders_confirmation_email_sent ON public.orders(confirmation_email_sent);
CREATE INDEX IF NOT EXISTS idx_orders_yoco_checkout_id ON public.orders(yoco_checkout_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON public.orders(paid_at DESC);

-- 3. Comment descriptors for schema documentation
COMMENT ON COLUMN public.orders.confirmation_email_sent IS 'Flag indicating whether a verified purchase confirmation email was accepted by the transactional email provider.';
COMMENT ON COLUMN public.orders.confirmation_email_sent_at IS 'Timestamp when the purchase confirmation email was successfully dispatched.';
COMMENT ON COLUMN public.orders.confirmation_email_error IS 'Detailed error message if the transactional email provider rejected dispatch.';
COMMENT ON COLUMN public.orders.confirmation_email_resend_count IS 'Counter tracking how many times an administrator manually re-dispatched the confirmation email.';
COMMENT ON COLUMN public.orders.confirmation_email_last_attempt_at IS 'Timestamp of the most recent email dispatch attempt.';
COMMENT ON COLUMN public.orders.yoco_checkout_id IS 'Yoco hosted checkout reference ID for server-side verification and webhook reconciliation.';
COMMENT ON COLUMN public.orders.paid_at IS 'Timestamp when payment was successfully authorized and verified by payment gateway.';
