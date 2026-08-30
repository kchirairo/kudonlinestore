import { jsPDF } from 'jspdf';
import { Order, Invoice, InvoiceSettingsConfig } from '../types';
import { STORE_CONFIG, DEFAULT_INVOICE_SETTINGS } from '../constants/config';
import { calculateOrderFinancials, validateInvoiceReconciliation, formatMoney, VAT_RATE } from './taxUtils';

/**
 * Generate a clean, printable vector PDF invoice for an order or invoice record.
 * Formats according to South African standard tax invoice layout with exact 15% VAT and reconciled totals.
 */
export const generateOrderInvoicePDF = async (
  order: Order | Invoice | any,
  settings?: InvoiceSettingsConfig
): Promise<jsPDF> => {
  // 1. Calculate dynamic financials and validate reconciliation
  const financials = calculateOrderFinancials(order);
  const validation = validateInvoiceReconciliation(financials);

  if (!validation.isValid) {
    console.error('[Invoice Generator Error]', validation.error);
    throw new Error(validation.error || 'Failed to generate invoice: Financial calculations did not reconcile.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174mm
  let y = margin;

  // Colors
  const primaryColor = [255, 100, 82]; // #ff6452
  const darkColor = [31, 41, 55]; // #1f2937
  const grayText = [107, 114, 128]; // #6b7280
  const lightGrayBg = [249, 250, 251]; // #f9fafb
  const borderGray = [229, 231, 235]; // #e5e7eb
  const successGreen = [16, 185, 129]; // #10b981
  const warningAmber = [217, 119, 6]; // #d97706
  const dangerRed = [220, 38, 38]; // #dc2626
  const neutralGray = [100, 116, 139]; // #64748b

  const companyName = settings?.companyName || STORE_CONFIG.STORE_NAME;
  const companyTagline = STORE_CONFIG.STORE_TAGLINE;
  const companyAddress = settings?.companyAddress || '124 Main Street, Sandton, Johannesburg, 2196';
  const companyEmail = settings?.companyEmail || STORE_CONFIG.CONTACT_EMAIL;
  const companyPhone = settings?.companyPhone || STORE_CONFIG.CONTACT_PHONE;
  const companyWhatsapp = settings?.whatsappSupport || settings?.companyWhatsapp || STORE_CONFIG.WHATSAPP_SUPPORT;
  const vatNumber = settings?.vatNumber || DEFAULT_INVOICE_SETTINGS.vatNumber || 'ZA4920192837';
  const invoiceTaxTitle = settings?.taxInvoiceTitle || 'TAX INVOICE / OFFICIAL RECEIPT';

  // 1. Header Section
  // Store Logo Badge
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(margin, y, 12, 12, 2.5, 2.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('K', margin + 3.8, y + 8.5);

  // Store Brand Name & Tagline
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(companyName, margin + 16, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text(companyTagline, margin + 16, y + 10.5);

  // Right side: TAX INVOICE title & status pill
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('TAX INVOICE', pageWidth - margin, y + 6, { align: 'right' });

  // Payment Status Pill (Dynamically styled according to confirmed payment status)
  let statusColor = warningAmber;
  let statusBg = [254, 243, 199]; // light amber
  if (financials.isPaid) {
    statusColor = successGreen;
    statusBg = [236, 253, 245]; // light emerald
  } else if (financials.isFailed) {
    statusColor = dangerRed;
    statusBg = [254, 226, 226]; // light red
  } else if (financials.isRefunded) {
    statusColor = neutralGray;
    statusBg = [241, 245, 249]; // light slate
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const pillTextWidth = doc.getTextWidth(financials.statusLabel);
  const pillWidth = Math.max(28, pillTextWidth + 8);
  const pillX = pageWidth - margin - pillWidth;
  const pillY = y + 8.5;

  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pillX, pillY, pillWidth, 5.5, 1.5, 1.5, 'FD');
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(financials.statusLabel, pillX + pillWidth / 2, pillY + 3.8, { align: 'center' });

  y += 18;

  // Merchant VAT and Address Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text(`${companyAddress}  •  SARS VAT Reg #: ${vatNumber}`, margin, y);

  y += 4;

  // Subtle Header Divider
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  y += 7;

  // 2. Meta Info Box: (Invoice Details & Customer Information)
  const col1X = margin;
  const col2X = margin + contentWidth / 2 + 5;

  // Left Column: Bill To / Shipping Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('BILLED & DELIVERED TO:', col1X, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(order.shipping_address?.fullName || order.customer_name || 'Valued Customer', col1X, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text(order.shipping_address?.addressLine || 'Address not specified', col1X, y + 9.5);
  doc.text(
    `${order.shipping_address?.city || ''}, ${order.shipping_address?.province || ''} ${
      order.shipping_address?.postalCode || ''
    }`.trim(),
    col1X,
    y + 14
  );
  if (order.shipping_address?.phone || order.shipping_address?.email || order.customer_email) {
    const contactLine = [
      order.shipping_address?.phone ? `Phone: ${order.shipping_address.phone}` : '',
      (order.shipping_address?.email || order.customer_email) ? `Email: ${order.shipping_address?.email || order.customer_email}` : '',
    ].filter(Boolean).join(' | ');
    doc.text(contactLine, col1X, y + 18.5);
  }

  // Right Column: Invoice & Order Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('INVOICE DETAILS:', col2X, y);

  const formattedDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const invoiceNumber = order.invoice_number || `INV-${order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;

  const metaRows = [
    { label: 'Invoice No:', value: invoiceNumber },
    { label: 'Order ID:', value: `#${order.order_number || order.id}` },
    { label: 'Date Issued:', value: formattedDate },
    { label: 'Payment Method:', value: order.payment_method || 'Online Gateway' },
    { label: 'Payment Status:', value: financials.statusLabel },
  ];

  let metaY = y + 5;
  metaRows.forEach((row) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text(row.label, col2X, metaY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(row.value, col2X + 32, metaY);
    metaY += 4.5;
  });

  y += 28;

  // 3. Itemized Products Table
  const tableHeaderY = y;
  const rowHeight = 7;

  // Table Header Background
  doc.setFillColor(lightGrayBg[0], lightGrayBg[1], lightGrayBg[2]);
  doc.roundedRect(margin, tableHeaderY, contentWidth, 8, 1.5, 1.5, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin, tableHeaderY + 8, pageWidth - margin, tableHeaderY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);

  const colItemX = margin + 4;
  const colQtyX = margin + contentWidth - 65;
  const colPriceX = margin + contentWidth - 40;
  const colTotalX = margin + contentWidth - 4;

  doc.text('ITEM DESCRIPTION', colItemX, tableHeaderY + 5.5);
  doc.text('QTY', colQtyX, tableHeaderY + 5.5, { align: 'center' });
  doc.text(`PRICE (${STORE_CONFIG.CURRENCY_CODE})`, colPriceX, tableHeaderY + 5.5, { align: 'right' });
  doc.text(`TOTAL (${STORE_CONFIG.CURRENCY_CODE})`, colTotalX, tableHeaderY + 5.5, { align: 'right' });

  y = tableHeaderY + 11;

  // Render Table Items
  const items = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [
        {
          id: 'item-1',
          product_id: 'prod',
          product_name: 'Store Order Items',
          quantity: 1,
          unit_price: financials.subtotal,
          total_price: financials.subtotal,
        },
      ];

  items.forEach((item, index) => {
    // Alternate row zebra tint
    if (index % 2 === 1) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, y - 2.5, contentWidth, rowHeight + 2, 'F');
    }

    // Product Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

    const productName = item.product_name || 'Product';
    const truncatedName =
      productName.length > 48 ? productName.substring(0, 46) + '...' : productName;
    doc.text(truncatedName, colItemX, y + 1.5);

    // Variant / Brand note
    if (item.variant || item.product_brand) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      const extraInfo = [item.product_brand, item.variant ? `Size: ${item.variant}` : '']
        .filter(Boolean)
        .join(' • ');
      doc.text(extraInfo, colItemX, y + 4.8);
    }

    // Quantity
    const qty = Number(item.quantity) || 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(String(qty), colQtyX, y + 2.5, { align: 'center' });

    // Unit Price (Numeric calculation rounded to 2 decimals)
    const unitPrice = Number(item.unit_price) || (Number(item.total_price) / qty) || 0;
    doc.setFont('helvetica', 'normal');
    doc.text(`${STORE_CONFIG.STORE_CURRENCY}${formatMoney(unitPrice)}`, colPriceX, y + 2.5, {
      align: 'right',
    });

    // Total Line Price (Numeric calculation rounded to 2 decimals)
    const lineTotal = Number(item.total_price) || (unitPrice * qty);
    doc.setFont('helvetica', 'bold');
    doc.text(`${STORE_CONFIG.STORE_CURRENCY}${formatMoney(lineTotal)}`, colTotalX, y + 2.5, {
      align: 'right',
    });

    // Bottom item line
    doc.setDrawColor(243, 244, 246);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

    y += 9;
  });

  y += 4;

  // 4. Totals Summary Box (Corrected VAT calculation & Dynamic Totals Display)
  const summaryBoxWidth = 86;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  const summaryLines: Array<{ label: string; value: string; bold?: boolean; color?: number[] }> = [
    {
      label: 'Subtotal (Net):',
      value: `${STORE_CONFIG.STORE_CURRENCY}${formatMoney(financials.subtotal)}`,
      bold: false,
    },
    {
      label: 'Courier Delivery:',
      value: financials.deliveryFee === 0 ? 'FREE' : `${STORE_CONFIG.STORE_CURRENCY}${formatMoney(financials.deliveryFee)}`,
      bold: false,
    },
  ];

  if (financials.discountAmount > 0) {
    summaryLines.push({
      label: 'Discount Applied:',
      value: `-${STORE_CONFIG.STORE_CURRENCY}${formatMoney(financials.discountAmount)}`,
      bold: false,
      color: [16, 185, 129], // green
    });
  }

  summaryLines.push({
    label: `VAT (${Math.round(VAT_RATE * 100)}%):`,
    value: `${STORE_CONFIG.STORE_CURRENCY}${formatMoney(financials.vatAmount)}`,
    bold: false,
  });

  summaryLines.push({
    label: 'TOTAL:',
    value: `${STORE_CONFIG.STORE_CURRENCY}${formatMoney(financials.grandTotal)}`,
    bold: true,
  });

  summaryLines.forEach((line) => {
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text(line.label, summaryX, y);

    doc.setFont('helvetica', 'bold');
    if (line.color) {
      doc.setTextColor(line.color[0], line.color[1], line.color[2]);
    } else {
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    }
    doc.text(line.value, pageWidth - margin - 4, y, { align: 'right' });
    y += 5;
  });

  // Grand Total Highlighted Box: TOTAL PAID vs TOTAL DUE
  y += 1.5;
  const highlightBg = financials.isPaid ? primaryColor : (financials.isFailed ? dangerRed : [234, 88, 12]);
  doc.setFillColor(highlightBg[0], highlightBg[1], highlightBg[2]);
  doc.roundedRect(summaryX - 2, y, summaryBoxWidth + 2, 8.5, 1.5, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(financials.totalLabel, summaryX + 2, y + 5.8);
  doc.text(`${STORE_CONFIG.STORE_CURRENCY}${formatMoney(financials.grandTotal)}`, pageWidth - margin - 4, y + 5.8, {
    align: 'right',
  });

  y += 18;

  // 5. Banking / Merchant & Support Footer Info
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('CUSTOMER SUPPORT & COMPLIANCE', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text(
    `Email: ${companyEmail}   |   Phone: ${companyPhone}   |   WhatsApp: ${companyWhatsapp}`,
    margin,
    y + 4
  );
  doc.text(
    settings?.invoiceFooterNote ||
      'Official Tax Invoice compliant with SARS 15% VAT regulations. Please retain for warranty and tracking.',
    margin,
    y + 7.5
  );

  // Bottom Watermark / Page footer
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Generated on ${new Date().toLocaleString('en-ZA')} • Tax Invoice (SARS 15% VAT) • ${companyName}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  // Save the document with clean filename
  const sanitizedId = (invoiceNumber || order.id).replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`KUD_Invoice_${sanitizedId}.pdf`);

  return doc;
};

