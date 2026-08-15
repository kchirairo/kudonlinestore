import React from 'react';
import { PaymentStatus } from '../../types';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toLowerCase();

  const getStyles = (st: string) => {
    switch (st) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
      case 'unpaid':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'refunded':
      case 'partially_refunded':
      case 'partially refunded':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const displayText = status
    ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
    : 'Unknown';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${getStyles(
        normalized
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {displayText}
    </span>
  );
};
