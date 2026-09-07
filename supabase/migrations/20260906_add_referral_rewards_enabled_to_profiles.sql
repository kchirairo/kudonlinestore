-- ==============================================================================
-- KUD Store - Customer Referral Rewards & Wallet Activation Control Migration
-- Adds referral_rewards_enabled column to public.profiles with default false
-- ==============================================================================

-- 1. Add referral_rewards_enabled to public.profiles (defaults to false for new & existing customers)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_rewards_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Performance index for querying customer referral activation state
CREATE INDEX IF NOT EXISTS idx_profiles_referral_rewards_enabled
ON public.profiles(referral_rewards_enabled);

-- 3. Document the column purpose
COMMENT ON COLUMN public.profiles.referral_rewards_enabled IS 'Administrative switch controlling whether Referral Rewards & Digital Store Wallet is activated for this specific customer. Defaults to false.';

-- 4. Secure Admin RPC: admin_set_referral_rewards_enabled(target_user_id uuid, enabled boolean)
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
  -- 1. Security check: caller must be service_role or admin in profiles
  IF auth.role() = 'service_role' THEN
    v_is_admin := TRUE;
  ELSE
    -- Verify via public.is_admin() if it exists
    IF EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace
    ) THEN
      BEGIN
        EXECUTE 'SELECT public.is_admin()' INTO v_is_admin;
      EXCEPTION WHEN OTHERS THEN
        v_is_admin := FALSE;
      END;
    END IF;

    -- Verify via caller profile role
    IF NOT v_is_admin AND auth.uid() IS NOT NULL THEN
      SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
      IF v_caller_role = 'admin' THEN
        v_is_admin := TRUE;
      END IF;
    END IF;
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied. Only store administrators can modify customer referral and wallet activation status.';
  END IF;

  -- 2. Update target customer profile
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

-- Grant execution to authenticated users and service_role (the function validates admin status internally)
GRANT EXECUTE ON FUNCTION public.admin_set_referral_rewards_enabled(UUID, BOOLEAN) TO authenticated, service_role;

-- 5. Tamper-Prevention Trigger: Block customers from modifying referral_rewards_enabled directly
CREATE OR REPLACE FUNCTION public.prevent_customer_referral_rewards_enabled_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.referral_rewards_enabled IS DISTINCT FROM OLD.referral_rewards_enabled THEN
    -- Allow service_role or admin callers
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
