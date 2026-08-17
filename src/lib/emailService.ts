import { SupabaseClient } from '@supabase/supabase-js';
import { STORE_CONFIG } from '../constants/config';

export interface EmailResult {
  sent: boolean;
  simulated: boolean;
  email: string;
  orderNumber: string;
  message: string;
  error?: string;
}

export async function sendOrderConfirmationEmail(
  orderId: string,
  supabase: SupabaseClient
): Promise<EmailResult> {
  try {
    // 1. Fetch order details from database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error(`Email Service Error: Could not find order ${orderId}:`, orderError?.message);
      return {
        sent: false,
        simulated: false,
        email: '',
        orderNumber: '',
        message: `Order ${orderId} not found in database`,
        error: orderError?.message || 'Order not found',
      };
    }

    const customerEmail = order.customer_email;
    const customerName = order.customer_name || 'Valued Customer';
    const orderNumber = order.order_number || `KUD-${order.id.slice(0, 6).toUpperCase()}`;

    if (!customerEmail || !customerEmail.includes('@')) {
      console.warn(`Email Service Warning: Invalid or missing customer email for order ${orderNumber}`);
      return {
        sent: false,
        simulated: true,
        email: customerEmail || 'N/A',
        orderNumber,
        message: 'No valid customer email address found on order',
      };
    }

    // 2. Fetch order items if available
    let items: any[] = [];
    try {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      if (orderItems) {
        items = orderItems;
      }
    } catch {
      // Non-blocking if order_items table schema query fails
    }

    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'https://kudstore.com';
    const orderLink = `${appUrl}/orders/${order.id}`;

    // 3. Build HTML Email Template
    const itemsHtml = items.length > 0
      ? items.map((item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827;">
            <strong>${item.product_name || 'Product'}</strong>
            ${item.variant ? `<br/><span style="font-size: 12px; color: #6b7280;">Variant: ${item.variant}</span>` : ''}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; text-align: center;">
            ${item.quantity || 1}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827; text-align: right; font-weight: 600;">
            R${((item.total_price || item.unit_price || 0)).toFixed(2)}
          </td>
        </tr>
      `).join('')
      : `
        <tr>
          <td colspan="3" style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #4b5563;">
            Standard Order Items (Total: R${Number(order.total || 0).toFixed(2)})
          </td>
        </tr>
      `;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation #${orderNumber}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 24px 0;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #111827; padding: 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">KUD STORE</h1>
                    <p style="color: #ff6452; margin: 4px 0 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Order Confirmation</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                      <p style="margin: 0; color: #065f46; font-size: 15px; font-weight: 700;">Payment Confirmed</p>
                      <p style="margin: 4px 0 0 0; color: #047857; font-size: 13px;">Your payment of R${Number(order.total || 0).toFixed(2)} via Yoco Secure Gateway was successful.</p>
                    </div>

                    <h2 style="color: #111827; font-size: 18px; margin: 0 0 8px 0; font-weight: 700;">Hi ${customerName},</h2>
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">
                      Thank you for your order! We've received your payment and your items are now being prepared for shipping.
                    </p>

                    <!-- Order Info Box -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                      <tr>
                        <td>
                          <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Order Number</p>
                          <p style="margin: 2px 0 0 0; font-size: 16px; color: #0f172a; font-weight: 700;">#${orderNumber}</p>
                        </td>
                        <td style="text-align: right;">
                          <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Payment Status</p>
                          <p style="margin: 2px 0 0 0; font-size: 14px; color: #16a34a; font-weight: 700;">PAID</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Items Summary -->
                    <h3 style="color: #111827; font-size: 15px; margin: 0 0 12px 0; font-weight: 700;">Order Summary</h3>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                      <thead>
                        <tr>
                          <th align="left" style="padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280; text-transform: uppercase;">Item</th>
                          <th align="center" style="padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280; text-transform: uppercase;">Qty</th>
                          <th align="right" style="padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280; text-transform: uppercase;">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>

                    <!-- Financial Totals -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; color: #6b7280;">Subtotal</td>
                        <td align="right" style="padding: 4px 0; font-size: 13px; color: #374151;">R${Number(order.subtotal || 0).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; color: #6b7280;">Shipping Fee</td>
                        <td align="right" style="padding: 4px 0; font-size: 13px; color: #374151;">R${Number(order.shipping_fee || 0).toFixed(2)}</td>
                      </tr>
                      ${Number(order.discount || 0) > 0 ? `
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; color: #16a34a;">Discount</td>
                        <td align="right" style="padding: 4px 0; font-size: 13px; color: #16a34a;">-R${Number(order.discount).toFixed(2)}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 12px 0 0 0; border-top: 2px solid #111827; font-size: 16px; color: #111827; font-weight: 800;">Total Paid</td>
                        <td align="right" style="padding: 12px 0 0 0; border-top: 2px solid #111827; font-size: 18px; color: #ff6452; font-weight: 800;">R${Number(order.total || 0).toFixed(2)}</td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin-bottom: 16px;">
                      <a href="${orderLink}" style="background-color: #ff6452; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 9999px; display: inline-block;">
                        View Order Status
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Questions? Contact us at ${STORE_CONFIG.CONTACT_EMAIL} or WhatsApp ${STORE_CONFIG.WHATSAPP_SUPPORT}</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} KUD Store. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 4. Send Email via Resend API if API Key is available
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'KUD Store <onboarding@resend.dev>';

    if (resendApiKey) {
      console.log(`Sending order confirmation email via Resend API to ${customerEmail}...`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [customerEmail],
          subject: `Order Confirmation #${orderNumber} - KUD Store`,
          html: emailHtml,
        }),
      });

      const resText = await response.text();
      if (response.ok) {
        console.log(`[EMAIL DISPATCH SUCCESS] Confirmation email sent to ${customerEmail} for order #${orderNumber}`);
        return {
          sent: true,
          simulated: false,
          email: customerEmail,
          orderNumber,
          message: `Order confirmation email sent to ${customerEmail}`,
        };
      } else {
        console.error(`[EMAIL DISPATCH ERROR] Resend API error (${response.status}):`, resText);
        return {
          sent: false,
          simulated: false,
          email: customerEmail,
          orderNumber,
          message: `Resend API returned error ${response.status}: ${resText}`,
          error: resText,
        };
      }
    } else {
      console.log(`[EMAIL SIMULATED DISPATCH] RESEND_API_KEY not configured.`);
      console.log(`Confirmation email generated for ${customerName} <${customerEmail}> | Order #${orderNumber} | Total: R${order.total}`);
      return {
        sent: true,
        simulated: true,
        email: customerEmail,
        orderNumber,
        message: `Simulated order confirmation email logged for ${customerEmail}. Configure RESEND_API_KEY to send live emails.`,
      };
    }
  } catch (err: any) {
    console.error(`Email Service Exception:`, err);
    return {
      sent: false,
      simulated: false,
      email: '',
      orderNumber: '',
      message: err.message || 'Unhandled exception in email service',
      error: err.message,
    };
  }
}
