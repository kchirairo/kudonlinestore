import { SupabaseClient } from '@supabase/supabase-js';
import { STORE_CONFIG } from '../constants/config';
import { calculateOrderFinancials, formatMoney } from '../utils/taxUtils';
import { InvoiceSendingLog } from '../types';

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

export interface ReferralInvitePayload {
  recipientEmail: string;
  recipientName?: string;
  senderName?: string;
  senderEmail?: string;
  referralCode: string;
  referralLink: string;
  customMessage?: string;
}

export interface ReferralEmailResult {
  success: boolean;
  sent: boolean;
  simulated: boolean;
  recipientEmail: string;
  referralCode: string;
  message: string;
  error?: string;
}

export async function sendReferralInviteEmail(
  payload: ReferralInvitePayload
): Promise<ReferralEmailResult> {
  try {
    const {
      recipientEmail,
      recipientName,
      senderName = 'A friend',
      senderEmail,
      referralCode,
      referralLink,
      customMessage,
    } = payload;

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return {
        success: false,
        sent: false,
        simulated: false,
        recipientEmail: recipientEmail || '',
        referralCode,
        message: 'Invalid recipient email address provided',
        error: 'Invalid recipient email',
      };
    }

    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'https://kudstore.co.za';
    const finalReferralLink = referralLink || `${appUrl}/?ref=${encodeURIComponent(referralCode)}`;

    // Build the high-converting, Apple-inspired branded HTML referral email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${senderName} invited you to KUD Store - Enjoy R50 OFF</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 36px 12px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);">
                
                <!-- Top Brand Accent Header -->
                <tr>
                  <td style="padding: 36px 36px 20px 36px; text-align: center; background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%);">
                    
                    <!-- Circular Green Badge with Heart Bag Icon -->
                    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td align="center" style="width: 76px; height: 76px; background: linear-gradient(135deg, #22c55e 0%, #15803d 100%); border-radius: 50%; box-shadow: 0 8px 20px rgba(34, 197, 94, 0.35);">
                          <!-- Shopping Bag with Heart SVG -->
                          <svg width="42" height="42" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
                            <path d="M10 15C10 13.8954 10.8954 13 12 13H32C33.1046 13 34 13.8954 34 15L35.5 33C35.5 35.2091 33.7091 37 31.5 37H12.5C10.2909 37 8.5 35.2091 8.5 33L10 15Z" fill="#ffffff"/>
                            <path d="M16 14V11C16 7.68629 18.6863 5 22 5C25.3137 5 28 7.68629 28 11V14" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
                            <circle cx="16" cy="15" r="1.5" fill="#15803d"/>
                            <circle cx="28" cy="15" r="1.5" fill="#15803d"/>
                            <path d="M22 30.5L20.85 29.45C16.8 25.75 14 23.2 14 20C14 17.4 16 15.4 18.6 15.4C20.05 15.4 21.45 16.1 22 17.15C22.55 16.1 23.95 15.4 25.4 15.4C28 15.4 30 17.4 30 20C30 23.2 27.2 25.75 23.15 29.45L22 30.5Z" fill="#ef4444"/>
                          </svg>
                        </td>
                      </tr>
                    </table>

                    <h1 style="color: #0f172a; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">
                      Share <span style="color: #16a34a;">the vibe!</span>
                    </h1>
                    <p style="color: #64748b; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">
                      Invite friends to KUD Store and shop together
                    </p>
                  </td>
                </tr>

                <!-- Main Content Body -->
                <tr>
                  <td style="padding: 12px 36px 32px 36px;">
                    
                    <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
                      Hi <strong>${recipientName || 'there'}</strong>,
                    </p>

                    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                      <strong>${senderName}</strong> invited you to shop on <strong>${STORE_CONFIG.STORE_NAME}</strong>, your trusted South African marketplace for beauty, tech, home, and lifestyle essentials.
                    </p>

                    ${customMessage ? `
                    <!-- Sender's Personal Note -->
                    <div style="background-color: #f1f5f9; border-left: 4px solid #16a34a; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
                      <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Message from ${senderName}:</p>
                      <p style="margin: 6px 0 0 0; font-size: 14px; color: #1e293b; font-style: italic; line-height: 1.5;">&ldquo;${customMessage}&rdquo;</p>
                    </div>
                    ` : ''}

                    <!-- Referral Gift Reward Card -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px dashed #86efac; border-radius: 20px; padding: 22px; margin-bottom: 26px; text-align: center;">
                      <tr>
                        <td>
                          <span style="display: inline-block; background-color: #16a34a; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 10px;">
                            Your Exclusive Welcome Gift
                          </span>
                          <h2 style="color: #065f46; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">
                            R50 OFF
                          </h2>
                          <p style="color: #047857; margin: 4px 0 16px 0; font-size: 13px; font-weight: 500;">
                            Valid on your first purchase with nationwide delivery
                          </p>

                          <!-- Promo Code Box -->
                          <div style="background-color: #ffffff; border: 1px solid #bbf7d0; border-radius: 12px; padding: 10px 18px; display: inline-block; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                            <span style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-right: 8px;">Promo Code:</span>
                            <span style="font-family: monospace; font-size: 17px; font-weight: 800; color: #15803d; letter-spacing: 1px;">${referralCode}</span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Primary Red Call to Action Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                      <tr>
                        <td align="center">
                          <a href="${finalReferralLink}" target="_blank" style="background-color: #ef4444; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 36px; border-radius: 9999px; display: inline-block; box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35); text-align: center; letter-spacing: 0.2px;">
                            Claim R50 &amp; Shop Now &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- 3-Step Simple Guide -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 16px; padding: 18px; margin-bottom: 24px; border: 1px solid #edf2f7;">
                      <tr>
                        <td align="center" style="padding-bottom: 12px;">
                          <span style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">How It Works</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="33%" align="center" style="padding: 4px 6px;">
                                <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">1. Invite friends</div>
                                <div style="font-size: 11px; color: #64748b;">Click invite link</div>
                              </td>
                              <td width="33%" align="center" style="padding: 4px 6px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                                <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">2. They shop</div>
                                <div style="font-size: 11px; color: #64748b;">Pick top items</div>
                              </td>
                              <td width="33%" align="center" style="padding: 4px 6px;">
                                <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">3. You both save</div>
                                <div style="font-size: 11px; color: #16a34a; font-weight: 600;">Get R50 discount</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Safe & Secure Seal -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <span style="display: inline-block; background-color: #ecfdf5; border: 1px solid #d1fae5; color: #dc2626; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px;">
                            <span style="color: #16a34a; margin-right: 4px;">&#10003;</span> Safe &amp; Secure Checkout &bull; Yoco Certified &bull; Fast SA Delivery
                          </span>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                      Questions or need assistance? Contact support at <a href="mailto:${STORE_CONFIG.CONTACT_EMAIL}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${STORE_CONFIG.CONTACT_EMAIL}</a> or WhatsApp <a href="https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, '')}" style="color: #16a34a; text-decoration: none; font-weight: 600;">${STORE_CONFIG.WHATSAPP_SUPPORT}</a>.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} ${STORE_CONFIG.STORE_NAME}. You received this transactional email because ${senderName} sent you a direct referral invitation.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send Email via Resend API if API Key is available
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'KUD Store <onboarding@resend.dev>';

    if (resendApiKey) {
      console.log(`[RESEND REFERRAL] Sending referral invite to ${recipientEmail} from ${senderName}...`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipientEmail],
          reply_to: senderEmail && senderEmail.includes('@') ? senderEmail : undefined,
          subject: `${senderName} invited you to KUD Store! (Here is R50 OFF)`,
          html: emailHtml,
        }),
      });

      const resText = await response.text();
      if (response.ok) {
        console.log(`[RESEND REFERRAL SUCCESS] Referral invitation delivered to ${recipientEmail}`);
        return {
          success: true,
          sent: true,
          simulated: false,
          recipientEmail,
          referralCode,
          message: `Referral invitation sent to ${recipientEmail}!`,
        };
      } else {
        console.error(`[RESEND REFERRAL ERROR] HTTP ${response.status}:`, resText);
        return {
          success: false,
          sent: false,
          simulated: false,
          recipientEmail,
          referralCode,
          message: `Resend API error (${response.status}): ${resText}`,
          error: resText,
        };
      }
    } else {
      console.log(`[RESEND REFERRAL SIMULATED] RESEND_API_KEY not configured.`);
      console.log(`Referral email generated for ${recipientName || 'Contact'} <${recipientEmail}> with code ${referralCode} from ${senderName}`);
      return {
        success: true,
        sent: true,
        simulated: true,
        recipientEmail,
        referralCode,
        message: `Invitation simulated for ${recipientEmail}. Configure RESEND_API_KEY to send live emails via Resend.`,
      };
    }
  } catch (err: any) {
    console.error(`Referral Email Exception:`, err);
    return {
      success: false,
      sent: false,
      simulated: false,
      recipientEmail: payload.recipientEmail || '',
      referralCode: payload.referralCode || '',
      message: err.message || 'Failed to dispatch referral invitation email',
      error: err.message,
    };
  }
}

// ============================================================================
// REFERRAL COMMISSION ALLOCATION EMAIL
// ============================================================================

export interface CommissionAllocatedEmailPayload {
  referrerEmail: string;
  referrerName: string;
  commissionAmount: number;
  referredClientName: string;
  evaluationMonth?: string;
  monthlyPurchasesCount?: number;
  newBalance?: number;
  adminNotes?: string;
  adminEmail?: string;
}

export interface EmailNotificationResult {
  success: boolean;
  sent: boolean;
  simulated: boolean;
  recipientEmail: string;
  message: string;
  emailId?: string;
  error?: string;
}

export async function sendCommissionAllocatedEmail(
  payload: CommissionAllocatedEmailPayload
): Promise<EmailNotificationResult> {
  try {
    const {
      referrerEmail,
      referrerName = 'Valued Ambassador',
      commissionAmount = 50,
      referredClientName = 'Your referred friend',
      evaluationMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      monthlyPurchasesCount = 2,
      newBalance = commissionAmount,
      adminNotes,
    } = payload;

    if (!referrerEmail || !referrerEmail.includes('@')) {
      return {
        success: false,
        sent: false,
        simulated: false,
        recipientEmail: referrerEmail || '',
        message: 'Invalid or missing referrer email address.',
        error: 'Invalid recipient email',
      };
    }

    const appUrl = (typeof window !== 'undefined' ? window.location.origin : (process.env.APP_URL || process.env.VITE_APP_URL || 'https://kudstore.co.za')).replace(/\/+$/, '');
    const accountRewardsUrl = `${appUrl}/account?tab=referrals`;

    // Try posting to backend API endpoint first for server-side Resend execution
    if (typeof window !== 'undefined') {
      try {
        const apiRes = await fetch('/api/email/referral-commission-allocated', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (apiRes.ok) {
          const data = await apiRes.json();
          return data;
        }
      } catch (clientErr) {
        console.warn('[EmailService] Client API proxy error, falling back to direct:', clientErr);
      }
    }

    // HTML Email Template for Commission Allocation
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🎉 Commission Credited! R${commissionAmount} Added to Your Balance</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 36px 12px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);">
                
                <!-- Header Banner -->
                <tr>
                  <td style="padding: 36px 36px 20px 36px; text-align: center; background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%);">
                    
                    <!-- Circular Emerald Badge -->
                    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td align="center" style="width: 76px; height: 76px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);">
                          <!-- Trophy / Sparkle Icon -->
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto;">
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                            <path d="M4 22h16"></path>
                            <path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path>
                            <path d="M14 14.66V17c0 .55.45 1 1 1h2"></path>
                            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                          </svg>
                        </td>
                      </tr>
                    </table>

                    <span style="display: inline-block; background-color: #d1fae5; color: #065f46; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px;">
                      Referral Commission Allocated
                    </span>
                    <h1 style="color: #0f172a; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">
                      You Earned <span style="color: #16a34a;">${STORE_CONFIG.STORE_CURRENCY}${commissionAmount}!</span>
                    </h1>
                    <p style="color: #64748b; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">
                      Your referral reward has been successfully approved and credited.
                    </p>
                  </td>
                </tr>

                <!-- Body Content -->
                <tr>
                  <td style="padding: 12px 36px 32px 36px;">
                    
                    <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
                      Hi <strong>${referrerName}</strong>,
                    </p>

                    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                      Exciting news! Your referred friend, <strong>${referredClientName}</strong>, made <strong>${monthlyPurchasesCount} verified purchases</strong> in <strong>${evaluationMonth}</strong>, fulfilling our monthly qualification requirements.
                    </p>

                    <!-- Commission Highlights Card -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px solid #86efac; border-radius: 20px; padding: 22px; margin-bottom: 24px;">
                      <tr>
                        <td>
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td>
                                <span style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; display: block;">
                                  Allocated Commission
                                </span>
                                <span style="font-size: 32px; font-weight: 900; color: #065f46; letter-spacing: -0.5px; display: block; margin-top: 2px;">
                                  +${STORE_CONFIG.STORE_CURRENCY}${commissionAmount}
                                </span>
                              </td>
                              <td align="right" valign="middle">
                                <div style="background-color: #ffffff; border: 1px solid #bbf7d0; border-radius: 14px; padding: 10px 16px; text-align: right;">
                                  <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">Total Available</span>
                                  <span style="font-size: 18px; font-weight: 800; color: #15803d;">${STORE_CONFIG.STORE_CURRENCY}${newBalance}</span>
                                </div>
                              </td>
                            </tr>
                          </table>

                          <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed #bbf7d0; font-size: 12px; color: #065f46;">
                            <strong>Qualification Details:</strong> ${referredClientName} &bull; ${monthlyPurchasesCount} Orders &bull; Month: ${evaluationMonth}
                            ${adminNotes ? `<br/><span style="color: #047857; font-style: italic; margin-top: 4px; display: block;">Admin Note: ${adminNotes}</span>` : ''}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Primary Red Call to Action Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                      <tr>
                        <td align="center">
                          <a href="${accountRewardsUrl}" target="_blank" style="background-color: #ef4444; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 36px; border-radius: 9999px; display: inline-block; box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35); text-align: center; letter-spacing: 0.2px;">
                            Redeem Balance &amp; Shop Now &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- How to Redeem Options Box -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 16px; padding: 18px; margin-bottom: 24px; border: 1px solid #edf2f7;">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">How to use your reward:</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #475569; line-height: 1.6;">
                          &bull; <strong>Discount Voucher:</strong> Convert your balance to coupon codes ready at checkout.<br/>
                          &bull; <strong>KUD Wallet Funds:</strong> Instantly credit your wallet for seamless checkout deductions.
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                      Questions about your referral balance? Contact us at <a href="mailto:${STORE_CONFIG.CONTACT_EMAIL}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${STORE_CONFIG.CONTACT_EMAIL}</a> or WhatsApp <a href="https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, '')}" style="color: #16a34a; text-decoration: none; font-weight: 600;">${STORE_CONFIG.WHATSAPP_SUPPORT}</a>.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} ${STORE_CONFIG.STORE_NAME}. You received this email because you are a registered participant in the KUD Store Referral Program.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'KUD Store <onboarding@resend.dev>';

    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [referrerEmail],
          subject: `🎉 Commission Credited! R${commissionAmount} Added to Your Balance`,
          html: emailHtml,
        }),
      });

      const resText = await response.text();
      if (response.ok) {
        console.log(`[RESEND COMMISSION SUCCESS] Commission email delivered to ${referrerEmail}`);
        return {
          success: true,
          sent: true,
          simulated: false,
          recipientEmail: referrerEmail,
          message: `Referral commission notification email sent to ${referrerEmail}!`,
        };
      } else {
        console.error(`[RESEND COMMISSION ERROR] HTTP ${response.status}:`, resText);
        return {
          success: false,
          sent: false,
          simulated: false,
          recipientEmail: referrerEmail,
          message: `Resend API error (${response.status}): ${resText}`,
          error: resText,
        };
      }
    } else {
      console.log(`[RESEND COMMISSION SIMULATED] Commission notification logged for ${referrerEmail} (+R${commissionAmount})`);
      return {
        success: true,
        sent: true,
        simulated: true,
        recipientEmail: referrerEmail,
        message: `Commission allocation email simulated for ${referrerEmail}. Configure RESEND_API_KEY for live delivery.`,
      };
    }
  } catch (err: any) {
    console.error('[EmailService] Error in sendCommissionAllocatedEmail:', err);
    return {
      success: false,
      sent: false,
      simulated: false,
      recipientEmail: payload.referrerEmail || '',
      message: err?.message || 'Failed to dispatch commission allocation email',
      error: err?.message,
    };
  }
}

// ============================================================================
// REFERRAL EARNINGS FROZEN EMAIL
// ============================================================================

export interface EarningsFrozenEmailPayload {
  customerEmail: string;
  customerName: string;
  frozenReason?: string;
  frozenAt?: string;
  currentBalance?: number;
  adminEmail?: string;
}

export async function sendEarningsFrozenEmail(
  payload: EarningsFrozenEmailPayload
): Promise<EmailNotificationResult> {
  try {
    const {
      customerEmail,
      customerName = 'Valued Customer',
      frozenReason = 'Referral earnings frozen by administrator for security / compliance review',
      frozenAt = new Date().toISOString(),
      currentBalance = 0,
    } = payload;

    if (!customerEmail || !customerEmail.includes('@')) {
      return {
        success: false,
        sent: false,
        simulated: false,
        recipientEmail: customerEmail || '',
        message: 'Invalid or missing customer email address.',
        error: 'Invalid recipient email',
      };
    }

    const appUrl = (typeof window !== 'undefined' ? window.location.origin : (process.env.APP_URL || process.env.VITE_APP_URL || 'https://kudstore.co.za')).replace(/\/+$/, '');
    const accountUrl = `${appUrl}/account?tab=referrals`;

    // Try posting to backend API endpoint first for server-side Resend execution
    if (typeof window !== 'undefined') {
      try {
        const apiRes = await fetch('/api/email/earnings-frozen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (apiRes.ok) {
          const data = await apiRes.json();
          return data;
        }
      } catch (clientErr) {
        console.warn('[EmailService] Client API proxy error for freeze, falling back to direct:', clientErr);
      }
    }

    const formattedDate = new Date(frozenAt).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notice: Referral Earnings Frozen</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 36px 12px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);">
                
                <!-- Header Banner -->
                <tr>
                  <td style="padding: 36px 36px 20px 36px; text-align: center; background: linear-gradient(180deg, #ecfeff 0%, #ffffff 100%);">
                    
                    <!-- Circular Cyan Snowflake Badge -->
                    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td align="center" style="width: 76px; height: 76px; background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); border-radius: 50%; box-shadow: 0 8px 20px rgba(8, 145, 178, 0.3);">
                          <!-- Snowflake / Lock Icon -->
                          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto;">
                            <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07"/>
                            <circle cx="12" cy="12" r="3" fill="#0891b2" stroke="#ffffff"/>
                          </svg>
                        </td>
                      </tr>
                    </table>

                    <span style="display: inline-block; background-color: #cffafe; color: #155e75; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px;">
                      Referral Account Notice
                    </span>
                    <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">
                      Referral Earnings Temporarily Frozen
                    </h1>
                    <p style="color: #64748b; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">
                      A temporary hold has been placed on your referral rewards redemptions.
                    </p>
                  </td>
                </tr>

                <!-- Body Content -->
                <tr>
                  <td style="padding: 12px 36px 32px 36px;">
                    
                    <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
                      Hi <strong>${customerName}</strong>,
                    </p>

                    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                      We are writing to inform you that your <strong>KUD Store referral rewards earnings</strong> have been placed on a temporary hold by our store administration team.
                    </p>

                    <!-- Notice & Reason Card -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdfa; border: 1.5px solid #a5f3fc; border-radius: 20px; padding: 20px; margin-bottom: 24px;">
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 800; color: #0891b2; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">
                            Administrator Hold Reason
                          </span>
                          <p style="margin: 0; font-size: 14px; color: #0e7490; font-style: italic; line-height: 1.5;">
                            &ldquo;${frozenReason}&rdquo;
                          </p>

                          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #bae6fd; font-size: 12px; color: #475569;">
                            <strong>Effective Date:</strong> ${formattedDate} &bull; <strong>Balance On Hold:</strong> ${STORE_CONFIG.STORE_CURRENCY}${currentBalance}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- What This Means Section -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 16px; padding: 18px; margin-bottom: 24px; border: 1px solid #edf2f7;">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">What This Means For Your Account:</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #475569; line-height: 1.6;">
                          &bull; <strong>Store Shopping:</strong> Your regular store shopping, orders, and delivery remain 100% active.<br/>
                          &bull; <strong>Rewards Redemptions:</strong> Converting referral balance to discount vouchers or KUD wallet funds is paused during this hold.<br/>
                          &bull; <strong>Balance Protection:</strong> Your accrued balance of ${STORE_CONFIG.STORE_CURRENCY}${currentBalance} remains preserved in your profile.
                        </td>
                      </tr>
                    </table>

                    <!-- Primary Action Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <a href="${accountUrl}" target="_blank" style="background-color: #0891b2; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 9999px; display: inline-block; box-shadow: 0 6px 20px rgba(8, 145, 178, 0.3); text-align: center;">
                            View Account Referral Status &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                      If you believe this hold was made in error or to submit verification details, please reply to this email, contact <a href="mailto:${STORE_CONFIG.CONTACT_EMAIL}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${STORE_CONFIG.CONTACT_EMAIL}</a>, or chat with us on WhatsApp <a href="https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, '')}" style="color: #16a34a; text-decoration: none; font-weight: 600;">${STORE_CONFIG.WHATSAPP_SUPPORT}</a>.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} ${STORE_CONFIG.STORE_NAME} Security &amp; Compliance Team.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'KUD Store <onboarding@resend.dev>';

    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [customerEmail],
          subject: `Notice: KUD Store Referral Earnings Frozen`,
          html: emailHtml,
        }),
      });

      const resText = await response.text();
      if (response.ok) {
        console.log(`[RESEND FREEZE SUCCESS] Freeze notification email delivered to ${customerEmail}`);
        return {
          success: true,
          sent: true,
          simulated: false,
          recipientEmail: customerEmail,
          message: `Earnings frozen notification email sent to ${customerEmail}!`,
        };
      } else {
        console.error(`[RESEND FREEZE ERROR] HTTP ${response.status}:`, resText);
        return {
          success: false,
          sent: false,
          simulated: false,
          recipientEmail: customerEmail,
          message: `Resend API error (${response.status}): ${resText}`,
          error: resText,
        };
      }
    } else {
      console.log(`[RESEND FREEZE SIMULATED] Freeze notice email logged for ${customerEmail} (Reason: ${frozenReason})`);
      return {
        success: true,
        sent: true,
        simulated: true,
        recipientEmail: customerEmail,
        message: `Freeze notification simulated for ${customerEmail}. Configure RESEND_API_KEY for live delivery.`,
      };
    }
  } catch (err: any) {
    console.error('[EmailService] Error in sendEarningsFrozenEmail:', err);
    return {
      success: false,
      sent: false,
      simulated: false,
      recipientEmail: payload.customerEmail || '',
      message: err?.message || 'Failed to dispatch earnings frozen email',
      error: err?.message,
    };
  }
}

// ============================================================================
// REFERRAL EARNINGS UNFROZEN EMAIL
// ============================================================================

export interface EarningsUnfrozenEmailPayload {
  customerEmail: string;
  customerName: string;
  currentBalance?: number;
}

export async function sendEarningsUnfrozenEmail(
  payload: EarningsUnfrozenEmailPayload
): Promise<EmailNotificationResult> {
  try {
    const {
      customerEmail,
      customerName = 'Valued Customer',
      currentBalance = 0,
    } = payload;

    if (!customerEmail || !customerEmail.includes('@')) {
      return {
        success: false,
        sent: false,
        simulated: false,
        recipientEmail: customerEmail || '',
        message: 'Invalid customer email address.',
        error: 'Invalid recipient email',
      };
    }

    const appUrl = (typeof window !== 'undefined' ? window.location.origin : (process.env.APP_URL || process.env.VITE_APP_URL || 'https://kudstore.co.za')).replace(/\/+$/, '');
    const accountUrl = `${appUrl}/account?tab=referrals`;

    // Try posting to backend API endpoint first for server-side Resend execution
    if (typeof window !== 'undefined') {
      try {
        const apiRes = await fetch('/api/email/earnings-unfrozen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (apiRes.ok) {
          const data = await apiRes.json();
          return data;
        }
      } catch (clientErr) {
        console.warn('[EmailService] Client API proxy error for unfreeze:', clientErr);
      }
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Good News: Your Referral Earnings Have Been Restored!</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 36px 12px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);">
                
                <!-- Header Banner -->
                <tr>
                  <td style="padding: 36px 36px 20px 36px; text-align: center; background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%);">
                    
                    <!-- Circular Emerald Badge -->
                    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td align="center" style="width: 76px; height: 76px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);">
                          <!-- Checkmark Icon -->
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto;">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </td>
                      </tr>
                    </table>

                    <span style="display: inline-block; background-color: #d1fae5; color: #065f46; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px;">
                      Earnings Restored
                    </span>
                    <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">
                      Your Referral Rewards Are Active!
                    </h1>
                    <p style="color: #64748b; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">
                      The temporary hold on your earnings has been lifted.
                    </p>
                  </td>
                </tr>

                <!-- Body Content -->
                <tr>
                  <td style="padding: 12px 36px 32px 36px;">
                    <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
                      Hi <strong>${customerName}</strong>,
                    </p>

                    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                      We are pleased to let you know that the temporary hold on your referral earnings has been successfully resolved and lifted. Your rewards balance of <strong>${STORE_CONFIG.STORE_CURRENCY}${currentBalance}</strong> is now completely restored and ready for voucher redemption or wallet conversion.
                    </p>

                    <!-- Primary Action Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <a href="${accountUrl}" target="_blank" style="background-color: #16a34a; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 15px 34px; border-radius: 9999px; display: inline-block; box-shadow: 0 6px 20px rgba(22, 163, 74, 0.3); text-align: center;">
                            Go to Rewards Dashboard &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                      &copy; ${new Date().getFullYear()} ${STORE_CONFIG.STORE_NAME}. You received this email regarding your KUD Store Referral Account.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'KUD Store <onboarding@resend.dev>';

    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [customerEmail],
          subject: `✨ Good News: Your Referral Earnings Have Been Restored!`,
          html: emailHtml,
        }),
      });

      const resText = await response.text();
      if (response.ok) {
        return {
          success: true,
          sent: true,
          simulated: false,
          recipientEmail: customerEmail,
          message: `Earnings restored notification email sent to ${customerEmail}!`,
        };
      }
    }

    return {
      success: true,
      sent: true,
      simulated: true,
      recipientEmail: customerEmail,
      message: `Unfreeze notification logged for ${customerEmail}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      sent: false,
      simulated: false,
      recipientEmail: payload.customerEmail || '',
      message: err?.message || 'Failed to dispatch unfreeze email',
      error: err?.message,
    };
  }
}

export interface InvoiceEmailOptions {
  orderOrInvoice: any;
  recipientEmail?: string;
  customMessage?: string;
  senderName?: string;
  senderEmail?: string;
  triggerType?: 'auto' | 'manual_admin' | 'resend';
  supabase?: SupabaseClient;
}

export interface InvoiceEmailResult {
  success: boolean;
  sent: boolean;
  simulated: boolean;
  recipientEmail: string;
  invoiceNumber: string;
  message: string;
  error?: string;
  log?: InvoiceSendingLog;
}

/**
 * Dispatches an official SARS 15% VAT Tax Invoice / Receipt email to customer
 */
export async function sendInvoiceEmail(
  options: InvoiceEmailOptions
): Promise<InvoiceEmailResult> {
  const {
    orderOrInvoice,
    recipientEmail,
    customMessage,
    senderName = 'KUD Store Billing',
    triggerType = 'manual_admin',
  } = options;

  try {
    const rawOrder = orderOrInvoice || {};
    const orderNumber = rawOrder.order_number || rawOrder.orderNumber || rawOrder.id || `KUD-${Date.now().toString().slice(-6)}`;
    const invoiceNumber = rawOrder.invoice_number || rawOrder.invoiceNumber || `INV-2026-${orderNumber.replace(/[^0-9]/g, '') || Math.floor(100000 + Math.random() * 900000)}`;
    const targetEmail = recipientEmail || rawOrder.customer_email || rawOrder.customerEmail || '';
    const customerName = rawOrder.customer_name || rawOrder.customerName || 'Valued Customer';
    const createdAt = rawOrder.created_at || rawOrder.createdAt || new Date().toISOString();
    const paymentMethod = rawOrder.payment_method || rawOrder.paymentMethod || 'Online Gateway';
    const paymentStatusRaw = (rawOrder.payment_status || rawOrder.paymentStatus || 'pending').toString().toLowerCase();
    const isPaid = paymentStatusRaw === 'paid' || paymentStatusRaw === 'completed' || paymentStatusRaw === 'success';

    if (!targetEmail || !targetEmail.includes('@')) {
      return {
        success: false,
        sent: false,
        simulated: false,
        recipientEmail: targetEmail,
        invoiceNumber,
        message: 'No valid recipient email address provided.',
        error: 'Invalid recipient email',
      };
    }

    const financials = calculateOrderFinancials(rawOrder);
    const items = Array.isArray(rawOrder.items) ? rawOrder.items : [];

    const itemsHtml = items.length > 0
      ? items.map((item: any) => {
          const qty = Number(item.quantity) || 1;
          const unit = Number(item.unit_price) || (Number(item.total_price) / qty) || 0;
          const lineTotal = Number(item.total_price) || (unit * qty);
          return `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827;">
                <strong>${item.product_name || item.name || 'Product Item'}</strong>
                ${item.product_brand ? `<br/><span style="font-size: 11px; color: #6b7280; text-transform: uppercase;">${item.product_brand}</span>` : ''}
                ${item.variant ? `<br/><span style="font-size: 12px; color: #9ca3af;">Variant: ${item.variant}</span>` : ''}
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; text-align: center;">
                ${qty}
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; text-align: right;">
                R${formatMoney(unit)}
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827; text-align: right; font-weight: 700;">
                R${formatMoney(lineTotal)}
              </td>
            </tr>
          `;
        }).join('')
      : `
        <tr>
          <td colspan="4" style="padding: 16px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #4b5563;">
            Standard Order Items (Subtotal: R${formatMoney(financials.subtotal)})
          </td>
        </tr>
      `;

    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'https://kudstore.com';
    const orderLink = `${appUrl}/orders/${rawOrder.id || orderNumber}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tax Invoice #${invoiceNumber}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 0;">
          <tr>
            <td align="center">
              <table width="650" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
                <!-- Header Banner -->
                <tr>
                  <td style="background-color: #0f172a; padding: 36px 32px; text-align: left;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">KUD STORE</h1>
                          <p style="color: #ff6452; margin: 4px 0 0 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">Official Tax Invoice & Receipt</p>
                          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 11px;">VAT Reg No: ZA4920192837 | SARS Compliant</p>
                        </td>
                        <td align="right">
                          <div style="background-color: ${isPaid ? '#065f46' : '#92400e'}; border: 1px solid ${isPaid ? '#34d399' : '#f59e0b'}; padding: 6px 16px; border-radius: 9999px; display: inline-block;">
                            <span style="color: #ffffff; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                              ${isPaid ? 'PAID IN FULL' : 'PAYMENT PENDING'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 32px;">
                    ${customMessage ? `
                    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 24px;">
                      <p style="margin: 0; font-size: 13px; color: #1e40af; font-weight: 600;">Message from Store Administration:</p>
                      <p style="margin: 4px 0 0 0; font-size: 13px; color: #1e3a8a;">${customMessage}</p>
                    </div>
                    ` : ''}

                    <!-- Invoice Metadata Grid -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 28px; border: 1px solid #edf2f7;">
                      <tr>
                        <td width="50%" valign="top" style="padding-right: 12px;">
                          <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Billed To</p>
                          <p style="margin: 4px 0 0 0; font-size: 15px; color: #0f172a; font-weight: 700;">${customerName}</p>
                          <p style="margin: 2px 0 0 0; font-size: 13px; color: #475569;">${targetEmail}</p>
                          ${rawOrder.customer_phone ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${rawOrder.customer_phone}</p>` : ''}
                        </td>
                        <td width="50%" valign="top" align="right" style="padding-left: 12px;">
                          <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Number</p>
                          <p style="margin: 2px 0 0 0; font-size: 15px; color: #0f172a; font-weight: 800;">${invoiceNumber}</p>
                          <p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Order Reference</p>
                          <p style="margin: 2px 0 0 0; font-size: 13px; color: #0f172a; font-weight: 600;">#${orderNumber}</p>
                          <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">Issue Date: ${new Date(createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                          <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Payment Method: ${paymentMethod}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Items Table -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                      <thead>
                        <tr>
                          <th align="left" style="padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Item Description</th>
                          <th align="center" style="padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                          <th align="right" style="padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Unit (Excl. VAT)</th>
                          <th align="right" style="padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>

                    <!-- Accurate Financial Breakdown Table (15% VAT) -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                      <tr>
                        <td width="55%"></td>
                        <td width="45%">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Subtotal (Taxable Base)</td>
                              <td align="right" style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">R${formatMoney(financials.subtotal)}</td>
                            </tr>
                            ${financials.discountAmount > 0 ? `
                            <tr>
                              <td style="padding: 6px 0; font-size: 13px; color: #16a34a;">Discount Applied</td>
                              <td align="right" style="padding: 6px 0; font-size: 13px; color: #16a34a; font-weight: 600;">-R${formatMoney(financials.discountAmount)}</td>
                            </tr>
                            ` : ''}
                            <tr>
                              <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Delivery / Courier Fee</td>
                              <td align="right" style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">
                                ${financials.deliveryFee === 0 ? '<span style="color: #16a34a; font-weight: 700;">FREE</span>' : `R${formatMoney(financials.deliveryFee)}`}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; font-size: 13px; color: #64748b;">VAT (15% SARS Rate)</td>
                              <td align="right" style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">R${formatMoney(financials.vatAmount)}</td>
                            </tr>
                            <tr>
                              <td style="padding: 14px 0 0 0; border-top: 2px solid #0f172a; font-size: 16px; color: #0f172a; font-weight: 900;">Grand Total</td>
                              <td align="right" style="padding: 14px 0 0 0; border-top: 2px solid #0f172a; font-size: 20px; color: #ff6452; font-weight: 900;">R${formatMoney(financials.grandTotal)}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0 0 0; font-size: 11px; color: #64748b;">Amount Paid</td>
                              <td align="right" style="padding: 4px 0 0 0; font-size: 12px; color: ${isPaid ? '#16a34a' : '#64748b'}; font-weight: 700;">
                                ${isPaid ? `R${formatMoney(financials.grandTotal)}` : 'R0.00'}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Customer Action Button -->
                    <div style="text-align: center; margin: 28px 0 12px 0;">
                      <a href="${orderLink}" style="background-color: #ff6452; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 800; font-size: 14px; border-radius: 9999px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(255, 100, 82, 0.2);">
                        View Order & Receipt Online
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 500;">
                      Thank you for choosing KUD Store. Registered with the South African Revenue Service (SARS).
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">
                      Need support? Contact <a href="mailto:${STORE_CONFIG.CONTACT_EMAIL}" style="color: #64748b;">${STORE_CONFIG.CONTACT_EMAIL}</a> or WhatsApp ${STORE_CONFIG.WHATSAPP_SUPPORT}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const now = new Date().toISOString();
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'KUD Store Billing <invoices@resend.dev>';

    let isRealSent = false;
    let emailId = `sim_${Date.now()}`;

    if (resendApiKey && !resendApiKey.includes('placeholder')) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [targetEmail],
            subject: `🧾 Tax Invoice #${invoiceNumber} - KUD Store`,
            html: emailHtml,
          }),
        });

        const resData: any = await response.json().catch(() => ({}));
        if (response.ok) {
          isRealSent = true;
          emailId = resData.id || `res_${Date.now()}`;
        }
      } catch (err: any) {
        console.warn('Resend API dispatch error, logging fallback:', err?.message);
      }
    }

    const logEntry: InvoiceSendingLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      sentTo: targetEmail,
      sentBy: senderName,
      triggerType,
      status: isRealSent ? 'delivered' : 'simulated',
      emailId,
      notes: customMessage ? `Custom note: "${customMessage}"` : 'Official tax invoice dispatched',
    };

    return {
      success: true,
      sent: true,
      simulated: !isRealSent,
      recipientEmail: targetEmail,
      invoiceNumber,
      message: isRealSent
        ? `Invoice #${invoiceNumber} successfully emailed to ${targetEmail} via Resend.`
        : `Invoice #${invoiceNumber} dispatch simulated and recorded for ${targetEmail}.`,
      log: logEntry,
    };
  } catch (err: any) {
    console.error('sendInvoiceEmail error:', err);
    return {
      success: false,
      sent: false,
      simulated: false,
      recipientEmail: options.recipientEmail || '',
      invoiceNumber: options.orderOrInvoice?.invoice_number || 'N/A',
      message: err?.message || 'Failed to dispatch invoice email',
      error: err?.message,
    };
  }
}

