import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, yoco-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Yoco Webhook Received:', JSON.stringify(body, null, 2));

    const eventType = body.type || body.event || 'payment.succeeded';
    const payload = body.payload || body.data || body;

    // Extract order identifier from metadata or clientReferenceId
    const orderId =
      payload.metadata?.orderId ||
      payload.metadata?.order_id ||
      payload.clientReferenceId ||
      payload.client_reference_id;

    if (!orderId) {
      console.warn('Yoco Webhook: No orderId found in webhook payload');
      return new Response(
        JSON.stringify({ received: true, note: 'No orderId in metadata, skipped processing' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Yoco Webhook Error: Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch existing order to check current status and prevent duplicate processing
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('id', orderId)
      .single();

    if (fetchError || !existingOrder) {
      console.error(`Yoco Webhook: Order ${orderId} not found in database:`, fetchError);
      return new Response(
        JSON.stringify({ received: true, warning: `Order ${orderId} not found` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for idempotency: if already paid, do not re-process
    if (existingOrder.payment_status === 'paid' || existingOrder.payment_status === 'completed') {
      console.log(`Yoco Webhook: Order ${orderId} is already marked as paid. Skipping.`);
      return new Response(
        JSON.stringify({ received: true, message: `Order ${orderId} already processed` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract payment amount from payload (in cents) and verify against expected order total
    const payloadAmountInCents =
      payload.amountInCents ||
      payload.amount_in_cents ||
      (typeof payload.amount === 'number' ? Math.round(payload.amount * 100) : null);

    const expectedTotalInCents = Math.round(Number(existingOrder.total || 0) * 100);

    if (payloadAmountInCents !== null && Math.abs(payloadAmountInCents - expectedTotalInCents) > 1) {
      console.error(`Yoco Webhook Security Error: Amount mismatch for order ${orderId}. Expected ${expectedTotalInCents} cents, received ${payloadAmountInCents} cents.`);
      return new Response(
        JSON.stringify({ error: 'Payment amount mismatch security error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentStatus = payload.status || 'successful';
    const isSuccessful =
      eventType === 'payment.succeeded' ||
      eventType === 'checkout.succeeded' ||
      paymentStatus === 'successful' ||
      paymentStatus === 'paid' ||
      paymentStatus === 'succeeded';

    if (isSuccessful) {
      // Update order status to paid / processing
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: existingOrder.status === 'pending' ? 'processing' : existingOrder.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        console.error(`Yoco Webhook: Failed updating order ${orderId}:`, updateError);
        return new Response(
          JSON.stringify({ error: 'Failed updating order payment status in database' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Yoco Webhook: Successfully marked order ${orderId} as paid.`);

      // Trigger automatic order confirmation email
      let emailStatus = 'skipped';
      try {
        const { data: fullOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (fullOrder && fullOrder.customer_email) {
          const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
          const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'KUD Store <onboarding@resend.dev>';
          const orderNum = fullOrder.order_number || `KUD-${fullOrder.id.slice(0, 6).toUpperCase()}`;

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #ff6452;">KUD Store - Order Confirmation</h2>
              <p>Hi ${fullOrder.customer_name || 'Valued Customer'},</p>
              <p>Thank you for your order! Your payment of <strong>R${Number(fullOrder.total || 0).toFixed(2)}</strong> via Yoco Secure Gateway was successful.</p>
              <p><strong>Order Number:</strong> #${orderNum}</p>
              <p><strong>Payment Status:</strong> PAID</p>
              <p>We are currently preparing your items for shipping.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #888;">If you have any questions, reply to this email or contact support@kudstore.com.</p>
            </div>
          `;

          if (resendApiKey) {
            const emailRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [fullOrder.customer_email],
                subject: `Order Confirmation #${orderNum} - KUD Store`,
                html: emailHtml,
              }),
            });
            if (emailRes.ok) {
              emailStatus = `sent to ${fullOrder.customer_email}`;
            } else {
              emailStatus = `resend_error: ${await emailRes.text()}`;
            }
          } else {
            emailStatus = `simulated for ${fullOrder.customer_email} (RESEND_API_KEY not set)`;
          }
          console.log(`Order email status for ${orderId}: ${emailStatus}`);
        }
      } catch (emailErr: any) {
        console.error(`Edge function email trigger error for ${orderId}:`, emailErr);
        emailStatus = `failed: ${emailErr.message}`;
      }

      return new Response(
        JSON.stringify({ success: true, orderId, payment_status: 'paid', email_trigger: emailStatus }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`Yoco Webhook: Payment event ${eventType} was not successful (status: ${paymentStatus}).`);
      return new Response(
        JSON.stringify({ received: true, note: `Payment event status is ${paymentStatus}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err: any) {
    console.error('Yoco Webhook Exception:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal webhook handler error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
