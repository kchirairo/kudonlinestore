import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@v1.3.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET_NAME = 'product-images';
const MAX_IMAGE_WIDTH = 1200;
const WEBP_QUALITY = 82;

interface WebhookPayload {
  type?: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  table?: string;
  schema?: string;
  record?: Record<string, any>;
  old_record?: Record<string, any>;
  imageUrl?: string;
  productId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      Deno.env.get('SUPABASE_ANON_KEY') ||
      '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function environment.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse incoming webhook body
    const body: WebhookPayload = await req.json().catch(() => ({}));
    console.log('[Optimize-Image] Webhook trigger received:', JSON.stringify(body));

    let targetImageUrl: string | null = null;
    let productId: string | null = null;

    // 1. Direct invocation with imageUrl & productId
    if (body.imageUrl) {
      targetImageUrl = body.imageUrl;
      productId = body.productId || null;
    }
    // 2. Database Webhook from 'public.products'
    else if (body.table === 'products' && body.record) {
      productId = body.record.id || null;
      targetImageUrl = body.record.image_url || (Array.isArray(body.record.images) ? body.record.images[0] : null);
    }
    // 3. Database Webhook from 'public.product_images'
    else if (body.table === 'product_images' && body.record) {
      productId = body.record.product_id || null;
      targetImageUrl = body.record.image_url || null;
    }
    // 4. Storage Webhook from 'storage.objects'
    else if (body.table === 'objects' && body.record) {
      const bucketId = body.record.bucket_id;
      const objectName = body.record.name;
      if (bucketId === BUCKET_NAME && objectName) {
        const { data: publicData } = supabase.storage.from(bucketId).getPublicUrl(objectName);
        targetImageUrl = publicData?.publicUrl || null;
      }
    }
    // 5. Generic record fallback
    else if (body.record) {
      productId = body.record.id || body.record.productId || null;
      targetImageUrl = body.record.image_url || body.record.imageUrl || body.record.image || null;
    }

    if (!targetImageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No eligible image URL found in webhook payload.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip if already an optimized WebP
    if (targetImageUrl.endsWith('-optimized.webp') || (targetImageUrl.endsWith('.webp') && targetImageUrl.includes('optimized'))) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Image is already optimized as WebP.',
          url: targetImageUrl,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Optimize-Image] Processing image: ${targetImageUrl}`);

    // Fetch original image binary
    const imageResponse = await fetch(targetImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch original image: HTTP ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const originalBytes = imageArrayBuffer.byteLength;
    const imageUint8 = new Uint8Array(imageArrayBuffer);

    // Decode and process image using ImageScript
    const decodedImage = await Image.decode(imageUint8);
    const originalWidth = decodedImage.width;
    const originalHeight = decodedImage.height;

    // Resize if wider than MAX_IMAGE_WIDTH while maintaining aspect ratio
    if (decodedImage.width > MAX_IMAGE_WIDTH) {
      const targetHeight = Math.round((MAX_IMAGE_WIDTH / decodedImage.width) * decodedImage.height);
      decodedImage.resize(MAX_IMAGE_WIDTH, targetHeight);
    }

    // Encode to WebP format
    const webpUint8 = await decodedImage.encodeWEBP(WEBP_QUALITY);
    const optimizedBytes = webpUint8.byteLength;
    const savedPercentage = Math.max(0, Math.round(((originalBytes - optimizedBytes) / originalBytes) * 100));

    // Construct unique WebP path in storage
    const urlObj = new URL(targetImageUrl);
    const pathParts = urlObj.pathname.split('/');
    const originalFileName = pathParts.pop() || `img_${Date.now()}.jpg`;
    const cleanBaseName = originalFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const optimizedStoragePath = `products/${cleanBaseName}-optimized.webp`;

    console.log(`[Optimize-Image] Uploading optimized WebP to "${BUCKET_NAME}/${optimizedStoragePath}"...`);

    // Upload optimized WebP to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(optimizedStoragePath, webpUint8, {
        contentType: 'image/webp',
        cacheControl: '31536000, immutable',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload optimized WebP to Supabase Storage: ${uploadError.message}`);
    }

    // Get public URL of optimized WebP
    const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(optimizedStoragePath);
    const optimizedWebpUrl = publicUrlData?.publicUrl || '';

    // Update database record if productId is available
    if (productId && optimizedWebpUrl) {
      console.log(`[Optimize-Image] Updating product "${productId}" with optimized WebP URL...`);

      // 1. Fetch current product record
      const { data: currentProduct } = await supabase
        .from('products')
        .select('images, image_url')
        .eq('id', productId)
        .maybeSingle();

      let updatedImages: string[] = [optimizedWebpUrl];
      if (currentProduct?.images && Array.isArray(currentProduct.images)) {
        updatedImages = currentProduct.images.map((img: string) =>
          img === targetImageUrl ? optimizedWebpUrl : img
        );
        if (!updatedImages.includes(optimizedWebpUrl)) {
          updatedImages.unshift(optimizedWebpUrl);
        }
      }

      await supabase
        .from('products')
        .update({
          image_url: optimizedWebpUrl,
          images: updatedImages,
        })
        .eq('id', productId);

      // 2. Also update product_images table if exists
      try {
        await supabase
          .from('product_images')
          .update({ image_url: optimizedWebpUrl })
          .eq('product_id', productId)
          .eq('image_url', targetImageUrl);
      } catch {
        // Optional table
      }
    }

    const responsePayload = {
      success: true,
      originalUrl: targetImageUrl,
      optimizedWebpUrl,
      stats: {
        originalWidth,
        originalHeight,
        optimizedWidth: decodedImage.width,
        optimizedHeight: decodedImage.height,
        originalSizeBytes: originalBytes,
        optimizedSizeBytes: optimizedBytes,
        savedPercentage: `${savedPercentage}%`,
        format: 'image/webp',
      },
      productId: productId || null,
    };

    console.log('[Optimize-Image] Optimization complete:', responsePayload.stats);

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Optimize-Image] Exception:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Image optimization failed',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
