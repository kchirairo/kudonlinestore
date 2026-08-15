-- ==============================================================================
-- KUD Store: Supabase Storage Bucket & RLS Policies Setup
-- Bucket: product-images (Public)
-- ==============================================================================

-- 1. Create 'product-images' bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760, -- 10MB file size limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];

-- 2. Drop existing policies if needed to avoid conflicts
DROP POLICY IF EXISTS "Public Access product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete product-images" ON storage.objects;

-- 3. Policy: Allow public read access to product-images
CREATE POLICY "Public Read product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 4. Policy: Allow authenticated users / admins to upload images to product-images
CREATE POLICY "Authenticated Upload product-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- 5. Policy: Allow authenticated users / admins to update images in product-images
CREATE POLICY "Authenticated Update product-images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- 6. Policy: Allow authenticated users / admins to delete images in product-images
CREATE POLICY "Authenticated Delete product-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);
