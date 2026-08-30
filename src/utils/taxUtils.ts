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
 * Dynamically computes item subtotal, delivery fee, 15% VAT, and grand total from order data.
 * Adheres strictly to:
 * - Subtotal = sum of (quantity * unit_price)
 * - VAT = subtotal * 15%
 * - Grand Total = subtotal + delivery fee + VAT - discount
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

  // 4. Exact 15% VAT calculation
  const vatAmount = roundMoney(taxableSubtotal * VAT_RATE);

  // 5. Grand total: Subtotal + Delivery + VAT - Discount
  const grandTotal = roundMoney(taxableSubtotal + vatAmount + deliveryFee);

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
