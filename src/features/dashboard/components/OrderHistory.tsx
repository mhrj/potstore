'use client';

import React from 'react';
import OrderItemCard from '@/components/ui/OrderItemCard';
import type { OrderItemDetailsItem } from '@/features/checkout/components/OrderItemDetails';

export type OrderHistoryProps = {
  items: OrderItemDetailsItem[];
  className?: string;
  showImage?: boolean;
};

/**
 * Order invoice items viewer for Dashboard and Order History using OrderItemCard.
 */
export default function OrderHistory({
  items,
  className = '',
  showImage = true,
}: OrderHistoryProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={`divide-y divide-soil-900/10 dark:divide-dust-50/10 ${className}`}>
      {items.map((item, idx) => (
        <OrderItemCard
          key={item.id ?? `${item.productId}-${idx}`}
          item={item}
          showImage={showImage}
        />
      ))}
    </div>
  );
}

