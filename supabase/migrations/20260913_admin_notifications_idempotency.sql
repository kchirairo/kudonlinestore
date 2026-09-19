-- ==============================================================================
-- KUD Store - Admin Notification Center Explicit Idempotency Migration
-- Ensures atomic, database-backed idempotency for order, payment, and inventory events.
-- ==============================================================================

-- 1. Ensure fingerprint column exists and has a unique partial index
-- Guarantees that no duplicate notification can ever be inserted for the same logical event.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_notifications_fingerprint_unique
ON public.admin_notifications(fingerprint)
WHERE fingerprint IS NOT NULL AND fingerprint != '';

-- 2. Performance index on order_id and product_id for fast relational queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_order_id
ON public.admin_notifications(order_id)
WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_product_id
ON public.admin_notifications(product_id)
WHERE product_id IS NOT NULL;

-- 3. Replace public.create_admin_notification with atomic, non-expiring idempotency logic
CREATE OR REPLACE FUNCTION public.create_admin_notification(
    p_type TEXT,
    p_severity TEXT,
    p_title TEXT,
    p_message TEXT,
    p_user_id UUID DEFAULT NULL,
    p_order_id UUID DEFAULT NULL,
    p_product_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_fingerprint TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_existing_id UUID;
BEGIN
  -- If fingerprint is provided, check for existing notification first
  IF p_fingerprint IS NOT NULL AND TRIM(p_fingerprint) != '' THEN
    SELECT id INTO v_existing_id
    FROM public.admin_notifications
    WHERE fingerprint = TRIM(p_fingerprint)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN v_existing_id;
    END IF;
  END IF;

  -- Atomic insert with conflict safety
  BEGIN
    INSERT INTO public.admin_notifications (
      type,
      severity,
      title,
      message,
      user_id,
      order_id,
      product_id,
      metadata,
      fingerprint,
      is_read,
      created_at,
      updated_at
    ) VALUES (
      p_type,
      COALESCE(p_severity, 'info'),
      p_title,
      p_message,
      p_user_id,
      p_order_id,
      p_product_id,
      COALESCE(p_metadata, '{}'::jsonb),
      TRIM(p_fingerprint),
      false,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
  EXCEPTION 
    WHEN unique_violation THEN
      -- If a concurrent worker inserted with the same fingerprint, retrieve that ID
      IF p_fingerprint IS NOT NULL AND TRIM(p_fingerprint) != '' THEN
        SELECT id INTO v_existing_id
        FROM public.admin_notifications
        WHERE fingerprint = TRIM(p_fingerprint)
        LIMIT 1;
        RETURN v_existing_id;
      END IF;
      RETURN NULL;
    WHEN OTHERS THEN
      -- Notification failure must never block transactional operations
      RETURN NULL;
  END;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.create_admin_notification(TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, JSONB, TEXT) TO authenticated, service_role, anon;

COMMENT ON FUNCTION public.create_admin_notification IS 'Safely and idempotently creates an admin notification. Duplicate fingerprints return the existing notification ID.';
