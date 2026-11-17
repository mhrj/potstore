'use client';

import React from 'react';
import OrderItemCard from '@/components/ui/OrderItemCard';
import type { OrderItemDetailsItem } from './OrderItemDetails';

export type CartSummaryProps = {
  items: OrderItemDetailsItem[];
  compact?: boolean;
  isCart?: boolean;
  className?: string;
};

/**
 * Renders order or cart items using the unified OrderItemCard.
 */
export default function CartSummary({
  items,
  compact = false,
  isCart = false,
  className = '',
}: CartSummaryProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={`divide-y divide-soil-900/10 dark:divide-dust-50/10 ${className}`}>
      {items.map((item, idx) => (
        <OrderItemCard
          key={item.id ?? `${item.productId}-${idx}`}
          item={item}
          compact={compact}
          isCart={isCart}
        />
      ))}
    </div>
  );
}

