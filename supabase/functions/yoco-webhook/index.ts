import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature, yoco-signature',
};

/**
 * Constant-time string equality check to prevent timing side-channel attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify Yoco webhook cryptographic HMAC-SHA256 signature using Standard Webhook / Svix specification.
 * Header: webhook-id, webhook-timestamp, webhook-signature (e.g. v1,g0hM9... or base64)
 * Secret: typically starts with whsec_ (with base64 encoded portion)
 */
async function verifyYocoSignature(
  rawBody: string,
  headers: Headers,
  signingSecret: string
): Promise<{ valid: boolean; reason?: string }> {
  const webhookId = headers.get('webhook-id') || headers.get('Webhook-Id');
  const webhookTimestamp = headers.get('webhook-timestamp') || headers.get('Webhook-Timestamp');
  const webhookSignature = headers.get('webhook-signature') || headers.get('Webhook-Signature') || headers.get('yoco-signature');

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return { valid: false, reason: 'Missing required signature headers (webhook-id, webhook-timestamp, webhook-signature)' };
  }

  // 1. Verify timestamp tolerance (within 300 seconds / 5 minutes) to prevent replay attacks
  const timestampNum = parseInt(webhookTimestamp, 10);
  if (isNaN(timestampNum)) {
    return { valid: false, reason: 'Invalid non-numeric webhook timestamp' };
  }
  const currentTimestampSec = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimestampSec - timestampNum) > 300) {
    return { valid: false, reason: `Timestamp skew exceeded tolerance (${Math.abs(currentTimestampSec - timestampNum)}s difference)` };
  }

  // 2. Decode signing secret
  let secretBytes: Uint8Array;
  try {
    const cleanSecret = signingSecret.startsWith('whsec_') ? signingSecret.slice(6) : signingSecret;
    try {
      const binaryString = atob(cleanSecret);
      secretBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        secretBytes[i] = binaryString.charCodeAt(i);
      }
    } catch {
      secretBytes = new TextEncoder().encode(signingSecret);
    }
  } catch (err: any) {
    return { valid: false, reason: `Failed to process webhook signing secret: ${err.message}` };
  }

  // 3. Compute HMAC-SHA256 over: "${webhook_id}.${webhook_timestamp}.${body}"
  const signedPayload = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signedPayload)
  );

  const expectedSignatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  // 4. Compare against provided signature list (space-separated, e.g. "v1,abc v1,xyz")
  const signatures = webhookSignature.split(' ').map((s) => s.trim());
  let matched = false;

  for (const sig of signatures) {
    const sigValue = sig.startsWith('v1,') ? sig.slice(3) : sig;
    if (timingSafeEqual(sigValue, expectedSignatureBase64)) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    return { valid: false, reason: 'Computed HMAC-SHA256 signature does not match webhook-signature header' };
  }

  return { valid: true };
}

/**
 * Direct Server-to-Server Verification with Yoco API
 * Queries https://payments.yoco.com/api/checkouts/{checkoutId} using YOCO_SECRET_KEY
 * to ensure that the payment was truly authorized and not faked.
 */
async function verifyCheckoutWithYocoApi(
  checkoutId: string,
  yocoSecretKey: string
): Promise<{
  verified: boolean;
  status?: string;
  amountInCents?: number;
  currency?: string;
  paymentId?: string;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${yocoSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return { verified: false, error: `Yoco API returned HTTP ${response.status}: ${errText}` };
    }

    const checkoutData = await response.json();
    const status = checkoutData.status?.toLowerCase() || '';
    const isCompleted = status === 'completed' || status === 'successful' || status === 'paid';

    return {
      verified: isCompleted,
      status,
      amountInCents: checkoutData.amount,
      currency: checkoutData.currency,
      paymentId: checkoutData.paymentId || checkoutData.payment?.id || checkoutData.id,
      orderId: checkoutData.metadata?.orderId || checkoutData.metadata?.order_id,
      orderNumber: checkoutData.metadata?.orderNumber || checkoutData.metadata?.order_number,
    };
  } catch (err: any) {
    return { verified: false, error: `Error calling Yoco Checkout API: ${err.message}` };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Yoco webhooks must be POST requests.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const requestTime = new Date().toISOString();

  try {
    // 1. Read raw body (must remain unmodified for cryptographic signature verification)
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[YOCO WEBHOOK] Failed to parse incoming JSON payload.');
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Read server-side environment secrets
    const yocoSecretKey = Deno.env.get('YOCO_SECRET_KEY') || '';
    const yocoWebhookSecret = Deno.env.get('YOCO_WEBHOOK_SECRET') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[YOCO WEBHOOK] Fatal error: Missing Supabase database credentials in Edge Function environment.');
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: Supabase credentials missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Webhook Cryptographic Signature Verification (if YOCO_WEBHOOK_SECRET is configured)
    if (yocoWebhookSecret) {
      const sigResult = await verifyYocoSignature(rawBody, req.headers, yocoWebhookSecret);
      if (!sigResult.valid) {
        console.error(`[YOCO WEBHOOK] Signature verification failed: ${sigResult.reason}`);
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Webhook signature verification failed', reason: sigResult.reason }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('[YOCO WEBHOOK] Cryptographic signature successfully verified against YOCO_WEBHOOK_SECRET.');
    } else {
      console.log('[YOCO WEBHOOK] YOCO_WEBHOOK_SECRET not set; relying on server-to-server Yoco API verification using YOCO_SECRET_KEY.');
    }

    // 4. Extract event metadata and payload
    const eventType = (body.type || body.event || 'payment.succeeded').toLowerCase();
    const payload = body.payload || body.data || body;
    const payloadStatus = (payload.status || '').toLowerCase();

    // Determine references
    const orderIdFromMeta =
      payload.metadata?.orderId ||
      payload.metadata?.order_id ||
      payload.clientReferenceId ||
      payload.client_reference_id ||
      body.metadata?.orderId;

    const orderNumberFromMeta =
      payload.metadata?.orderNumber ||
      payload.metadata?.order_number ||
      body.metadata?.orderNumber;

    const checkoutId =
      payload.checkoutId ||
      payload.checkout_id ||
      (typeof payload.id === 'string' && payload.id.startsWith('ch_') ? payload.id : null) ||
      body.checkoutId ||
      null;

    const paymentId =
      (typeof payload.id === 'string' && payload.id.startsWith('pay_') ? payload.id : null) ||
      payload.paymentId ||
      payload.payment_id ||
      payload.payment?.id ||
      null;

    console.log('[YOCO WEBHOOK] Event received:', {
      type: eventType,
      status: payloadStatus,
      checkoutId,
      paymentId,
      orderId: orderIdFromMeta,
      orderNumber: orderNumberFromMeta,
      timestamp: requestTime,
    });

    // 5. Locate the order in public.orders using multiple fallback strategies
    let existingOrder: any = null;

    // Strategy A: Direct UUID lookup
    if (orderIdFromMeta && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdFromMeta)) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderIdFromMeta)
        .maybeSingle();

      if (!error && data) {
        existingOrder = data;
      }
    }

    // Strategy B: Lookup by yoco_checkout_id stored during create-yoco-checkout
    if (!existingOrder && checkoutId) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('yoco_checkout_id', checkoutId)
        .maybeSingle();

      if (!error && data) {
        existingOrder = data;
      }
    }

    // Strategy C: Lookup by order_number
    if (!existingOrder && orderNumberFromMeta) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumberFromMeta)
        .maybeSingle();

      if (!error && data) {
        existingOrder = data;
      }
    }

    // Strategy D: Lookup by payment_reference or payment_id
    if (!existingOrder && paymentId) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`payment_reference.eq.${paymentId},payment_id.eq.${paymentId}`)
        .maybeSingle();

      if (!error && data) {
        existingOrder = data;
      }
    }

    // Strategy E: Active lookup via Yoco API if checkoutId is known
    if (!existingOrder && checkoutId && yocoSecretKey) {
      console.log(`[YOCO WEBHOOK] Order not found locally; querying Yoco API for checkout ${checkoutId}...`);
      const remoteCheck = await verifyCheckoutWithYocoApi(checkoutId, yocoSecretKey);
      if (remoteCheck.orderId) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('id', remoteCheck.orderId)
          .maybeSingle();
        if (data) existingOrder = data;
      } else if (remoteCheck.orderNumber) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('order_number', remoteCheck.orderNumber)
          .maybeSingle();
        if (data) existingOrder = data;
      }
    }

    if (!existingOrder) {
      console.warn('[YOCO WEBHOOK] Could not associate webhook event with any existing order in public.orders.');
      return new Response(
        JSON.stringify({
          received: true,
          matched: false,
          note: 'Event acknowledged, but no corresponding order was located in database.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderId = existingOrder.id;
    const orderNumber = existingOrder.order_number;
    console.log(`[YOCO WEBHOOK] Matched order: ID=${orderId}, Number=${orderNumber}, CurrentPaymentStatus=${existingOrder.payment_status}`);

    // 6. Idempotency Check: Prevent duplicate webhook events from creating duplicate updates or actions
    const isAlreadyPaid =
      existingOrder.payment_status?.toLowerCase() === 'paid' ||
      existingOrder.payment_status?.toLowerCase() === 'completed';

    // 7. Classify event type: Success vs Failure vs Cancellation vs Expired
    const isSuccessEvent =
      eventType === 'payment.succeeded' ||
      eventType === 'checkout.succeeded' ||
      eventType === 'checkout.completed' ||
      payloadStatus === 'successful' ||
      payloadStatus === 'completed' ||
      payloadStatus === 'paid';

    const isFailedEvent =
      eventType === 'payment.failed' ||
      eventType === 'checkout.failed' ||
      payloadStatus === 'failed';

    const isCancelledEvent =
      eventType === 'checkout.cancelled' ||
      eventType === 'payment.cancelled' ||
      payloadStatus === 'cancelled';

    const isExpiredEvent =
      eventType === 'checkout.expired' ||
      payloadStatus === 'expired';

    // 8. Handle Successful Payment Events
    if (isSuccessEvent) {
      // If order is already paid, acknowledge idempotently without duplicate updates
      if (isAlreadyPaid) {
        console.log(`[YOCO WEBHOOK] Idempotency: Order ${orderId} (${orderNumber}) is already marked as 'paid'. Skipping duplicate update.`);
        return new Response(
          JSON.stringify({
            received: true,
            duplicate: true,
            orderId,
            orderNumber,
            payment_status: 'paid',
            message: 'Order was already confirmed as paid.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Expected amount verification (ZAR cents)
      const expectedTotalInCents = Math.round(Number(existingOrder.total || 0) * 100);
      const payloadAmountInCents =
        typeof payload.amountInCents === 'number'
          ? payload.amountInCents
          : typeof payload.amount_in_cents === 'number'
          ? payload.amount_in_cents
          : typeof payload.amount === 'number'
          ? (payload.amount > 1000 && payload.amount % 1 === 0 ? payload.amount : Math.round(payload.amount * 100))
          : null;

      if (payloadAmountInCents !== null && Math.abs(payloadAmountInCents - expectedTotalInCents) > 1) {
        console.error(`[YOCO WEBHOOK SECURITY] Payment amount mismatch for order ${orderId}. Expected ${expectedTotalInCents} cents, received ${payloadAmountInCents} cents.`);
        return new Response(
          JSON.stringify({
            error: 'Security verification failure: Payment amount does not match order total.',
            expected: expectedTotalInCents,
            received: payloadAmountInCents,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Authoritative Server-to-Server Verification with Yoco API using YOCO_SECRET_KEY
      let verifiedPaymentReference = paymentId || checkoutId || `yoco_${Date.now()}`;

      if (checkoutId && yocoSecretKey) {
        console.log(`[YOCO WEBHOOK] Performing authoritative verification with Yoco API for checkout ${checkoutId}...`);
        const remoteVerification = await verifyCheckoutWithYocoApi(checkoutId, yocoSecretKey);

        if (!remoteVerification.verified) {
          console.warn(`[YOCO WEBHOOK] Authoritative Yoco API check reported non-completed status: ${remoteVerification.status} (Error: ${remoteVerification.error})`);
          return new Response(
            JSON.stringify({
              received: true,
              verified: false,
              status: remoteVerification.status || 'unverified',
              message: 'Yoco API did not confirm checkout completion. Order status unchanged.',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (remoteVerification.paymentId) {
          verifiedPaymentReference = remoteVerification.paymentId;
        }

        console.log(`[YOCO WEBHOOK] Authoritative Yoco API check passed! Payment reference: ${verifiedPaymentReference}`);
      }

      // 9. Update public.orders with verified fields:
      // payment_status = 'paid'
      // paid_at = current timestamp
      // payment_provider = 'yoco'
      // payment_reference = verified payment reference
      const nowIso = new Date().toISOString();
      const updatePayload: Record<string, any> = {
        payment_status: 'paid',
        paid_at: nowIso,
        payment_provider: 'yoco',
        payment_reference: verifiedPaymentReference,
        payment_id: verifiedPaymentReference, // Sync legacy column if present
        yoco_checkout_id: checkoutId || existingOrder.yoco_checkout_id || null,
        status: existingOrder.status === 'pending' ? 'processing' : existingOrder.status,
        updated_at: nowIso,
      };

      // Execute update with graceful schema fallback for missing columns
      let updateError = (await supabase.from('orders').update(updatePayload).eq('id', orderId)).error;

      if (updateError && updateError.message?.toLowerCase().includes('column')) {
        console.warn('[YOCO WEBHOOK] Schema fallback: Retrying without payment_reference / payment_provider columns:', updateError.message);
        delete updatePayload.payment_reference;
        delete updatePayload.payment_provider;
        const retryResult = await supabase.from('orders').update(updatePayload).eq('id', orderId);
        updateError = retryResult.error;
      }

      if (updateError) {
        console.error(`[YOCO WEBHOOK] Database error updating order ${orderId}:`, updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update order in database', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[YOCO WEBHOOK] Successfully updated order ${orderId} (${orderNumber}): payment_status='paid', paid_at=${nowIso}, ref=${verifiedPaymentReference}`);

      // 10. Asynchronously trigger purchase confirmation email if not yet sent
      if (!existingOrder.confirmation_email_sent) {
        try {
          console.log(`[YOCO WEBHOOK] Triggering send-order-confirmation Edge Function for order ${orderId}...`);
          fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderId, isResend: false }),
          }).catch((err) => {
            console.warn('[YOCO WEBHOOK] Non-blocking email trigger note:', err?.message);
          });
        } catch (emailTriggerErr: any) {
          console.warn('[YOCO WEBHOOK] Email trigger invocation caught:', emailTriggerErr?.message);
        }
      }

      return new Response(
        JSON.stringify({
          received: true,
          orderId,
          orderNumber,
          payment_status: 'paid',
          paid_at: nowIso,
          payment_provider: 'yoco',
          payment_reference: verifiedPaymentReference,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 11. Handle Failed, Cancelled, or Expired Events Safely
    if (isFailedEvent || isCancelledEvent || isExpiredEvent) {
      if (isAlreadyPaid) {
        console.log(`[YOCO WEBHOOK] Order ${orderId} was already confirmed as paid; ignoring non-success event ${eventType}.`);
        return new Response(
          JSON.stringify({ received: true, ignored: true, reason: 'Order already paid' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const targetPaymentStatus = isCancelledEvent ? 'cancelled' : isExpiredEvent ? 'expired' : 'failed';
      const nowIso = new Date().toISOString();

      const nonSuccessUpdate: Record<string, any> = {
        payment_status: targetPaymentStatus,
        status: isCancelledEvent ? 'cancelled' : existingOrder.status,
        updated_at: nowIso,
      };

      await supabase.from('orders').update(nonSuccessUpdate).eq('id', orderId);
      console.log(`[YOCO WEBHOOK] Order ${orderId} updated to payment_status='${targetPaymentStatus}' based on event '${eventType}'.`);

      return new Response(
        JSON.stringify({
          received: true,
          orderId,
          payment_status: targetPaymentStatus,
          event: eventType,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Other non-critical event types
    console.log(`[YOCO WEBHOOK] Unhandled event type '${eventType}' for order ${orderId}. Acknowledged without order mutation.`);
    return new Response(
      JSON.stringify({ received: true, unhandled: true, event: eventType }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (fatalError: any) {
    console.error('[YOCO WEBHOOK] Unhandled exception occurred in webhook processor:', fatalError);
    return new Response(
      JSON.stringify({ error: 'Internal server error processing Yoco webhook', message: fatalError?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
