/**
 * KUD Store - Purchase Confirmation Email Template Generator
 * Produces secure, sanitized, cross-client responsive HTML and plain-text emails.
 */

export interface EmailOrderItem {
  product_name: string;
  product_image?: string | null;
  product_brand?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant?: string;
}

export interface OrderConfirmationTemplateProps {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  orderNumber: string;
  orderDate: string;
  paymentMethod: string;
  paymentReference?: string;
  items: EmailOrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  currency?: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryProvince: string;
  deliveryPostalCode: string;
  customerNote?: string;
  storeName?: string;
  supportEmail?: string;
  supportPhone?: string;
  storeUrl?: string;
  isResend?: boolean;
}

/**
 * Escapes potentially hazardous characters to prevent HTML injection.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats monetary amounts according to South African Rand conventions: e.g. "R1,299.00"
 */
export function formatZar(amount: number): string {
  const safeNum = Number(amount) || 0;
  return `R${safeNum.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generates both responsive HTML email and plain-text fallback.
 */
export function generateOrderConfirmationEmail(props: OrderConfirmationTemplateProps): {
  subject: string;
  html: string;
  text: string;
} {
  const storeName = props.storeName || 'KUD Store';
  const supportEmail = props.supportEmail || 'support@kudstore.co.za';
  const supportPhone = props.supportPhone || '+27 11 000 0000';
  const storeUrl = props.storeUrl || 'https://kudstore.com';
  const orderUrl = `${storeUrl}/orders/${encodeURIComponent(props.orderNumber.replace(/^KUD-/, ''))}`;

  const cleanCustomerName = escapeHtml(props.customerName || 'Valued Customer');
  const cleanOrderNumber = escapeHtml(props.orderNumber);
  const cleanPaymentMethod = escapeHtml(props.paymentMethod || 'Yoco Secure Card Payment');
  const cleanPaymentRef = props.paymentReference ? escapeHtml(props.paymentReference) : null;
  const cleanAddress = escapeHtml(props.deliveryAddress);
  const cleanCity = escapeHtml(props.deliveryCity);
  const cleanProvince = escapeHtml(props.deliveryProvince);
  const cleanPostalCode = escapeHtml(props.deliveryPostalCode);
  const cleanPhone = props.customerPhone ? escapeHtml(props.customerPhone) : null;
  const cleanNote = props.customerNote ? escapeHtml(props.customerNote) : null;

  const subject = props.isResend
    ? `Order Confirmation — Resent: #${cleanOrderNumber} | ${storeName}`
    : `Order Confirmed: #${cleanOrderNumber} | ${storeName}`;

  // Build items HTML
  const itemsHtml = props.items && props.items.length > 0
    ? props.items.map((item) => {
        const name = escapeHtml(item.product_name || 'Product');
        const variant = item.variant ? escapeHtml(item.variant) : null;
        const brand = item.product_brand ? escapeHtml(item.product_brand) : null;
        const qty = Number(item.quantity) || 1;
        const unit = formatZar(item.unit_price);
        const lineTotal = formatZar(item.total_price || (item.unit_price * qty));
        const image = item.product_image && item.product_image.startsWith('http')
          ? escapeHtml(item.product_image)
          : null;

        return `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  ${image ? `
                  <td width="64" style="padding-right: 14px; vertical-align: top;">
                    <img src="${image}" alt="${name}" width="56" height="56" style="border-radius: 8px; object-fit: cover; display: block; border: 1px solid #e2e8f0; background-color: #f8fafc;" />
                  </td>
                  ` : ''}
                  <td style="vertical-align: top;">
                    ${brand ? `<div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">${brand}</div>` : ''}
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.4;">${name}</div>
                    ${variant ? `<div style="font-size: 12px; color: #64748b; margin-top: 3px;">Variant / Size: <strong style="color: #334155;">${variant}</strong></div>` : ''}
                    <div style="font-size: 12px; color: #64748b; margin-top: 3px;">
                      Qty: <strong style="color: #0f172a;">${qty}</strong> &times; ${unit}
                    </div>
                  </td>
                  <td align="right" style="vertical-align: top; padding-left: 12px; white-space: nowrap;">
                    <span style="font-size: 14px; font-weight: 800; color: #0f172a;">${lineTotal}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      }).join('')
    : `
      <tr>
        <td colspan="2" style="padding: 16px 0; color: #64748b; font-size: 14px; text-align: center;">
          Standard Order Items
        </td>
      </tr>
    `;

  // Build items plain text
  const itemsText = props.items && props.items.length > 0
    ? props.items.map((i) => {
        const v = i.variant ? ` (${i.variant})` : '';
        return `• ${i.product_name}${v} x${i.quantity} @ ${formatZar(i.unit_price)} = ${formatZar(i.total_price || (i.unit_price * i.quantity))}`;
      }).join('\n')
    : `Items Total: ${formatZar(props.total)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px 32px 28px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">
                ${escapeHtml(storeName)}
              </h1>
              <div style="display: inline-block; margin-top: 8px; background-color: rgba(255, 100, 82, 0.15); border: 1px solid #ff6452; padding: 4px 12px; border-radius: 9999px;">
                <span style="color: #ff6452; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                  ${props.isResend ? 'Official Receipt — Copy' : 'Official Purchase Confirmation'}
                </span>
              </div>
            </td>
          </tr>

          <!-- Resend Banner if Applicable -->
          ${props.isResend ? `
          <tr>
            <td style="background-color: #eff6ff; border-bottom: 1px solid #bfdbfe; padding: 12px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; font-weight: 700; color: #1d4ed8;">
                ℹ️ This is a resent copy of your purchase confirmation email requested by store support.
              </p>
            </td>
          </tr>
          ` : ''}

          <!-- Verified Payment Banner -->
          <tr>
            <td style="padding: 28px 32px 0;">
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 14px; padding: 16px 20px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="32" style="vertical-align: middle; font-size: 22px; line-height: 1;">
                      ✅
                    </td>
                    <td style="vertical-align: middle; padding-left: 8px;">
                      <div style="font-size: 15px; font-weight: 800; color: #065f46;">
                        Payment Authorized & Verified
                      </div>
                      <div style="font-size: 13px; color: #047857; margin-top: 2px;">
                        Your payment of <strong style="color: #065f46;">${formatZar(props.total)}</strong> has been received via ${cleanPaymentMethod}.
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Greeting & Intro Message -->
          <tr>
            <td style="padding: 24px 32px 0;">
              <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #0f172a;">
                Hi ${cleanCustomerName},
              </h2>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Thank you for your purchase from <strong>${escapeHtml(storeName)}</strong>! We have confirmed your payment and our logistics team is already preparing your order for courier delivery.
              </p>
            </td>
          </tr>

          <!-- Order Summary Meta Box -->
          <tr>
            <td style="padding: 20px 32px 0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 20px;">
                <tr>
                  <td style="vertical-align: top; padding-bottom: 10px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Order Number</div>
                    <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 2px;">#${cleanOrderNumber}</div>
                  </td>
                  <td align="right" style="vertical-align: top; padding-bottom: 10px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Payment Status</div>
                    <div style="display: inline-block; margin-top: 2px; background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 900; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;">
                      PAID
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align: top; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Order Date</div>
                    <div style="font-size: 13px; font-weight: 600; color: #334155; margin-top: 2px;">${escapeHtml(props.orderDate)}</div>
                  </td>
                  <td align="right" style="vertical-align: top; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Payment Method</div>
                    <div style="font-size: 13px; font-weight: 600; color: #334155; margin-top: 2px;">
                      ${cleanPaymentMethod}${cleanPaymentRef ? ` <span style="font-size: 11px; color: #64748b;">(${cleanPaymentRef})</span>` : ''}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Ordered Section -->
          <tr>
            <td style="padding: 28px 32px 0;">
              <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                Purchased Items
              </h3>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown Table -->
          <tr>
            <td style="padding: 20px 32px 0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px;">
                <tr>
                  <td style="font-size: 13px; color: #64748b; padding-bottom: 8px;">Subtotal</td>
                  <td align="right" style="font-size: 13px; font-weight: 700; color: #0f172a; padding-bottom: 8px;">
                    ${formatZar(props.subtotal)}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #64748b; padding-bottom: 8px;">Courier Delivery Fee</td>
                  <td align="right" style="font-size: 13px; font-weight: 700; color: #0f172a; padding-bottom: 8px;">
                    ${props.shippingFee === 0 ? '<span style="color: #16a34a;">FREE</span>' : formatZar(props.shippingFee)}
                  </td>
                </tr>
                ${props.discount > 0 ? `
                <tr>
                  <td style="font-size: 13px; color: #16a34a; font-weight: 700; padding-bottom: 8px;">Discount Savings</td>
                  <td align="right" style="font-size: 13px; font-weight: 800; color: #16a34a; padding-bottom: 8px;">
                    -${formatZar(props.discount)}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="border-top: 2px solid #0f172a; padding-top: 12px; font-size: 15px; font-weight: 900; color: #0f172a;">
                    Total Paid (Incl. 15% VAT)
                  </td>
                  <td align="right" style="border-top: 2px solid #0f172a; padding-top: 12px; font-size: 18px; font-weight: 900; color: #ff6452;">
                    ${formatZar(props.total)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Address & Recipient Card -->
          <tr>
            <td style="padding: 24px 32px 0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px;">
                <tr>
                  <td style="vertical-align: top;">
                    <div style="font-size: 12px; font-weight: 800; color: #ff6452; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                      📍 Delivery Address
                    </div>
                    <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${cleanCustomerName}</div>
                    <div style="font-size: 13px; color: #475569; margin-top: 3px; line-height: 1.5;">
                      ${cleanAddress}<br/>
                      ${cleanCity}, ${cleanProvince} ${cleanPostalCode}
                    </div>
                    ${cleanPhone ? `
                    <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
                      Recipient Contact: <strong style="color: #334155;">${cleanPhone}</strong>
                    </div>
                    ` : ''}
                    ${cleanNote ? `
                    <div style="font-size: 12px; color: #64748b; margin-top: 6px; background-color: #f1f5f9; padding: 8px 12px; border-radius: 8px;">
                      Delivery Note: <em style="color: #1e293b;">${cleanNote}</em>
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 28px 32px; text-align: center;">
              <a href="${orderUrl}" style="background-color: #ff6452; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 800; font-size: 14px; border-radius: 9999px; display: inline-block; box-shadow: 0 4px 12px rgba(255, 100, 82, 0.3);">
                View Live Order Status &amp; Tracking
              </a>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 10px;">
                You can view fulfillment progress and download your official tax invoice at any time.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.6;">
                Need assistance? We are here to help:<br/>
                Email: <a href="mailto:${escapeHtml(supportEmail)}" style="color: #ff6452; font-weight: 700; text-decoration: none;">${escapeHtml(supportEmail)}</a>
                ${supportPhone ? ` &bull; Tel / WhatsApp: <strong style="color: #334155;">${escapeHtml(supportPhone)}</strong>` : ''}
              </p>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(storeName)}. All rights reserved.<br/>
                South African Rand (ZAR) &bull; Secure Payments Powered by Yoco
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
==================================================
${storeName.toUpperCase()} - ORDER CONFIRMATION
${props.isResend ? '[RESENT COPY]\n' : ''}==================================================

Hi ${props.customerName || 'Valued Customer'},

Thank you for your purchase from ${storeName}!
Your payment has been successfully authorized and your order is now being processed.

ORDER DETAILS:
--------------------------------------------------
Order Number:   #${props.orderNumber}
Order Date:     ${props.orderDate}
Payment Status: PAID
Payment Method: ${props.paymentMethod}${props.paymentReference ? ` (${props.paymentReference})` : ''}

ITEMS ORDERED:
--------------------------------------------------
${itemsText}

FINANCIAL BREAKDOWN:
--------------------------------------------------
Subtotal:       ${formatZar(props.subtotal)}
Shipping Fee:   ${props.shippingFee === 0 ? 'FREE' : formatZar(props.shippingFee)}
${props.discount > 0 ? `Discount:       -${formatZar(props.discount)}\n` : ''}TOTAL PAID:     ${formatZar(props.total)} (Incl. 15% VAT)

DELIVERY ADDRESS:
--------------------------------------------------
${props.customerName}
${props.deliveryAddress}
${props.deliveryCity}, ${props.deliveryProvince} ${props.deliveryPostalCode}
${props.customerPhone ? `Contact Phone: ${props.customerPhone}\n` : ''}${props.customerNote ? `Note: ${props.customerNote}\n` : ''}
TRACK YOUR ORDER:
--------------------------------------------------
You can track fulfillment status at:
${orderUrl}

NEED HELP?
--------------------------------------------------
Email: ${supportEmail}
Support: ${supportPhone}

Thank you for shopping with ${storeName}!
`;

  return {
    subject,
    html,
    text,
  };
}
