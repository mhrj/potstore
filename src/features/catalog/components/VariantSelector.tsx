'use client';

import { formatToman, toFa } from '@/lib/format';

export type ProductVariantOption = {
  id: string;
  title: string;
  priceToman: number;
  stock: number;
  sku?: string | null;
  attributes?: unknown;
};

type VariantSelectorProps = {
  variants: ProductVariantOption[];
  selectedVariantId: string | null;
  onSelectVariant: (variantId: string) => void;
};

export default function VariantSelector({
  variants,
  selectedVariantId,
  onSelectVariant,
}: VariantSelectorProps) {
  if (!variants || variants.length === 0) return null;

  const activeVariant =
    variants.find((v) => v.id === selectedVariantId) ?? variants[0] ?? null;

  return (
    <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-soil-900 dark:text-dust-50">
          انتخاب سایز / مدل
        </h3>
        {activeVariant && (
          <span
            className={`text-xs font-medium ${
              activeVariant.stock > 0
                ? 'text-soil-700/70 dark:text-dust-200/70'
                : 'text-red-600 dark:text-red-400 font-bold'
            }`}
          >
            {activeVariant.stock > 0
              ? `موجودی: ${toFa(activeVariant.stock)} عدد`
              : 'ناموجود'}
          </span>
        )}
      </div>

      <div
        role="group"
        aria-label="انتخاب سایز / مدل"
        className="flex flex-wrap gap-2.5 pt-1"
      >
        {variants.map((variant) => {
          const isSelected = variant.id === selectedVariantId;
          const isOutOfStock = variant.stock <= 0;

          return (
            <button
              key={variant.id}
              type="button"
              disabled={isOutOfStock}
              onClick={() => onSelectVariant(variant.id)}
              aria-pressed={isSelected}
              aria-label={`${variant.title} - ${formatToman(variant.priceToman)} تومان${isOutOfStock ? ' (ناموجود)' : ''}`}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-flora-600 focus-visible:outline-none focus-visible:ring-offset-2 dark:focus-visible:ring-offset-flora-950 ${
                isOutOfStock
                  ? 'border-soil-900/10 dark:border-dust-50/10 bg-dust-50 dark:bg-flora-950/30 text-soil-700/50 dark:text-dust-300/50 opacity-60 cursor-not-allowed'
                  : isSelected
                    ? 'border-flora-800 bg-flora-900 text-white shadow-sm dark:border-flora-400 dark:bg-flora-600 cursor-pointer'
                    : 'border-soil-900/10 dark:border-dust-50/15 bg-dust-100 text-soil-900 hover:bg-dust-200 dark:bg-flora-950/60 dark:text-dust-100 dark:hover:bg-flora-950 cursor-pointer'
              }`}
            >
              <span className={isOutOfStock ? 'line-through' : ''}>
                {variant.title}
              </span>
              <span
                className={`text-[11px] font-semibold ${
                  isSelected
                    ? 'text-flora-100 dark:text-flora-50'
                    : 'text-flora-800 dark:text-flora-300'
                }`}
              >
                {formatToman(variant.priceToman)}
              </span>
              {isOutOfStock && (
                <span className="rounded-full bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                  ناموجود
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

