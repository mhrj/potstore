'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useTransition } from 'react';
import { formatToman, toFa } from '@/lib/format';
import { isUnoptimizedImage } from '@/lib/image-validation';
import { numberToWordsFa } from '@/lib/number-to-words';
import type { PricedLine } from '@/lib/pricing';
import ItemColorBadge from '@/features/catalog/components/ItemColorBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { extractColorName, formatSpecs, formatBundleBreakdown } from './OrderItemDetails';

export default function CartItemRow({ line, stock }: { line: PricedLine; stock: number }) {
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

  const colorName = extractColorName(line);
  const specs = formatSpecs(line);
  const bundleBreakdown = line.bundleSize > 1 && line.bundleItems ? formatBundleBreakdown(line.bundleItems) : null;

  return (
    <li className="flex gap-4 rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-4">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-white dark:bg-flora-950 border border-soil-900/5 dark:border-dust-50/10">
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.name}
            fill
            className="object-cover"
            sizes="96px"
            unoptimized={isUnoptimizedImage(line.imageUrl)}
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

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-soil-900 dark:text-dust-50">{line.name}</h2>
              {line.variantTitle && (
                <span className="text-xs font-bold text-flora-800 dark:text-flora-200 bg-flora-100/80 dark:bg-flora-900/80 px-2.5 py-0.5 rounded-lg border border-flora-300/40 dark:border-flora-700/40">
                  {line.variantTitle}
                </span>
              )}
              <ItemColorBadge colorData={line.colorData} />
              {line.colorAdjustment !== 0 && (
                <span className="text-[11px] font-bold text-flora-700 dark:text-flora-400 bg-flora-50 dark:bg-flora-950/60 px-2 py-0.5 rounded-md border border-flora-500/20">
                  (تغییر قیمت رنگ: {line.colorAdjustment > 0 ? '+' : ''}{toFa(formatToman(line.colorAdjustment))} تومان)
                </span>
              )}
            </div>
            <div className="mt-1 space-y-1">
              <p className="text-xs font-semibold text-soil-800 dark:text-dust-200">
                {toFa(line.bundleSize > 1 ? Math.round(qty / line.bundleSize) : qty)}{' '}
                {line.bundleSize > 1 ? 'بسته' : 'عدد'}
                {colorName ? ` - رنگ ${colorName}` : ''} -{' '}
                {formatToman(line.unitToman * (line.bundleSize > 1 ? line.bundleSize : 1))} تومان
              </p>

              {bundleBreakdown && (
                <p className="text-[11px] text-flora-800 dark:text-flora-300 font-medium bg-flora-50/70 dark:bg-flora-950/50 px-2 py-0.5 rounded-lg border border-flora-200/60 dark:border-flora-800/40">
                  {bundleBreakdown}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-soil-700/70 dark:text-dust-200/70">
                {specs && <span>{specs}</span>}
                <span className="rounded bg-flora-50 dark:bg-flora-950 px-1.5 py-0.5 text-[10px] text-flora-700 dark:text-flora-300 border border-flora-300/40 dark:border-flora-700">
                  سطح: {line.tierLabel}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            disabled={pending}
            aria-label="حذف از سبد"
            className="rounded-full p-1.5 text-soil-700/60 dark:text-dust-200/60 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 cursor-pointer"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-soil-900/10 dark:border-dust-50/20 dark:bg-flora-950 p-0.5">
              <button
                type="button"
                onClick={() => update(qty - line.bundleSize)}
                disabled={pending || qty <= line.bundleSize}
                aria-label="کاهش تعداد"
                className="grid size-8 place-items-center rounded-full text-base font-bold text-soil-900 dark:text-dust-50 transition hover:bg-dust-100 dark:hover:bg-flora-900 disabled:opacity-35"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-black text-soil-900 dark:text-dust-50">{toFa(qty)}</span>
              <button
                type="button"
                onClick={() => update(qty + line.bundleSize)}
                disabled={pending || qty + line.bundleSize > stock}
                aria-label="افزایش تعداد"
                className="grid size-8 place-items-center rounded-full text-base font-bold text-soil-900 dark:text-dust-50 transition hover:bg-dust-100 dark:hover:bg-flora-900 disabled:opacity-35"
              >
                +
              </button>
            </div>
            <span className="text-xs text-soil-700/80 dark:text-dust-200/80">
              {toFa(qty)} عدد {line.bundleSize > 1 && `(معادل ${toFa(qty / line.bundleSize)} بسته)`}
            </span>
          </div>

          <div className="text-end">
            <p className="text-sm font-black text-flora-900 dark:text-flora-300">
              {formatToman(line.lineTotalToman)}
            </p>
            {line.lineTotalToman >= 1000 && (
              <p className="text-[11px] font-normal text-soil-700/70 dark:text-dust-200/70">
                ({numberToWordsFa(line.lineTotalToman)} تومان)
              </p>
            )}
          </div>
        </div>

        {line.nextTier && (
          <p className="text-[11px] text-dust-500 dark:text-dust-400">
            {line.bundleSize > 1 ? (
              <>
                {toFa(Math.max(1, line.nextTier.minQuantity - Math.round(qty / line.bundleSize)))} بسته دیگر → هر بسته{' '}
                {formatToman(line.nextTier.unitPriceToman)}
              </>
            ) : (
              <>
                {toFa(Math.max(1, line.nextTier.minQuantity - qty))} عدد دیگر → هر عدد{' '}
                {formatToman(line.nextTier.unitPriceToman)}
              </>
            )}
          </p>
        )}

        {error && (
          <p role="alert" className="text-[11px] font-bold text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

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
    </li>
  );
}
