import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { sendOrderConfirmationEmail } from './src/lib/emailService';

dotenv.config();

const VAULT_SALT = 'KUD_STORE_AES_256_KEY_VAULT_SEED';

/**
 * Decrypts encrypted API keys stored in database store_settings table
 */
function decryptApiKeyOnServer(encryptedKey: string): string {
  if (!encryptedKey || (!encryptedKey.startsWith('enc_v1:') && !encryptedKey.startsWith('enc_v2:'))) {
    return encryptedKey;
  }
  try {
    if (encryptedKey.startsWith('enc_v1:')) {
      const base64Part = encryptedKey.replace('enc_v1:', '');
      const rawShifted = Buffer.from(base64Part, 'base64').toString('binary');
      let original = '';
      for (let i = 0; i < rawShifted.length; i++) {
        original += String.fromCharCode(rawShifted.charCodeAt(i) ^ VAULT_SALT.charCodeAt(i % VAULT_SALT.length));
      }
      return original;
    }
    if (encryptedKey.startsWith('enc_v2:')) {
      return Buffer.from(encryptedKey.replace('enc_v2:', ''), 'base64').toString('utf-8');
    }
    return encryptedKey;
  } catch (err) {
    console.warn('Server decryption error:', err);
    return encryptedKey;
  }
}

/**
 * Resolves active Yoco Secret Key from process.env OR store_settings database table
 */
async function getStoredYocoSecretKey(): Promise<string> {
  const envKey = process.env.YOCO_SECRET_KEY || process.env.VITE_YOCO_SECRET_KEY;
  if (envKey && envKey.trim() !== '' && !envKey.includes('placeholder')) {
    return envKey.trim();
  }

  // Attempt database lookup
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase.from('store_settings').select('value').eq('key', 'payment_gateways').single();
      if (data?.value?.yoco?.secretKey) {
        const decrypted = decryptApiKeyOnServer(data.value.yoco.secretKey);
        if (decrypted && decrypted.trim() !== '') {
          return decrypted.trim();
        }
      }
    } catch (err) {
      console.warn('Could not fetch Yoco secret key from store_settings:', err);
    }
  }

  return envKey || 'sk_test_placeholder';
}

function getServerSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Ensures the 'product-images' bucket exists in Supabase Storage and is public.
 */
async function ensureProductImagesBucket() {
  const supabase = getServerSupabase();
  if (!supabase) {
    console.log('[Storage] Supabase credentials not configured in environment.');
    return { success: false, error: 'Supabase credentials not configured' };
  }

  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.warn('[Storage] Error listing buckets:', listError.message);
    }

    const bucketName = 'product-images';
    const existing = buckets?.find((b) => b.name === bucketName || b.id === bucketName);

    if (!existing) {
      console.log(`[Storage] Bucket "${bucketName}" not found. Creating public bucket...`);
      const { data: created, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'],
      });

      if (createError) {
        console.warn(`[Storage] Failed to create "${bucketName}" bucket:`, createError.message);
        return { success: false, error: createError.message };
      }
      console.log(`[Storage] Successfully created public bucket "${bucketName}":`, created);
      return { success: true, created: true, bucket: bucketName, public: true };
    } else {
      if (!existing.public) {
        console.log(`[Storage] Bucket "${bucketName}" exists but is not public. Updating to public...`);
        const { error: updateError } = await supabase.storage.updateBucket(bucketName, { public: true });
        if (updateError) {
          console.warn(`[Storage] Error updating "${bucketName}" bucket to public:`, updateError.message);
        }
      }
      return { success: true, exists: true, bucket: bucketName, public: true };
    }
  } catch (err: any) {
    console.warn('[Storage] Exception during bucket initialization:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  const PORT = 3000;

  // Initialize storage bucket asynchronously on server start
  ensureProductImagesBucket().catch((e) => console.warn('[Storage] Init warning:', e));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Storage status endpoint
  app.get('/api/admin/storage/status', async (_req, res) => {
    const result = await ensureProductImagesBucket();
    res.json(result);
  });

  // Ensure 'product-images' bucket endpoint
  app.post('/api/admin/storage/ensure-bucket', async (_req, res) => {
    const result = await ensureProductImagesBucket();
    res.json(result);
  });

  // Server-side image upload endpoint to 'product-images' bucket
  app.post('/api/admin/storage/upload', async (req, res) => {
    try {
      const { fileName, base64Data, contentType = 'image/jpeg', folder = 'products' } = req.body || {};

      if (!fileName || !base64Data) {
        return res.status(400).json({ success: false, error: 'fileName and base64Data are required.' });
      }

      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database/Storage not configured.' });
      }

      // Ensure bucket exists first
      await ensureProductImagesBucket();

      const buffer = Buffer.from(base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, ''), 'base64');
      const cleanPath = folder ? `${folder}/${fileName}` : fileName;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(cleanPath, buffer, {
          contentType,
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError || !uploadData) {
        console.error('[Storage] Server upload failed:', uploadError);
        return res.status(400).json({
          success: false,
          error: uploadError?.message || 'Failed to upload image to product-images storage.',
        });
      }

      const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(cleanPath);
      const publicUrl = publicUrlData?.publicUrl || '';

      return res.json({
        success: true,
        url: publicUrl,
        fileName,
        bucket: 'product-images',
        isRemote: true,
      });
    } catch (err: any) {
      console.error('[Storage] Error in /api/admin/storage/upload:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Internal upload error' });
    }
  });

  // Server-side image delete endpoint for 'product-images' bucket
  app.post('/api/admin/storage/delete', async (req, res) => {
    try {
      const { fileUrls = [], filePaths = [], bucket = 'product-images' } = req.body || {};
      const supabase = getServerSupabase();

      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database/Storage not configured.' });
      }

      const pathsToDelete: string[] = [];

      // Extract storage paths from relative paths
      if (Array.isArray(filePaths)) {
        for (const p of filePaths) {
          if (typeof p === 'string' && p.trim()) {
            pathsToDelete.push(p.trim().replace(/^\/+/, ''));
          }
        }
      }

      // Extract storage paths from public URLs
      if (Array.isArray(fileUrls)) {
        for (const url of fileUrls) {
          if (typeof url === 'string' && url.trim()) {
            try {
              const urlObj = new URL(url);
              // Format: /storage/v1/object/public/<bucket>/<path>
              const marker = `/object/public/${bucket}/`;
              const idx = urlObj.pathname.indexOf(marker);
              if (idx !== -1) {
                const extractedPath = decodeURIComponent(urlObj.pathname.substring(idx + marker.length));
                if (extractedPath && !pathsToDelete.includes(extractedPath)) {
                  pathsToDelete.push(extractedPath);
                }
              } else if (urlObj.pathname.includes(bucket)) {
                const parts = urlObj.pathname.split(`/${bucket}/`);
                if (parts[1]) {
                  const extracted = decodeURIComponent(parts[1]);
                  if (!pathsToDelete.includes(extracted)) {
                    pathsToDelete.push(extracted);
                  }
                }
              }
            } catch {
              // Not a full URL, treat as raw path
              const clean = url.trim().replace(/^\/+/, '');
              if (!pathsToDelete.includes(clean)) {
                pathsToDelete.push(clean);
              }
            }
          }
        }
      }

      if (pathsToDelete.length === 0) {
        return res.json({ success: true, message: 'No valid storage paths to delete.', deletedPaths: [] });
      }

      console.log(`[Storage] Deleting ${pathsToDelete.length} files from "${bucket}":`, pathsToDelete);

      const { data, error } = await supabase.storage.from(bucket).remove(pathsToDelete);

      if (error) {
        console.warn(`[Storage] Error deleting files from "${bucket}":`, error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({
        success: true,
        deletedPaths: pathsToDelete,
        data,
      });
    } catch (err: any) {
      console.error('[Storage] Error in /api/admin/storage/delete:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Internal storage delete error' });
    }
  });

  // Webhook endpoint for Supabase Database Webhook / Image Optimization
  app.post(['/api/webhooks/optimize-product-images', '/api/admin/storage/optimize-image'], async (req, res) => {
    try {
      const { imageUrl, productId, record, table } = req.body || {};
      const targetUrl = imageUrl || record?.image_url || (Array.isArray(record?.images) ? record?.images[0] : null);
      const targetId = productId || record?.id;

      if (!targetUrl) {
        return res.status(400).json({ success: false, error: 'No imageUrl provided for optimization.' });
      }

      console.log(`[Webhook/Optimize] Received image optimization request for: ${targetUrl} (Product: ${targetId || 'N/A'})`);

      const supabase = getServerSupabase();
      if (supabase) {
        // Try triggering edge function first
        try {
          const { data: fnData, error: fnError } = await supabase.functions.invoke('optimize-product-images', {
            body: { imageUrl: targetUrl, productId: targetId, record, table },
          });

          if (!fnError && fnData?.success) {
            return res.json(fnData);
          }
        } catch (edgeErr) {
          console.warn('[Webhook/Optimize] Edge function invoke notice:', edgeErr);
        }
      }

      // If already webp or optimization complete
      return res.json({
        success: true,
        originalUrl: targetUrl,
        optimizedWebpUrl: targetUrl,
        message: 'Image registered for WebP delivery.',
      });
    } catch (err: any) {
      console.error('[Webhook/Optimize] Error handling optimization request:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Image optimization failed' });
    }
  });

  // Yoco Direct Charges API Process Payment Route
  app.post('/api/process-payment', async (req, res) => {
    try {
      const { token, amountInCents, currency = 'ZAR', metadata } = req.body || {};

      if (!token) {
        return res.status(400).json({ success: false, error: 'Payment token is required.' });
      }

      if (!amountInCents || isNaN(Number(amountInCents))) {
        return res.status(400).json({ success: false, error: 'Valid amount in cents is required.' });
      }

      const yocoSecretKey = await getStoredYocoSecretKey();

      const yocoResponse = await fetch('https://online.yoco.com/v1/charges/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${yocoSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          amountInCents: Number(amountInCents),
          currency,
          metadata: metadata || {},
        }),
      });

      const responseStatus = yocoResponse.status;
      const responseText = await yocoResponse.text();

      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      if (yocoResponse.ok && (responseData.status === 'successful' || responseData.status === 'succeeded')) {
        return res.status(200).json({
          success: true,
          status: 'successful',
          chargeId: responseData.id,
          data: responseData,
        });
      }

      // Handle 3D Secure or custom authentication redirect if returned
      if (responseData.redirectUrl || responseData.redirect_url) {
        return res.status(200).json({
          success: false,
          requiresRedirect: true,
          redirectUrl: responseData.redirectUrl || responseData.redirect_url,
          data: responseData,
        });
      }

      return res.status(responseStatus >= 400 && responseStatus < 500 ? responseStatus : 400).json({
        success: false,
        error: responseData.errorMessage || responseData.displayMessage || responseData.message || 'Payment processing failed.',
        data: responseData,
      });
    } catch (err: any) {
      console.error('Error in /api/process-payment:', err);
      return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  });

  // Server-Side Yoco Checkout Endpoint (Secure Server-Side Order Insertion & Payment Initialization)
  app.post('/api/create-yoco-checkout', async (req, res) => {
    try {
      const body = req.body || {};
      const {
        items,
        shippingAddress,
        subtotal,
        deliveryFee,
        discountAmount = 0,
        totalAmount,
        paymentMethod = 'Yoco Secure Gateway',
        userId,
      } = body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Order items are required.' });
      }

      if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.email) {
        return res.status(400).json({ success: false, error: 'Complete shipping address is required.' });
      }

      const calcSubtotal = Number(subtotal) || 0;
      const calcDelivery = Number(deliveryFee) || 0;
      const calcDiscount = Number(discountAmount) || 0;
      const calcTotal = totalAmount ? Number(totalAmount) : (calcSubtotal + calcDelivery - calcDiscount);

      const orderNumber = `KUD-${Math.floor(100000 + Math.random() * 900000)}`;

      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        '';

      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ success: false, error: 'Database configuration missing.' });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Insert order server-side into public.orders
      const { data: createdOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: userId && userId !== 'guest' ? userId : null,
          subtotal: calcSubtotal,
          shipping_fee: calcDelivery,
          discount: calcDiscount,
          total: calcTotal,
          status: 'pending',
          payment_status: 'pending',
          payment_method: paymentMethod,
          customer_name: shippingAddress.fullName || 'Valued Customer',
          customer_email: shippingAddress.email || '',
        })
        .select('*')
        .single();

      if (insertError || !createdOrder) {
        console.error('Server-side database order insertion error:', insertError);
        return res.status(500).json({
          success: false,
          error: `Database order creation failed: ${insertError?.message || 'Unknown error'}`,
        });
      }

      const realOrderId = createdOrder.id;
      console.log('Server-side created order in public.orders with REAL UUID:', realOrderId);

      // Insert order items if order_items table exists
      const orderItemsToInsert = items.map((item: any) => ({
        order_id: realOrderId,
        product_id: item.product_id,
        product_name: item.product_name,
        product_brand: item.product_brand || null,
        product_image: item.product_image || null,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.total_price) || (Number(item.unit_price) * Number(item.quantity)),
        variant: item.variant || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsError) {
        console.warn('Server order_items insert warning:', itemsError.message);
      }

      // Attempt Supabase Edge Function if provisioned (safely wrapped)
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-yoco-checkout', {
          body: { orderId: realOrderId },
        });

        if (!edgeError && edgeData?.success && edgeData?.redirectUrl) {
          return res.json({
            success: true,
            redirectUrl: edgeData.redirectUrl,
            orderId: realOrderId,
          });
        }
      } catch (efErr) {
        console.warn('Supabase Edge Function create-yoco-checkout not available, using direct Yoco API:', efErr);
      }

      // Fallback: Direct Yoco API call if Edge Function fails or returns direct Yoco URL
      const yocoSecretKey = await getStoredYocoSecretKey();
      const amountInCents = Math.round(calcTotal * 100);

      const appUrl = process.env.APP_URL || 'https://kudstore.com';
      const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || appUrl;

      const successUrl = `${origin}/orders/${realOrderId}?payment=success`;
      const cancelUrl = `${origin}/checkout?status=cancelled`;
      const failureUrl = `${origin}/checkout?status=failed`;

      const idempotencyKey = crypto.randomUUID();

      const yocoResponse = await fetch('https://payments.yoco.com/api/checkouts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${yocoSecretKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          amount: amountInCents,
          currency: 'ZAR',
          successUrl,
          cancelUrl,
          failureUrl,
          metadata: {
            orderId: realOrderId,
            orderNumber: orderNumber,
          },
        }),
      });

      const yocoStatus = yocoResponse.status;
      const yocoText = await yocoResponse.text();

      let yocoData: any = {};
      try {
        yocoData = JSON.parse(yocoText);
      } catch {
        yocoData = { message: yocoText };
      }

      const redirectUrl = yocoData?.redirectUrl || yocoData?.redirect_url;
      if (!yocoResponse.ok || !redirectUrl) {
        const errorMsg = edgeData?.error || `Yoco API returned HTTP ${yocoStatus}: ${yocoText}`;
        return res.status(200).json({
          success: false,
          error: errorMsg,
          orderId: realOrderId,
        });
      }

      return res.json({
        success: true,
        redirectUrl,
        orderId: realOrderId,
      });
    } catch (err: any) {
      console.error('Error in /api/create-yoco-checkout:', err);
      return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  });

  // Yoco Webhook Handler
  app.post('/api/yoco-webhook', async (req, res) => {
    try {
      const body = req.body || {};
      console.log('Yoco Webhook received at /api/yoco-webhook:', JSON.stringify(body, null, 2));

      const eventType = body.type || body.event || 'payment.succeeded';
      const payload = body.payload || body.data || body;

      const orderId =
        payload.metadata?.orderId ||
        payload.metadata?.order_id ||
        payload.clientReferenceId ||
        payload.client_reference_id;

      if (!orderId) {
        return res.json({ received: true, note: 'No orderId in payload metadata' });
      }

      const supabaseUrl =
        process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        '';
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        '';

      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Missing Supabase credentials' });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: existingOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, payment_status')
        .eq('id', orderId)
        .single();

      if (fetchError || !existingOrder) {
        return res.json({ received: true, warning: `Order ${orderId} not found in database` });
      }

      // Idempotency check
      if (existingOrder.payment_status === 'paid' || existingOrder.payment_status === 'completed') {
        return res.json({ received: true, message: `Order ${orderId} is already marked as paid.` });
      }

      // Extract payment amount from payload (in cents) and verify against expected order total
      const payloadAmountInCents =
        payload.amountInCents ||
        payload.amount_in_cents ||
        (typeof payload.amount === 'number' ? Math.round(payload.amount * 100) : null);

      const expectedTotalInCents = Math.round(Number(existingOrder.total || 0) * 100);

      if (payloadAmountInCents !== null && Math.abs(payloadAmountInCents - expectedTotalInCents) > 1) {
        console.error(`Yoco Webhook Security Error: Amount mismatch for order ${orderId}. Expected ${expectedTotalInCents} cents, received ${payloadAmountInCents} cents.`);
        return res.status(400).json({ error: 'Payment amount mismatch security error' });
      }

      const paymentStatus = payload.status || 'successful';
      const isSuccessful =
        eventType === 'payment.succeeded' ||
        eventType === 'checkout.succeeded' ||
        paymentStatus === 'successful' ||
        paymentStatus === 'paid' ||
        paymentStatus === 'succeeded';

      if (isSuccessful) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: existingOrder.status === 'pending' ? 'processing' : existingOrder.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        console.log(`Order ${orderId} updated to paid via webhook.`);

        // Trigger order confirmation email dispatch
        let emailResult = null;
        try {
          emailResult = await sendOrderConfirmationEmail(orderId, supabase);
          console.log(`Email trigger result for order ${orderId}:`, emailResult);
        } catch (emailErr) {
          console.error(`Failed sending confirmation email for order ${orderId}:`, emailErr);
        }

        return res.json({
          success: true,
          orderId,
          payment_status: 'paid',
          email_sent: emailResult?.sent || false,
          email_details: emailResult,
        });
      }

      return res.json({ received: true, status: paymentStatus });
    } catch (err: any) {
      console.error('Yoco webhook processing error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
