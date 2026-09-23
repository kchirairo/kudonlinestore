-- ==============================================================================
-- ADD AGE, PHONE, AND GENDER TO PUBLIC.PROFILES
-- ==============================================================================
-- This migration adds customer demographic and contact fields to public.profiles:
-- 1. phone (Text format with South African / international formatting)
-- 2. age (Integer format with customer range validation)
-- 3. gender (Text format: 'Male' or 'Female')

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;

-- Validation check constraint for gender values if specified
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_gender_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_gender_check
      CHECK (gender IS NULL OR gender IN ('Male', 'Female'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.phone IS 'Customer mobile or contact telephone number.';
COMMENT ON COLUMN public.profiles.age IS 'Customer age in years (13 - 120).';
COMMENT ON COLUMN public.profiles.gender IS 'Customer gender identification (strictly Male or Female).';
