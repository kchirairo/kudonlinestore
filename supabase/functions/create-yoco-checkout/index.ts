import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const yocoSecretKey = Deno.env.get('YOCO_SECRET_KEY') || '';
    if (!yocoSecretKey) {
      console.error('YOCO_SECRET_KEY environment variable is missing in Supabase Edge Function.');
      return new Response(
        JSON.stringify({
          error: 'YOCO_SECRET_KEY is not configured in Supabase Edge Function secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase URL or Key is missing in Edge Function environment.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read request JSON body
    const body = await req.json().catch(() => ({}));
    const { orderId } = body;

    // Server-side logging showing received orderId
    console.log('[EDGE FUNC LOG] received orderId:', orderId);

    // Validate orderId parameter
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId parameter is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Retrieve order by UUID
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    // Server-side logging showing whether the order was found and order.total
    console.log('[EDGE FUNC LOG] whether order was found:', !!order);
    console.log('[EDGE FUNC LOG] order.total:', order ? order.total : null);

    if (orderError || !order) {
      console.error("Failed to fetch orderId from database:", orderError?.message);
      return new Response(
        JSON.stringify({
          error: `Order ${orderId} not found in database: ${orderError?.message || 'Not found'}`,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use order.total for the payment amount (in ZAR)
    const totalAmountInRands = Number(order.total) || 0;
    const amountInCents = Math.round(totalAmountInRands * 100);

    if (amountInCents <= 0) {
      return new Response(
        JSON.stringify({ error: 'Order total must be greater than zero.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://kudstore.com';
    const successUrl = `${origin}/orders/${order.id}?payment=success`;
    const cancelUrl = `${origin}/checkout?status=cancelled`;
    const failureUrl = `${origin}/checkout?status=failed`;

    const idempotencyKey = crypto.randomUUID();

    // Hosted Checkout API call
    const yocoResponse = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yocoSecretKey}`,
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
          orderId: order.id,
          orderNumber: order.order_number,
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
      const errorMessage = yocoData?.errorMessage || yocoData?.displayMessage || yocoData?.message || `Yoco API returned HTTP ${yocoStatus}: ${yocoText}`;
      console.error("Yoco API error:", errorMessage);
      return new Response(
        JSON.stringify({
          error: errorMessage,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Return Yoco redirectUrl to React without marking order as paid
    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl: redirectUrl,
        orderId: order.id,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('Unhandled Edge Function exception in create-yoco-checkout:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error in Yoco Edge Function' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
