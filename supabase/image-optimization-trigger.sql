-- ==============================================================================
-- KUD Store: Supabase Database Webhook & Trigger for Automatic WebP Image Optimization
-- Automatically triggers the 'optimize-product-images' Supabase Edge Function
-- to generate web-friendly WebP versions whenever a product image is uploaded/updated.
-- ==============================================================================

-- 1. Ensure required extensions are active (for async HTTP requests from Postgres)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Function to invoke the Supabase Edge Function on product image change
CREATE OR REPLACE FUNCTION public.trigger_optimize_product_image()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text;
  v_anon_key text;
  v_image_url text;
  v_payload jsonb;
  v_request_id bigint;
BEGIN
  -- Determine the target image URL
  v_image_url := NEW.image_url;
  IF v_image_url IS NULL AND NEW.images IS NOT NULL AND jsonb_array_length(to_jsonb(NEW.images)) > 0 THEN
    v_image_url := NEW.images[1];
  END IF;

  -- Only trigger if an image URL exists and is not already an optimized WebP
  IF v_image_url IS NOT NULL 
     AND v_image_url != '' 
     AND v_image_url NOT LIKE '%-optimized.webp' 
     AND (v_image_url NOT LIKE '%.webp%' OR v_image_url NOT LIKE '%optimized%') THEN

    -- Fetch configured project settings or use default edge function endpoint
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
      v_supabase_url := 'https://hbmtwbllznwwjsomxhvu.supabase.co';
    END IF;

    v_anon_key := current_setting('app.settings.supabase_anon_key', true);
    IF v_anon_key IS NULL OR v_anon_key = '' THEN
      v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibXR3Ymxsem53d2pzb214aHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwMjk2MjksImV4cCI6MjA1NTYwNTYyOX0.Z_W5U089P3nF9U3C_95j1W-m3l5Y_o5D2jX6w';
    END IF;

    -- Build Webhook Payload
    v_payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'productId', NEW.id,
      'imageUrl', v_image_url,
      'record', row_to_json(NEW)
    );

    -- Dispatch asynchronous HTTP POST to Edge Function using pg_net
    BEGIN
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/optimize-product-images',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon_key,
          'apikey', v_anon_key
        ),
        body := v_payload
      ) INTO v_request_id;
    EXCEPTION WHEN OTHERS THEN
      -- Log warning without breaking the transaction
      RAISE WARNING 'Image optimization trigger HTTP request failed: %', SQLERRM;
    END;

  END IF;

  RETURN NEW;
END;
$$;

-- 3. Drop existing trigger if present to avoid duplicate triggers
DROP TRIGGER IF EXISTS trg_optimize_product_image ON public.products;

-- 4. Attach trigger to 'public.products' table on INSERT and UPDATE
CREATE TRIGGER trg_optimize_product_image
AFTER INSERT OR UPDATE OF image_url, images ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.trigger_optimize_product_image();

-- ==============================================================================
-- Alternative: Supabase Dashboard UI Database Webhook Configuration
-- ==============================================================================
-- You can also create a Database Webhook via the Supabase Dashboard:
-- 1. Navigate to: Dashboard -> Database -> Webhooks -> "Create a webhook"
-- 2. Name: "optimize_product_image_webhook"
-- 3. Table: "public.products"
-- 4. Events: Check "Insert" and "Update"
-- 5. Webhook Type: "Supabase Edge Functions"
-- 6. Edge Function: Select "optimize-product-images"
-- 7. HTTP Method: POST
-- ==============================================================================
