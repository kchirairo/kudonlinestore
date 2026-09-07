import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  generateOrderConfirmationEmail,
  EmailOrderItem,
} from './orderConfirmationTemplate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
      console.error('[SEND-CONFIRMATION-EMAIL] Missing Supabase credentials in Edge Function environment');
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse JSON request
    const body = await req.json().catch(() => ({}));
    const orderId = body.orderId || body.order_id;
    const isResend = Boolean(body.isResend || body.is_resend);

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SEND-CONFIRMATION-EMAIL] Processing order confirmation request for Order: ${orderId}, isResend: ${isResend}`);

    // Check authorization
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    let isAuthorizedAdmin = false;

    if (token) {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (!userError && userData?.user) {
          // Check role in profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userData.user.id)
            .maybeSingle();

          if (profile?.role === 'admin' || userData.user.email?.includes('admin')) {
            isAuthorizedAdmin = true;
          }
        }
      } catch (authErr) {
        console.warn('[SEND-CONFIRMATION-EMAIL] User auth verification warning:', authErr);
      }
    }

    // Service-role key token check
    if (token && (token === supabaseServiceKey || token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))) {
      isAuthorizedAdmin = true;
    }

    // If manual resend is requested, only admins or internal service role are allowed
    if (isResend && !isAuthorizedAdmin) {
      console.warn(`[SEND-CONFIRMATION-EMAIL] Unauthorized attempt to resend email for order ${orderId}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Only store administrators can manually resend purchase confirmations.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch authoritative order row directly from database (Do not trust client-supplied financials or email)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error(`[SEND-CONFIRMATION-EMAIL] Order ${orderId} not found in database:`, orderError);
      return new Response(
        JSON.stringify({ error: `Order ${orderId} not found in database.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side payment verification: verify payment status
    let isPaid =
      order.payment_status === 'paid' ||
      order.payment_status === 'completed' ||
      order.status === 'confirmed' ||
      order.status === 'processing';

    // If order in DB is not marked paid yet, check if Yoco checkout ID exists and verify directly with Yoco API
    if (!isPaid && order.yoco_checkout_id) {
      const yocoSecretKey = Deno.env.get('YOCO_SECRET_KEY');
      if (yocoSecretKey) {
        try {
          console.log(`[SEND-CONFIRMATION-EMAIL] Verifying payment directly with Yoco API for checkout ${order.yoco_checkout_id}...`);
          const yocoCheckRes = await fetch(`https://payments.yoco.com/api/checkouts/${order.yoco_checkout_id}`, {
            headers: {
              'Authorization': `Bearer ${yocoSecretKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (yocoCheckRes.ok) {
            const yocoData = await yocoCheckRes.json();
            const yocoStatus = yocoData?.status?.toLowerCase();
            if (yocoStatus === 'completed' || yocoStatus === 'paid' || yocoStatus === 'successful') {
              console.log(`[SEND-CONFIRMATION-EMAIL] Yoco API confirmed checkout ${order.yoco_checkout_id} as paid!`);
              isPaid = true;

              // Synchronize DB order payment status
              await supabase
                .from('orders')
                .update({
                  payment_status: 'paid',
                  status: order.status === 'pending' ? 'processing' : order.status,
                  paid_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', order.id);
            }
          }
        } catch (yocoErr) {
          console.warn('[SEND-CONFIRMATION-EMAIL] Notice verifying Yoco checkout directly:', yocoErr);
        }
      }
    }

    // STRICT INTENT CHECK: Confirmation email must ONLY be sent after successful payment
    if (!isPaid) {
      console.warn(`[SEND-CONFIRMATION-EMAIL] Order ${orderId} is unpaid (payment_status: ${order.payment_status}). Confirmation email rejected.`);
      return new Response(
        JSON.stringify({
          error: 'Cannot send purchase confirmation for unpaid order. Payment must be verified before confirmation email dispatch.',
          paymentStatus: order.payment_status,
          orderStatus: order.status,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IDEMPOTENCY CHECK: Never send multiple confirmation emails for the same payment unless explicitly resent by admin
    if (order.confirmation_email_sent && !isResend) {
      console.log(`[SEND-CONFIRMATION-EMAIL] Idempotency check: confirmation email already sent for order ${orderId} at ${order.confirmation_email_sent_at}. Skipping.`);
      return new Response(
        JSON.stringify({
          success: true,
          alreadySent: true,
          message: 'Order confirmation email has already been dispatched for this order.',
          sentAt: order.confirmation_email_sent_at,
          orderNumber: order.order_number,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerEmail = (order.customer_email || '').trim();
    if (!customerEmail || !customerEmail.includes('@')) {
      const errorMsg = 'No valid customer email address found on order.';
      console.warn(`[SEND-CONFIRMATION-EMAIL] ${errorMsg} for order ${order.order_number}`);

      await supabase
        .from('orders')
        .update({
          confirmation_email_error: errorMsg,
          confirmation_email_last_attempt_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order items from public.order_items strictly for this order
    const { data: dbItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    let parsedItems: EmailOrderItem[] = [];
    if (Array.isArray(dbItems) && dbItems.length > 0) {
      parsedItems = dbItems.map((it: any) => ({
        product_name: it.product_name || it.name || 'Product',
        product_image: it.product_image || it.image || null,
        product_brand: it.product_brand || it.brand || '',
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price ?? it.price ?? 0),
        total_price: Number(it.total_price ?? (Number(it.unit_price ?? it.price ?? 0) * (Number(it.quantity) || 1))),
        variant: it.variant || it.size_or_variant || undefined,
      }));
    } else if (Array.isArray(order.items) && order.items.length > 0) {
      // Fallback to jsonb items array if stored on order row
      parsedItems = order.items.map((it: any) => ({
        product_name: it.product_name || it.name || 'Product',
        product_image: it.product_image || it.image || null,
        product_brand: it.product_brand || it.brand || '',
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price ?? it.price ?? 0),
        total_price: Number(it.total_price ?? (Number(it.unit_price ?? it.price ?? 0) * (Number(it.quantity) || 1))),
        variant: it.variant || it.size_or_variant || undefined,
      }));
    }

    // Format order date
    const orderDateFormatted = order.created_at
      ? new Date(order.created_at).toLocaleDateString('en-ZA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleDateString('en-ZA');

    // Generate responsive HTML and plain-text templates with sanitized variables
    const { subject, html, text } = generateOrderConfirmationEmail({
      customerName: order.customer_name || 'Valued Customer',
      customerEmail,
      customerPhone: order.customer_phone || undefined,
      orderNumber: order.order_number || `KUD-${order.id.slice(0, 6).toUpperCase()}`,
      orderDate: orderDateFormatted,
      paymentMethod: order.payment_method || 'Yoco Hosted Checkout',
      paymentReference: order.payment_id || order.payment_reference || undefined,
      items: parsedItems,
      subtotal: Number(order.subtotal ?? order.subtotal_amount ?? 0),
      shippingFee: Number(order.shipping_fee ?? order.delivery_fee ?? 0),
      discount: Number(order.discount ?? order.discount_amount ?? 0),
      total: Number(order.total ?? order.total_amount ?? 0),
      deliveryAddress: order.delivery_address || order.shipping_address?.addressLine || 'Standard Delivery',
      deliveryCity: order.delivery_city || order.shipping_address?.city || '',
      deliveryProvince: order.delivery_province || order.shipping_address?.province || '',
      deliveryPostalCode: order.delivery_postal_code || order.shipping_address?.postalCode || '',
      customerNote: order.customer_note || undefined,
      storeName: 'KUD Store',
      supportEmail: 'support@kudstore.co.za',
      supportPhone: '+27 11 000 0000',
      storeUrl: Deno.env.get('APP_URL') || 'https://kudstore.com',
      isResend,
    });

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'KUD Store <onboarding@resend.dev>';

    // If Resend API key is not configured, simulate dispatch gracefully
    if (!resendApiKey) {
      console.warn(`[SEND-CONFIRMATION-EMAIL] RESEND_API_KEY secret is not configured. Simulating dispatch for order ${order.order_number} to ${customerEmail}.`);

      const nowIso = new Date().toISOString();
      await supabase
        .from('orders')
        .update({
          confirmation_email_sent: true,
          confirmation_email_sent_at: nowIso,
          confirmation_email_error: 'Simulated dispatch (RESEND_API_KEY secret is not configured in Supabase Edge Function secrets).',
          confirmation_email_resend_count: (Number(order.confirmation_email_resend_count) || 0) + (isResend ? 1 : 0),
          confirmation_email_last_attempt_at: nowIso,
        })
        .eq('id', order.id);

      return new Response(
        JSON.stringify({
          success: true,
          simulated: true,
          message: `Confirmation email simulated successfully for ${customerEmail} (Configure RESEND_API_KEY in Supabase Edge Function secrets for live delivery).`,
          orderNumber: order.order_number,
          sentAt: nowIso,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Resend API
    console.log(`[SEND-CONFIRMATION-EMAIL] Dispatching email via Resend API to ${customerEmail}...`);
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [customerEmail],
        subject,
        html,
        text,
      }),
    });

    const resendStatus = resendResponse.status;
    const resendData = await resendResponse.json().catch(() => ({}));
    const nowIso = new Date().toISOString();

    if (!resendResponse.ok) {
      const errorDetail = resendData?.message || resendData?.error || `Resend API returned HTTP ${resendStatus}`;
      console.error(`[SEND-CONFIRMATION-EMAIL] Resend delivery failed for order ${order.order_number}:`, errorDetail);

      // CRITICAL: Do NOT mark payment as unpaid or change order status when email fails
      await supabase
        .from('orders')
        .update({
          confirmation_email_error: errorDetail,
          confirmation_email_last_attempt_at: nowIso,
        })
        .eq('id', order.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Transactional email delivery failed: ${errorDetail}`,
          canRetry: true,
          orderNumber: order.order_number,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success: Mark email as sent ONLY after delivery-provider acceptance
    console.log(`[SEND-CONFIRMATION-EMAIL] Resend successfully accepted email for order ${order.order_number}! Email ID: ${resendData.id}`);

    await supabase
      .from('orders')
      .update({
        confirmation_email_sent: true,
        confirmation_email_sent_at: nowIso,
        confirmation_email_error: null,
        confirmation_email_resend_count: (Number(order.confirmation_email_resend_count) || 0) + (isResend ? 1 : 0),
        confirmation_email_last_attempt_at: nowIso,
      })
      .eq('id', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: isResend
          ? `Order confirmation resent successfully to ${customerEmail}`
          : `Order confirmation email sent successfully to ${customerEmail}`,
        emailId: resendData.id,
        orderNumber: order.order_number,
        sentAt: nowIso,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[SEND-CONFIRMATION-EMAIL] Unexpected Edge Function error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'An unexpected error occurred in send-order-confirmation function' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
