import { Order, OrderItem, PaymentStatus } from '../types';
import { STORE_CONFIG } from '../constants/config';

/**
 * Standard South African Value Added Tax (VAT) rate: 15%
 */
export const VAT_RATE = 0.15;

/**
 * Rounds any monetary number to exactly 2 decimal places avoiding floating-point drift.
 */
export function roundMoney(val: number): number {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a monetary number to 2 decimal places with South African localized thousand separators.
 * Example: 10 -> "10.00", 1450.5 -> "1,450.50"
 */
export function formatMoney(val: number): string {
  const num = roundMoney(val);
  return num.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats an amount with the store currency symbol.
 * Example: formatCurrency(10) -> "R10.00"
 */
export function formatCurrency(val: number, currency: string = STORE_CONFIG.STORE_CURRENCY): string {
  return `${currency}${formatMoney(val)}`;
}

export interface OrderFinancials {
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  vatAmount: number;
  taxEnabled: boolean;
  taxName: string;
  taxRate: number;
  showTaxOnReceipt: boolean;
  vatRegistrationNumber?: string | null;
  grandTotal: number;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  isPaid: boolean;
  isPending: boolean;
  isFailed: boolean;
  isRefunded: boolean;
  statusLabel: string;
  totalLabel: string;
  amountPaid: number;
  amountDue: number;
}

/**
 * Dynamically computes item subtotal, delivery fee, tax/VAT, and grand total from order data.
 * Supports dynamic tax rates, enable/disable toggle, tax name, and historical snapshots.
 * Adheres strictly to:
 * - Subtotal = sum of (quantity * unit_price)
 * - Tax/VAT = taxableSubtotal * (taxRate / 100) if taxEnabled, else 0
 * - Grand Total = subtotal + delivery fee + tax/VAT - discount
 */
export function calculateOrderFinancials(order: Partial<Order> | any): OrderFinancials {
  // 1. Calculate items subtotal from line items if present, fallback to order.subtotal_amount
  let subtotal = 0;
  if (Array.isArray(order?.items) && order.items.length > 0) {
    subtotal = order.items.reduce((sum: number, item: OrderItem) => {
      const qty = Number(item.quantity) || 1;
      const unit = Number(item.unit_price) || (Number(item.total_price) / qty) || 0;
      const lineTotal = Number(item.total_price) || (unit * qty);
      return sum + lineTotal;
    }, 0);
  } else {
    subtotal = Number(order?.subtotal_amount ?? order?.subtotal ?? 0);
  }
  subtotal = roundMoney(subtotal);

  // 2. Delivery fee & discount
  const deliveryFee = roundMoney(Number(order?.delivery_fee ?? order?.shipping_fee ?? 0));
  const discountAmount = roundMoney(Number(order?.discount_amount ?? order?.discount ?? 0));

  // 3. Subtotal after discount for tax calculation
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);

  // 4. Determine tax configuration from order snapshot or legacy fields
  let taxEnabled = false;
  let taxName = 'VAT';
  let taxRate = 15;
  let vatAmount = 0;
  let showTaxOnReceipt = true;
  const vatRegistrationNumber = order?.vat_registration_number || order?.vat_number || null;

  if (order?.tax_enabled !== undefined && order?.tax_enabled !== null) {
    taxEnabled = Boolean(order.tax_enabled);
    taxName = order.tax_name || 'VAT';
    taxRate = order.tax_rate !== undefined && order.tax_rate !== null ? Number(order.tax_rate) : 15;
    showTaxOnReceipt = order.show_tax_on_receipt !== false;

    if (taxEnabled) {
      if (order.tax_amount !== undefined && order.tax_amount !== null && !isNaN(Number(order.tax_amount))) {
        vatAmount = roundMoney(Number(order.tax_amount));
      } else {
        vatAmount = roundMoney(taxableSubtotal * (taxRate / 100));
      }
    } else {
      vatAmount = 0;
    }
  } else if (order?.vat_amount !== undefined && order?.vat_amount !== null) {
    vatAmount = roundMoney(Number(order.vat_amount));
    taxEnabled = vatAmount > 0;
    taxRate = 15;
    taxName = 'VAT';
  } else if (order?.total_amount !== undefined || order?.total !== undefined) {
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
    // Default fallback
    taxEnabled = false;
    vatAmount = 0;
    taxRate = 0;
  }

  // 5. Grand total: Subtotal + Delivery + Tax - Discount
  // If order has an explicit total that closely matches, prioritize it to prevent any rounding mismatches
  const calculatedGrandTotal = roundMoney(taxableSubtotal + vatAmount + deliveryFee);
  let grandTotal = calculatedGrandTotal;
  if (order?.total_amount !== undefined || order?.total !== undefined) {
    const rawTotal = roundMoney(Number(order.total_amount ?? order.total));
    if (Math.abs(rawTotal - calculatedGrandTotal) <= 0.05) {
      grandTotal = rawTotal;
    }
  }

  // 6. Payment Status normalization
  const rawStatus = (order?.payment_status || 'pending').toString().toLowerCase().trim();
  let paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded' = 'pending';
  if (rawStatus === 'paid' || rawStatus === 'completed' || rawStatus === 'success') {
    paymentStatus = 'paid';
  } else if (rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'declined') {
    paymentStatus = 'failed';
  } else if (rawStatus === 'refunded') {
    paymentStatus = 'refunded';
  } else {
    paymentStatus = 'pending';
  }

  const isPaid = paymentStatus === 'paid';
  const isPending = paymentStatus === 'pending';
  const isFailed = paymentStatus === 'failed';
  const isRefunded = paymentStatus === 'refunded';

  // 7. Human-readable status badges & totals labels
  const statusLabel = isPaid
    ? 'PAID'
    : isPending
    ? 'PAYMENT PENDING'
    : isFailed
    ? 'PAYMENT FAILED'
    : 'REFUNDED';

  const totalLabel = isPaid
    ? 'TOTAL PAID:'
    : isPending
    ? 'TOTAL DUE:'
    : isFailed
    ? 'TOTAL DUE:'
    : 'REFUNDED:';

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
    amountDue,
  };
}

/**
 * Validates that an order's grand total strictly reconciles with:
 * total = subtotal + delivery_fee + vat - discount
 * Prevents invalid invoices from being generated if corrupted or miscalculated.
 */
export function validateInvoiceReconciliation(financials: OrderFinancials): {
  isValid: boolean;
  reconciledTotal: number;
  error?: string;
} {
  const expectedTotal = roundMoney(
    financials.subtotal + financials.deliveryFee + financials.vatAmount - financials.discountAmount
  );

  const difference = Math.abs(financials.grandTotal - expectedTotal);
  if (difference > 0.05) {
    return {
      isValid: false,
      reconciledTotal: expectedTotal,
      error: `Invoice calculation validation failed: Grand Total (R${financials.grandTotal}) does not reconcile with Subtotal (R${financials.subtotal}) + Delivery (R${financials.deliveryFee}) + VAT 15% (R${financials.vatAmount}) - Discount (R${financials.discountAmount}). Expected R${expectedTotal}.`,
    };
  }

  return {
    isValid: true,
    reconciledTotal: expectedTotal,
  };
}
