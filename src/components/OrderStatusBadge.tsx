import React from 'react';
import { OrderStatus } from '../types';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toLowerCase();

  const getStyles = (st: string) => {
    switch (st) {
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'shipped':
      case 'packed':
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'confirmed':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cancelled':
      case 'canceled':
      case 'refunded':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const displayText = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : 'Unknown';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tracking-wide ${getStyles(
        normalized
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {displayText}
    </span>
  );
};
