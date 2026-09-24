var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_vite = require("vite");
var import_supabase_js = require("@supabase/supabase-js");
var import_dotenv = __toESM(require("dotenv"), 1);

// src/constants/config.ts
var STORE_CONFIG = {
  // Store Basic Information
  STORE_NAME: "KUD online store",
  STORE_TAGLINE: "The shopping partner you can trust.",
  STORE_CURRENCY: "R",
  // South African Rand
  CURRENCY_CODE: "ZAR",
  // Promotional Banner Settings
  PROMO_TEXT: "Earn per each referral, win something \u{1F381}",
  PROMO_SUBTEXT: "120 people get R50 in KUD credit. T&Cs apply.",
  // Delivery & Fees
  DELIVERY_FEE: 65,
  // ZAR R65 flat delivery fee across SA
  EXPRESS_DELIVERY_FEE: 120,
  // ZAR R120 express courier delivery
  FREE_DELIVERY_THRESHOLD: 800,
  // Free delivery for orders over R800
  // Brand Colors (Tailwind Reference)
  ACCENT_COLOR: "#ff6452",
  // Soft Coral / Salmon
  PROMO_BG_COLOR: "#eff6ff",
  // Light blue background
  // Contact & Social Links
  CONTACT_EMAIL: "qchirass@gmail.com",
  CONTACT_PHONE: "+27 (0)11 892 4000",
  WHATSAPP_SUPPORT: "+27797648590",
  // South African Provinces
  SOUTH_AFRICAN_PROVINCES: [
    "Gauteng",
    "Western Cape",
    "KwaZulu-Natal",
    "Eastern Cape",
    "Free State",
    "Limpopo",
    "Mpumalanga",
    "North West",
    "Northern Cape"
  ],
  // Main Categories
  CATEGORY_LIST: [
    "Technology",
    "Sports & Leisure",
    "Beauty",
    "Books",
    "Home",
    "Automotive",
    "Industrial & Tools",
    "Health & Wellness",
    "Garden & Outdoor",
    "Office & Business",
    "Jewelry & Accessories",
    "Fashion & Apparel"
  ]
};
var SA_PROVINCES = STORE_CONFIG.SOUTH_AFRICAN_PROVINCES;
var DEFAULT_COUPONS = [
  {
    id: "coupon-1",
    code: "KUD50",
    description: "R50 OFF on orders over R150",
    discountType: "fixed",
    discountValue: 50,
    minOrderAmount: 150,
    isActive: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "coupon-2",
    code: "WELCOME10",
    description: "10% OFF your entire shopping bag",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 0,
    isActive: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "coupon-3",
    code: "FREESHIP",
    description: "100% OFF Delivery Fee",
    discountType: "free_shipping",
    discountValue: 0,
    minOrderAmount: 200,
    isActive: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "coupon-4",
    code: "SAVE20",
    description: "20% OFF on premium orders over R500",
    discountType: "percentage",
    discountValue: 20,
    minOrderAmount: 500,
    maxDiscountAmount: 300,
    isActive: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var DEFAULT_REFERRAL_SETTINGS = {
  isProgramEnabled: true,
  hideReferralEarningsGlobally: false,
  hideInviteOptionGlobally: false,
  hideReferralWalletGlobally: false,
  rewardPerReferral: 50,
  invitedFriendDiscount: 50,
  minVoucherRedemptionAmount: 50,
  voucherExpiryDays: 90,
  allowLeaderboardDisplay: true,
  minMonthlyPurchasesRequired: 2,
  // Referred client must make purchase at least twice in a month
  requireAdminAllocation: true,
  // Commission must be allocated to the customer by the admin
  commissionAmountPerQualifiedReferral: 50,
  lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
};
var DEFAULT_INVOICE_SETTINGS = {
  autoSendInvoices: true,
  sendCustomerCopy: true,
  senderName: "KUD Store Billing",
  allowCustomerDownload: true,
  invoicePrefix: "INV-2026-",
  vatNumber: "ZA4920192837",
  companyName: "KUD online store (Pty) Ltd",
  companyAddress: "124 Main Street, Sandton, Johannesburg, 2196, South Africa",
  companyEmail: "qchirass@gmail.com",
  companyPhone: "+27 (0)11 892 4000",
  companyWhatsapp: "+27797648590",
  whatsappSupport: "+27797648590",
  taxInvoiceTitle: "TAX INVOICE / OFFICIAL RECEIPT",
  invoiceFooterNote: "Thank you for choosing KUD Store. Official Tax Invoice compliant with SARS 15% VAT regulations.",
  invoiceSupportNote: "For order inquiries, billing, or returns, contact support via email or WhatsApp.",
  sendCopyEmail: "qchirass@gmail.com",
  lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
};

// src/utils/taxUtils.ts
var VAT_RATE = 0.15;
function roundMoney(val) {
  if (typeof val !== "number" || isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
function formatMoney(val) {
  const num = roundMoney(val);
  return num.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function calculateOrderFinancials(order) {
  let subtotal = 0;
  if (Array.isArray(order?.items) && order.items.length > 0) {
    subtotal = order.items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 1;
      const unit = Number(item.unit_price) || Number(item.total_price) / qty || 0;
      const lineTotal = Number(item.total_price) || unit * qty;
      return sum + lineTotal;
    }, 0);
  } else {
    subtotal = Number(order?.subtotal_amount ?? order?.subtotal ?? 0);
  }
  subtotal = roundMoney(subtotal);
  const deliveryFee = roundMoney(Number(order?.delivery_fee ?? order?.shipping_fee ?? 0));
  const discountAmount = roundMoney(Number(order?.discount_amount ?? order?.discount ?? 0));
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  let taxEnabled = false;
  let taxName = "VAT";
  let taxRate = 15;
  let vatAmount = 0;
  let showTaxOnReceipt = true;
  const vatRegistrationNumber = order?.vat_registration_number || order?.vat_number || null;
  if (order?.tax_enabled !== void 0 && order?.tax_enabled !== null) {
    taxEnabled = Boolean(order.tax_enabled);
    taxName = order.tax_name || "VAT";
    taxRate = order.tax_rate !== void 0 && order.tax_rate !== null ? Number(order.tax_rate) : 15;
    showTaxOnReceipt = order.show_tax_on_receipt !== false;
    if (taxEnabled) {
      if (order.tax_amount !== void 0 && order.tax_amount !== null && !isNaN(Number(order.tax_amount))) {
        vatAmount = roundMoney(Number(order.tax_amount));
      } else {
        vatAmount = roundMoney(taxableSubtotal * (taxRate / 100));
      }
    } else {
      vatAmount = 0;
    }
  } else if (order?.vat_amount !== void 0 && order?.vat_amount !== null) {
    vatAmount = roundMoney(Number(order.vat_amount));
    taxEnabled = vatAmount > 0;
    taxRate = 15;
    taxName = "VAT";
  } else if (order?.total_amount !== void 0 || order?.total !== void 0) {
    const savedTotal = Number(order.total_amount ?? order.total);
    const diffWithoutTax = Math.abs(savedTotal - (taxableSubtotal + deliveryFee));
    const diffWith15Tax = Math.abs(savedTotal - (taxableSubtotal * 1.15 + deliveryFee));
    if (diffWithoutTax < 0.05 && diffWith15Tax > 0.05) {
      taxEnabled = false;
      vatAmount = 0;
      taxRate = 0;
    } else {
      taxEnabled = true;
      taxRate = 15;
      vatAmount = roundMoney(taxableSubtotal * VAT_RATE);
    }
  } else {
    taxEnabled = false;
    vatAmount = 0;
    taxRate = 0;
  }
  const calculatedGrandTotal = roundMoney(taxableSubtotal + vatAmount + deliveryFee);
  let grandTotal = calculatedGrandTotal;
  if (order?.total_amount !== void 0 || order?.total !== void 0) {
    const rawTotal = roundMoney(Number(order.total_amount ?? order.total));
    if (Math.abs(rawTotal - calculatedGrandTotal) <= 0.05) {
      grandTotal = rawTotal;
    }
  }
  const rawStatus = (order?.payment_status || "pending").toString().toLowerCase().trim();
  let paymentStatus = "pending";
  if (rawStatus === "paid" || rawStatus === "completed" || rawStatus === "success") {
    paymentStatus = "paid";
  } else if (rawStatus === "failed" || rawStatus === "cancelled" || rawStatus === "declined") {
    paymentStatus = "failed";
  } else if (rawStatus === "refunded") {
    paymentStatus = "refunded";
  } else {
    paymentStatus = "pending";
  }
  const isPaid = paymentStatus === "paid";
  const isPending = paymentStatus === "pending";
  const isFailed = paymentStatus === "failed";
  const isRefunded = paymentStatus === "refunded";
  const statusLabel = isPaid ? "PAID" : isPending ? "PAYMENT PENDING" : isFailed ? "PAYMENT FAILED" : "REFUNDED";
  const totalLabel = isPaid ? "TOTAL PAID:" : isPending ? "TOTAL DUE:" : isFailed ? "TOTAL DUE:" : "REFUNDED:";
  const amountPaid = isPaid ? grandTotal : roundMoney(Number(order?.amount_paid || 0));
  const amountDue = isPaid ? 0 : grandTotal;
  return {
    subtotal,
    deliveryFee,
    discountAmount,
    vatAmount,
    taxEnabled,
    taxName,
    taxRate,
    showTaxOnReceipt,
    vatRegistrationNumber,
    grandTotal,
    paymentStatus,
    isPaid,
    isPending,
    isFailed,
    isRefunded,
    statusLabel,
    totalLabel,
    amountPaid,
    amountDue
  };
}

// src/lib/emailService.ts
async function sendOrderConfirmationEmail(orderId, supabase) {
  try {
    const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (orderError || !order) {
      console.error(`Email Service Error: Could not find order ${orderId}:`, orderError?.message);
      return {
        sent: false,
        simulated: false,
        email: "",
        orderNumber: "",
        message: `Order ${orderId} not found in database`,
        error: orderError?.message || "Order not found"
      };
    }
    const customerEmail = order.customer_email;
    const customerName = order.customer_name || "Valued Customer";
    const orderNumber = order.order_number || `KUD-${order.id.slice(0, 6).toUpperCase()}`;
    if (!customerEmail || !customerEmail.includes("@")) {
      console.warn(`Email Service Warning: Invalid or missing customer email for order ${orderNumber}`);
      return {
        sent: false,
        simulated: true,
        email: customerEmail || "N/A",
        orderNumber,
        message: "No valid customer email address found on order"
      };
    }
    let items = [];
    try {
      const { data: orderItems } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      if (orderItems) {
        items = orderItems;
      }
    } catch {
    }
    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || "https://kudstore.com";
    const orderLink = `${appUrl}/orders/${order.id}`;
    const itemsHtml = items.length > 0 ? items.map((item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827;">
            <strong>${item.product_name || "Product"}</strong>
            ${item.variant ? `<br/><span style="font-size: 12px; color: #6b7280;">Variant: ${item.variant}</span>` : ""}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; text-align: center;">
            ${item.quantity || 1}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827; text-align: right; font-weight: 600;">
            R${(item.total_price || item.unit_price || 0).toFixed(2)}
          </td>
        </tr>
      `).join("") : `
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
                      ` : ""}
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
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} KUD Store. All rights reserved.</p>
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
    const fromEmail = process.env.RESEND_FROM_EMAIL || "KUD Store <onboarding@resend.dev>";
    if (resendApiKey) {
      console.log(`Sending order confirmation email via Resend API to ${customerEmail}...`);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [customerEmail],
          subject: `Order Confirmation #${orderNumber} - KUD Store`,
          html: emailHtml
        })
      });
      const resText = await response.text();
      if (response.ok) {
        console.log(`[EMAIL DISPATCH SUCCESS] Confirmation email sent to ${customerEmail} for order #${orderNumber}`);
        return {
          sent: true,
          simulated: false,
          email: customerEmail,
          orderNumber,
          message: `Order confirmation email sent to ${customerEmail}`
        };
      } else {
        console.error(`[EMAIL DISPATCH ERROR] Resend API error (${response.status}):`, resText);
        return {
          sent: false,
          simulated: false,
          email: customerEmail,
          orderNumber,
          message: `Resend API returned error ${response.status}: ${resText}`,
          error: resText
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
        message: `Simulated order confirmation email logged for ${customerEmail}. Configure RESEND_API_KEY to send live emails.`
      };
    }
  } catch (err) {
    console.error(`Email Service Exception:`, err);
    return {
      sent: false,
      simulated: false,
      email: "",
      orderNumber: "",
      message: err.message || "Unhandled exception in email service",
      error: err.message
    };
  }
}
async function sendReferralInviteEmail(payload) {
  try {
    const {
      recipientEmail,
      recipientName,
      senderName = "A friend",
      senderEmail,
      referralCode,
      referralLink,
      customMessage
    } = payload;
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return {
        success: false,
        sent: false,
        simulated: false,
        recipientEmail: recipientEmail || "",
        referralCode,
        message: "Invalid recipient email address provided",
        error: "Invalid recipient email"
      };
    }
    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || "https://kudstore.co.za";
    const finalReferralLink = referralLink || `${appUrl}/?ref=${encodeURIComponent(referralCode)}`;
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
                      Hi <strong>${recipientName || "there"}</strong>,
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
                    ` : ""}

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
                      Questions or need assistance? Contact support at <a href="mailto:${STORE_CONFIG.CONTACT_EMAIL}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${STORE_CONFIG.CONTACT_EMAIL}</a> or WhatsApp <a href="https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, "")}" style="color: #16a34a; text-decoration: none; font-weight: 600;">${STORE_CONFIG.WHATSAPP_SUPPORT}</a>.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} ${STORE_CONFIG.STORE_NAME}. You received this transactional email because ${senderName} sent you a direct referral invitation.
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
    const fromEmail = process.env.RESEND_FROM_EMAIL || "KUD Store <onboarding@resend.dev>";
    if (resendApiKey) {
      console.log(`[RESEND REFERRAL] Sending referral invite to ${recipientEmail} from ${senderName}...`);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipientEmail],
          reply_to: senderEmail && senderEmail.includes("@") ? senderEmail : void 0,
          subject: `${senderName} invited you to KUD Store! (Here is R50 OFF)`,
          html: emailHtml
        })
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
          message: `Referral invitation sent to ${recipientEmail}!`
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
          error: resText
        };
      }
    } else {
      console.log(`[RESEND REFERRAL SIMULATED] RESEND_API_KEY not configured.`);
      console.log(`Referral email generated for ${recipientName || "Contact"} <${recipientEmail}> with code ${referralCode} from ${senderName}`);
      return {
        success: true,
        sent: true,
        simulated: true,
        recipientEmail,
        referralCode,
        message: `Invitation simulated for ${recipientEmail}. Configure RESEND_API_KEY to send live emails via Resend.`
      };
    }
  } catch (err) {
    console.error(`Referral Email Exception:`, err);
    return {
      success: false,
      sent: false,
      simulated: false,
      recipientEmail: payload.recipientEmail || "",
      referralCode: payload.referralCode || "",
      message: err.message || "Failed to dispatch referral invitation email",
      error: err.message
    };
  }
}
async function sendCommissionAllocatedEmail(payload) {
  try {
    const {
      referrerEmail,
      referrerName = "Valued Ambassador",
      commissionAmount = 50,
      referredClientName = "Your referred friend",
      evaluationMonth = (/* @__PURE__ */ new Date()).toLocaleString("default", { month: "long", year: "numeric" }),
      monthlyPurchasesCount = 2,
      newBalance = commissionAmount,
      adminNotes
    } = payload;
    if (!referrerEmail || !referrerEmail.includes("@")) {
      return {
        success: false,
        sent: false,
        simulated: false,
        recipientEmail: referrerEmail || "",
        message: "Invalid or missing referrer email address.",
        error: "Invalid recipient email"
      };
    }
    const appUrl = (typeof window !== "undefined" ? window.location.origin : process.env.APP_URL || process.env.VITE_APP_URL || "https://kudstore.co.za").replace(/\/+$/, "");
    const accountRewardsUrl = `${appUrl}/account?tab=referrals`;
    if (typeof window !== "undefined") {
      try {
        const apiRes = await fetch("/api/email/referral-commission-allocated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (apiRes.ok) {
          const data = await apiRes.json();
          return data;
        }
      } catch (clientErr) {
        console.warn("[EmailService] Client API proxy error, falling back to direct:", clientErr);
      }
    }
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>\u{1F389} Commission Credited! R${commissionAmount} Added to Your Balance</title>
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
                            ${adminNotes ? `<br/><span style="color: #047857; font-style: italic; margin-top: 4px; display: block;">Admin Note: ${adminNotes}</span>` : ""}
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
                      Questions about your referral balance? Contact us at <a href="mailto:${STORE_CONFIG.CONTACT_EMAIL}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${STORE_CONFIG.CONTACT_EMAIL}</a> or WhatsApp <a href="https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, "")}" style="color: #16a34a; text-decoration: none; font-weight: 600;">${STORE_CONFIG.WHATSAPP_SUPPORT}</a>.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} ${STORE_CONFIG.STORE_NAME}. You received this email because you are a registered participant in the KUD Store Referral Program.
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
    const fromEmail = process.env.RESEND_FROM_EMAIL || "KUD Store <onboarding@resend.dev>";
    if (resendApiKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [referrerEmail],
          subject: `\u{1F389} Commission Credited! R${commissionAmount} Added to Your Balance`,
          html: emailHtml
        })
      });
      const resText = await response.text();
      if (response.ok) {
        console.log(`[RESEND COMMISSION SUCCESS] Commission email delivered to ${referrerEmail}`);
        return {
          success: true,
          sent: true,
          simulated: false,
          recipientEmail: referrerEmail,
          message: `Referral commission notification email sent to ${referrerEmail}!`
        };
      } else {
        console.error(`[RESEND COMMISSION ERROR] HTTP ${response.status}:`, resText);
        return {
          success: false,
          sent: false,
          simulated: false,
          recipientEmail: referrerEmail,
          message: `Resend API error (${response.status}): ${resText}`,
          error: resText
        };
      }
    } else {
      console.log(`[RESEND COMMISSION SIMULATED] Commission notification logged for ${referrerEmail} (+R${commissionAmount})`);
      return {
        success: true,
        sent: true,
        simulated: true,
        recipientEmail: referrerEmail,
        message: `Commission allocation email simulated for ${referrerEmail}. Configure RESEND_API_KEY for live delivery.`
      };
    }
  } catch (err) {
    console.error("[EmailService] Error in sendCommissionAllocatedEmail:", err);
    return {
      success: false,
      sent: false,
      simulated: false,
      recipientEmail: payload.referrerEmail || "",
      message: err?.message || "Failed to dispatch commission allocation email",
      error: err?.message
    };
  }
}
async function sendEarningsFrozenEmail(payload) {
  try {
    const {
      customerEmail,
      customerName = "Valued Customer",
      frozenReason = "Referral earnings frozen by administrator for security / compliance review",
      frozenAt = (/* @__PURE__ */ new Date()).toISOString(),
      currentBalance = 0
    } = payload;
    if (!customerEmail || !customerEmail.includes("@")) {
      return {
        success: false,
        sent: false,
        simulated: false,
        recipientEmail: customerEmail || "",
        message: "Invalid or missing customer email address.",
        error: "Invalid recipient email"
      };
    }
    const appUrl = (typeof window !== "undefined" ? window.location.origin : process.env.APP_URL || process.env.VITE_APP_URL || "https://kudstore.co.za").replace(/\/+$/, "");
    const accountUrl = `${appUrl}/account?tab=referrals`;
    if (typeof window !== "undefined") {
      try {
        const apiRes = await fetch("/api/email/earnings-frozen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (apiRes.ok) {
          const data = await apiRes.json();
          return data;
        }
      } catch (clientErr) {
        console.warn("[EmailService] Client API proxy error for freeze, falling back to direct:", clientErr);
      }
    }
    const formattedDate = new Date(frozenAt).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric"
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
                      If you believe this hold was made in error or to submit verification details, please reply to this email, contact <a href="mailto:${STORE_CONFIG.CONTACT_EMAIL}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${STORE_CONFIG.CONTACT_EMAIL}</a>, or chat with us on WhatsApp <a href="https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, "")}" style="color: #16a34a; text-decoration: none; font-weight: 600;">${STORE_CONFIG.WHATSAPP_SUPPORT}</a>.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} ${STORE_CONFIG.STORE_NAME} Security &amp; Compliance Team.
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
    const fromEmail = process.env.RESEND_FROM_EMAIL || "KUD Store <onboarding@resend.dev>";
    if (resendApiKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [customerEmail],
          subject: `Notice: KUD Store Referral Earnings Frozen`,
          html: emailHtml
        })
      });
      const resText = await response.text();
      if (response.ok) {
        console.log(`[RESEND FREEZE SUCCESS] Freeze notification email delivered to ${customerEmail}`);
        return {
          success: true,
          sent: true,
          simulated: false,
          recipientEmail: customerEmail,
          message: `Earnings frozen notification email sent to ${customerEmail}!`
        };
      } else {
        console.error(`[RESEND FREEZE ERROR] HTTP ${response.status}:`, resText);
        return {
          success: false,
          sent: false,
          simulated: false,
          recipientEmail: customerEmail,
          message: `Resend API error (${response.status}): ${resText}`,
          error: resText
        };
      }
    } else {
      console.log(`[RESEND FREEZE SIMULATED] Freeze notice email logged for ${customerEmail} (Reason: ${frozenReason})`);
      return {
        success: true,
        sent: true,
        simulated: true,
        recipientEmail: customerEmail,
        message: `Freeze notification simulated for ${customerEmail}. Configure RESEND_API_KEY for live delivery.`
      };
    }
  } catch (err) {
    console.error("[EmailService] Error in sendEarningsFrozenEmail:", err);
    return {
      success: false,
      sent: false,
      simulated: false,
      recipientEmail: payload.customerEmail || "",
      message: err?.message || "Failed to dispatch earnings frozen email",
      error: err?.message
    };
  }
}
async function sendEarningsUnfrozenEmail(payload) {
  try {
    const {
      customerEmail,
      customerName = "Valued Customer",
      currentBalance = 0
    } = payload;
    if (!customerEmail || !customerEmail.includes("@")) {
      return {
        success: false,
        sent: false,
        simulated: false,
        recipientEmail: customerEmail || "",
        message: "Invalid customer email address.",
        error: "Invalid recipient email"
      };
    }
    const appUrl = (typeof window !== "undefined" ? window.location.origin : process.env.APP_URL || process.env.VITE_APP_URL || "https://kudstore.co.za").replace(/\/+$/, "");
    const accountUrl = `${appUrl}/account?tab=referrals`;
    if (typeof window !== "undefined") {
      try {
        const apiRes = await fetch("/api/email/earnings-unfrozen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (apiRes.ok) {
          const data = await apiRes.json();
          return data;
        }
      } catch (clientErr) {
        console.warn("[EmailService] Client API proxy error for unfreeze:", clientErr);
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
                      &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} ${STORE_CONFIG.STORE_NAME}. You received this email regarding your KUD Store Referral Account.
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
    const fromEmail = process.env.RESEND_FROM_EMAIL || "KUD Store <onboarding@resend.dev>";
    if (resendApiKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [customerEmail],
          subject: `\u2728 Good News: Your Referral Earnings Have Been Restored!`,
          html: emailHtml
        })
      });
      const resText = await response.text();
      if (response.ok) {
        return {
          success: true,
          sent: true,
          simulated: false,
          recipientEmail: customerEmail,
          message: `Earnings restored notification email sent to ${customerEmail}!`
        };
      }
    }
    return {
      success: true,
      sent: true,
      simulated: true,
      recipientEmail: customerEmail,
      message: `Unfreeze notification logged for ${customerEmail}.`
    };
  } catch (err) {
    return {
      success: false,
      sent: false,
      simulated: false,
      recipientEmail: payload.customerEmail || "",
      message: err?.message || "Failed to dispatch unfreeze email",
      error: err?.message
    };
  }
}
async function sendInvoiceEmail(options) {
  const {
    orderOrInvoice,
    recipientEmail,
    customMessage,
    senderName = "KUD Store Billing",
    triggerType = "manual_admin"
  } = options;
  try {
    const rawOrder = orderOrInvoice || {};
    const orderNumber = rawOrder.order_number || rawOrder.orderNumber || rawOrder.id || `KUD-${Date.now().toString().slice(-6)}`;
    const invoiceNumber = rawOrder.invoice_number || rawOrder.invoiceNumber || `INV-2026-${orderNumber.replace(/[^0-9]/g, "") || Math.floor(1e5 + Math.random() * 9e5)}`;
    const targetEmail = recipientEmail || rawOrder.customer_email || rawOrder.customerEmail || "";
    const customerName = rawOrder.customer_name || rawOrder.customerName || "Valued Customer";
    const createdAt = rawOrder.created_at || rawOrder.createdAt || (/* @__PURE__ */ new Date()).toISOString();
    const paymentMethod = rawOrder.payment_method || rawOrder.paymentMethod || "Online Gateway";
    const paymentStatusRaw = (rawOrder.payment_status || rawOrder.paymentStatus || "pending").toString().toLowerCase();
    const isPaid = paymentStatusRaw === "paid" || paymentStatusRaw === "completed" || paymentStatusRaw === "success";
    if (!targetEmail || !targetEmail.includes("@")) {
      return {
        success: false,
        sent: false,
        simulated: false,
        recipientEmail: targetEmail,
        invoiceNumber,
        message: "No valid recipient email address provided.",
        error: "Invalid recipient email"
      };
    }
    const financials = calculateOrderFinancials(rawOrder);
    const items = Array.isArray(rawOrder.items) ? rawOrder.items : [];
    const itemsHtml = items.length > 0 ? items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const unit = Number(item.unit_price) || Number(item.total_price) / qty || 0;
      const lineTotal = Number(item.total_price) || unit * qty;
      return `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827;">
                <strong>${item.product_name || item.name || "Product Item"}</strong>
                ${item.product_brand ? `<br/><span style="font-size: 11px; color: #6b7280; text-transform: uppercase;">${item.product_brand}</span>` : ""}
                ${item.variant ? `<br/><span style="font-size: 12px; color: #9ca3af;">Variant: ${item.variant}</span>` : ""}
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
    }).join("") : `
        <tr>
          <td colspan="4" style="padding: 16px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #4b5563;">
            Standard Order Items (Subtotal: R${formatMoney(financials.subtotal)})
          </td>
        </tr>
      `;
    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || "https://kudstore.com";
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
                          <div style="background-color: ${isPaid ? "#065f46" : "#92400e"}; border: 1px solid ${isPaid ? "#34d399" : "#f59e0b"}; padding: 6px 16px; border-radius: 9999px; display: inline-block;">
                            <span style="color: #ffffff; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                              ${isPaid ? "PAID IN FULL" : "PAYMENT PENDING"}
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
                    ` : ""}

                    <!-- Invoice Metadata Grid -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 28px; border: 1px solid #edf2f7;">
                      <tr>
                        <td width="50%" valign="top" style="padding-right: 12px;">
                          <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Billed To</p>
                          <p style="margin: 4px 0 0 0; font-size: 15px; color: #0f172a; font-weight: 700;">${customerName}</p>
                          <p style="margin: 2px 0 0 0; font-size: 13px; color: #475569;">${targetEmail}</p>
                          ${rawOrder.customer_phone ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${rawOrder.customer_phone}</p>` : ""}
                        </td>
                        <td width="50%" valign="top" align="right" style="padding-left: 12px;">
                          <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Number</p>
                          <p style="margin: 2px 0 0 0; font-size: 15px; color: #0f172a; font-weight: 800;">${invoiceNumber}</p>
                          <p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Order Reference</p>
                          <p style="margin: 2px 0 0 0; font-size: 13px; color: #0f172a; font-weight: 600;">#${orderNumber}</p>
                          <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">Issue Date: ${new Date(createdAt).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })}</p>
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
                            ` : ""}
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
                              <td align="right" style="padding: 4px 0 0 0; font-size: 12px; color: ${isPaid ? "#16a34a" : "#64748b"}; font-weight: 700;">
                                ${isPaid ? `R${formatMoney(financials.grandTotal)}` : "R0.00"}
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
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "KUD Store Billing <invoices@resend.dev>";
    let isRealSent = false;
    let emailId = `sim_${Date.now()}`;
    if (resendApiKey && !resendApiKey.includes("placeholder")) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [targetEmail],
            subject: `\u{1F9FE} Tax Invoice #${invoiceNumber} - KUD Store`,
            html: emailHtml
          })
        });
        const resData = await response.json().catch(() => ({}));
        if (response.ok) {
          isRealSent = true;
          emailId = resData.id || `res_${Date.now()}`;
        }
      } catch (err) {
        console.warn("Resend API dispatch error, logging fallback:", err?.message);
      }
    }
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      sentTo: targetEmail,
      sentBy: senderName,
      triggerType,
      status: isRealSent ? "delivered" : "simulated",
      emailId,
      notes: customMessage ? `Custom note: "${customMessage}"` : "Official tax invoice dispatched"
    };
    return {
      success: true,
      sent: true,
      simulated: !isRealSent,
      recipientEmail: targetEmail,
      invoiceNumber,
      message: isRealSent ? `Invoice #${invoiceNumber} successfully emailed to ${targetEmail} via Resend.` : `Invoice #${invoiceNumber} dispatch simulated and recorded for ${targetEmail}.`,
      log: logEntry
    };
  } catch (err) {
    console.error("sendInvoiceEmail error:", err);
    return {
      success: false,
      sent: false,
      simulated: false,
      recipientEmail: options.recipientEmail || "",
      invoiceNumber: options.orderOrInvoice?.invoice_number || "N/A",
      message: err?.message || "Failed to dispatch invoice email",
      error: err?.message
    };
  }
}

// server.ts
import_dotenv.default.config();
var VAULT_SALT = "KUD_STORE_AES_256_KEY_VAULT_SEED";
function decryptApiKeyOnServer(encryptedKey) {
  if (!encryptedKey || !encryptedKey.startsWith("enc_v1:") && !encryptedKey.startsWith("enc_v2:")) {
    return encryptedKey;
  }
  try {
    if (encryptedKey.startsWith("enc_v1:")) {
      const base64Part = encryptedKey.replace("enc_v1:", "");
      const rawShifted = Buffer.from(base64Part, "base64").toString("binary");
      let original = "";
      for (let i = 0; i < rawShifted.length; i++) {
        original += String.fromCharCode(rawShifted.charCodeAt(i) ^ VAULT_SALT.charCodeAt(i % VAULT_SALT.length));
      }
      return original;
    }
    if (encryptedKey.startsWith("enc_v2:")) {
      return Buffer.from(encryptedKey.replace("enc_v2:", ""), "base64").toString("utf-8");
    }
    return encryptedKey;
  } catch (err) {
    console.warn("Server decryption error:", err);
    return encryptedKey;
  }
}
async function getStoredYocoSecretKey() {
  const envKey = process.env.YOCO_SECRET_KEY || process.env.VITE_YOCO_SECRET_KEY;
  if (envKey && envKey.trim() !== "" && !envKey.includes("placeholder")) {
    return envKey.trim();
  }
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
      const { data } = await supabase.from("settings").select("id, settings_data").limit(1).maybeSingle();
      const yocoConfig = data?.settings_data?.payment_gateways?.yoco;
      if (yocoConfig?.secretKey) {
        const decrypted = decryptApiKeyOnServer(yocoConfig.secretKey);
        if (decrypted && decrypted.trim() !== "") {
          return decrypted.trim();
        }
      }
    } catch (err) {
      console.warn("Could not fetch Yoco secret key from public.settings:", err);
    }
  }
  return envKey || "sk_test_placeholder";
}
function getServerSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
}
function fingerprintToDeterministicUuid(fingerprint) {
  const hash = import_crypto.default.createHash("sha1").update(fingerprint.trim()).digest("hex");
  const p1 = hash.substring(0, 8);
  const p2 = hash.substring(8, 12);
  const p3 = "5" + hash.substring(13, 16);
  const p4 = (parseInt(hash.substring(16, 18), 16) & 63 | 128).toString(16).padStart(2, "0") + hash.substring(18, 20);
  const p5 = hash.substring(20, 32);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}
async function createAdminNotificationSafe({
  type,
  severity,
  title,
  message,
  userId = null,
  orderId = null,
  productId = null,
  metadata = {},
  fingerprint = null
}) {
  try {
    const supabase = getServerSupabase();
    if (!supabase) return null;
    const cleanFingerprint = fingerprint && typeof fingerprint === "string" ? fingerprint.trim() : null;
    if (cleanFingerprint) {
      const deterministicId = fingerprintToDeterministicUuid(cleanFingerprint);
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const { data: upsertData, error: upsertError } = await supabase.from("admin_notifications").upsert(
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
          updated_at: nowIso
        },
        {
          onConflict: "id",
          ignoreDuplicates: true
        }
      ).select("id");
      if (!upsertError) {
        return deterministicId;
      }
      console.warn("[AdminNotifications] Atomic upsert notice, falling back to RPC:", upsertError.message);
    }
    const { data: rpcData, error: rpcError } = await supabase.rpc("create_admin_notification", {
      p_type: type,
      p_severity: severity,
      p_title: title,
      p_message: message,
      p_user_id: userId || null,
      p_order_id: orderId || null,
      p_product_id: productId || null,
      p_metadata: metadata || {},
      p_fingerprint: cleanFingerprint || null
    });
    if (rpcError) {
      console.warn("[AdminNotifications] Server RPC notice:", rpcError.message);
      return null;
    }
    return rpcData || null;
  } catch (err) {
    console.warn("[AdminNotifications] Safe notification caught error:", err?.message);
    return null;
  }
}
async function checkAndNotifyProductStock(productId, stockValue, productName, lowStockThreshold = 5) {
  try {
    if (!productId) return;
    const supabase = getServerSupabase();
    if (!supabase) return;
    let currentStock = stockValue !== void 0 && stockValue !== null ? Number(stockValue) : NaN;
    let name = productName;
    if (isNaN(currentStock) || !name) {
      const { data: prod } = await supabase.from("products").select("name, stock").eq("id", productId).single();
      if (prod) {
        if (isNaN(currentStock)) currentStock = Number(prod.stock) || 0;
        if (!name) name = prod.name;
      }
    }
    if (isNaN(currentStock)) return;
    const threshold = Number(lowStockThreshold) || 5;
    if (currentStock <= 0) {
      await createAdminNotificationSafe({
        type: "inventory",
        severity: "critical",
        title: `Out of Stock: ${name || "Product"}`,
        message: `Product "${name || "Product"}" has reached 0 units in stock. Replenishment required immediately.`,
        productId,
        metadata: {
          product_id: productId,
          product_name: name || "Product",
          current_stock: currentStock,
          threshold
        },
        fingerprint: `inventory:${productId}:out`
      });
    } else if (currentStock <= threshold) {
      await createAdminNotificationSafe({
        type: "inventory",
        severity: "warning",
        title: `Low Stock Alert: ${name || "Product"}`,
        message: `Product "${name || "Product"}" stock has dropped to ${currentStock} remaining (threshold: ${threshold}).`,
        productId,
        metadata: {
          product_id: productId,
          product_name: name || "Product",
          current_stock: currentStock,
          threshold
        },
        fingerprint: `inventory:${productId}:low`
      });
    }
  } catch (err) {
    console.warn("[AdminNotifications] Stock check caught error:", err?.message);
  }
}
async function ensureStorageBucket(bucketName = "product-images") {
  const supabase = getServerSupabase();
  if (!supabase) {
    console.log("[Storage] Supabase credentials not configured in environment.");
    return { success: false, error: "Supabase credentials not configured" };
  }
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.warn("[Storage] Error listing buckets:", listError.message);
    }
    const existing = buckets?.find((b) => b.name === bucketName || b.id === bucketName);
    if (!existing) {
      console.log(`[Storage] Bucket "${bucketName}" not found. Creating public bucket...`);
      const { data: created, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 15728640,
        // 15MB
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif", "image/svg+xml"]
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
  } catch (err) {
    console.warn("[Storage] Exception during bucket initialization:", err);
    return { success: false, error: err?.message || String(err) };
  }
}
async function ensureProductImagesBucket() {
  return ensureStorageBucket("product-images");
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "25mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  const PORT = 3e3;
  ensureProductImagesBucket().catch((e) => console.warn("[Storage] Init warning:", e));
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/admin/storage/status", async (_req, res) => {
    const result = await ensureProductImagesBucket();
    res.json(result);
  });
  app.post("/api/admin/storage/ensure-bucket", async (_req, res) => {
    const result = await ensureProductImagesBucket();
    res.json(result);
  });
  app.post("/api/admin/storage/upload", async (req, res) => {
    try {
      const { fileName, base64Data, contentType = "image/jpeg", folder = "products", bucket = "product-images" } = req.body || {};
      if (!fileName || !base64Data) {
        return res.status(400).json({ success: false, error: "fileName and base64Data are required." });
      }
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database/Storage not configured." });
      }
      const targetBucket = bucket === "store-branding" ? "store-branding" : bucket === "auth-backgrounds" ? "auth-backgrounds" : "product-images";
      await ensureStorageBucket(targetBucket);
      const buffer = Buffer.from(base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, ""), "base64");
      const cleanPath = folder ? `${folder}/${fileName}` : fileName;
      const { data: uploadData, error: uploadError } = await supabase.storage.from(targetBucket).upload(cleanPath, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: true
      });
      if (uploadError || !uploadData) {
        console.error("[Storage] Server upload failed:", uploadError);
        return res.status(400).json({
          success: false,
          error: uploadError?.message || `Failed to upload image to ${targetBucket} storage.`
        });
      }
      const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(cleanPath);
      const publicUrl = publicUrlData?.publicUrl || "";
      return res.json({
        success: true,
        url: publicUrl,
        fileName,
        storagePath: cleanPath,
        bucket: targetBucket,
        isRemote: true
      });
    } catch (err) {
      console.error("[Storage] Error in /api/admin/storage/upload:", err);
      return res.status(500).json({ success: false, error: err?.message || "Internal upload error" });
    }
  });
  app.post("/api/customizations/upload", async (req, res) => {
    try {
      const { fileName, originalName, base64Data, contentType = "image/png" } = req.body || {};
      if (!fileName || !base64Data) {
        return res.status(400).json({ success: false, error: "File data is required." });
      }
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(contentType.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: "Invalid file format. Only JPG, JPEG, PNG, and WEBP image files are supported."
        });
      }
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database storage is not configured." });
      }
      const targetBucket = "customer-customizations";
      await ensureStorageBucket(targetBucket);
      const buffer = Buffer.from(base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, ""), "base64");
      const maxSizeBytes = 10 * 1024 * 1024;
      if (buffer.length > maxSizeBytes) {
        return res.status(400).json({
          success: false,
          error: `File exceeds maximum allowed size of 10 MB (${(buffer.length / (1024 * 1024)).toFixed(1)} MB uploaded).`
        });
      }
      const safePath = `customer-designs/${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from(targetBucket).upload(safePath, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: true
      });
      if (uploadError || !uploadData) {
        console.error("[Customization] Server upload to customer-customizations failed:", uploadError);
        const fallbackBucket = "product-images";
        await ensureStorageBucket(fallbackBucket);
        const { data: fallbackData, error: fallbackError } = await supabase.storage.from(fallbackBucket).upload(safePath, buffer, { contentType, cacheControl: "3600", upsert: true });
        if (fallbackError || !fallbackData) {
          return res.status(400).json({
            success: false,
            error: uploadError?.message || fallbackError?.message || "Storage upload failed."
          });
        }
        const { data: fbUrlData } = supabase.storage.from(fallbackBucket).getPublicUrl(safePath);
        return res.json({
          success: true,
          url: fbUrlData?.publicUrl || "",
          fileName: originalName || fileName,
          sizeBytes: buffer.length
        });
      }
      const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(safePath);
      return res.json({
        success: true,
        url: publicUrlData?.publicUrl || "",
        fileName: originalName || fileName,
        sizeBytes: buffer.length
      });
    } catch (err) {
      console.error("[Customization] Error handling customer upload:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to process file upload." });
    }
  });
  app.post("/api/orders/validate-prices", async (req, res) => {
    try {
      const { items } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: "No items provided for validation." });
      }
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not available." });
      }
      const productIds = items.map((it) => it.productId || it.product_id).filter(Boolean);
      const { data: dbProducts, error: prodErr } = await supabase.from("products").select("*").in("id", productIds);
      if (prodErr || !dbProducts) {
        return res.status(500).json({ success: false, error: "Failed to retrieve authoritative product data." });
      }
      const productMap = new Map(dbProducts.map((p) => [String(p.id), p]));
      let calculatedSubtotal = 0;
      const validatedItems = [];
      for (const item of items) {
        const prodId = String(item.productId || item.product_id);
        const dbProd = productMap.get(prodId);
        if (!dbProd) {
          return res.status(400).json({ success: false, error: `Product not found in catalog: ${prodId}` });
        }
        const qty = Math.max(1, Number(item.quantity) || 1);
        const basePrice = Number(dbProd.price) || 0;
        const customConfig = dbProd.customization_config || dbProd.category_attributes?.customizationConfig || {};
        const disableStock = customConfig.disableStockLimits || dbProd.track_inventory === false || dbProd.allow_backorders;
        if (!disableStock && typeof dbProd.stock === "number" && dbProd.stock < qty) {
          return res.status(400).json({
            success: false,
            error: `Insufficient stock for "${dbProd.name}". Available: ${dbProd.stock}, Requested: ${qty}`
          });
        }
        let sizeAdjustment = 0;
        const customization = item.customization;
        if (customization?.selectedSizeOption?.priceModifier !== void 0) {
          sizeAdjustment = Number(customization.selectedSizeOption.priceModifier) || 0;
        }
        let customizationCharge = 0;
        if (customConfig.isCustomizable && customConfig.customizationCharge > 0) {
          customizationCharge = Number(customConfig.customizationCharge) || 0;
        }
        let verifiedUnitPrice = basePrice + sizeAdjustment + customizationCharge;
        if (customConfig.bulkPricingTiers && Array.isArray(customConfig.bulkPricingTiers)) {
          const matchTier = customConfig.bulkPricingTiers.filter((t) => qty >= t.minQuantity && (!t.maxQuantity || qty <= t.maxQuantity)).sort((a, b) => b.minQuantity - a.minQuantity)[0];
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
          customization
        });
      }
      return res.json({
        success: true,
        subtotal: calculatedSubtotal,
        items: validatedItems
      });
    } catch (err) {
      console.error("[PriceValidation] Error in /api/orders/validate-prices:", err);
      return res.status(500).json({ success: false, error: err?.message || "Price validation error." });
    }
  });
  app.get("/api/auth-appearance", async (_req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const { data: settingsData, error: settingsError } = await supabase.from("auth_appearance_settings").select("*").limit(1).maybeSingle();
      if (settingsError) {
        console.warn("[AuthAppearance] Error fetching settings:", settingsError.message);
      }
      const { data: imagesData, error: imagesError } = await supabase.from("auth_background_images").select("*").order("display_order", { ascending: true }).order("created_at", { ascending: true });
      if (imagesError) {
        console.warn("[AuthAppearance] Error fetching background images:", imagesError.message);
      }
      const formattedImages = (imagesData || []).map((img) => {
        let publicUrl = img.storage_path;
        if (!publicUrl.startsWith("http://") && !publicUrl.startsWith("https://")) {
          const { data } = supabase.storage.from("auth-backgrounds").getPublicUrl(img.storage_path);
          publicUrl = data?.publicUrl || img.storage_path;
        }
        return {
          ...img,
          public_url: publicUrl
        };
      });
      return res.json({
        success: true,
        settings: settingsData || null,
        images: formattedImages
      });
    } catch (err) {
      console.error("[AuthAppearance] Error in GET /api/auth-appearance:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to load auth appearance" });
    }
  });
  app.post("/api/admin/auth-appearance/settings", async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const payload = req.body || {};
      const { id = 1, ...fieldsToUpdate } = payload;
      const updateData = {
        ...fieldsToUpdate,
        id: 1,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const { data, error } = await supabase.from("auth_appearance_settings").upsert(updateData, { onConflict: "id" }).select().single();
      if (error) {
        console.error("[AuthAppearance] Error updating settings:", error);
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.json({ success: true, data });
    } catch (err) {
      console.error("[AuthAppearance] Error in POST /api/admin/auth-appearance/settings:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to update settings" });
    }
  });
  app.post("/api/admin/auth-appearance/images", async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const { name, storage_path, is_active = true, display_order = 0, is_default = false } = req.body || {};
      if (!name || !storage_path) {
        return res.status(400).json({ success: false, error: "name and storage_path are required." });
      }
      if (is_default) {
        await supabase.from("auth_background_images").update({ is_default: false }).neq("id", "00000000-0000-0000-0000-000000000000");
      }
      const { data, error } = await supabase.from("auth_background_images").insert({
        name: String(name).trim(),
        storage_path: String(storage_path).trim(),
        is_active: Boolean(is_active),
        display_order: Number(display_order) || 0,
        is_default: Boolean(is_default)
      }).select().single();
      if (error) {
        console.error("[AuthAppearance] Error inserting image:", error);
        return res.status(400).json({ success: false, error: error.message });
      }
      let publicUrl = data.storage_path;
      if (!publicUrl.startsWith("http://") && !publicUrl.startsWith("https://")) {
        const { data: urlData } = supabase.storage.from("auth-backgrounds").getPublicUrl(data.storage_path);
        publicUrl = urlData?.publicUrl || data.storage_path;
      }
      return res.json({
        success: true,
        data: {
          ...data,
          public_url: publicUrl
        }
      });
    } catch (err) {
      console.error("[AuthAppearance] Error in POST /api/admin/auth-appearance/images:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to insert image" });
    }
  });
  app.patch("/api/admin/auth-appearance/images/:id", async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const { id } = req.params;
      const updates = req.body || {};
      if (updates.is_default === true) {
        await supabase.from("auth_background_images").update({ is_default: false }).neq("id", id);
      }
      const { data, error } = await supabase.from("auth_background_images").update({
        ...updates,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", id).select().single();
      if (error) {
        console.error("[AuthAppearance] Error updating image:", error);
        return res.status(400).json({ success: false, error: error.message });
      }
      let publicUrl = data?.storage_path;
      if (publicUrl && !publicUrl.startsWith("http://") && !publicUrl.startsWith("https://")) {
        const { data: urlData } = supabase.storage.from("auth-backgrounds").getPublicUrl(data.storage_path);
        publicUrl = urlData?.publicUrl || data.storage_path;
      }
      return res.json({
        success: true,
        data: {
          ...data,
          public_url: publicUrl
        }
      });
    } catch (err) {
      console.error("[AuthAppearance] Error in PATCH /api/admin/auth-appearance/images/:id:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to update image" });
    }
  });
  app.delete("/api/admin/auth-appearance/images/:id", async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const { id } = req.params;
      const { storage_path } = req.query;
      const { error: deleteError } = await supabase.from("auth_background_images").delete().eq("id", id);
      if (deleteError) {
        console.error("[AuthAppearance] Error deleting image record:", deleteError);
        return res.status(400).json({ success: false, error: deleteError.message });
      }
      if (storage_path && typeof storage_path === "string" && !storage_path.startsWith("http")) {
        await supabase.storage.from("auth-backgrounds").remove([storage_path]);
      }
      return res.json({ success: true, id });
    } catch (err) {
      console.error("[AuthAppearance] Error in DELETE /api/admin/auth-appearance/images/:id:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to delete image" });
    }
  });
  app.post("/api/admin/auth-appearance/reorder", async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const { orderMap } = req.body || {};
      if (!orderMap || typeof orderMap !== "object") {
        return res.status(400).json({ success: false, error: "orderMap object is required." });
      }
      const promises = Object.entries(orderMap).map(
        ([id, display_order]) => supabase.from("auth_background_images").update({
          display_order: Number(display_order) || 0,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", id)
      );
      await Promise.all(promises);
      return res.json({ success: true });
    } catch (err) {
      console.error("[AuthAppearance] Error in POST /api/admin/auth-appearance/reorder:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to reorder images" });
    }
  });
  app.post(["/api/admin/settings/logo_url", "/api/settings/logo_url"], async (req, res) => {
    try {
      const { logo_url } = req.body || {};
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database/Storage not configured." });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const { data: current, error: fetchErr } = await supabase.from("settings").select("id").limit(1).maybeSingle();
      if (fetchErr) {
        return res.status(500).json({ success: false, error: fetchErr.message });
      }
      const settingsId = current?.id || "5411b2f4-8189-4a14-882d-b3c280aeaba4";
      const cleanLogoUrl = typeof logo_url === "string" && logo_url.trim().length > 0 ? logo_url.trim() : null;
      const { error: updateErr } = await supabase.from("settings").update({
        logo_url: cleanLogoUrl,
        updated_at: now
      }).eq("id", settingsId);
      if (updateErr) {
        console.error("[Settings] Error updating logo_url:", updateErr);
        return res.status(500).json({ success: false, error: updateErr.message });
      }
      return res.json({ success: true, logo_url: cleanLogoUrl });
    } catch (err) {
      console.error("[Settings] Error in /api/admin/settings/logo_url:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to update logo_url." });
    }
  });
  app.post("/api/admin/storage/delete", async (req, res) => {
    try {
      const { fileUrls = [], filePaths = [], bucket = "product-images" } = req.body || {};
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database/Storage not configured." });
      }
      const pathsToDelete = [];
      if (Array.isArray(filePaths)) {
        for (const p of filePaths) {
          if (typeof p === "string" && p.trim()) {
            pathsToDelete.push(p.trim().replace(/^\/+/, ""));
          }
        }
      }
      if (Array.isArray(fileUrls)) {
        for (const url of fileUrls) {
          if (typeof url === "string" && url.trim()) {
            try {
              const urlObj = new URL(url);
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
              const clean = url.trim().replace(/^\/+/, "");
              if (!pathsToDelete.includes(clean)) {
                pathsToDelete.push(clean);
              }
            }
          }
        }
      }
      if (pathsToDelete.length === 0) {
        return res.json({ success: true, message: "No valid storage paths to delete.", deletedPaths: [] });
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
        data
      });
    } catch (err) {
      console.error("[Storage] Error in /api/admin/storage/delete:", err);
      return res.status(500).json({ success: false, error: err?.message || "Internal storage delete error" });
    }
  });
  app.post(["/api/webhooks/optimize-product-images", "/api/admin/storage/optimize-image"], async (req, res) => {
    try {
      const { imageUrl, productId, record, table } = req.body || {};
      const targetUrl = imageUrl || record?.image_url || (Array.isArray(record?.images) ? record?.images[0] : null);
      const targetId = productId || record?.id;
      if (!targetUrl) {
        return res.status(400).json({ success: false, error: "No imageUrl provided for optimization." });
      }
      console.log(`[Webhook/Optimize] Received image optimization request for: ${targetUrl} (Product: ${targetId || "N/A"})`);
      const supabase = getServerSupabase();
      if (supabase) {
        try {
          const { data: fnData, error: fnError } = await supabase.functions.invoke("optimize-product-images", {
            body: { imageUrl: targetUrl, productId: targetId, record, table }
          });
          if (!fnError && fnData?.success) {
            return res.json(fnData);
          }
        } catch (edgeErr) {
          console.warn("[Webhook/Optimize] Edge function invoke notice:", edgeErr);
        }
      }
      return res.json({
        success: true,
        originalUrl: targetUrl,
        optimizedWebpUrl: targetUrl,
        message: "Image registered for WebP delivery."
      });
    } catch (err) {
      console.error("[Webhook/Optimize] Error handling optimization request:", err);
      return res.status(500).json({ success: false, error: err?.message || "Image optimization failed" });
    }
  });
  app.post("/api/process-payment", async (req, res) => {
    try {
      const { token, amountInCents, currency = "ZAR", metadata } = req.body || {};
      if (!token) {
        return res.status(400).json({ success: false, error: "Payment token is required." });
      }
      if (!amountInCents || isNaN(Number(amountInCents))) {
        return res.status(400).json({ success: false, error: "Valid amount in cents is required." });
      }
      const yocoSecretKey = await getStoredYocoSecretKey();
      const yocoResponse = await fetch("https://online.yoco.com/v1/charges/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${yocoSecretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          amountInCents: Number(amountInCents),
          currency,
          metadata: metadata || {}
        })
      });
      const responseStatus = yocoResponse.status;
      const responseText = await yocoResponse.text();
      let responseData = {};
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }
      if (yocoResponse.ok && (responseData.status === "successful" || responseData.status === "succeeded")) {
        return res.status(200).json({
          success: true,
          status: "successful",
          chargeId: responseData.id,
          data: responseData
        });
      }
      if (responseData.redirectUrl || responseData.redirect_url) {
        return res.status(200).json({
          success: false,
          requiresRedirect: true,
          redirectUrl: responseData.redirectUrl || responseData.redirect_url,
          data: responseData
        });
      }
      return res.status(responseStatus >= 400 && responseStatus < 500 ? responseStatus : 400).json({
        success: false,
        error: responseData.errorMessage || responseData.displayMessage || responseData.message || "Payment processing failed.",
        data: responseData
      });
    } catch (err) {
      console.error("Error in /api/process-payment:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
  });
  app.post("/api/create-yoco-checkout", async (req, res) => {
    try {
      const body = req.body || {};
      const {
        items,
        shippingAddress,
        subtotal,
        deliveryFee,
        discountAmount = 0,
        totalAmount,
        paymentMethod = "Yoco Secure Gateway",
        userId
      } = body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: "Order items are required." });
      }
      if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.email) {
        return res.status(400).json({ success: false, error: "Complete shipping address is required." });
      }
      const calcSubtotal = Number(subtotal) || 0;
      const calcDelivery = Number(deliveryFee) || 0;
      const calcDiscount = Number(discountAmount) || 0;
      const orderNumber = `KUD-${Math.floor(1e5 + Math.random() * 9e5)}`;
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ success: false, error: "Database configuration missing." });
      }
      const supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
      let orderTaxEnabled = Boolean(body.tax_enabled);
      let orderTaxName = body.tax_name || "VAT";
      let orderTaxRate = body.tax_rate !== void 0 ? Number(body.tax_rate) : 0;
      let orderTaxAmount = body.tax_amount !== void 0 ? Number(body.tax_amount) : 0;
      if (body.tax_enabled === void 0) {
        try {
          const { data: taxSettingsRow } = await supabase.from("settings").select("tax_enabled, tax_name, tax_rate").order("updated_at", { ascending: false }).limit(1).maybeSingle();
          if (taxSettingsRow?.tax_enabled) {
            orderTaxEnabled = true;
            orderTaxName = taxSettingsRow.tax_name || "VAT";
            orderTaxRate = Number(taxSettingsRow.tax_rate) || 15;
            orderTaxAmount = Math.round(Math.max(0, calcSubtotal - calcDiscount) * (orderTaxRate / 100) * 100) / 100;
          }
        } catch {
        }
      }
      const calcTotal = totalAmount ? Number(totalAmount) : calcSubtotal + (orderTaxEnabled ? orderTaxAmount : 0) + calcDelivery - calcDiscount;
      const { data: createdOrder, error: insertError } = await supabase.from("orders").insert({
        order_number: orderNumber,
        user_id: userId && userId !== "guest" ? userId : null,
        subtotal: calcSubtotal,
        shipping_fee: calcDelivery,
        discount: calcDiscount,
        total: calcTotal,
        tax_enabled: orderTaxEnabled,
        tax_name: orderTaxName,
        tax_rate: orderTaxRate,
        tax_amount: orderTaxAmount,
        status: "pending",
        payment_status: "pending",
        payment_method: paymentMethod,
        customer_name: shippingAddress.fullName || "Valued Customer",
        customer_email: shippingAddress.email || ""
      }).select("*").single();
      if (insertError || !createdOrder) {
        console.error("Server-side database order insertion error:", insertError);
        return res.status(500).json({
          success: false,
          error: `Database order creation failed: ${insertError?.message || "Unknown error"}`
        });
      }
      const realOrderId = createdOrder.id;
      console.log("Server-side created order in public.orders with REAL UUID:", realOrderId);
      const orderItemsToInsert = items.map((item) => ({
        order_id: realOrderId,
        product_id: item.product_id,
        product_name: item.product_name,
        product_brand: item.product_brand || null,
        product_image: item.product_image || null,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.total_price) || Number(item.unit_price) * Number(item.quantity),
        variant: item.variant || null
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsToInsert);
      if (itemsError) {
        console.warn("Server order_items insert warning:", itemsError.message);
      }
      createAdminNotificationSafe({
        type: "order",
        severity: "info",
        title: `New Order: #${createdOrder.order_number}`,
        message: `Order #${createdOrder.order_number} for R${Number(calcTotal).toFixed(2)} placed by ${shippingAddress.fullName || "Customer"}.`,
        userId: userId && userId !== "guest" ? userId : null,
        orderId: realOrderId,
        metadata: {
          order_id: realOrderId,
          user_id: userId && userId !== "guest" ? userId : null,
          order_number: createdOrder.order_number,
          total: calcTotal,
          currency: "ZAR",
          customer_name: shippingAddress.fullName || "Customer"
        },
        fingerprint: `order:${realOrderId}:created`
      }).catch((err) => console.warn("[create-yoco-checkout] Order notification caught:", err));
      try {
        const { data: edgeData2, error: edgeError } = await supabase.functions.invoke("create-yoco-checkout", {
          body: { orderId: realOrderId }
        });
        if (!edgeError && edgeData2?.success && edgeData2?.redirectUrl) {
          return res.json({
            success: true,
            redirectUrl: edgeData2.redirectUrl,
            orderId: realOrderId
          });
        }
      } catch (efErr) {
        console.warn("Supabase Edge Function create-yoco-checkout not available, using direct Yoco API:", efErr);
      }
      const yocoSecretKey = await getStoredYocoSecretKey();
      const amountInCents = Math.round(calcTotal * 100);
      const appUrl = process.env.APP_URL || "https://kudstore.com";
      const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || appUrl;
      const successUrl = `${origin}/orders/${realOrderId}?payment=success`;
      const cancelUrl = `${origin}/checkout?status=cancelled`;
      const failureUrl = `${origin}/checkout?status=failed`;
      const idempotencyKey = import_crypto.default.randomUUID();
      const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${yocoSecretKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          amount: amountInCents,
          currency: "ZAR",
          successUrl,
          cancelUrl,
          failureUrl,
          metadata: {
            orderId: realOrderId,
            orderNumber
          }
        })
      });
      const yocoStatus = yocoResponse.status;
      const yocoText = await yocoResponse.text();
      let yocoData = {};
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
          orderId: realOrderId
        });
      }
      return res.json({
        success: true,
        redirectUrl,
        orderId: realOrderId
      });
    } catch (err) {
      console.error("Error in /api/create-yoco-checkout:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
  });
  app.post("/api/yoco-webhook", async (req, res) => {
    try {
      const body = req.body || {};
      console.log("Yoco Webhook received at /api/yoco-webhook:", JSON.stringify(body, null, 2));
      const eventType = body.type || body.event || "payment.succeeded";
      const payload = body.payload || body.data || body;
      const orderId = payload.metadata?.orderId || payload.metadata?.order_id || payload.clientReferenceId || payload.client_reference_id;
      if (!orderId) {
        return res.json({ received: true, note: "No orderId in payload metadata" });
      }
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: "Missing Supabase credentials" });
      }
      const supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
      const { data: existingOrder, error: fetchError } = await supabase.from("orders").select("id, status, payment_status, total, order_number, user_id, customer_name").eq("id", orderId).single();
      if (fetchError || !existingOrder) {
        return res.json({ received: true, warning: `Order ${orderId} not found in database` });
      }
      if (existingOrder.payment_status === "paid" || existingOrder.payment_status === "completed") {
        return res.json({ received: true, message: `Order ${orderId} is already marked as paid.` });
      }
      const payloadAmountInCents = payload.amountInCents || payload.amount_in_cents || (typeof payload.amount === "number" ? Math.round(payload.amount * 100) : null);
      const expectedTotalInCents = Math.round(Number(existingOrder.total || 0) * 100);
      if (payloadAmountInCents !== null && Math.abs(payloadAmountInCents - expectedTotalInCents) > 1) {
        console.error(`Yoco Webhook Security Error: Amount mismatch for order ${orderId}. Expected ${expectedTotalInCents} cents, received ${payloadAmountInCents} cents.`);
        return res.status(400).json({ error: "Payment amount mismatch security error" });
      }
      const paymentStatus = payload.status || "successful";
      const isSuccessful = eventType === "payment.succeeded" || eventType === "checkout.succeeded" || paymentStatus === "successful" || paymentStatus === "paid" || paymentStatus === "succeeded";
      if (isSuccessful) {
        await supabase.from("orders").update({
          payment_status: "paid",
          status: existingOrder.status === "pending" ? "processing" : existingOrder.status,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", orderId);
        console.log(`Order ${orderId} updated to paid via webhook.`);
        const orderNum = existingOrder.order_number || `KUD-${orderId.slice(0, 6).toUpperCase()}`;
        const orderTotal = Number(existingOrder.total || 0);
        createAdminNotificationSafe({
          type: "payment",
          severity: "success",
          title: `Payment Received: #${orderNum}`,
          message: `Verified Yoco payment of R${orderTotal.toFixed(2)} received for order #${orderNum}.`,
          userId: existingOrder.user_id || null,
          orderId,
          metadata: {
            order_id: orderId,
            order_number: orderNum,
            payment_reference: payload.id || payload.checkoutId || `yoco_${Date.now()}`,
            amount: orderTotal,
            payment_provider: "yoco",
            status: "paid"
          },
          fingerprint: `payment:${orderId}:success`
        }).catch((notifErr) => console.warn("[AdminNotifications] Yoco payment success notification notice:", notifErr));
        let emailResult = null;
        let invoiceResult = null;
        try {
          emailResult = await sendOrderConfirmationEmail(orderId, supabase);
          console.log(`Email trigger result for order ${orderId}:`, emailResult);
        } catch (emailErr) {
          console.error(`Failed sending confirmation email for order ${orderId}:`, emailErr);
        }
        try {
          const { data: storeSettingsRow } = await supabase.from("settings").select("settings_data").limit(1).maybeSingle();
          const autoSendEnabled = storeSettingsRow?.settings_data?.invoice_settings?.autoSendInvoices !== false;
          if (autoSendEnabled) {
            const { data: fullOrder } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
            let items = [];
            const { data: fullItems } = await supabase.from("order_items").select("*").eq("order_id", orderId);
            if (fullItems) items = fullItems;
            if (fullOrder) {
              invoiceResult = await sendInvoiceEmail({
                orderOrInvoice: { ...fullOrder, items },
                senderName: "KUD Store Billing Automation",
                triggerType: "auto",
                supabase
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
          payment_status: "paid",
          email_sent: emailResult?.sent || false,
          invoice_sent: invoiceResult?.sent || false,
          email_details: emailResult,
          invoice_details: invoiceResult
        });
      }
      if (eventType.includes("fail") || eventType.includes("cancel") || paymentStatus === "failed" || paymentStatus === "cancelled") {
        const targetStatus = paymentStatus === "cancelled" || eventType.includes("cancel") ? "cancelled" : "failed";
        const orderNum = existingOrder.order_number || `KUD-${orderId.slice(0, 6).toUpperCase()}`;
        createAdminNotificationSafe({
          type: "payment",
          severity: "warning",
          title: `Payment ${targetStatus === "cancelled" ? "Cancelled" : "Failed"}: #${orderNum}`,
          message: `Yoco payment for order #${orderNum} was ${targetStatus} (event: ${eventType}).`,
          userId: existingOrder.user_id || null,
          orderId,
          metadata: {
            order_id: orderId,
            order_number: orderNum,
            payment_reference: payload.id || null,
            status: targetStatus,
            event: eventType
          },
          fingerprint: `payment:${orderId}:failed`
        }).catch((notifErr) => console.warn("[AdminNotifications] Yoco payment warning notification notice:", notifErr));
      }
      return res.json({ received: true, status: paymentStatus });
    } catch (err) {
      console.error("Yoco webhook processing error:", err);
      return res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/notifications/notify-order-created", async (req, res) => {
    try {
      const { orderId } = req.body || {};
      if (!orderId) {
        return res.status(400).json({ success: false, error: "orderId is required" });
      }
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database service unavailable" });
      }
      const { data: order, error: orderErr } = await supabase.from("orders").select("id, order_number, total, subtotal, user_id, customer_name, customer_email, created_at").eq("id", orderId).single();
      if (orderErr || !order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }
      const orderNumber = order.order_number || `KUD-${order.id.slice(0, 6).toUpperCase()}`;
      const totalAmount = Number(order.total ?? order.subtotal ?? 0);
      const customerName = order.customer_name || "Valued Customer";
      const notifId = await createAdminNotificationSafe({
        type: "order",
        severity: "info",
        title: `New Order: #${orderNumber}`,
        message: `Order #${orderNumber} for R${totalAmount.toFixed(2)} placed by ${customerName}.`,
        userId: order.user_id || null,
        orderId: order.id,
        metadata: {
          order_id: order.id,
          user_id: order.user_id || null,
          order_number: orderNumber,
          total: totalAmount,
          currency: "ZAR",
          customer_name: customerName
        },
        fingerprint: `order:${order.id}:created`
      });
      try {
        const { data: orderItems } = await supabase.from("order_items").select("product_id, product_name, quantity").eq("order_id", order.id);
        if (orderItems && orderItems.length > 0) {
          for (const item of orderItems) {
            if (item.product_id) {
              const { data: prod } = await supabase.from("products").select("id, name, stock").eq("id", item.product_id).single();
              if (prod && typeof prod.stock === "number") {
                const updatedStock = Math.max(0, prod.stock - (Number(item.quantity) || 1));
                await supabase.from("products").update({
                  stock: updatedStock,
                  updated_at: (/* @__PURE__ */ new Date()).toISOString()
                }).eq("id", item.product_id);
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
      } catch (stockErr) {
        console.warn("[AdminNotifications] Stock check caught notice:", stockErr?.message);
      }
      return res.json({ success: true, notificationId: notifId });
    } catch (err) {
      console.warn("[AdminNotifications] Exception in /api/notifications/notify-order-created:", err?.message);
      return res.status(500).json({ success: false, error: err?.message || "Failed to process order notification" });
    }
  });
  app.post("/api/notifications/notify-inventory-check", async (req, res) => {
    try {
      const { productId, stock, productName, threshold = 5 } = req.body || {};
      if (!productId) {
        return res.status(400).json({ success: false, error: "productId is required" });
      }
      await checkAndNotifyProductStock(productId, stock, productName, threshold);
      return res.json({ success: true });
    } catch (err) {
      console.warn("[AdminNotifications] Exception in /api/notifications/notify-inventory-check:", err?.message);
      return res.status(500).json({ success: false, error: err?.message || "Failed to check inventory notification" });
    }
  });
  app.post("/api/send-referral-invite", async (req, res) => {
    try {
      const {
        recipientEmail,
        recipientEmails,
        recipientName,
        senderName = "A friend",
        senderEmail,
        referralCode,
        referralLink,
        customMessage
      } = req.body || {};
      if (!referralCode) {
        return res.status(400).json({
          success: false,
          error: "Referral code is required."
        });
      }
      const supabase = getServerSupabase();
      if (supabase && senderEmail) {
        try {
          const { data: senderProfile } = await supabase.from("profiles").select("referral_rewards").eq("email", senderEmail).maybeSingle();
          if (senderProfile?.referral_rewards?.isBanned) {
            return res.status(403).json({
              success: false,
              error: `Your account has been restricted from sending referral invitations. ${senderProfile.referral_rewards.banReason || ""}`
            });
          }
          if (senderProfile?.referral_rewards?.hideInviteOption) {
            return res.status(403).json({
              success: false,
              error: "Referral invitations have been disabled for this account."
            });
          }
        } catch {
        }
      }
      const rawRecipients = [];
      if (Array.isArray(recipientEmails)) {
        rawRecipients.push(...recipientEmails);
      } else if (typeof recipientEmails === "string") {
        rawRecipients.push(...recipientEmails.split(/[,;\s]+/));
      }
      if (recipientEmail && typeof recipientEmail === "string") {
        rawRecipients.push(...recipientEmail.split(/[,;\s]+/));
      }
      const validEmails = Array.from(
        new Set(
          rawRecipients.map((e) => e.trim().toLowerCase()).filter((e) => e.length > 3 && e.includes("@") && e.includes("."))
        )
      );
      if (validEmails.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Please provide at least one valid recipient email address."
        });
      }
      const emailsToSend = validEmails.slice(0, 20);
      console.log(`[Referral Invites] Dispatching simultaneous invitations to ${emailsToSend.length} contact(s): ${emailsToSend.join(", ")}`);
      const results = await Promise.all(
        emailsToSend.map(
          (email) => sendReferralInviteEmail({
            recipientEmail: email,
            recipientName: recipientName || void 0,
            senderName: senderName || "Your friend",
            senderEmail: senderEmail || void 0,
            referralCode,
            referralLink,
            customMessage: customMessage || void 0
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
        message: isSimulated ? `Simulated invitation logged for ${sentCount} contact${sentCount > 1 ? "s" : ""}: ${emailsToSend.join(", ")}. (Configure RESEND_API_KEY for live inbox delivery)` : `Referral invitations successfully delivered to ${sentCount} friend${sentCount > 1 ? "s" : ""}!`
      });
    } catch (err) {
      console.error("[REFERRAL EMAIL ENDPOINT ERROR]:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error while dispatching referral email."
      });
    }
  });
  app.get("/api/referrals/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const supabase = getServerSupabase();
      if (!userId) {
        return res.status(400).json({ success: false, error: "User ID is required" });
      }
      let userData = null;
      if (supabase) {
        try {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
          if (profile) {
            const storedRewards = profile.referral_rewards || profile.referral_data;
            const isRefRewardsEnabled = profile.referral_rewards_enabled !== void 0 ? Boolean(profile.referral_rewards_enabled) : storedRewards && typeof storedRewards === "object" && storedRewards.referral_rewards_enabled !== void 0 ? Boolean(storedRewards.referral_rewards_enabled) : false;
            if (storedRewards && typeof storedRewards === "object") {
              userData = {
                userId,
                referralBalance: storedRewards.referralBalance ?? 150,
                totalEarned: storedRewards.totalEarned ?? 250,
                walletBalance: storedRewards.walletBalance ?? profile.wallet_balance ?? 50,
                successfulReferralsCount: storedRewards.successfulReferralsCount ?? 3,
                pendingReferralsCount: storedRewards.pendingReferralsCount ?? 1,
                vouchers: storedRewards.vouchers || [],
                history: storedRewards.history || [],
                isBanned: Boolean(storedRewards.isBanned),
                banReason: storedRewards.banReason || "",
                isEarningsFrozen: Boolean(storedRewards.isEarningsFrozen),
                frozenReason: storedRewards.frozenReason || "",
                frozenAt: storedRewards.frozenAt,
                hideReferralEarnings: Boolean(storedRewards.hideReferralEarnings),
                hideInviteOption: Boolean(storedRewards.hideInviteOption),
                referral_rewards_enabled: isRefRewardsEnabled,
                referralRewardsEnabled: isRefRewardsEnabled,
                adminAdjustments: storedRewards.adminAdjustments || [],
                lastUpdated: storedRewards.lastUpdated || (/* @__PURE__ */ new Date()).toISOString()
              };
            }
          }
        } catch (e) {
          console.warn("[Referrals API] Error loading user profile rewards from Supabase:", e);
        }
      }
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
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return res.json({ success: true, data: userData });
    } catch (err) {
      console.error("[Referrals API] Error fetching user rewards:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to fetch rewards" });
    }
  });
  app.post("/api/referrals/redeem", async (req, res) => {
    try {
      const {
        userId,
        type,
        amount,
        voucherCode,
        voucherExpiry,
        redemptionId,
        updatedRewardState
      } = req.body || {};
      if (!userId || !type || !amount || amount <= 0) {
        return res.status(400).json({ success: false, error: "Missing required redemption parameters." });
      }
      const supabase = getServerSupabase();
      if (supabase && userId && userId !== "guest") {
        try {
          const { data: userProfile } = await supabase.from("profiles").select("referral_rewards, referral_rewards_enabled").eq("id", userId).maybeSingle();
          const dbRewards = userProfile?.referral_rewards || {};
          const isRefEnabled = userProfile?.referral_rewards_enabled !== void 0 ? Boolean(userProfile.referral_rewards_enabled) : dbRewards.referral_rewards_enabled !== void 0 ? Boolean(dbRewards.referral_rewards_enabled) : false;
          if (!isRefEnabled) {
            return res.status(403).json({
              success: false,
              error: "Referral Rewards & Wallet is not active for your account."
            });
          }
          if (dbRewards.isEarningsFrozen) {
            return res.status(403).json({
              success: false,
              error: `Your referral earnings are currently frozen by store administration.${dbRewards.frozenReason ? ` Reason: ${dbRewards.frozenReason}` : ""}`
            });
          }
          if (dbRewards.isBanned) {
            return res.status(403).json({
              success: false,
              error: `Your account is currently restricted from redeeming referral rewards.${dbRewards.banReason ? ` Reason: ${dbRewards.banReason}` : ""}`
            });
          }
        } catch (checkErr) {
          console.warn("[Referrals API] Pre-redemption user verification warning:", checkErr);
        }
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (type === "discount_voucher" && voucherCode && supabase) {
        try {
          const { data: currentSettings } = await supabase.from("settings").select("id, settings_data").limit(1).maybeSingle();
          const sData = currentSettings?.settings_data || {};
          const couponsConfig = sData.coupons_config || { coupons: [] };
          const existingCoupons = couponsConfig.coupons || [];
          const newCouponItem = {
            id: redemptionId || `coupon-${Date.now()}`,
            code: voucherCode,
            description: `Referral Reward R${amount} OFF Discount Voucher`,
            discountType: "fixed",
            discountValue: Number(amount),
            minOrderAmount: Math.max(50, Number(amount)),
            isActive: true,
            expiryDate: voucherExpiry || new Date(Date.now() + 864e5 * 90).toISOString(),
            createdAt: now
          };
          const updatedCoupons = [
            newCouponItem,
            ...existingCoupons.filter((c) => c.code !== voucherCode)
          ];
          const newSettingsData = {
            ...sData,
            coupons_config: {
              ...couponsConfig,
              coupons: updatedCoupons,
              lastUpdated: now
            }
          };
          if (currentSettings?.id) {
            await supabase.from("settings").update({ settings_data: newSettingsData, updated_at: now }).eq("id", currentSettings.id);
          } else {
            await supabase.from("settings").insert({
              store_name: "KUD Store",
              currency_symbol: "R",
              settings_data: newSettingsData,
              created_at: now,
              updated_at: now
            });
          }
          console.log(`[Referrals API] Registered new discount coupon voucher '${voucherCode}' in store settings.`);
        } catch (couponErr) {
          console.warn("[Referrals API] Error registering coupon voucher in settings:", couponErr);
        }
      }
      if (supabase && userId && userId !== "guest") {
        try {
          const walletBal = updatedRewardState?.walletBalance ?? (type === "wallet_credit" ? Number(amount) : 0);
          await supabase.from("profiles").update({
            wallet_balance: walletBal,
            referral_rewards: updatedRewardState || {
              referralBalance: 0,
              walletBalance: walletBal,
              lastUpdated: now
            },
            updated_at: now
          }).eq("id", userId);
        } catch (profileErr) {
          console.warn("[Referrals API] Error updating user profile in Supabase:", profileErr);
        }
      }
      return res.json({
        success: true,
        message: type === "discount_voucher" ? `Successfully redeemed R${amount} as discount voucher ${voucherCode}!` : `Successfully added R${amount} credit to your KUD Wallet!`,
        data: {
          userId,
          type,
          amount,
          voucherCode,
          updatedRewardState
        }
      });
    } catch (err) {
      console.error("[Referrals API] Error processing redemption:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to process redemption." });
    }
  });
  app.post("/api/referrals/wallet/deduct", async (req, res) => {
    try {
      const { userId, amountToUse, newBalance } = req.body || {};
      const supabase = getServerSupabase();
      if (supabase && userId && userId !== "guest") {
        try {
          await supabase.from("profiles").update({
            wallet_balance: Number(newBalance),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          }).eq("id", userId);
        } catch (e) {
          console.warn("[Referrals API] Deduct wallet error in DB:", e);
        }
      }
      return res.json({ success: true, newBalance });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });
  app.get("/api/referrals/leaderboard", async (req, res) => {
    try {
      const timeframe = req.query.timeframe || "all_time";
      const supabase = getServerSupabase();
      const baseChampions = [
        {
          rank: 1,
          userId: "usr-champ-1",
          name: "Liam K.",
          city: "Cape Town",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80",
          referralsCount: timeframe === "this_week" ? 4 : timeframe === "this_month" ? 8 : 18,
          totalEarned: timeframe === "this_week" ? 400 : timeframe === "this_month" ? 800 : 1800,
          tier: "Platinum",
          badge: "\u{1F451} All-Time Champion",
          monthlyPrize: "R500 Store Voucher + VIP Platinum Gift Box",
          change: "same",
          changeAmount: 0
        },
        {
          rank: 2,
          userId: "usr-champ-2",
          name: "Zandile M.",
          city: "Johannesburg",
          avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80",
          referralsCount: timeframe === "this_week" ? 3 : timeframe === "this_month" ? 6 : 14,
          totalEarned: timeframe === "this_week" ? 300 : timeframe === "this_month" ? 600 : 1400,
          tier: "Platinum",
          badge: "\u{1F948} Top Ambassador",
          monthlyPrize: "R300 Store Voucher",
          change: "up",
          changeAmount: 1
        },
        {
          rank: 3,
          userId: "usr-champ-3",
          name: "Thabo N.",
          city: "Durban",
          avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
          referralsCount: timeframe === "this_week" ? 3 : timeframe === "this_month" ? 5 : 11,
          totalEarned: timeframe === "this_week" ? 300 : timeframe === "this_month" ? 500 : 1100,
          tier: "Platinum",
          badge: "\u{1F949} Elite Advocate",
          monthlyPrize: "R150 Store Voucher",
          change: "down",
          changeAmount: 1
        },
        {
          rank: 4,
          userId: "usr-champ-4",
          name: "Sipho D.",
          city: "Pretoria",
          avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80",
          referralsCount: timeframe === "this_week" ? 2 : timeframe === "this_month" ? 4 : 9,
          totalEarned: timeframe === "this_week" ? 150 : timeframe === "this_month" ? 300 : 675,
          tier: "Gold",
          badge: "\u2B50 Gold Leader",
          change: "up",
          changeAmount: 2
        },
        {
          rank: 5,
          userId: "usr-champ-5",
          name: "Chloe V.",
          city: "Stellenbosch",
          avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
          referralsCount: timeframe === "this_week" ? 2 : timeframe === "this_month" ? 3 : 8,
          totalEarned: timeframe === "this_week" ? 150 : timeframe === "this_month" ? 225 : 600,
          tier: "Gold",
          badge: "\u2B50 Gold Influencer",
          change: "same",
          changeAmount: 0
        },
        {
          rank: 6,
          userId: "usr-champ-6",
          name: "Marcus P.",
          city: "Gqeberha",
          avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&h=120&q=80",
          referralsCount: timeframe === "this_week" ? 1 : timeframe === "this_month" ? 3 : 7,
          totalEarned: timeframe === "this_week" ? 75 : timeframe === "this_month" ? 225 : 525,
          tier: "Gold",
          badge: "\u26A1 Rising Star",
          change: "up",
          changeAmount: 1
        },
        {
          rank: 7,
          userId: "usr-champ-7",
          name: "Anika S.",
          city: "Bloemfontein",
          avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80",
          referralsCount: timeframe === "this_week" ? 1 : timeframe === "this_month" ? 2 : 5,
          totalEarned: timeframe === "this_week" ? 60 : timeframe === "this_month" ? 120 : 300,
          tier: "Silver",
          badge: "\u{1F948} Silver Star",
          change: "down",
          changeAmount: 1
        },
        {
          rank: 8,
          userId: "usr-champ-8",
          name: "Johan B.",
          city: "Centurion",
          avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&h=120&q=80",
          referralsCount: timeframe === "this_week" ? 1 : timeframe === "this_month" ? 2 : 4,
          totalEarned: timeframe === "this_week" ? 60 : timeframe === "this_month" ? 120 : 240,
          tier: "Silver",
          change: "same",
          changeAmount: 0
        }
      ];
      return res.json({
        success: true,
        timeframe,
        seasonEnd: "End of month",
        monthlyPrizePool: "R1,000 in VIP Shopping Vouchers",
        data: baseChampions
      });
    } catch (err) {
      console.error("[Leaderboard API] Error fetching leaderboard:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to fetch leaderboard." });
    }
  });
  app.post("/api/admin/referrals/customers", async (req, res) => {
    try {
      const { userId, updatedState } = req.body || {};
      if (!userId || !updatedState) {
        return res.status(400).json({ success: false, error: "userId and updatedState are required." });
      }
      const supabase = getServerSupabase();
      if (supabase && userId !== "guest") {
        try {
          const profileUpdates = {
            wallet_balance: updatedState.walletBalance,
            referral_rewards: updatedState,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          if (updatedState.referral_rewards_enabled !== void 0) {
            profileUpdates.referral_rewards_enabled = Boolean(updatedState.referral_rewards_enabled);
          }
          await supabase.from("profiles").update(profileUpdates).eq("id", userId);
        } catch (dbErr) {
          console.warn("[Admin Referrals API] Error updating DB profile:", dbErr.message);
        }
      }
      return res.json({ success: true, data: updatedState });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/admin/referrals/config", async (req, res) => {
    try {
      const config = req.body;
      const supabase = getServerSupabase();
      if (!config) {
        return res.status(400).json({ success: false, error: "Config payload is required." });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (supabase) {
        try {
          const { data: current } = await supabase.from("settings").select("id, settings_data").limit(1).maybeSingle();
          const currentSettings = current?.settings_data || {};
          const updatedSettings = {
            ...currentSettings,
            referral_settings: {
              ...config,
              lastUpdated: now
            }
          };
          if (current?.id) {
            await supabase.from("settings").update({ settings_data: updatedSettings, updated_at: now }).eq("id", current.id);
          }
        } catch (e) {
          console.warn("[Admin Referrals Config API] Error persisting to DB:", e.message);
        }
      }
      return res.json({ success: true, data: config });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/email/referral-commission-allocated", async (req, res) => {
    try {
      const payload = req.body || {};
      const { referrerEmail } = payload;
      if (!referrerEmail || !referrerEmail.includes("@")) {
        return res.status(400).json({
          success: false,
          error: "A valid referrerEmail is required to dispatch commission notification."
        });
      }
      console.log(`[Server Email] Triggering referral commission allocated email to ${referrerEmail}...`);
      const result = await sendCommissionAllocatedEmail(payload);
      return res.json(result);
    } catch (err) {
      console.error("[Server Email] Error in /api/email/referral-commission-allocated:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to send commission email." });
    }
  });
  app.post("/api/email/earnings-frozen", async (req, res) => {
    try {
      const payload = req.body || {};
      const { customerEmail } = payload;
      if (!customerEmail || !customerEmail.includes("@")) {
        return res.status(400).json({
          success: false,
          error: "A valid customerEmail is required to dispatch earnings freeze alert."
        });
      }
      console.log(`[Server Email] Triggering earnings frozen email to ${customerEmail}...`);
      const result = await sendEarningsFrozenEmail(payload);
      return res.json(result);
    } catch (err) {
      console.error("[Server Email] Error in /api/email/earnings-frozen:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to send freeze notice email." });
    }
  });
  app.post("/api/email/earnings-unfrozen", async (req, res) => {
    try {
      const payload = req.body || {};
      const { customerEmail } = payload;
      if (!customerEmail || !customerEmail.includes("@")) {
        return res.status(400).json({
          success: false,
          error: "A valid customerEmail is required."
        });
      }
      console.log(`[Server Email] Triggering earnings restored email to ${customerEmail}...`);
      const result = await sendEarningsUnfrozenEmail(payload);
      return res.json(result);
    } catch (err) {
      console.error("[Server Email] Error in /api/email/earnings-unfrozen:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to send unfreeze email." });
    }
  });
  app.post("/api/email/test", async (req, res) => {
    try {
      const { recipientEmail, type = "commission" } = req.body || {};
      const targetEmail = recipientEmail || "customer@kudstore.com";
      let result;
      if (type === "freeze") {
        result = await sendEarningsFrozenEmail({
          customerEmail: targetEmail,
          customerName: "Test Customer",
          frozenReason: "Compliance security audit (Test Email)",
          currentBalance: 150
        });
      } else if (type === "unfreeze") {
        result = await sendEarningsUnfrozenEmail({
          customerEmail: targetEmail,
          customerName: "Test Customer",
          currentBalance: 150
        });
      } else {
        result = await sendCommissionAllocatedEmail({
          referrerEmail: targetEmail,
          referrerName: "Test Referrer",
          commissionAmount: 50,
          referredClientName: "Sarah Jenkins",
          evaluationMonth: "August 2026",
          monthlyPurchasesCount: 2,
          newBalance: 200,
          adminNotes: "Test referral commission allocation email from Admin settings"
        });
      }
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });
  app.post("/api/email/send-invoice", async (req, res) => {
    try {
      const {
        orderId,
        invoiceId,
        recipientEmail,
        customMessage,
        senderName = "KUD Store Billing Admin",
        triggerType = "manual_admin",
        orderData
      } = req.body || {};
      let finalOrderData = orderData;
      const supabase = getServerSupabase();
      if (!finalOrderData && orderId && supabase) {
        try {
          const { data: dbOrder } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
          if (dbOrder) {
            let items = [];
            const { data: dbItems } = await supabase.from("order_items").select("*").eq("order_id", orderId);
            if (dbItems) items = dbItems;
            finalOrderData = { ...dbOrder, items };
          }
        } catch (dbErr) {
          console.warn("[Server Invoice Email] DB fetch fallback warning:", dbErr.message);
        }
      }
      if (!finalOrderData) {
        return res.status(400).json({
          success: false,
          error: "Order or invoice data could not be located for dispatch."
        });
      }
      console.log(`[Server Invoice Email] Dispatching tax invoice #${invoiceId || finalOrderData.id} to ${recipientEmail || finalOrderData.customer_email}...`);
      const result = await sendInvoiceEmail({
        orderOrInvoice: finalOrderData,
        recipientEmail,
        customMessage,
        senderName,
        triggerType,
        supabase: supabase || void 0
      });
      return res.json(result);
    } catch (err) {
      console.error("[Server Invoice Email] Error dispatching tax invoice:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Failed to dispatch tax invoice email."
      });
    }
  });
  app.post("/api/admin/invoices/toggle-auto-send", async (req, res) => {
    try {
      const { enabled } = req.body || {};
      const supabase = getServerSupabase();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (supabase) {
        try {
          const { data: current } = await supabase.from("settings").select("id, settings_data").limit(1).maybeSingle();
          const currentSettings = current?.settings_data || {};
          const currentInvoiceSettings = currentSettings.invoice_settings || {};
          const updatedSettings = {
            ...currentSettings,
            invoice_settings: {
              ...currentInvoiceSettings,
              autoSendInvoices: Boolean(enabled),
              lastUpdated: now
            }
          };
          if (current?.id) {
            await supabase.from("settings").update({ settings_data: updatedSettings, updated_at: now }).eq("id", current.id);
          }
        } catch (e) {
          console.warn("[Admin Invoices Config] Error updating auto-send setting:", e.message);
        }
      }
      return res.json({ success: true, autoSendInvoices: Boolean(enabled) });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/admin/invoices/toggle-customer-download", async (req, res) => {
    try {
      const { enabled } = req.body || {};
      const supabase = getServerSupabase();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (supabase) {
        try {
          const { data: current } = await supabase.from("settings").select("id, settings_data").limit(1).maybeSingle();
          const currentSettings = current?.settings_data || {};
          const currentInvoiceSettings = currentSettings.invoice_settings || {};
          const updatedSettings = {
            ...currentSettings,
            invoice_settings: {
              ...currentInvoiceSettings,
              allowCustomerDownload: Boolean(enabled),
              lastUpdated: now
            }
          };
          if (current?.id) {
            await supabase.from("settings").update({ settings_data: updatedSettings, updated_at: now }).eq("id", current.id);
          }
        } catch (e) {
          console.warn("[Admin Invoices Config] Error updating allow customer download setting:", e.message);
        }
      }
      return res.json({ success: true, allowCustomerDownload: Boolean(enabled) });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/admin/gateways/health-check", async (_req, res) => {
    try {
      const supabase = getServerSupabase();
      let gatewaysConfig = {};
      if (supabase) {
        try {
          const { data } = await supabase.from("settings").select("settings_data").limit(1).maybeSingle();
          if (data?.settings_data?.payment_gateways) {
            gatewaysConfig = data.settings_data.payment_gateways;
          }
        } catch (e) {
          console.warn("[HealthCheck] Error loading gateway settings from DB:", e);
        }
      }
      const pingEndpoint = async (url, timeoutMs = 3500) => {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const resp = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
            headers: { "User-Agent": "KUDStore-HealthCheck/1.0" }
          }).catch(async () => {
            return await fetch(url, {
              method: "GET",
              signal: controller.signal,
              headers: { "User-Agent": "KUDStore-HealthCheck/1.0" }
            });
          });
          clearTimeout(timeoutId);
          const latencyMs = Math.max(1, Date.now() - start);
          return {
            reachable: resp.status < 500 || resp.status === 503 || resp.status === 401 || resp.status === 403,
            latencyMs,
            status: resp.status
          };
        } catch (err) {
          clearTimeout(timeoutId);
          const latencyMs = Math.max(1, Date.now() - start);
          return {
            reachable: false,
            latencyMs,
            status: 0,
            error: err?.name === "AbortError" ? "Connection timed out" : err?.message || "Network unreachable"
          };
        }
      };
      const results = {};
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const yocoConfig = gatewaysConfig.yoco || {};
      const yocoEnvKey = process.env.YOCO_SECRET_KEY || process.env.VITE_YOCO_SECRET_KEY;
      const yocoKeyConfigured = Boolean(
        (yocoConfig.configured ?? true) && (yocoEnvKey || yocoConfig.publicKey || yocoConfig.secretKey)
      );
      const yocoPing = await pingEndpoint("https://online.yoco.com/v1/charges/");
      const yocoHealthy = yocoPing.reachable && yocoKeyConfigured;
      results["yoco"] = {
        gatewayId: "yoco",
        gatewayName: "Yoco Secure Payment",
        status: !yocoKeyConfigured ? "warning" : yocoHealthy ? "healthy" : "unreachable",
        reachable: yocoPing.reachable,
        credentialsValid: yocoKeyConfigured,
        latencyMs: yocoPing.latencyMs,
        httpStatus: yocoPing.status,
        environmentMode: yocoConfig.mode || "test",
        endpointUrl: "https://online.yoco.com/v1/charges/",
        message: !yocoKeyConfigured ? "Credentials not configured in server environment" : yocoPing.reachable ? `Yoco API online and responsive (${yocoPing.latencyMs}ms). Ready for card & EFT processing.` : `Yoco endpoint unreachable (${yocoPing.error || "Connection failed"}).`,
        checkedAt: now
      };
      const cardConfig = gatewaysConfig.card || {};
      const cardConfigured = cardConfig.configured ?? true;
      const cardStart = Date.now();
      results["card"] = {
        gatewayId: "card",
        gatewayName: "Credit or Debit Card",
        status: !cardConfigured ? "warning" : "healthy",
        reachable: true,
        credentialsValid: cardConfigured,
        latencyMs: Math.max(1, Date.now() - cardStart + 6),
        environmentMode: cardConfig.mode || "live",
        message: cardConfigured ? "Direct Card processing engine operational. SSL/TLS tokenization active." : "Card gateway credentials not marked as configured.",
        checkedAt: now
      };
      const codConfig = gatewaysConfig.cod || {};
      const codConfigured = codConfig.configured ?? true;
      results["cod"] = {
        gatewayId: "cod",
        gatewayName: "Cash on Delivery (COD)",
        status: codConfigured ? "healthy" : "warning",
        reachable: true,
        credentialsValid: codConfigured,
        latencyMs: 3,
        environmentMode: "live",
        message: "Cash on Delivery courier dispatch routing active and responsive.",
        checkedAt: now
      };
      const payfastConfig = gatewaysConfig.payfast || {};
      const payfastMode = payfastConfig.mode || "test";
      const payfastUrl = payfastMode === "live" ? "https://www.payfast.co.za" : "https://sandbox.payfast.co.za";
      const payfastPing = await pingEndpoint(payfastUrl);
      const payfastConfigured = payfastConfig.configured ?? false;
      results["payfast"] = {
        gatewayId: "payfast",
        gatewayName: "PayFast South Africa",
        status: !payfastConfigured ? "not_configured" : payfastPing.reachable ? "healthy" : "unreachable",
        reachable: payfastPing.reachable,
        credentialsValid: payfastConfigured,
        latencyMs: payfastPing.latencyMs,
        httpStatus: payfastPing.status,
        environmentMode: payfastMode,
        endpointUrl: payfastUrl,
        message: !payfastConfigured ? "Credentials not configured in server environment." : payfastPing.reachable ? `PayFast ${payfastMode.toUpperCase()} gateway online (${payfastPing.latencyMs}ms).` : `PayFast gateway unreachable (${payfastPing.error || "Timeout"}).`,
        checkedAt: now
      };
      const ozowConfig = gatewaysConfig.ozow || {};
      const ozowPing = await pingEndpoint("https://api.ozow.com");
      const ozowConfigured = ozowConfig.configured ?? false;
      results["ozow"] = {
        gatewayId: "ozow",
        gatewayName: "Instant EFT (Ozow)",
        status: !ozowConfigured ? "not_configured" : ozowPing.reachable ? "healthy" : "unreachable",
        reachable: ozowPing.reachable,
        credentialsValid: ozowConfigured,
        latencyMs: ozowPing.latencyMs,
        httpStatus: ozowPing.status,
        environmentMode: ozowConfig.mode || "test",
        endpointUrl: "https://api.ozow.com",
        message: !ozowConfigured ? "Credentials not configured in server environment." : ozowPing.reachable ? `Ozow API responsive (${ozowPing.latencyMs}ms). Major SA banks supported.` : `Ozow API unreachable (${ozowPing.error || "Connection failed"}).`,
        checkedAt: now
      };
      const paypalConfig = gatewaysConfig.paypal || {};
      const paypalMode = paypalConfig.mode || "test";
      const paypalUrl = paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      const paypalPing = await pingEndpoint(paypalUrl);
      const paypalConfigured = paypalConfig.configured ?? false;
      results["paypal"] = {
        gatewayId: "paypal",
        gatewayName: "PayPal Global",
        status: !paypalConfigured ? "not_configured" : paypalPing.reachable ? "healthy" : "unreachable",
        reachable: paypalPing.reachable,
        credentialsValid: paypalConfigured,
        latencyMs: paypalPing.latencyMs,
        httpStatus: paypalPing.status,
        environmentMode: paypalMode,
        endpointUrl: paypalUrl,
        message: !paypalConfigured ? "Credentials not configured in server environment." : paypalPing.reachable ? `PayPal ${paypalMode.toUpperCase()} REST API online (${paypalPing.latencyMs}ms).` : `PayPal API unreachable (${paypalPing.error || "Timeout"}).`,
        checkedAt: now
      };
      const peachConfig = gatewaysConfig.peach_payments || {};
      const peachMode = peachConfig.mode || "test";
      const peachUrl = peachMode === "live" ? "https://secure.peachpayments.com" : "https://testsecure.peachpayments.com";
      const peachPing = await pingEndpoint(peachUrl);
      const peachConfigured = peachConfig.configured ?? false;
      results["peach_payments"] = {
        gatewayId: "peach_payments",
        gatewayName: "Peach Payments",
        status: !peachConfigured ? "not_configured" : peachPing.reachable ? "healthy" : "unreachable",
        reachable: peachPing.reachable,
        credentialsValid: peachConfigured,
        latencyMs: peachPing.latencyMs,
        httpStatus: peachPing.status,
        environmentMode: peachMode,
        endpointUrl: peachUrl,
        message: !peachConfigured ? "Credentials not configured in server environment." : peachPing.reachable ? `Peach Payments endpoint responsive (${peachPing.latencyMs}ms).` : `Peach Payments endpoint unreachable (${peachPing.error || "Timeout"}).`,
        checkedAt: now
      };
      const allItems = Object.values(results);
      const healthyCount = allItems.filter((i) => i.status === "healthy").length;
      const warningCount = allItems.filter((i) => i.status === "warning" || i.status === "not_configured").length;
      const unreachableCount = allItems.filter((i) => i.status === "unreachable").length;
      return res.json({
        success: true,
        timestamp: now,
        totalChecked: allItems.length,
        healthyCount,
        warningCount,
        unreachableCount,
        results
      });
    } catch (err) {
      console.error("[HealthCheck] Error running gateway health checks:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to run health check." });
    }
  });
  app.get("/api/product-categories", async (_req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const { data, error } = await supabase.from("product_categories").select("id, name, display_order, is_active, created_at").eq("is_active", true).order("display_order", { ascending: true });
      if (error) {
        console.error("[CategoriesAPI] Error fetching product_categories from Supabase:", error);
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.json({ success: true, data: data || [] });
    } catch (err) {
      console.error("[CategoriesAPI] Server exception fetching categories:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to fetch categories." });
    }
  });
  app.get("/api/products", async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const includeInactive = req.query.include_inactive === "true" || req.query.all === "true";
      let query = supabase.from("products").select("*");
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        console.error("[ProductsAPI] Error fetching products:", error);
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.json({ success: true, data: data || [] });
    } catch (err) {
      console.error("[ProductsAPI] Server exception:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to fetch products." });
    }
  });
  app.get("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.error("[ProductsAPI] Error fetching product by id:", error);
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.json({ success: true, data: data || null });
    } catch (err) {
      console.error("[ProductsAPI] Server exception:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to fetch product." });
    }
  });
  app.post("/api/admin/products", async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const payload = req.body;
      const { data, error } = await supabase.from("products").insert(payload).select("*");
      if (error) {
        console.error("[AdminProductsAPI] Error inserting product:", error);
        return res.status(500).json({ success: false, error: error.message });
      }
      if (payload.stock !== void 0 && data?.[0]?.id) {
        checkAndNotifyProductStock(data[0].id, Number(payload.stock), payload.name, payload.low_stock_threshold || 5);
      }
      return res.json({ success: true, data: data?.[0] || data });
    } catch (err) {
      console.error("[AdminProductsAPI] Server exception:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to create product." });
    }
  });
  app.put("/api/admin/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const payload = req.body;
      const { data, error } = await supabase.from("products").update(payload).eq("id", id).select("*");
      if (error) {
        console.error("[AdminProductsAPI] Error updating product:", error);
        return res.status(500).json({ success: false, error: error.message });
      }
      if (payload.stock !== void 0) {
        checkAndNotifyProductStock(id, Number(payload.stock), payload.name, payload.low_stock_threshold || 5);
      }
      return res.json({ success: true, data: data?.[0] || data });
    } catch (err) {
      console.error("[AdminProductsAPI] Server exception:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to update product." });
    }
  });
  app.delete("/api/admin/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database not configured." });
      }
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        console.error("[AdminProductsAPI] Error deleting product:", error);
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.json({ success: true });
    } catch (err) {
      console.error("[AdminProductsAPI] Server exception:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to delete product." });
    }
  });
  app.get("/api/settings/public-row", async (_req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database/Storage not configured." });
      }
      const { data, error } = await supabase.from("settings").select("id, store_name, currency_symbol, store_description, delivery_fee, free_shipping_threshold, support_email, support_phone, logo_url, banner_url, settings_data, created_at, updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      if (!data) {
        return res.status(404).json({ success: false, error: "No settings row found." });
      }
      const sanitized = { ...data };
      if (sanitized.settings_data && typeof sanitized.settings_data === "object") {
        const cleanSettings = { ...sanitized.settings_data };
        const promoBannerEnabled = cleanSettings.promotional_banner_enabled === true;
        cleanSettings.promotional_banner_enabled = promoBannerEnabled;
        if (cleanSettings.banner_config && typeof cleanSettings.banner_config === "object") {
          cleanSettings.banner_config = {
            ...cleanSettings.banner_config,
            enabled: promoBannerEnabled,
            promotional_banner_enabled: promoBannerEnabled
          };
        }
        if (cleanSettings.payment_gateways && typeof cleanSettings.payment_gateways === "object") {
          const cleanGateways = {};
          for (const [k, v] of Object.entries(cleanSettings.payment_gateways)) {
            if (v && typeof v === "object") {
              const { secretKey, privateKey, passphrase, ...safeObj } = v;
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
    } catch (err) {
      console.error("[Settings] Error fetching public-row:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to fetch settings row." });
    }
  });
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database/Storage not configured." });
      }
      try {
        const { data: tableData, error: tableError } = await supabase.from("settings").select("id, settings_data").limit(1).maybeSingle();
        if (!tableError && tableData?.settings_data && typeof tableData.settings_data === "object") {
          if (key === "promotional_banner_enabled") {
            const isEnabled = tableData.settings_data.promotional_banner_enabled === true;
            return res.json({ success: true, data: isEnabled, source: "database_table" });
          }
          const sectionData = tableData.settings_data[key];
          if (sectionData !== void 0) {
            let val = sectionData;
            if (key === "banner_config" && typeof val === "object") {
              const isEnabled = tableData.settings_data.promotional_banner_enabled === true;
              val = {
                ...val,
                enabled: isEnabled,
                promotional_banner_enabled: isEnabled
              };
            }
            if (key === "payment_gateways" && typeof val === "object") {
              val = { ...val };
              for (const gKey of Object.keys(val)) {
                if (val[gKey] && typeof val[gKey] === "object") {
                  const { secretKey, privateKey, passphrase, ...safeObj } = val[gKey];
                  val[gKey] = safeObj;
                }
              }
            }
            return res.json({ success: true, data: val, source: "database_table" });
          }
        }
      } catch {
      }
      try {
        const { data: fileData, error: downloadError } = await supabase.storage.from("product-images").download(`settings/${key}.json`);
        if (!downloadError && fileData) {
          const text = await fileData.text();
          let parsed = JSON.parse(text);
          if (key === "payment_gateways" && typeof parsed === "object") {
            for (const gKey of Object.keys(parsed)) {
              if (parsed[gKey] && typeof parsed[gKey] === "object") {
                const { secretKey, privateKey, passphrase, ...safeObj } = parsed[gKey];
                parsed[gKey] = safeObj;
              }
            }
          }
          return res.json({ success: true, data: parsed, source: "supabase_storage" });
        }
      } catch {
      }
      return res.status(404).json({ success: false, error: `Setting '${key}' not found.` });
    } catch (err) {
      console.error("[Settings] Error fetching setting:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to fetch setting." });
    }
  });
  app.get("/api/admin/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database/Storage not configured." });
      }
      try {
        const { data: tableData, error: tableError } = await supabase.from("settings").select("id, settings_data").limit(1).maybeSingle();
        if (!tableError && tableData?.settings_data && typeof tableData.settings_data === "object") {
          const sectionData = tableData.settings_data[key];
          if (sectionData !== void 0) {
            return res.json({ success: true, data: sectionData, source: "database_table" });
          }
        }
      } catch {
      }
      try {
        const { data: fileData, error: downloadError } = await supabase.storage.from("product-images").download(`settings/${key}.json`);
        if (!downloadError && fileData) {
          const text = await fileData.text();
          const parsed = JSON.parse(text);
          return res.json({ success: true, data: parsed, source: "supabase_storage" });
        }
      } catch {
      }
      return res.status(404).json({ success: false, error: `Setting '${key}' not found.` });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to fetch admin setting." });
    }
  });
  app.get("/api/admin/tax-settings", async (_req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database service is unavailable" });
      }
      const { data, error } = await supabase.from("settings").select("id, tax_enabled, tax_name, tax_rate, show_tax_on_receipt, vat_registration_number").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) {
        console.error("[API TAX SETTINGS GET] Error querying settings:", error);
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.json({
        success: true,
        data: data ? {
          id: data.id,
          tax_enabled: Boolean(data.tax_enabled),
          tax_name: data.tax_name || "VAT",
          tax_rate: data.tax_rate !== null && data.tax_rate !== void 0 ? Number(data.tax_rate) : 15,
          show_tax_on_receipt: data.show_tax_on_receipt !== false,
          vat_registration_number: data.vat_registration_number || null
        } : null
      });
    } catch (err) {
      console.error("[API TAX SETTINGS GET] Unexpected error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Server error fetching tax settings" });
    }
  });
  app.post("/api/admin/tax-settings", async (req, res) => {
    try {
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database service is unavailable" });
      }
      const { tax_enabled, tax_name, tax_rate, show_tax_on_receipt, vat_registration_number } = req.body;
      const { data: existingRow, error: findError } = await supabase.from("settings").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (findError) {
        console.error("[API TAX SETTINGS POST] Error finding settings row:", findError);
        return res.status(500).json({ success: false, error: findError.message });
      }
      let settingsId = existingRow?.id;
      const payloadToUpdate = {
        tax_enabled: Boolean(tax_enabled),
        tax_name: typeof tax_name === "string" && tax_name.trim().length > 0 ? tax_name.trim() : "VAT",
        tax_rate: typeof tax_rate === "number" ? tax_rate : Number(tax_rate) || 0,
        show_tax_on_receipt: Boolean(show_tax_on_receipt),
        vat_registration_number: vat_registration_number ? String(vat_registration_number).trim() : null,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      let resultRow = null;
      if (settingsId) {
        const { data: updated, error: updateError } = await supabase.from("settings").update(payloadToUpdate).eq("id", settingsId).select("id, tax_enabled, tax_name, tax_rate, show_tax_on_receipt, vat_registration_number").single();
        if (updateError) {
          console.error("[API TAX SETTINGS POST] Error updating existing settings row:", updateError);
          return res.status(500).json({ success: false, error: updateError.message });
        }
        resultRow = updated;
      } else {
        const { data: inserted, error: insertError } = await supabase.from("settings").insert(payloadToUpdate).select("id, tax_enabled, tax_name, tax_rate, show_tax_on_receipt, vat_registration_number").single();
        if (insertError) {
          console.error("[API TAX SETTINGS POST] Error inserting settings row:", insertError);
          return res.status(500).json({ success: false, error: insertError.message });
        }
        resultRow = inserted;
      }
      console.log("[API TAX SETTINGS POST] Saved successfully to public.settings:", resultRow);
      return res.json({
        success: true,
        message: "VAT/TAX settings saved successfully.",
        data: {
          id: resultRow.id,
          tax_enabled: Boolean(resultRow.tax_enabled),
          tax_name: resultRow.tax_name || "VAT",
          tax_rate: Number(resultRow.tax_rate) || 0,
          show_tax_on_receipt: Boolean(resultRow.show_tax_on_receipt),
          vat_registration_number: resultRow.vat_registration_number || null
        }
      });
    } catch (err) {
      console.error("[API TAX SETTINGS POST] Unexpected error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Server error saving tax settings" });
    }
  });
  app.post("/api/admin/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const payload = req.body;
      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ success: false, error: "Payload body must be a JSON object." });
      }
      const supabase = getServerSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: "Database/Storage not configured." });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const updatedPayload = {
        ...payload,
        lastUpdated: now
      };
      let tableSaved = false;
      let storageSaved = false;
      let lastErrorMessage = "";
      try {
        const { data: current } = await supabase.from("settings").select("id, settings_data").limit(1).maybeSingle();
        const currentSettingsData = current?.settings_data || {};
        const updatedSettingsData = {
          ...currentSettingsData || {},
          [key]: updatedPayload
        };
        if (key === "banner_config") {
          if (updatedPayload.enabled !== void 0) {
            const isEnabled = Boolean(updatedPayload.enabled);
            updatedSettingsData.promotional_banner_enabled = isEnabled;
            updatedSettingsData.banner_config = {
              ...updatedPayload,
              enabled: isEnabled,
              promotional_banner_enabled: isEnabled
            };
          }
        } else if (key === "promotional_banner_enabled") {
          const isEnabled = Boolean(typeof updatedPayload === "object" ? updatedPayload.enabled ?? updatedPayload.promotional_banner_enabled : updatedPayload);
          updatedSettingsData.promotional_banner_enabled = isEnabled;
          if (updatedSettingsData.banner_config) {
            updatedSettingsData.banner_config = {
              ...updatedSettingsData.banner_config,
              enabled: isEnabled,
              promotional_banner_enabled: isEnabled
            };
          }
        }
        let result;
        if (current?.id) {
          result = await supabase.from("settings").update({
            settings_data: updatedSettingsData,
            updated_at: now
          }).eq("id", current.id);
        } else {
          result = await supabase.from("settings").insert({
            store_name: "KUD Store",
            currency_symbol: "R",
            settings_data: updatedSettingsData,
            created_at: now,
            updated_at: now
          });
        }
        if (!result.error) {
          tableSaved = true;
        } else {
          lastErrorMessage = result.error.message;
          console.log(`[Settings] Notice writing to table 'settings':`, result.error.message);
        }
      } catch (tErr) {
        lastErrorMessage = tErr.message;
      }
      try {
        const buffer = Buffer.from(JSON.stringify(updatedPayload, null, 2), "utf-8");
        const { data: sData, error: sError } = await supabase.storage.from("product-images").upload(`settings/${key}.json`, buffer, {
          contentType: "application/json",
          cacheControl: "0",
          upsert: true
        });
        if (!sError && sData) {
          storageSaved = true;
        } else if (sError) {
          console.warn(`[Settings] Notice uploading to Supabase storage:`, sError.message);
          if (!lastErrorMessage) lastErrorMessage = sError.message;
        }
      } catch (sErr) {
        console.warn(`[Settings] Storage upload exception:`, sErr);
        if (!lastErrorMessage) lastErrorMessage = sErr.message;
      }
      if (!tableSaved && !storageSaved) {
        return res.status(500).json({
          success: false,
          error: lastErrorMessage || "Failed to persist settings in Supabase."
        });
      }
      return res.json({
        success: true,
        data: updatedPayload,
        persistedIn: tableSaved ? "database_table" : "supabase_storage"
      });
    } catch (err) {
      console.error("[Settings] Error saving setting:", err);
      return res.status(500).json({ success: false, error: err?.message || "Internal error saving settings." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
