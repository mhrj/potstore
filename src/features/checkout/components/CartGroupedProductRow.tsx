'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { formatToman, toFa } from '@/lib/format';
import { isUnoptimizedImage } from '@/lib/image-validation';
import { numberToWordsFa } from '@/lib/number-to-words';
import type { PricedLine } from '@/lib/pricing';
import { ItemColorBadge } from '@/features/catalog';
import ConfirmModal from '@/components/ui/ConfirmModal';
import OrderItemCard from '@/components/ui/OrderItemCard';
import { extractColorName, formatSpecs, formatBundleBreakdown } from './OrderItemDetails';

type CartGroupedProductRowProps = {
  group: {
    productId: string;
    productName: string;
    productSlug: string;
    imageUrl?: string | null;
    specs?: string | null;
    lines: PricedLine[];
    totalQuantity: number;
    totalToman: number;
    breakdownSummary?: string;
  };
  stock: number;
};

function VariantSubRow({
  line,
  stock,
}: {
  line: PricedLine;
  stock: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [qty, setQty] = useState(line.quantity);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const clamp = (n: number) => {
    const step = line.bundleSize > 1 ? line.bundleSize : 1;
    const raw = Math.floor(n) || step;
    const units = Math.max(1, Math.round(raw / step));
    const multiple = units * step;
    const maxUnits = Math.max(1, Math.floor(stock / step));
    const maxQty = maxUnits * step;
    return Math.max(step, Math.min(maxQty, multiple));
  };

  const searchParams = new URLSearchParams();
  if (line.variantId) searchParams.set('variantId', line.variantId);
  if (line.selectedColorHex) searchParams.set('selectedColorHex', line.selectedColorHex);
  const queryString = searchParams.toString();
  const itemEndpoint = `/api/cart/${line.productId}${queryString ? `?${queryString}` : ''}`;

  const update = (next: number) => {
    const clamped = clamp(next);
    if (clamped === qty) return;
    setQty(clamped);
    setError(null);
    startTransition(async () => {
      const res = await fetch(itemEndpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: clamped,
          variantId: line.variantId,
          selectedColorHex: line.selectedColorHex,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? 'به‌روزرسانی ناموفق بود');
        setQty(line.quantity);
        return;
      }
      router.refresh();
    });
  };

  const handleConfirmRemove = () => {
    setIsConfirmOpen(false);
    setError(null);
    startTransition(async () => {
      const res = await fetch(itemEndpoint, { method: 'DELETE' });
      if (!res.ok) {
        setError('حذف ناموفق بود');
        return;
      }
      router.refresh();
    });
  };

  const isBundle = line.bundleSize > 1;

  let nextTierHintText: string | null = null;
  if (line.nextTier) {
    nextTierHintText = isBundle
      ? `${toFa(Math.max(1, line.nextTier.minQuantity - Math.round(qty / line.bundleSize)))} بسته دیگر → هر بسته ${formatToman(line.nextTier.unitPriceToman)} تومان`
      : `${toFa(Math.max(1, line.nextTier.minQuantity - qty))} عدد دیگر → هر عدد ${formatToman(line.nextTier.unitPriceToman)} تومان`;
  }

  return (
    <div className="py-2 border-b border-soil-900/5 dark:border-dust-50/5 last:border-b-0">
      <OrderItemCard
        item={{ ...line, quantity: qty }}
        isCart={true}
        stock={stock}
        isPending={pending}
        showImage={false}
        onUpdateQuantity={(next) => update(next)}
        onRemove={() => setIsConfirmOpen(true)}
        nextTierHintText={nextTierHintText}
      />
      {error && (
        <p role="alert" className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1">
          {error}
        </p>
      )}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="حذف از سبد خرید"
        message="آیا از حذف این کالا از سبد خرید مطمئن هستید؟"
        isDestructive={true}
        confirmText="حذف کالا"
        cancelText="انصراف"
        onConfirm={handleConfirmRemove}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}

export default function CartGroupedProductRow({
  group,
  stock,
}: CartGroupedProductRowProps) {
  return (
    <li className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 space-y-4">
      <div className="flex gap-4">
        {/* Single product image */}
        <div className="relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-xl bg-white dark:bg-flora-950 border border-soil-900/5 dark:border-dust-50/10">
          {group.imageUrl ? (
            <Image
              src={group.imageUrl}
              alt={group.productName}
              fill
              className="object-cover"
              sizes="96px"
              unoptimized={isUnoptimizedImage(group.imageUrl)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-soil-700/30 dark:text-dust-300/30">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/products/${group.productSlug}`}
              className="font-bold text-base text-soil-900 dark:text-dust-50 hover:text-flora-700 dark:hover:text-flora-300 transition block truncate"
            >
              {group.productName}
            </Link>
            {group.breakdownSummary && (
              <span className="text-xs text-soil-700/80 dark:text-dust-200/80 font-medium">
                ({group.breakdownSummary})
              </span>
            )}
          </div>
          {group.specs && (
            <p className="text-xs text-soil-700/70 dark:text-dust-200/70">
              {group.specs}
            </p>
          )}
        </div>
      </div>

      {/* List variants underneath as sub-rows */}
      <div className="rounded-xl bg-dust-50/70 dark:bg-flora-950/40 border border-soil-900/5 dark:border-dust-50/5 px-4 py-2 space-y-1">
        {group.lines.map((line) => (
          <VariantSubRow
            key={`${line.productId}-${line.variantId ?? 'default'}-${line.selectedColorHex ?? 'none'}`}
            line={line}
            stock={stock}
          />
        ))}
      </div>

      {/* Group total */}
      <div className="pt-2 border-t border-soil-900/10 dark:border-dust-50/10 flex items-center justify-between text-xs sm:text-sm">
        <span className="font-bold text-soil-700/80 dark:text-dust-200/80">
          مجموع:
        </span>
        <div className="text-end">
          <span className="font-black text-base text-flora-900 dark:text-flora-300">
            {formatToman(group.totalToman)} تومان
          </span>
          {group.totalToman >= 1000 && (
            <span className="block text-[11px] font-normal text-soil-700/70 dark:text-dust-200/70">
              ({numberToWordsFa(group.totalToman)} تومان)
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

