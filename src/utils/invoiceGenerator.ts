import { jsPDF } from 'jspdf';
import { Order } from '../types';
import { STORE_CONFIG } from '../constants/config';

/**
 * Generate a clean, printable vector PDF invoice for an order.
 * Formats according to South African standard tax invoice layout.
 */
export const generateOrderInvoicePDF = async (order: Order): Promise<void> => {
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
  doc.text(STORE_CONFIG.STORE_NAME, margin + 16, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text(STORE_CONFIG.STORE_TAGLINE, margin + 16, y + 10.5);

  // Right side: INVOICE title & status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('TAX INVOICE', pageWidth - margin, y + 6, { align: 'right' });

  // Payment Status Pill
  const isPaid = (order.payment_status || '').toLowerCase() === 'paid';
  const statusLabel = isPaid ? 'PAID' : (order.payment_status || 'PENDING').toUpperCase();
  const statusColor = isPaid ? successGreen : [234, 88, 12];

  doc.setFillColor(isPaid ? 236 : 254, isPaid ? 253 : 243, isPaid ? 245 : 199);
  doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - margin - 24, y + 8.5, 24, 5.5, 1.5, 1.5, 'FD');
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(statusLabel, pageWidth - margin - 12, y + 12.2, { align: 'center' });

  y += 20;

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
  doc.text(order.shipping_address?.fullName || 'Valued Customer', col1X, y + 5);

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
  if (order.shipping_address?.phone) {
    doc.text(`Phone: ${order.shipping_address.phone}`, col1X, y + 18.5);
  }

  // Right Column: Invoice & Order Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('INVOICE DETAILS:', col2X, y);

  const formattedDate = new Date(order.created_at).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const invoiceNumber = `INV-${order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;

  const metaRows = [
    { label: 'Invoice No:', value: invoiceNumber },
    { label: 'Order ID:', value: `#${order.id}` },
    { label: 'Date Issued:', value: formattedDate },
    { label: 'Payment Method:', value: order.payment_method || 'Online Payment' },
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

  y += 26;

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
  order.items.forEach((item, index) => {
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
      productName.length > 50 ? productName.substring(0, 48) + '...' : productName;
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(String(item.quantity || 1), colQtyX, y + 2.5, { align: 'center' });

    // Unit Price
    const unitPrice = item.unit_price || (item.total_price / (item.quantity || 1));
    doc.setFont('helvetica', 'normal');
    doc.text(`${STORE_CONFIG.STORE_CURRENCY} ${unitPrice.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, colPriceX, y + 2.5, {
      align: 'right',
    });

    // Total Line Price
    doc.setFont('helvetica', 'bold');
    doc.text(`${STORE_CONFIG.STORE_CURRENCY} ${(item.total_price || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, colTotalX, y + 2.5, {
      align: 'right',
    });

    // Bottom item line
    doc.setDrawColor(243, 244, 246);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

    y += 9;
  });

  y += 4;

  // 4. Totals Summary Box
  const summaryBoxWidth = 80;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  const subtotal = order.subtotal_amount || 0;
  const deliveryFee = order.delivery_fee || 0;
  const grandTotal = order.total_amount || (subtotal + deliveryFee);
  const vatAmount = (grandTotal * 15) / 115; // 15% SA standard VAT component

  const summaryLines = [
    { label: 'Subtotal:', value: `${STORE_CONFIG.STORE_CURRENCY} ${subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, bold: false },
    { label: 'Courier Delivery:', value: deliveryFee === 0 ? 'FREE' : `${STORE_CONFIG.STORE_CURRENCY} ${deliveryFee.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, bold: false },
    { label: 'Includes 15% VAT:', value: `${STORE_CONFIG.STORE_CURRENCY} ${vatAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, bold: false, italic: true },
  ];

  summaryLines.forEach((line) => {
    doc.setFont('helvetica', line.italic ? 'italic' : line.bold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text(line.label, summaryX, y);

    doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(line.value, pageWidth - margin - 4, y, { align: 'right' });
    y += 5;
  });

  // Grand Total Highlighted Box
  y += 1;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(summaryX - 2, y, summaryBoxWidth + 2, 8.5, 1.5, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TOTAL PAID:', summaryX + 2, y + 5.8);
  doc.text(`${STORE_CONFIG.STORE_CURRENCY} ${grandTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, y + 5.8, {
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
  doc.text('CUSTOMER SUPPORT & QUERIES', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text(
    `Email: ${STORE_CONFIG.CONTACT_EMAIL}   |   Phone: ${STORE_CONFIG.CONTACT_PHONE}   |   WhatsApp: ${STORE_CONFIG.WHATSAPP_SUPPORT}`,
    margin,
    y + 4
  );
  doc.text(
    'Thank you for shopping with KUD Store. Please keep this invoice for your guarantee and order tracking.',
    margin,
    y + 7.5
  );

  // Bottom Watermark / Page footer
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Generated on ${new Date().toLocaleString('en-ZA')} • www.kudstore.co.za`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  // Save the document with clean filename
  const sanitizedId = order.id.replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`KUD_Store_Invoice_Order_${sanitizedId}.pdf`);
};
