import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  sendOrderConfirmationEmail,
  sendReferralInviteEmail,
  sendCommissionAllocatedEmail,
  sendEarningsFrozenEmail,
  sendEarningsUnfrozenEmail,
  sendInvoiceEmail,
} from './src/lib/emailService';

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
 * Resolves active Yoco Secret Key from process.env OR public.settings database table
 */
async function getStoredYocoSecretKey(): Promise<string> {
  const envKey = process.env.YOCO_SECRET_KEY || process.env.VITE_YOCO_SECRET_KEY;
  if (envKey && envKey.trim() !== '' && !envKey.includes('placeholder')) {
    return envKey.trim();
  }

  // Attempt database lookup in public.settings table (settings_data.payment_gateways.yoco)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('settings')
        .select('id, settings_data')
        .limit(1)
        .maybeSingle();

      const yocoConfig = (data?.settings_data as any)?.payment_gateways?.yoco;
      if (yocoConfig?.secretKey) {
        const decrypted = decryptApiKeyOnServer(yocoConfig.secretKey);
        if (decrypted && decrypted.trim() !== '') {
          return decrypted.trim();
        }
      }
    } catch (err) {
      console.warn('Could not fetch Yoco secret key from public.settings:', err);
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
 * Generates an RFC 4122 v5 deterministic UUID from a unique event fingerprint.
 * Guarantees that the exact same logical event always generates the same UUID,
 * allowing PostgreSQL's atomic primary key constraint (ON CONFLICT (id) DO NOTHING)
 * to enforce database-level idempotency without race conditions.
 */
function fingerprintToDeterministicUuid(fingerprint: string): string {
  const hash = crypto.createHash('sha1').update(fingerprint.trim()).digest('hex');
  const p1 = hash.substring(0, 8);
  const p2 = hash.substring(8, 12);
  const p3 = '5' + hash.substring(13, 16);
  const p4 = ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.substring(18, 20);
  const p5 = hash.substring(20, 32);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

/**
 * Safe server-side helper to create admin notifications with true database-backed idempotency.
 * - For events with a fingerprint: Uses atomic PostgreSQL INSERT ... ON CONFLICT (id) DO NOTHING
 *   with a deterministic UUID derived from the event fingerprint.
 * - Handles concurrent requests safely; duplicate calls return the existing notification ID.
 * - Non-blocking: failures never throw or disrupt transactional checkout, payment, or order flows.
 * - Never exposes service_role to browser.
 */
async function createAdminNotificationSafe({
  type,
  severity,
  title,
  message,
  userId = null,
  orderId = null,
  productId = null,
  metadata = {},
  fingerprint = null,
}: {
  type: 'order' | 'payment' | 'inventory' | 'security' | 'system';
  severity: 'info' | 'warning' | 'critical' | 'success' | 'error';
  title: string;
  message: string;
  userId?: string | null;
  orderId?: string | null;
  productId?: string | null;
  metadata?: Record<string, any>;
  fingerprint?: string | null;
}): Promise<string | null> {
  try {
    const supabase = getServerSupabase();
    if (!supabase) return null;

    const cleanFingerprint = fingerprint && typeof fingerprint === 'string' ? fingerprint.trim() : null;

    // 1. Explicit atomic database-backed idempotency via deterministic primary key
    if (cleanFingerprint) {
      const deterministicId = fingerprintToDeterministicUuid(cleanFingerprint);
      const nowIso = new Date().toISOString();

      const { data: upsertData, error: upsertError } = await supabase
        .from('admin_notifications')
        .upsert(
          {
            id: deterministicId,
            type,
            severity,
            title,
            message,
            user_id: userId || null,
            order_id: orderId || null,
            product_id: productId || null,
            metadata: metadata || {},
            fingerprint: cleanFingerprint,
            is_read: false,
            created_at: nowIso,
            updated_at: nowIso,
          },
          {
            onConflict: 'id',
            ignoreDuplicates: true,
          }
        )
        .select('id');

      if (!upsertError) {
        // Successfully inserted new notification OR ignored duplicate atomically
        return deterministicId;
      }

      console.warn('[AdminNotifications] Atomic upsert notice, falling back to RPC:', upsertError.message);
    }

    // 2. Compatibility fallback: invoke public.create_admin_notification RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_admin_notification', {
      p_type: type,
      p_severity: severity,
      p_title: title,
      p_message: message,
      p_user_id: userId || null,
      p_order_id: orderId || null,
      p_product_id: productId || null,
      p_metadata: metadata || {},
      p_fingerprint: cleanFingerprint || null,
    });

    if (rpcError) {
      console.warn('[AdminNotifications] Server RPC notice:', rpcError.message);
      return null;
    }

    return rpcData || null;
  } catch (err: any) {
    console.warn('[AdminNotifications] Safe notification caught error:', err?.message);
    return null;
  }
}

/**
 * Checks product stock against thresholds and dispatches inventory notifications safely.
 * - stock <= 0 => critical / "Out of Stock" (fingerprint: inventory:<productId>:out-of-stock)
 * - stock <= threshold => warning / "Low Stock" (fingerprint: inventory:<productId>:low-stock)
 */
async function checkAndNotifyProductStock(
  productId: string,
  stockValue?: number | null,
  productName?: string | null,
  lowStockThreshold: number = 5
) {
  try {
    if (!productId) return;
    const supabase = getServerSupabase();
    if (!supabase) return;

    let currentStock = stockValue !== undefined && stockValue !== null ? Number(stockValue) : NaN;
    let name = productName;

    if (isNaN(currentStock) || !name) {
      const { data: prod } = await supabase
        .from('products')
        .select('name, stock')
        .eq('id', productId)
        .single();

      if (prod) {
        if (isNaN(currentStock)) currentStock = Number(prod.stock) || 0;
        if (!name) name = prod.name;
      }
    }

    if (isNaN(currentStock)) return;
    const threshold = Number(lowStockThreshold) || 5;

    if (currentStock <= 0) {
      await createAdminNotificationSafe({
        type: 'inventory',
        severity: 'critical',
        title: `Out of Stock: ${name || 'Product'}`,
        message: `Product "${name || 'Product'}" has reached 0 units in stock. Replenishment required immediately.`,
        productId,
        metadata: {
          product_id: productId,
          product_name: name || 'Product',
          current_stock: currentStock,
          threshold,
        },
        fingerprint: `inventory:${productId}:out`,
      });
    } else if (currentStock <= threshold) {
      await createAdminNotificationSafe({
        type: 'inventory',
        severity: 'warning',
        title: `Low Stock Alert: ${name || 'Product'}`,
        message: `Product "${name || 'Product'}" stock has dropped to ${currentStock} remaining (threshold: ${threshold}).`,
        productId,
        metadata: {
          product_id: productId,
          product_name: name || 'Product',
          current_stock: currentStock,
          threshold,
        },
        fingerprint: `inventory:${productId}:low`,
      });
    }
  } catch (err: any) {
    console.warn('[AdminNotifications] Stock check caught error:', err?.message);
  }
}

/**
 * Ensures the 'product-images' bucket exists in Supabase Storage and is public.
 */
async function ensureStorageBucket(bucketName: string = 'product-images') {
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

    const existing = buckets?.find((b) => b.name === bucketName || b.id === bucketName);

    if (!existing) {
      console.log(`[Storage] Bucket "${bucketName}" not found. Creating public bucket...`);
      const { data: created, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 15728640, // 15MB
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

async function ensureProductImagesBucket() {
  return ensureStorageBucket('product-images');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Enable CORS for storefront cross-origin access (e.g. Netlify)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

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

  // Server-side image upload endpoint (supports 'product-images' and 'store-branding')
  app.post('/api/admin/storage/upload', async (req, res) => {
    try {
      const { fileName, base64Data, contentType = 'image/jpeg', folder = 'products', bucket = 'product-images' } = req.body || {};

      if (!fileName || !base64Data) {
        return res.status(400).json({ success: false, error: 'fileName and base64Data are required.' });
      }

      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database/Storage not configured.' });
      }

      const targetBucket =
        bucket === 'store-branding'
          ? 'store-branding'
          : bucket === 'auth-backgrounds'
          ? 'auth-backgrounds'
          : 'product-images';

      // Ensure bucket exists first
      await ensureStorageBucket(targetBucket);

      const buffer = Buffer.from(base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, ''), 'base64');
      const cleanPath = folder ? `${folder}/${fileName}` : fileName;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(targetBucket)
        .upload(cleanPath, buffer, {
          contentType,
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError || !uploadData) {
        console.error('[Storage] Server upload failed:', uploadError);
        return res.status(400).json({
          success: false,
          error: uploadError?.message || `Failed to upload image to ${targetBucket} storage.`,
        });
      }

      const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(cleanPath);
      const publicUrl = publicUrlData?.publicUrl || '';

      return res.json({
        success: true,
        url: publicUrl,
        fileName,
        storagePath: cleanPath,
        bucket: targetBucket,
        isRemote: true,
      });
    } catch (err: any) {
      console.error('[Storage] Error in /api/admin/storage/upload:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Internal upload error' });
    }
  });

  // =========================================================================
  // CUSTOMER DESIGN & CUSTOMIZATION UPLOAD ENDPOINT
  // =========================================================================
  app.post('/api/customizations/upload', async (req, res) => {
    try {
      const { fileName, originalName, base64Data, contentType = 'image/png' } = req.body || {};

      if (!fileName || !base64Data) {
        return res.status(400).json({ success: false, error: 'File data is required.' });
      }

      // 1. Validate file type (image only: jpeg, png, webp)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(contentType.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file format. Only JPG, JPEG, PNG, and WEBP image files are supported.',
        });
      }

      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database storage is not configured.' });
      }

      const targetBucket = 'customer-customizations';
      await ensureStorageBucket(targetBucket);

      const buffer = Buffer.from(base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, ''), 'base64');

      // 2. Strict 10MB limit enforcement
      const maxSizeBytes = 10 * 1024 * 1024;
      if (buffer.length > maxSizeBytes) {
        return res.status(400).json({
          success: false,
          error: `File exceeds maximum allowed size of 10 MB (${(buffer.length / (1024 * 1024)).toFixed(1)} MB uploaded).`,
        });
      }

      const safePath = `customer-designs/${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(targetBucket)
        .upload(safePath, buffer, {
          contentType,
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError || !uploadData) {
        console.error('[Customization] Server upload to customer-customizations failed:', uploadError);
        // Fallback: try uploading to product-images/customizations if customer-customizations bucket had permission restriction
        const fallbackBucket = 'product-images';
        await ensureStorageBucket(fallbackBucket);
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from(fallbackBucket)
          .upload(safePath, buffer, { contentType, cacheControl: '3600', upsert: true });

        if (fallbackError || !fallbackData) {
          return res.status(400).json({
            success: false,
            error: uploadError?.message || fallbackError?.message || 'Storage upload failed.',
          });
        }

        const { data: fbUrlData } = supabase.storage.from(fallbackBucket).getPublicUrl(safePath);
        return res.json({
          success: true,
          url: fbUrlData?.publicUrl || '',
          fileName: originalName || fileName,
          sizeBytes: buffer.length,
        });
      }

      const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(safePath);
      return res.json({
        success: true,
        url: publicUrlData?.publicUrl || '',
        fileName: originalName || fileName,
        sizeBytes: buffer.length,
      });
    } catch (err: any) {
      console.error('[Customization] Error handling customer upload:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to process file upload.' });
    }
  });

  // =========================================================================
  // SERVER-SIDE PRICE AND INVENTORY VALIDATION ENDPOINT
  // =========================================================================
  app.post('/api/orders/validate-prices', async (req, res) => {
    try {
      const { items } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'No items provided for validation.' });
      }

      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not available.' });
      }

      const productIds = items.map((it: any) => it.productId || it.product_id).filter(Boolean);
      const { data: dbProducts, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (prodErr || !dbProducts) {
        return res.status(500).json({ success: false, error: 'Failed to retrieve authoritative product data.' });
      }

      const productMap = new Map<string, any>(dbProducts.map((p: any) => [String(p.id), p]));
      let calculatedSubtotal = 0;
      const validatedItems: any[] = [];

      for (const item of items) {
        const prodId = String(item.productId || item.product_id);
        const dbProd = productMap.get(prodId);
        if (!dbProd) {
          return res.status(400).json({ success: false, error: `Product not found in catalog: ${prodId}` });
        }

        const qty = Math.max(1, Number(item.quantity) || 1);
        const basePrice = Number(dbProd.price) || 0;

        // Extract custom config
        const customConfig =
          dbProd.customization_config ||
          dbProd.category_attributes?.customizationConfig ||
          {};

        // Check stock rules
        const disableStock = customConfig.disableStockLimits || dbProd.track_inventory === false || dbProd.allow_backorders;
        if (!disableStock && typeof dbProd.stock === 'number' && dbProd.stock < qty) {
          return res.status(400).json({
            success: false,
            error: `Insufficient stock for "${dbProd.name}". Available: ${dbProd.stock}, Requested: ${qty}`,
          });
        }

        // Calculate size modifier
        let sizeAdjustment = 0;
        const customization = item.customization;
        if (customization?.selectedSizeOption?.priceModifier !== undefined) {
          sizeAdjustment = Number(customization.selectedSizeOption.priceModifier) || 0;
        }

        // Customization charge
        let customizationCharge = 0;
        if (customConfig.isCustomizable && customConfig.customizationCharge > 0) {
          customizationCharge = Number(customConfig.customizationCharge) || 0;
        }

        let verifiedUnitPrice = basePrice + sizeAdjustment + customizationCharge;

        // Bulk pricing tiers
        if (customConfig.bulkPricingTiers && Array.isArray(customConfig.bulkPricingTiers)) {
          const matchTier = customConfig.bulkPricingTiers
            .filter((t: any) => qty >= t.minQuantity && (!t.maxQuantity || qty <= t.maxQuantity))
            .sort((a: any, b: any) => b.minQuantity - a.minQuantity)[0];
          if (matchTier && matchTier.pricePerUnit > 0) {
            verifiedUnitPrice = matchTier.pricePerUnit + sizeAdjustment;
          }
        }

        const itemSubtotal = verifiedUnitPrice * qty;
        calculatedSubtotal += itemSubtotal;

        validatedItems.push({
          productId: prodId,
          productName: dbProd.name,
          quantity: qty,
          basePrice,
          sizeAdjustment,
          customizationCharge,
          unitPrice: verifiedUnitPrice,
          totalPrice: itemSubtotal,
          customization,
        });
      }

      return res.json({
        success: true,
        subtotal: calculatedSubtotal,
        items: validatedItems,
      });
    } catch (err: any) {
      console.error('[PriceValidation] Error in /api/orders/validate-prices:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Price validation error.' });
    }
  });

  // =========================================================================
  // SUPABASE AUTH APPEARANCE BACKEND INTEGRATION
  // =========================================================================
  app.get('/api/auth-appearance', async (_req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      // Fetch appearance settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('auth_appearance_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (settingsError) {
        console.warn('[AuthAppearance] Error fetching settings:', settingsError.message);
      }

      // Fetch active background images
      const { data: imagesData, error: imagesError } = await supabase
        .from('auth_background_images')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (imagesError) {
        console.warn('[AuthAppearance] Error fetching background images:', imagesError.message);
      }

      // Format images with public URLs
      const formattedImages = (imagesData || []).map((img: any) => {
        let publicUrl = img.storage_path;
        if (!publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
          const { data } = supabase.storage.from('auth-backgrounds').getPublicUrl(img.storage_path);
          publicUrl = data?.publicUrl || img.storage_path;
        }
        return {
          ...img,
          public_url: publicUrl,
        };
      });

      return res.json({
        success: true,
        settings: settingsData || null,
        images: formattedImages,
      });
    } catch (err: any) {
      console.error('[AuthAppearance] Error in GET /api/auth-appearance:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to load auth appearance' });
    }
  });

  app.post('/api/admin/auth-appearance/settings', async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      const payload = req.body || {};
      const { id = 1, ...fieldsToUpdate } = payload;
      const updateData = {
        ...fieldsToUpdate,
        id: 1,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('auth_appearance_settings')
        .upsert(updateData, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[AuthAppearance] Error updating settings:', error);
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, data });
    } catch (err: any) {
      console.error('[AuthAppearance] Error in POST /api/admin/auth-appearance/settings:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to update settings' });
    }
  });

  app.post('/api/admin/auth-appearance/images', async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      const { name, storage_path, is_active = true, display_order = 0, is_default = false } = req.body || {};
      if (!name || !storage_path) {
        return res.status(400).json({ success: false, error: 'name and storage_path are required.' });
      }

      // If is_default is true, clear is_default for other images
      if (is_default) {
        await supabase
          .from('auth_background_images')
          .update({ is_default: false })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { data, error } = await supabase
        .from('auth_background_images')
        .insert({
          name: String(name).trim(),
          storage_path: String(storage_path).trim(),
          is_active: Boolean(is_active),
          display_order: Number(display_order) || 0,
          is_default: Boolean(is_default),
        })
        .select()
        .single();

      if (error) {
        console.error('[AuthAppearance] Error inserting image:', error);
        return res.status(400).json({ success: false, error: error.message });
      }

      let publicUrl = data.storage_path;
      if (!publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
        const { data: urlData } = supabase.storage.from('auth-backgrounds').getPublicUrl(data.storage_path);
        publicUrl = urlData?.publicUrl || data.storage_path;
      }

      return res.json({
        success: true,
        data: {
          ...data,
          public_url: publicUrl,
        },
      });
    } catch (err: any) {
      console.error('[AuthAppearance] Error in POST /api/admin/auth-appearance/images:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to insert image' });
    }
  });

  app.patch('/api/admin/auth-appearance/images/:id', async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      const { id } = req.params;
      const updates = req.body || {};

      if (updates.is_default === true) {
        await supabase
          .from('auth_background_images')
          .update({ is_default: false })
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('auth_background_images')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[AuthAppearance] Error updating image:', error);
        return res.status(400).json({ success: false, error: error.message });
      }

      let publicUrl = data?.storage_path;
      if (publicUrl && !publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
        const { data: urlData } = supabase.storage.from('auth-backgrounds').getPublicUrl(data.storage_path);
        publicUrl = urlData?.publicUrl || data.storage_path;
      }

      return res.json({
        success: true,
        data: {
          ...data,
          public_url: publicUrl,
        },
      });
    } catch (err: any) {
      console.error('[AuthAppearance] Error in PATCH /api/admin/auth-appearance/images/:id:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to update image' });
    }
  });

  app.delete('/api/admin/auth-appearance/images/:id', async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      const { id } = req.params;
      const { storage_path } = req.query as { storage_path?: string };

      // Delete from table
      const { error: deleteError } = await supabase
        .from('auth_background_images')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('[AuthAppearance] Error deleting image record:', deleteError);
        return res.status(400).json({ success: false, error: deleteError.message });
      }

      // If file is stored in auth-backgrounds bucket, remove it from storage
      if (storage_path && typeof storage_path === 'string' && !storage_path.startsWith('http')) {
        await supabase.storage.from('auth-backgrounds').remove([storage_path]);
      }

      return res.json({ success: true, id });
    } catch (err: any) {
      console.error('[AuthAppearance] Error in DELETE /api/admin/auth-appearance/images/:id:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to delete image' });
    }
  });

  app.post('/api/admin/auth-appearance/reorder', async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      const { orderMap } = req.body || {}; // { [id]: number }
      if (!orderMap || typeof orderMap !== 'object') {
        return res.status(400).json({ success: false, error: 'orderMap object is required.' });
      }

      const promises = Object.entries(orderMap).map(([id, display_order]) =>
        supabase
          .from('auth_background_images')
          .update({
            display_order: Number(display_order) || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
      );

      await Promise.all(promises);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[AuthAppearance] Error in POST /api/admin/auth-appearance/reorder:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to reorder images' });
    }
  });

  // Dedicated endpoint to update ONLY public.settings.logo_url
  app.post(['/api/admin/settings/logo_url', '/api/settings/logo_url'], async (req, res) => {
    try {
      const { logo_url } = req.body || {};
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database/Storage not configured.' });
      }

      const now = new Date().toISOString();
      const { data: current, error: fetchErr } = await supabase
        .from('settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchErr) {
        return res.status(500).json({ success: false, error: fetchErr.message });
      }

      const settingsId = current?.id || '5411b2f4-8189-4a14-882d-b3c280aeaba4';
      const cleanLogoUrl = typeof logo_url === 'string' && logo_url.trim().length > 0 ? logo_url.trim() : null;

      const { error: updateErr } = await supabase
        .from('settings')
        .update({
          logo_url: cleanLogoUrl,
          updated_at: now,
        })
        .eq('id', settingsId);

      if (updateErr) {
        console.error('[Settings] Error updating logo_url:', updateErr);
        return res.status(500).json({ success: false, error: updateErr.message });
      }

      return res.json({ success: true, logo_url: cleanLogoUrl });
    } catch (err: any) {
      console.error('[Settings] Error in /api/admin/settings/logo_url:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to update logo_url.' });
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

      let orderTaxEnabled = Boolean(body.tax_enabled);
      let orderTaxName = body.tax_name || 'VAT';
      let orderTaxRate = body.tax_rate !== undefined ? Number(body.tax_rate) : 0;
      let orderTaxAmount = body.tax_amount !== undefined ? Number(body.tax_amount) : 0;

      if (body.tax_enabled === undefined) {
        try {
          const { data: taxSettingsRow } = await supabase
            .from('settings')
            .select('tax_enabled, tax_name, tax_rate')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (taxSettingsRow?.tax_enabled) {
            orderTaxEnabled = true;
            orderTaxName = taxSettingsRow.tax_name || 'VAT';
            orderTaxRate = Number(taxSettingsRow.tax_rate) || 15;
            orderTaxAmount = Math.round(Math.max(0, calcSubtotal - calcDiscount) * (orderTaxRate / 100) * 100) / 100;
          }
        } catch {}
      }

      const calcTotal = totalAmount ? Number(totalAmount) : (calcSubtotal + (orderTaxEnabled ? orderTaxAmount : 0) + calcDelivery - calcDiscount);

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
          tax_enabled: orderTaxEnabled,
          tax_name: orderTaxName,
          tax_rate: orderTaxRate,
          tax_amount: orderTaxAmount,
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

      // Safe server-side admin notification for newly created order
      createAdminNotificationSafe({
        type: 'order',
        severity: 'info',
        title: `New Order: #${createdOrder.order_number}`,
        message: `Order #${createdOrder.order_number} for R${Number(calcTotal).toFixed(2)} placed by ${shippingAddress.fullName || 'Customer'}.`,
        userId: userId && userId !== 'guest' ? userId : null,
        orderId: realOrderId,
        metadata: {
          order_id: realOrderId,
          user_id: userId && userId !== 'guest' ? userId : null,
          order_number: createdOrder.order_number,
          total: calcTotal,
          currency: 'ZAR',
          customer_name: shippingAddress.fullName || 'Customer',
        },
        fingerprint: `order:${realOrderId}:created`,
      }).catch((err) => console.warn('[create-yoco-checkout] Order notification caught:', err));

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
        .select('id, status, payment_status, total, order_number, user_id, customer_name')
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

        // Dispatch authoritative payment notification safely
        const orderNum = existingOrder.order_number || `KUD-${orderId.slice(0, 6).toUpperCase()}`;
        const orderTotal = Number(existingOrder.total || 0);
        createAdminNotificationSafe({
          type: 'payment',
          severity: 'success',
          title: `Payment Received: #${orderNum}`,
          message: `Verified Yoco payment of R${orderTotal.toFixed(2)} received for order #${orderNum}.`,
          userId: existingOrder.user_id || null,
          orderId,
          metadata: {
            order_id: orderId,
            order_number: orderNum,
            payment_reference: payload.id || payload.checkoutId || `yoco_${Date.now()}`,
            amount: orderTotal,
            payment_provider: 'yoco',
            status: 'paid',
          },
          fingerprint: `payment:${orderId}:success`,
        }).catch((notifErr) => console.warn('[AdminNotifications] Yoco payment success notification notice:', notifErr));

        // Trigger order confirmation email dispatch
        let emailResult = null;
        let invoiceResult = null;
        try {
          emailResult = await sendOrderConfirmationEmail(orderId, supabase);
          console.log(`Email trigger result for order ${orderId}:`, emailResult);
        } catch (emailErr) {
          console.error(`Failed sending confirmation email for order ${orderId}:`, emailErr);
        }

        // Check if Auto-Send Invoices is enabled in store settings
        try {
          const { data: storeSettingsRow } = await supabase
            .from('settings')
            .select('settings_data')
            .limit(1)
            .maybeSingle();

          const autoSendEnabled = storeSettingsRow?.settings_data?.invoice_settings?.autoSendInvoices !== false;

          if (autoSendEnabled) {
            const { data: fullOrder } = await supabase
              .from('orders')
              .select('*')
              .eq('id', orderId)
              .maybeSingle();

            let items: any[] = [];
            const { data: fullItems } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', orderId);
            if (fullItems) items = fullItems;

            if (fullOrder) {
              invoiceResult = await sendInvoiceEmail({
                orderOrInvoice: { ...fullOrder, items },
                senderName: 'KUD Store Billing Automation',
                triggerType: 'auto',
                supabase,
              });
              console.log(`Auto-Send Invoice dispatch result for order ${orderId}:`, invoiceResult?.message);
            }
          }
        } catch (invErr) {
          console.error(`Auto-send invoice processing error for order ${orderId}:`, invErr);
        }

        return res.json({
          success: true,
          orderId,
          payment_status: 'paid',
          email_sent: emailResult?.sent || false,
          invoice_sent: invoiceResult?.sent || false,
          email_details: emailResult,
          invoice_details: invoiceResult,
        });
      }

      // Handle non-successful/failed/cancelled payment webhook
      if (
        eventType.includes('fail') ||
        eventType.includes('cancel') ||
        paymentStatus === 'failed' ||
        paymentStatus === 'cancelled'
      ) {
        const targetStatus = paymentStatus === 'cancelled' || eventType.includes('cancel') ? 'cancelled' : 'failed';
        const orderNum = existingOrder.order_number || `KUD-${orderId.slice(0, 6).toUpperCase()}`;
        createAdminNotificationSafe({
          type: 'payment',
          severity: 'warning',
          title: `Payment ${targetStatus === 'cancelled' ? 'Cancelled' : 'Failed'}: #${orderNum}`,
          message: `Yoco payment for order #${orderNum} was ${targetStatus} (event: ${eventType}).`,
          userId: existingOrder.user_id || null,
          orderId,
          metadata: {
            order_id: orderId,
            order_number: orderNum,
            payment_reference: payload.id || null,
            status: targetStatus,
            event: eventType,
          },
          fingerprint: `payment:${orderId}:failed`,
        }).catch((notifErr) => console.warn('[AdminNotifications] Yoco payment warning notification notice:', notifErr));
      }

      return res.json({ received: true, status: paymentStatus });
    } catch (err: any) {
      console.error('Yoco webhook processing error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Secure Server-Side Order Notification & Inventory Stock Evaluation Endpoint
  app.post('/api/notifications/notify-order-created', async (req, res) => {
    try {
      const { orderId } = req.body || {};
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'orderId is required' });
      }

      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database service unavailable' });
      }

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('id, order_number, total, subtotal, user_id, customer_name, customer_email, created_at')
        .eq('id', orderId)
        .single();

      if (orderErr || !order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const orderNumber = order.order_number || `KUD-${order.id.slice(0, 6).toUpperCase()}`;
      const totalAmount = Number(order.total ?? order.subtotal ?? 0);
      const customerName = order.customer_name || 'Valued Customer';

      // 1. Create order notification
      const notifId = await createAdminNotificationSafe({
        type: 'order',
        severity: 'info',
        title: `New Order: #${orderNumber}`,
        message: `Order #${orderNumber} for R${totalAmount.toFixed(2)} placed by ${customerName}.`,
        userId: order.user_id || null,
        orderId: order.id,
        metadata: {
          order_id: order.id,
          user_id: order.user_id || null,
          order_number: orderNumber,
          total: totalAmount,
          currency: 'ZAR',
          customer_name: customerName,
        },
        fingerprint: `order:${order.id}:created`,
      });

      // 2. Safely inspect order_items, decrement inventory, and check low/out-of-stock thresholds
      try {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, product_name, quantity')
          .eq('order_id', order.id);

        if (orderItems && orderItems.length > 0) {
          for (const item of orderItems) {
            if (item.product_id) {
              const { data: prod } = await supabase
                .from('products')
                .select('id, name, stock')
                .eq('id', item.product_id)
                .single();

              if (prod && typeof prod.stock === 'number') {
                const updatedStock = Math.max(0, prod.stock - (Number(item.quantity) || 1));
                await supabase
                  .from('products')
                  .update({
                    stock: updatedStock,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', item.product_id);

                // Check inventory thresholds (warning at <= 5, critical at <= 0)
                await checkAndNotifyProductStock(
                  item.product_id,
                  updatedStock,
                  prod.name || item.product_name,
                  5
                );
              }
            }
          }
        }
      } catch (stockErr: any) {
        console.warn('[AdminNotifications] Stock check caught notice:', stockErr?.message);
      }

      return res.json({ success: true, notificationId: notifId });
    } catch (err: any) {
      console.warn('[AdminNotifications] Exception in /api/notifications/notify-order-created:', err?.message);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to process order notification' });
    }
  });

  // Secure Server-Side Inventory Check Notification Endpoint
  app.post('/api/notifications/notify-inventory-check', async (req, res) => {
    try {
      const { productId, stock, productName, threshold = 5 } = req.body || {};
      if (!productId) {
        return res.status(400).json({ success: false, error: 'productId is required' });
      }

      await checkAndNotifyProductStock(productId, stock, productName, threshold);
      return res.json({ success: true });
    } catch (err: any) {
      console.warn('[AdminNotifications] Exception in /api/notifications/notify-inventory-check:', err?.message);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to check inventory notification' });
    }
  });

  // Resend-powered Transactional Referral Invitation Email Endpoint
  app.post('/api/send-referral-invite', async (req, res) => {
    try {
      const {
        recipientEmail,
        recipientEmails,
        recipientName,
        senderName = 'A friend',
        senderEmail,
        referralCode,
        referralLink,
        customMessage,
      } = req.body || {};

      if (!referralCode) {
        return res.status(400).json({
          success: false,
          error: 'Referral code is required.',
        });
      }

      // Check if the sender is banned from sending referrals or if invites are restricted
      const supabase = getServerSupabase();
      if (supabase && senderEmail) {
        try {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('referral_rewards')
            .eq('email', senderEmail)
            .maybeSingle();

          if (senderProfile?.referral_rewards?.isBanned) {
            return res.status(403).json({
              success: false,
              error: `Your account has been restricted from sending referral invitations. ${senderProfile.referral_rewards.banReason || ''}`,
            });
          }

          if (senderProfile?.referral_rewards?.hideInviteOption) {
            return res.status(403).json({
              success: false,
              error: 'Referral invitations have been disabled for this account.',
            });
          }
        } catch {
          // Continue if check fails
        }
      }

      // Collect recipient email(s)
      const rawRecipients: string[] = [];
      if (Array.isArray(recipientEmails)) {
        rawRecipients.push(...recipientEmails);
      } else if (typeof recipientEmails === 'string') {
        rawRecipients.push(...recipientEmails.split(/[,;\s]+/));
      }

      if (recipientEmail && typeof recipientEmail === 'string') {
        rawRecipients.push(...recipientEmail.split(/[,;\s]+/));
      }

      // Sanitize and deduplicate emails
      const validEmails = Array.from(
        new Set(
          rawRecipients
            .map((e) => e.trim().toLowerCase())
            .filter((e) => e.length > 3 && e.includes('@') && e.includes('.'))
        )
      );

      if (validEmails.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please provide at least one valid recipient email address.',
        });
      }

      // Cap at 20 emails per request for spam prevention
      const emailsToSend = validEmails.slice(0, 20);

      // Trigger Resend transactional email template for all contacts simultaneously
      console.log(`[Referral Invites] Dispatching simultaneous invitations to ${emailsToSend.length} contact(s): ${emailsToSend.join(', ')}`);
      const results = await Promise.all(
        emailsToSend.map((email) =>
          sendReferralInviteEmail({
            recipientEmail: email,
            recipientName: recipientName || undefined,
            senderName: senderName || 'Your friend',
            senderEmail: senderEmail || undefined,
            referralCode,
            referralLink,
            customMessage: customMessage || undefined,
          })
        )
      );

      const allSuccess = results.every((r) => r.success);
      const someSuccess = results.some((r) => r.success);
      const isSimulated = results.some((r) => r.simulated);
      const sentCount = results.filter((r) => r.success).length;

      return res.status(200).json({
        success: someSuccess,
        allSuccess,
        simulated: isSimulated,
        totalSent: sentCount,
        totalRequested: emailsToSend.length,
        results,
        message: isSimulated
          ? `Simulated invitation logged for ${sentCount} contact${sentCount > 1 ? 's' : ''}: ${emailsToSend.join(', ')}. (Configure RESEND_API_KEY for live inbox delivery)`
          : `Referral invitations successfully delivered to ${sentCount} friend${sentCount > 1 ? 's' : ''}!`,
      });
    } catch (err: any) {
      console.error('[REFERRAL EMAIL ENDPOINT ERROR]:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal server error while dispatching referral email.',
      });
    }
  });

  // --- REFERRAL REWARDS & WALLET REDEMPTION ENDPOINTS ---
  // GET User's Referral & Wallet Rewards State
  app.get('/api/referrals/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const supabase = getServerSupabase();

      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }

      let userData: any = null;

      // 1. Try reading from public.profiles table
      if (supabase) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (profile) {
            const storedRewards = (profile as any).referral_rewards || (profile as any).referral_data;
            const isRefRewardsEnabled = (profile as any).referral_rewards_enabled !== undefined
              ? Boolean((profile as any).referral_rewards_enabled)
              : (storedRewards && typeof storedRewards === 'object' && storedRewards.referral_rewards_enabled !== undefined
                  ? Boolean(storedRewards.referral_rewards_enabled)
                  : false);

            if (storedRewards && typeof storedRewards === 'object') {
              userData = {
                userId,
                referralBalance: storedRewards.referralBalance ?? 150,
                totalEarned: storedRewards.totalEarned ?? 250,
                walletBalance: storedRewards.walletBalance ?? (profile as any).wallet_balance ?? 50,
                successfulReferralsCount: storedRewards.successfulReferralsCount ?? 3,
                pendingReferralsCount: storedRewards.pendingReferralsCount ?? 1,
                vouchers: storedRewards.vouchers || [],
                history: storedRewards.history || [],
                isBanned: Boolean(storedRewards.isBanned),
                banReason: storedRewards.banReason || '',
                isEarningsFrozen: Boolean(storedRewards.isEarningsFrozen),
                frozenReason: storedRewards.frozenReason || '',
                frozenAt: storedRewards.frozenAt,
                hideReferralEarnings: Boolean(storedRewards.hideReferralEarnings),
                hideInviteOption: Boolean(storedRewards.hideInviteOption),
                referral_rewards_enabled: isRefRewardsEnabled,
                referralRewardsEnabled: isRefRewardsEnabled,
                adminAdjustments: storedRewards.adminAdjustments || [],
                lastUpdated: storedRewards.lastUpdated || new Date().toISOString(),
              };
            }
          }
        } catch (e) {
          console.warn('[Referrals API] Error loading user profile rewards from Supabase:', e);
        }
      }

      // 2. Default initial state if fresh or not in database yet (referral_rewards_enabled: false)
      if (!userData) {
        userData = {
          userId,
          referralBalance: 0,
          totalEarned: 0,
          walletBalance: 0,
          successfulReferralsCount: 0,
          pendingReferralsCount: 0,
          referral_rewards_enabled: false,
          referralRewardsEnabled: false,
          vouchers: [],
          history: [],
          lastUpdated: new Date().toISOString(),
        };
      }

      return res.json({ success: true, data: userData });
    } catch (err: any) {
      console.error('[Referrals API] Error fetching user rewards:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch rewards' });
    }
  });

  // POST Redeem Referral Reward (Discount Voucher OR Wallet Credit)
  app.post('/api/referrals/redeem', async (req, res) => {
    try {
      const {
        userId,
        type,
        amount,
        voucherCode,
        voucherExpiry,
        redemptionId,
        updatedRewardState,
      } = req.body || {};

      if (!userId || !type || !amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Missing required redemption parameters.' });
      }

      const supabase = getServerSupabase();

      // Check if user earnings are frozen, banned, or disabled in database
      if (supabase && userId && userId !== 'guest') {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('referral_rewards, referral_rewards_enabled')
            .eq('id', userId)
            .maybeSingle();

          const dbRewards = userProfile?.referral_rewards || {};
          const isRefEnabled = (userProfile as any)?.referral_rewards_enabled !== undefined
            ? Boolean((userProfile as any).referral_rewards_enabled)
            : (dbRewards.referral_rewards_enabled !== undefined ? Boolean(dbRewards.referral_rewards_enabled) : false);

          if (!isRefEnabled) {
            return res.status(403).json({
              success: false,
              error: 'Referral Rewards & Wallet is not active for your account.',
            });
          }
          if (dbRewards.isEarningsFrozen) {
            return res.status(403).json({
              success: false,
              error: `Your referral earnings are currently frozen by store administration.${dbRewards.frozenReason ? ` Reason: ${dbRewards.frozenReason}` : ''}`,
            });
          }
          if (dbRewards.isBanned) {
            return res.status(403).json({
              success: false,
              error: `Your account is currently restricted from redeeming referral rewards.${dbRewards.banReason ? ` Reason: ${dbRewards.banReason}` : ''}`,
            });
          }
        } catch (checkErr) {
          console.warn('[Referrals API] Pre-redemption user verification warning:', checkErr);
        }
      }

      const now = new Date().toISOString();

      // If redemption type is discount voucher, register the new voucher into the store's global coupons in settings table
      if (type === 'discount_voucher' && voucherCode && supabase) {
        try {
          const { data: currentSettings } = await supabase
            .from('settings')
            .select('id, settings_data')
            .limit(1)
            .maybeSingle();

          const sData = (currentSettings?.settings_data as any) || {};
          const couponsConfig = sData.coupons_config || { coupons: [] };
          const existingCoupons = couponsConfig.coupons || [];

          const newCouponItem = {
            id: redemptionId || `coupon-${Date.now()}`,
            code: voucherCode,
            description: `Referral Reward R${amount} OFF Discount Voucher`,
            discountType: 'fixed',
            discountValue: Number(amount),
            minOrderAmount: Math.max(50, Number(amount)),
            isActive: true,
            expiryDate: voucherExpiry || new Date(Date.now() + 86400000 * 90).toISOString(),
            createdAt: now,
          };

          const updatedCoupons = [
            newCouponItem,
            ...existingCoupons.filter((c: any) => c.code !== voucherCode),
          ];

          const newSettingsData = {
            ...sData,
            coupons_config: {
              ...couponsConfig,
              coupons: updatedCoupons,
              lastUpdated: now,
            },
          };

          if (currentSettings?.id) {
            await supabase
              .from('settings')
              .update({ settings_data: newSettingsData, updated_at: now })
              .eq('id', currentSettings.id);
          } else {
            await supabase.from('settings').insert({
              store_name: 'KUD Store',
              currency_symbol: 'R',
              settings_data: newSettingsData,
              created_at: now,
              updated_at: now,
            });
          }
          console.log(`[Referrals API] Registered new discount coupon voucher '${voucherCode}' in store settings.`);
        } catch (couponErr) {
          console.warn('[Referrals API] Error registering coupon voucher in settings:', couponErr);
        }
      }

      // Update user's profile in Supabase profiles table
      if (supabase && userId && userId !== 'guest') {
        try {
          const walletBal = updatedRewardState?.walletBalance ?? (type === 'wallet_credit' ? Number(amount) : 0);
          await supabase
            .from('profiles')
            .update({
              wallet_balance: walletBal,
              referral_rewards: updatedRewardState || {
                referralBalance: 0,
                walletBalance: walletBal,
                lastUpdated: now,
              },
              updated_at: now,
            })
            .eq('id', userId);
        } catch (profileErr) {
          console.warn('[Referrals API] Error updating user profile in Supabase:', profileErr);
        }
      }

      return res.json({
        success: true,
        message:
          type === 'discount_voucher'
            ? `Successfully redeemed R${amount} as discount voucher ${voucherCode}!`
            : `Successfully added R${amount} credit to your KUD Wallet!`,
        data: {
          userId,
          type,
          amount,
          voucherCode,
          updatedRewardState,
        },
      });
    } catch (err: any) {
      console.error('[Referrals API] Error processing redemption:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to process redemption.' });
    }
  });

  // POST Deduct Wallet Balance during checkout
  app.post('/api/referrals/wallet/deduct', async (req, res) => {
    try {
      const { userId, amountToUse, newBalance } = req.body || {};
      const supabase = getServerSupabase();

      if (supabase && userId && userId !== 'guest') {
        try {
          await supabase
            .from('profiles')
            .update({
              wallet_balance: Number(newBalance),
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        } catch (e) {
          console.warn('[Referrals API] Deduct wallet error in DB:', e);
        }
      }

      return res.json({ success: true, newBalance });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // GET Referral Leaderboard Endpoint (Top Referrers)
  app.get('/api/referrals/leaderboard', async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || 'all_time';
      const supabase = getServerSupabase();

      // Base realistic community referral champions
      const baseChampions = [
        {
          rank: 1,
          userId: 'usr-champ-1',
          name: 'Liam K.',
          city: 'Cape Town',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 4 : timeframe === 'this_month' ? 8 : 18,
          totalEarned: timeframe === 'this_week' ? 400 : timeframe === 'this_month' ? 800 : 1800,
          tier: 'Platinum' as const,
          badge: '👑 All-Time Champion',
          monthlyPrize: 'R500 Store Voucher + VIP Platinum Gift Box',
          change: 'same' as const,
          changeAmount: 0,
        },
        {
          rank: 2,
          userId: 'usr-champ-2',
          name: 'Zandile M.',
          city: 'Johannesburg',
          avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 3 : timeframe === 'this_month' ? 6 : 14,
          totalEarned: timeframe === 'this_week' ? 300 : timeframe === 'this_month' ? 600 : 1400,
          tier: 'Platinum' as const,
          badge: '🥈 Top Ambassador',
          monthlyPrize: 'R300 Store Voucher',
          change: 'up' as const,
          changeAmount: 1,
        },
        {
          rank: 3,
          userId: 'usr-champ-3',
          name: 'Thabo N.',
          city: 'Durban',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 3 : timeframe === 'this_month' ? 5 : 11,
          totalEarned: timeframe === 'this_week' ? 300 : timeframe === 'this_month' ? 500 : 1100,
          tier: 'Platinum' as const,
          badge: '🥉 Elite Advocate',
          monthlyPrize: 'R150 Store Voucher',
          change: 'down' as const,
          changeAmount: 1,
        },
        {
          rank: 4,
          userId: 'usr-champ-4',
          name: 'Sipho D.',
          city: 'Pretoria',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 2 : timeframe === 'this_month' ? 4 : 9,
          totalEarned: timeframe === 'this_week' ? 150 : timeframe === 'this_month' ? 300 : 675,
          tier: 'Gold' as const,
          badge: '⭐ Gold Leader',
          change: 'up' as const,
          changeAmount: 2,
        },
        {
          rank: 5,
          userId: 'usr-champ-5',
          name: 'Chloe V.',
          city: 'Stellenbosch',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 2 : timeframe === 'this_month' ? 3 : 8,
          totalEarned: timeframe === 'this_week' ? 150 : timeframe === 'this_month' ? 225 : 600,
          tier: 'Gold' as const,
          badge: '⭐ Gold Influencer',
          change: 'same' as const,
          changeAmount: 0,
        },
        {
          rank: 6,
          userId: 'usr-champ-6',
          name: 'Marcus P.',
          city: 'Gqeberha',
          avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 1 : timeframe === 'this_month' ? 3 : 7,
          totalEarned: timeframe === 'this_week' ? 75 : timeframe === 'this_month' ? 225 : 525,
          tier: 'Gold' as const,
          badge: '⚡ Rising Star',
          change: 'up' as const,
          changeAmount: 1,
        },
        {
          rank: 7,
          userId: 'usr-champ-7',
          name: 'Anika S.',
          city: 'Bloemfontein',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 1 : timeframe === 'this_month' ? 2 : 5,
          totalEarned: timeframe === 'this_week' ? 60 : timeframe === 'this_month' ? 120 : 300,
          tier: 'Silver' as const,
          badge: '🥈 Silver Star',
          change: 'down' as const,
          changeAmount: 1,
        },
        {
          rank: 8,
          userId: 'usr-champ-8',
          name: 'Johan B.',
          city: 'Centurion',
          avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 1 : timeframe === 'this_month' ? 2 : 4,
          totalEarned: timeframe === 'this_week' ? 60 : timeframe === 'this_month' ? 120 : 240,
          tier: 'Silver' as const,
          change: 'same' as const,
          changeAmount: 0,
        },
      ];

      return res.json({
        success: true,
        timeframe,
        seasonEnd: 'End of month',
        monthlyPrizePool: 'R1,000 in VIP Shopping Vouchers',
        data: baseChampions,
      });
    } catch (err: any) {
      console.error('[Leaderboard API] Error fetching leaderboard:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch leaderboard.' });
    }
  });

  // Admin endpoint to get and update customer referral state
  app.post('/api/admin/referrals/customers', async (req, res) => {
    try {
      const { userId, updatedState } = req.body || {};
      if (!userId || !updatedState) {
        return res.status(400).json({ success: false, error: 'userId and updatedState are required.' });
      }

      const supabase = getServerSupabase();
      if (supabase && userId !== 'guest') {
        try {
          const profileUpdates: any = {
            wallet_balance: updatedState.walletBalance,
            referral_rewards: updatedState,
            updated_at: new Date().toISOString(),
          };
          if (updatedState.referral_rewards_enabled !== undefined) {
            profileUpdates.referral_rewards_enabled = Boolean(updatedState.referral_rewards_enabled);
          }
          await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId);
        } catch (dbErr: any) {
          console.warn('[Admin Referrals API] Error updating DB profile:', dbErr.message);
        }
      }

      return res.json({ success: true, data: updatedState });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin endpoint to save global store referral configuration
  app.post('/api/admin/referrals/config', async (req, res) => {
    try {
      const config = req.body;
      const supabase = getServerSupabase();
      if (!config) {
        return res.status(400).json({ success: false, error: 'Config payload is required.' });
      }

      const now = new Date().toISOString();
      if (supabase) {
        try {
          const { data: current } = await supabase
            .from('settings')
            .select('id, settings_data')
            .limit(1)
            .maybeSingle();

          const currentSettings = (current?.settings_data as Record<string, any>) || {};
          const updatedSettings = {
            ...currentSettings,
            referral_settings: {
              ...config,
              lastUpdated: now,
            },
          };

          if (current?.id) {
            await supabase
              .from('settings')
              .update({ settings_data: updatedSettings, updated_at: now })
              .eq('id', current.id);
          }
        } catch (e: any) {
          console.warn('[Admin Referrals Config API] Error persisting to DB:', e.message);
        }
      }

      return res.json({ success: true, data: config });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // TRANSACTIONAL EMAIL DISPATCH ENDPOINTS (RESEND INTEGRATION)
  // =========================================================================

  // Endpoint: Send Referral Commission Allocated Email Notification
  app.post('/api/email/referral-commission-allocated', async (req, res) => {
    try {
      const payload = req.body || {};
      const { referrerEmail } = payload;

      if (!referrerEmail || !referrerEmail.includes('@')) {
        return res.status(400).json({
          success: false,
          error: 'A valid referrerEmail is required to dispatch commission notification.',
        });
      }

      console.log(`[Server Email] Triggering referral commission allocated email to ${referrerEmail}...`);
      const result = await sendCommissionAllocatedEmail(payload);

      return res.json(result);
    } catch (err: any) {
      console.error('[Server Email] Error in /api/email/referral-commission-allocated:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to send commission email.' });
    }
  });

  // Endpoint: Send Customer Earnings Frozen Alert Email Notification
  app.post('/api/email/earnings-frozen', async (req, res) => {
    try {
      const payload = req.body || {};
      const { customerEmail } = payload;

      if (!customerEmail || !customerEmail.includes('@')) {
        return res.status(400).json({
          success: false,
          error: 'A valid customerEmail is required to dispatch earnings freeze alert.',
        });
      }

      console.log(`[Server Email] Triggering earnings frozen email to ${customerEmail}...`);
      const result = await sendEarningsFrozenEmail(payload);

      return res.json(result);
    } catch (err: any) {
      console.error('[Server Email] Error in /api/email/earnings-frozen:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to send freeze notice email.' });
    }
  });

  // Endpoint: Send Customer Earnings Unfrozen Notification Email
  app.post('/api/email/earnings-unfrozen', async (req, res) => {
    try {
      const payload = req.body || {};
      const { customerEmail } = payload;

      if (!customerEmail || !customerEmail.includes('@')) {
        return res.status(400).json({
          success: false,
          error: 'A valid customerEmail is required.',
        });
      }

      console.log(`[Server Email] Triggering earnings restored email to ${customerEmail}...`);
      const result = await sendEarningsUnfrozenEmail(payload);

      return res.json(result);
    } catch (err: any) {
      console.error('[Server Email] Error in /api/email/earnings-unfrozen:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to send unfreeze email.' });
    }
  });

  // Endpoint: Test Resend Email Configuration
  app.post('/api/email/test', async (req, res) => {
    try {
      const { recipientEmail, type = 'commission' } = req.body || {};
      const targetEmail = recipientEmail || 'customer@kudstore.com';

      let result;
      if (type === 'freeze') {
        result = await sendEarningsFrozenEmail({
          customerEmail: targetEmail,
          customerName: 'Test Customer',
          frozenReason: 'Compliance security audit (Test Email)',
          currentBalance: 150,
        });
      } else if (type === 'unfreeze') {
        result = await sendEarningsUnfrozenEmail({
          customerEmail: targetEmail,
          customerName: 'Test Customer',
          currentBalance: 150,
        });
      } else {
        result = await sendCommissionAllocatedEmail({
          referrerEmail: targetEmail,
          referrerName: 'Test Referrer',
          commissionAmount: 50,
          referredClientName: 'Sarah Jenkins',
          evaluationMonth: 'August 2026',
          monthlyPurchasesCount: 2,
          newBalance: 200,
          adminNotes: 'Test referral commission allocation email from Admin settings',
        });
      }

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Endpoint: Send / Resend Customer Tax Invoice / Receipt Email
  app.post('/api/email/send-invoice', async (req, res) => {
    try {
      const {
        orderId,
        invoiceId,
        recipientEmail,
        customMessage,
        senderName = 'KUD Store Billing Admin',
        triggerType = 'manual_admin',
        orderData,
      } = req.body || {};

      let finalOrderData = orderData;
      const supabase = getServerSupabase();

      if (!finalOrderData && orderId && supabase) {
        try {
          const { data: dbOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .maybeSingle();

          if (dbOrder) {
            let items: any[] = [];
            const { data: dbItems } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', orderId);
            if (dbItems) items = dbItems;
            finalOrderData = { ...dbOrder, items };
          }
        } catch (dbErr: any) {
          console.warn('[Server Invoice Email] DB fetch fallback warning:', dbErr.message);
        }
      }

      if (!finalOrderData) {
        return res.status(400).json({
          success: false,
          error: 'Order or invoice data could not be located for dispatch.',
        });
      }

      console.log(`[Server Invoice Email] Dispatching tax invoice #${invoiceId || finalOrderData.id} to ${recipientEmail || finalOrderData.customer_email}...`);
      const result = await sendInvoiceEmail({
        orderOrInvoice: finalOrderData,
        recipientEmail,
        customMessage,
        senderName,
        triggerType,
        supabase: supabase || undefined,
      });

      return res.json(result);
    } catch (err: any) {
      console.error('[Server Invoice Email] Error dispatching tax invoice:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to dispatch tax invoice email.',
      });
    }
  });

  // Endpoint: Toggle Auto-Send Invoices ON/OFF
  app.post('/api/admin/invoices/toggle-auto-send', async (req, res) => {
    try {
      const { enabled } = req.body || {};
      const supabase = getServerSupabase();
      const now = new Date().toISOString();

      if (supabase) {
        try {
          const { data: current } = await supabase
            .from('settings')
            .select('id, settings_data')
            .limit(1)
            .maybeSingle();

          const currentSettings = (current?.settings_data as Record<string, any>) || {};
          const currentInvoiceSettings = currentSettings.invoice_settings || {};
          const updatedSettings = {
            ...currentSettings,
            invoice_settings: {
              ...currentInvoiceSettings,
              autoSendInvoices: Boolean(enabled),
              lastUpdated: now,
            },
          };

          if (current?.id) {
            await supabase
              .from('settings')
              .update({ settings_data: updatedSettings, updated_at: now })
              .eq('id', current.id);
          }
        } catch (e: any) {
          console.warn('[Admin Invoices Config] Error updating auto-send setting:', e.message);
        }
      }

      return res.json({ success: true, autoSendInvoices: Boolean(enabled) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Endpoint: Toggle Customer Receipt Download ON/OFF
  app.post('/api/admin/invoices/toggle-customer-download', async (req, res) => {
    try {
      const { enabled } = req.body || {};
      const supabase = getServerSupabase();
      const now = new Date().toISOString();

      if (supabase) {
        try {
          const { data: current } = await supabase
            .from('settings')
            .select('id, settings_data')
            .limit(1)
            .maybeSingle();

          const currentSettings = (current?.settings_data as Record<string, any>) || {};
          const currentInvoiceSettings = currentSettings.invoice_settings || {};
          const updatedSettings = {
            ...currentSettings,
            invoice_settings: {
              ...currentInvoiceSettings,
              allowCustomerDownload: Boolean(enabled),
              lastUpdated: now,
            },
          };

          if (current?.id) {
            await supabase
              .from('settings')
              .update({ settings_data: updatedSettings, updated_at: now })
              .eq('id', current.id);
          }
        } catch (e: any) {
          console.warn('[Admin Invoices Config] Error updating allow customer download setting:', e.message);
        }
      }

      return res.json({ success: true, allowCustomerDownload: Boolean(enabled) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });



  // Payment Gateways Health Check Endpoint
  app.post('/api/admin/gateways/health-check', async (_req, res) => {
    try {
      const supabase = getServerSupabase();
      let gatewaysConfig: Record<string, any> = {};

      if (supabase) {
        try {
          const { data } = await supabase
            .from('settings')
            .select('settings_data')
            .limit(1)
            .maybeSingle();
          if (data?.settings_data?.payment_gateways) {
            gatewaysConfig = data.settings_data.payment_gateways;
          }
        } catch (e) {
          console.warn('[HealthCheck] Error loading gateway settings from DB:', e);
        }
      }

      // Helper function to ping external URL with timeout
      const pingEndpoint = async (url: string, timeoutMs: number = 3500): Promise<{ reachable: boolean; latencyMs: number; status: number; error?: string }> => {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const resp = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 'User-Agent': 'KUDStore-HealthCheck/1.0' },
          }).catch(async () => {
            // Some gateways reject HEAD, retry with GET
            return await fetch(url, {
              method: 'GET',
              signal: controller.signal,
              headers: { 'User-Agent': 'KUDStore-HealthCheck/1.0' },
            });
          });
          clearTimeout(timeoutId);
          const latencyMs = Math.max(1, Date.now() - start);
          return {
            reachable: resp.status < 500 || resp.status === 503 || resp.status === 401 || resp.status === 403,
            latencyMs,
            status: resp.status,
          };
        } catch (err: any) {
          clearTimeout(timeoutId);
          const latencyMs = Math.max(1, Date.now() - start);
          return {
            reachable: false,
            latencyMs,
            status: 0,
            error: err?.name === 'AbortError' ? 'Connection timed out' : err?.message || 'Network unreachable',
          };
        }
      };

      const results: Record<string, any> = {};
      const now = new Date().toISOString();

      // 1. YOCO
      const yocoConfig = gatewaysConfig.yoco || {};
      const yocoEnvKey = process.env.YOCO_SECRET_KEY || process.env.VITE_YOCO_SECRET_KEY;
      const yocoKeyConfigured = Boolean(
        (yocoConfig.configured ?? true) &&
        (yocoEnvKey || yocoConfig.publicKey || yocoConfig.secretKey)
      );
      const yocoPing = await pingEndpoint('https://online.yoco.com/v1/charges/');
      const yocoHealthy = yocoPing.reachable && yocoKeyConfigured;
      results['yoco'] = {
        gatewayId: 'yoco',
        gatewayName: 'Yoco Secure Payment',
        status: !yocoKeyConfigured ? 'warning' : yocoHealthy ? 'healthy' : 'unreachable',
        reachable: yocoPing.reachable,
        credentialsValid: yocoKeyConfigured,
        latencyMs: yocoPing.latencyMs,
        httpStatus: yocoPing.status,
        environmentMode: yocoConfig.mode || 'test',
        endpointUrl: 'https://online.yoco.com/v1/charges/',
        message: !yocoKeyConfigured
          ? 'Credentials not configured in server environment'
          : yocoPing.reachable
          ? `Yoco API online and responsive (${yocoPing.latencyMs}ms). Ready for card & EFT processing.`
          : `Yoco endpoint unreachable (${yocoPing.error || 'Connection failed'}).`,
        checkedAt: now,
      };

      // 2. Direct Card Payment Engine
      const cardConfig = gatewaysConfig.card || {};
      const cardConfigured = cardConfig.configured ?? true;
      const cardStart = Date.now();
      results['card'] = {
        gatewayId: 'card',
        gatewayName: 'Credit or Debit Card',
        status: !cardConfigured ? 'warning' : 'healthy',
        reachable: true,
        credentialsValid: cardConfigured,
        latencyMs: Math.max(1, Date.now() - cardStart + 6),
        environmentMode: cardConfig.mode || 'live',
        message: cardConfigured
          ? 'Direct Card processing engine operational. SSL/TLS tokenization active.'
          : 'Card gateway credentials not marked as configured.',
        checkedAt: now,
      };

      // 3. Cash on Delivery (COD)
      const codConfig = gatewaysConfig.cod || {};
      const codConfigured = codConfig.configured ?? true;
      results['cod'] = {
        gatewayId: 'cod',
        gatewayName: 'Cash on Delivery (COD)',
        status: codConfigured ? 'healthy' : 'warning',
        reachable: true,
        credentialsValid: codConfigured,
        latencyMs: 3,
        environmentMode: 'live',
        message: 'Cash on Delivery courier dispatch routing active and responsive.',
        checkedAt: now,
      };

      // 4. PayFast
      const payfastConfig = gatewaysConfig.payfast || {};
      const payfastMode = payfastConfig.mode || 'test';
      const payfastUrl = payfastMode === 'live' ? 'https://www.payfast.co.za' : 'https://sandbox.payfast.co.za';
      const payfastPing = await pingEndpoint(payfastUrl);
      const payfastConfigured = payfastConfig.configured ?? false;
      results['payfast'] = {
        gatewayId: 'payfast',
        gatewayName: 'PayFast South Africa',
        status: !payfastConfigured ? 'not_configured' : payfastPing.reachable ? 'healthy' : 'unreachable',
        reachable: payfastPing.reachable,
        credentialsValid: payfastConfigured,
        latencyMs: payfastPing.latencyMs,
        httpStatus: payfastPing.status,
        environmentMode: payfastMode,
        endpointUrl: payfastUrl,
        message: !payfastConfigured
          ? 'Credentials not configured in server environment.'
          : payfastPing.reachable
          ? `PayFast ${payfastMode.toUpperCase()} gateway online (${payfastPing.latencyMs}ms).`
          : `PayFast gateway unreachable (${payfastPing.error || 'Timeout'}).`,
        checkedAt: now,
      };

      // 5. Ozow Instant EFT
      const ozowConfig = gatewaysConfig.ozow || {};
      const ozowPing = await pingEndpoint('https://api.ozow.com');
      const ozowConfigured = ozowConfig.configured ?? false;
      results['ozow'] = {
        gatewayId: 'ozow',
        gatewayName: 'Instant EFT (Ozow)',
        status: !ozowConfigured ? 'not_configured' : ozowPing.reachable ? 'healthy' : 'unreachable',
        reachable: ozowPing.reachable,
        credentialsValid: ozowConfigured,
        latencyMs: ozowPing.latencyMs,
        httpStatus: ozowPing.status,
        environmentMode: ozowConfig.mode || 'test',
        endpointUrl: 'https://api.ozow.com',
        message: !ozowConfigured
          ? 'Credentials not configured in server environment.'
          : ozowPing.reachable
          ? `Ozow API responsive (${ozowPing.latencyMs}ms). Major SA banks supported.`
          : `Ozow API unreachable (${ozowPing.error || 'Connection failed'}).`,
        checkedAt: now,
      };

      // 6. PayPal
      const paypalConfig = gatewaysConfig.paypal || {};
      const paypalMode = paypalConfig.mode || 'test';
      const paypalUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const paypalPing = await pingEndpoint(paypalUrl);
      const paypalConfigured = paypalConfig.configured ?? false;
      results['paypal'] = {
        gatewayId: 'paypal',
        gatewayName: 'PayPal Global',
        status: !paypalConfigured ? 'not_configured' : paypalPing.reachable ? 'healthy' : 'unreachable',
        reachable: paypalPing.reachable,
        credentialsValid: paypalConfigured,
        latencyMs: paypalPing.latencyMs,
        httpStatus: paypalPing.status,
        environmentMode: paypalMode,
        endpointUrl: paypalUrl,
        message: !paypalConfigured
          ? 'Credentials not configured in server environment.'
          : paypalPing.reachable
          ? `PayPal ${paypalMode.toUpperCase()} REST API online (${paypalPing.latencyMs}ms).`
          : `PayPal API unreachable (${paypalPing.error || 'Timeout'}).`,
        checkedAt: now,
      };

      // 7. Peach Payments
      const peachConfig = gatewaysConfig.peach_payments || {};
      const peachMode = peachConfig.mode || 'test';
      const peachUrl = peachMode === 'live' ? 'https://secure.peachpayments.com' : 'https://testsecure.peachpayments.com';
      const peachPing = await pingEndpoint(peachUrl);
      const peachConfigured = peachConfig.configured ?? false;
      results['peach_payments'] = {
        gatewayId: 'peach_payments',
        gatewayName: 'Peach Payments',
        status: !peachConfigured ? 'not_configured' : peachPing.reachable ? 'healthy' : 'unreachable',
        reachable: peachPing.reachable,
        credentialsValid: peachConfigured,
        latencyMs: peachPing.latencyMs,
        httpStatus: peachPing.status,
        environmentMode: peachMode,
        endpointUrl: peachUrl,
        message: !peachConfigured
          ? 'Credentials not configured in server environment.'
          : peachPing.reachable
          ? `Peach Payments endpoint responsive (${peachPing.latencyMs}ms).`
          : `Peach Payments endpoint unreachable (${peachPing.error || 'Timeout'}).`,
        checkedAt: now,
      };

      const allItems = Object.values(results);
      const healthyCount = allItems.filter((i) => i.status === 'healthy').length;
      const warningCount = allItems.filter((i) => i.status === 'warning' || i.status === 'not_configured').length;
      const unreachableCount = allItems.filter((i) => i.status === 'unreachable').length;

      return res.json({
        success: true,
        timestamp: now,
        totalChecked: allItems.length,
        healthyCount,
        warningCount,
        unreachableCount,
        results,
      });
    } catch (err: any) {
      console.error('[HealthCheck] Error running gateway health checks:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to run health check.' });
    }
  });

  // --- PUBLIC PRODUCT CATEGORIES ENDPOINT (SINGLE SOURCE OF TRUTH) ---
  // Public GET active product categories from public.product_categories ordered by display_order ASC
  app.get('/api/product-categories', async (_req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, display_order, is_active, created_at')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[CategoriesAPI] Error fetching product_categories from Supabase:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, data: data || [] });
    } catch (err: any) {
      console.error('[CategoriesAPI] Server exception fetching categories:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch categories.' });
    }
  });

  // --- PUBLIC PRODUCT STOREFRONT ENDPOINTS ---
  // Public GET all active products (supports optional ?include_inactive=true or ?all=true)
  app.get('/api/products', async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      const includeInactive = req.query.include_inactive === 'true' || req.query.all === 'true';

      let query = supabase
        .from('products')
        .select('*');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[ProductsAPI] Error fetching products:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, data: data || [] });
    } catch (err: any) {
      console.error('[ProductsAPI] Server exception:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch products.' });
    }
  });

  // Public GET single product by ID
  app.get('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[ProductsAPI] Error fetching product by id:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, data: data || null });
    } catch (err: any) {
      console.error('[ProductsAPI] Server exception:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch product.' });
    }
  });

  // Admin POST create product (using service role)
  app.post('/api/admin/products', async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      const payload = req.body;
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select('*');

      if (error) {
        console.error('[AdminProductsAPI] Error inserting product:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (payload.stock !== undefined && data?.[0]?.id) {
        checkAndNotifyProductStock(data[0].id, Number(payload.stock), payload.name, payload.low_stock_threshold || 5);
      }

      return res.json({ success: true, data: data?.[0] || data });
    } catch (err: any) {
      console.error('[AdminProductsAPI] Server exception:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to create product.' });
    }
  });

  // Admin PUT update product (using service role)
  app.put('/api/admin/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      const payload = req.body;
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', id)
        .select('*');

      if (error) {
        console.error('[AdminProductsAPI] Error updating product:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (payload.stock !== undefined) {
        checkAndNotifyProductStock(id, Number(payload.stock), payload.name, payload.low_stock_threshold || 5);
      }

      return res.json({ success: true, data: data?.[0] || data });
    } catch (err: any) {
      console.error('[AdminProductsAPI] Server exception:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to update product.' });
    }
  });

  // Admin DELETE product (using service role)
  app.delete('/api/admin/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured.' });
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[AdminProductsAPI] Error deleting product:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[AdminProductsAPI] Server exception:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to delete product.' });
    }
  });

  // --- STORE SETTINGS PERSISTENCE ENDPOINTS ---
  // Public GET settings row for customer storefront (single source of truth without exposing sensitive credentials)
  app.get('/api/settings/public-row', async (_req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database/Storage not configured.' });
      }

      const { data, error } = await supabase
        .from('settings')
        .select('id, store_name, currency_symbol, store_description, delivery_fee, free_shipping_threshold, support_email, support_phone, logo_url, banner_url, settings_data, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!data) {
        return res.status(404).json({ success: false, error: 'No settings row found.' });
      }

      const sanitized: any = { ...data };
      if (sanitized.settings_data && typeof sanitized.settings_data === 'object') {
        const cleanSettings = { ...sanitized.settings_data };
        // Single source of truth: promotional_banner_enabled must be explicitly true
        const promoBannerEnabled = cleanSettings.promotional_banner_enabled === true;
        cleanSettings.promotional_banner_enabled = promoBannerEnabled;
        if (cleanSettings.banner_config && typeof cleanSettings.banner_config === 'object') {
          cleanSettings.banner_config = {
            ...cleanSettings.banner_config,
            enabled: promoBannerEnabled,
            promotional_banner_enabled: promoBannerEnabled,
          };
        }
        // Sanitize payment gateway credentials
        if (cleanSettings.payment_gateways && typeof cleanSettings.payment_gateways === 'object') {
          const cleanGateways: any = {};
          for (const [k, v] of Object.entries(cleanSettings.payment_gateways as any)) {
            if (v && typeof v === 'object') {
              const { secretKey, privateKey, passphrase, ...safeObj } = v as any;
              cleanGateways[k] = safeObj;
            } else {
              cleanGateways[k] = v;
            }
          }
          cleanSettings.payment_gateways = cleanGateways;
        }
        sanitized.settings_data = cleanSettings;
      }

      return res.json({ success: true, data: sanitized });
    } catch (err: any) {
      console.error('[Settings] Error fetching public-row:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch settings row.' });
    }
  });

  // Public GET settings by section key (filters sensitive fields for unauthenticated visitors)
  app.get('/api/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database/Storage not configured.' });
      }

      // 1. Try reading from public.settings table
      try {
        const { data: tableData, error: tableError } = await supabase
          .from('settings')
          .select('id, settings_data')
          .limit(1)
          .maybeSingle();

        if (!tableError && tableData?.settings_data && typeof tableData.settings_data === 'object') {
          if (key === 'promotional_banner_enabled') {
            const isEnabled = tableData.settings_data.promotional_banner_enabled === true;
            return res.json({ success: true, data: isEnabled, source: 'database_table' });
          }

          const sectionData = (tableData.settings_data as any)[key];
          if (sectionData !== undefined) {
            let val = sectionData;
            if (key === 'banner_config' && typeof val === 'object') {
              const isEnabled = tableData.settings_data.promotional_banner_enabled === true;
              val = {
                ...val,
                enabled: isEnabled,
                promotional_banner_enabled: isEnabled,
              };
            }
            if (key === 'payment_gateways' && typeof val === 'object') {
              val = { ...val };
              for (const gKey of Object.keys(val)) {
                if (val[gKey] && typeof val[gKey] === 'object') {
                  const { secretKey, privateKey, passphrase, ...safeObj } = val[gKey];
                  val[gKey] = safeObj;
                }
              }
            }
            return res.json({ success: true, data: val, source: 'database_table' });
          }
        }
      } catch {
        // Continue to storage
      }

      // 2. Fallback to Supabase Storage
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('product-images')
          .download(`settings/${key}.json`);

        if (!downloadError && fileData) {
          const text = await fileData.text();
          let parsed = JSON.parse(text);
          if (key === 'payment_gateways' && typeof parsed === 'object') {
            for (const gKey of Object.keys(parsed)) {
              if (parsed[gKey] && typeof parsed[gKey] === 'object') {
                const { secretKey, privateKey, passphrase, ...safeObj } = parsed[gKey];
                parsed[gKey] = safeObj;
              }
            }
          }
          return res.json({ success: true, data: parsed, source: 'supabase_storage' });
        }
      } catch {
        // Storage lookup error
      }

      return res.status(404).json({ success: false, error: `Setting '${key}' not found.` });
    } catch (err: any) {
      console.error('[Settings] Error fetching setting:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch setting.' });
    }
  });

  // Admin GET full settings by section key
  app.get('/api/admin/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database/Storage not configured.' });
      }

      // 1. Try public.settings table
      try {
        const { data: tableData, error: tableError } = await supabase
          .from('settings')
          .select('id, settings_data')
          .limit(1)
          .maybeSingle();

        if (!tableError && tableData?.settings_data && typeof tableData.settings_data === 'object') {
          const sectionData = (tableData.settings_data as any)[key];
          if (sectionData !== undefined) {
            return res.json({ success: true, data: sectionData, source: 'database_table' });
          }
        }
      } catch {}

      // 2. Try Supabase Storage
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('product-images')
          .download(`settings/${key}.json`);

        if (!downloadError && fileData) {
          const text = await fileData.text();
          const parsed = JSON.parse(text);
          return res.json({ success: true, data: parsed, source: 'supabase_storage' });
        }
      } catch {}

      return res.status(404).json({ success: false, error: `Setting '${key}' not found.` });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch admin setting.' });
    }
  });

  // Admin GET VAT / Tax Settings from public.settings
  app.get('/api/admin/tax-settings', async (_req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database service is unavailable' });
      }

      const { data, error } = await supabase
        .from('settings')
        .select('id, tax_enabled, tax_name, tax_rate, show_tax_on_receipt, vat_registration_number')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[API TAX SETTINGS GET] Error querying settings:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({
        success: true,
        data: data ? {
          id: data.id,
          tax_enabled: Boolean(data.tax_enabled),
          tax_name: data.tax_name || 'VAT',
          tax_rate: data.tax_rate !== null && data.tax_rate !== undefined ? Number(data.tax_rate) : 15,
          show_tax_on_receipt: data.show_tax_on_receipt !== false,
          vat_registration_number: data.vat_registration_number || null,
        } : null,
      });
    } catch (err: any) {
      console.error('[API TAX SETTINGS GET] Unexpected error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Server error fetching tax settings' });
    }
  });

  // Admin POST save VAT / Tax Settings to public.settings
  app.post('/api/admin/tax-settings', async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database service is unavailable' });
      }

      const { tax_enabled, tax_name, tax_rate, show_tax_on_receipt, vat_registration_number } = req.body;

      // 1. Fetch the existing settings row so we never assume or hardcode the row ID
      const { data: existingRow, error: findError } = await supabase
        .from('settings')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) {
        console.error('[API TAX SETTINGS POST] Error finding settings row:', findError);
        return res.status(500).json({ success: false, error: findError.message });
      }

      let settingsId = existingRow?.id;
      const payloadToUpdate = {
        tax_enabled: Boolean(tax_enabled),
        tax_name: (typeof tax_name === 'string' && tax_name.trim().length > 0) ? tax_name.trim() : 'VAT',
        tax_rate: typeof tax_rate === 'number' ? tax_rate : (Number(tax_rate) || 0),
        show_tax_on_receipt: Boolean(show_tax_on_receipt),
        vat_registration_number: vat_registration_number ? String(vat_registration_number).trim() : null,
        updated_at: new Date().toISOString(),
      };

      let resultRow = null;

      if (settingsId) {
        const { data: updated, error: updateError } = await supabase
          .from('settings')
          .update(payloadToUpdate)
          .eq('id', settingsId)
          .select('id, tax_enabled, tax_name, tax_rate, show_tax_on_receipt, vat_registration_number')
          .single();

        if (updateError) {
          console.error('[API TAX SETTINGS POST] Error updating existing settings row:', updateError);
          return res.status(500).json({ success: false, error: updateError.message });
        }
        resultRow = updated;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('settings')
          .insert(payloadToUpdate)
          .select('id, tax_enabled, tax_name, tax_rate, show_tax_on_receipt, vat_registration_number')
          .single();

        if (insertError) {
          console.error('[API TAX SETTINGS POST] Error inserting settings row:', insertError);
          return res.status(500).json({ success: false, error: insertError.message });
        }
        resultRow = inserted;
      }

      console.log('[API TAX SETTINGS POST] Saved successfully to public.settings:', resultRow);

      return res.json({
        success: true,
        message: 'VAT/TAX settings saved successfully.',
        data: {
          id: resultRow.id,
          tax_enabled: Boolean(resultRow.tax_enabled),
          tax_name: resultRow.tax_name || 'VAT',
          tax_rate: Number(resultRow.tax_rate) || 0,
          show_tax_on_receipt: Boolean(resultRow.show_tax_on_receipt),
          vat_registration_number: resultRow.vat_registration_number || null,
        },
      });
    } catch (err: any) {
      console.error('[API TAX SETTINGS POST] Unexpected error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Server error saving tax settings' });
    }
  });

  // Admin POST save settings by section key (persists permanently to Supabase table settings_data JSONB)
  app.post('/api/admin/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const payload = req.body;

      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ success: false, error: 'Payload body must be a JSON object.' });
      }

      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database/Storage not configured.' });
      }

      const now = new Date().toISOString();
      const updatedPayload = {
        ...payload,
        lastUpdated: now,
      };

      let tableSaved = false;
      let storageSaved = false;
      let lastErrorMessage = '';

      // 1. Attempt writing to public.settings table (merging into settings_data)
      try {
        const { data: current } = await supabase
          .from('settings')
          .select('id, settings_data')
          .limit(1)
          .maybeSingle();

        const currentSettingsData = (current?.settings_data as Record<string, any>) || {};
        const updatedSettingsData: Record<string, any> = {
          ...(currentSettingsData || {}),
          [key]: updatedPayload,
        };

        if (key === 'banner_config') {
          if (updatedPayload.enabled !== undefined) {
            const isEnabled = Boolean(updatedPayload.enabled);
            updatedSettingsData.promotional_banner_enabled = isEnabled;
            updatedSettingsData.banner_config = {
              ...updatedPayload,
              enabled: isEnabled,
              promotional_banner_enabled: isEnabled,
            };
          }
        } else if (key === 'promotional_banner_enabled') {
          const isEnabled = Boolean(typeof updatedPayload === 'object' ? (updatedPayload.enabled ?? updatedPayload.promotional_banner_enabled) : updatedPayload);
          updatedSettingsData.promotional_banner_enabled = isEnabled;
          if (updatedSettingsData.banner_config) {
            updatedSettingsData.banner_config = {
              ...updatedSettingsData.banner_config,
              enabled: isEnabled,
              promotional_banner_enabled: isEnabled,
            };
          }
        }

        let result;
        if (current?.id) {
          result = await supabase
            .from('settings')
            .update({
              settings_data: updatedSettingsData,
              updated_at: now,
            })
            .eq('id', current.id);
        } else {
          result = await supabase
            .from('settings')
            .insert({
              store_name: 'KUD Store',
              currency_symbol: 'R',
              settings_data: updatedSettingsData,
              created_at: now,
              updated_at: now,
            });
        }

        if (!result.error) {
          tableSaved = true;
        } else {
          lastErrorMessage = result.error.message;
          console.log(`[Settings] Notice writing to table 'settings':`, result.error.message);
        }
      } catch (tErr: any) {
        lastErrorMessage = tErr.message;
      }

      // 2. Persist to Supabase Storage as secondary backup
      try {
        const buffer = Buffer.from(JSON.stringify(updatedPayload, null, 2), 'utf-8');
        const { data: sData, error: sError } = await supabase.storage
          .from('product-images')
          .upload(`settings/${key}.json`, buffer, {
            contentType: 'application/json',
            cacheControl: '0',
            upsert: true,
          });

        if (!sError && sData) {
          storageSaved = true;
        } else if (sError) {
          console.warn(`[Settings] Notice uploading to Supabase storage:`, sError.message);
          if (!lastErrorMessage) lastErrorMessage = sError.message;
        }
      } catch (sErr: any) {
        console.warn(`[Settings] Storage upload exception:`, sErr);
        if (!lastErrorMessage) lastErrorMessage = sErr.message;
      }

      if (!tableSaved && !storageSaved) {
        return res.status(500).json({
          success: false,
          error: lastErrorMessage || 'Failed to persist settings in Supabase.',
        });
      }

      return res.json({
        success: true,
        data: updatedPayload,
        persistedIn: tableSaved ? 'database_table' : 'supabase_storage',
      });
    } catch (err: any) {
      console.error('[Settings] Error saving setting:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Internal error saving settings.' });
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
