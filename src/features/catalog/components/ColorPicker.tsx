'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { formatToman, toFa } from '@/lib/format';
import { useProductColor } from './ProductColorContext';
import type { BundleItem, ColorOption } from '@/lib/product-features';

type Props = {
  product: {
    id: string;
    name: string;
    colorOptions?: ColorOption[] | null;
    bundleSize?: number;
  };
  bundleItems?: BundleItem[] | null;
  limitingItemIndex?: number | null;
  limitingStock?: number | null;
};

// Check if color is light to show dark checkmark or darker border
function isLightColor(hex: string): boolean {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 180;
}

function ColorSwatchRow({
  label,
  colors,
  selectedColor,
  onSelect,
  required = false,
  isLimiting = false,
  limitingStock,
}: {
  label: string;
  colors: ColorOption[];
  selectedColor: string | null;
  onSelect: (color: string) => void;
  required?: boolean;
  isLimiting?: boolean;
  limitingStock?: number | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 1) {
      setCanScrollStart(false);
      setCanScrollEnd(false);
      return;
    }

    const scrollVal = Math.abs(el.scrollLeft);
    setCanScrollStart(scrollVal > 5);
    setCanScrollEnd(scrollVal < maxScroll - 5);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, colors]);

  const handleScroll = (direction: 'next' | 'prev') => {
    const el = scrollRef.current;
    if (!el) return;

    const step = 140;
    const delta = direction === 'next' ? -step : step;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (!colors.length) return null;

  const selectedOpt = selectedColor
    ? colors.find((c) => c.hexCode.toUpperCase() === selectedColor.toUpperCase())
    : null;

  return (
    <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${isLimiting ? 'text-amber-950 dark:text-amber-300 font-black' : 'text-soil-900 dark:text-dust-50'}`}>{label}</span>
          {isLimiting && (
            <span
              title={limitingStock !== undefined && limitingStock !== null ? `این آیتم سقف سفارش را به ${toFa(limitingStock)} عدد محدود کرده است` : undefined}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 dark:bg-amber-900/60 border border-amber-300/80 dark:border-amber-700/60 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-200 shadow-2xs"
            >
              <span>⚠️</span>
              <span>محدودیت موجودی{limitingStock !== undefined && limitingStock !== null ? ` (${toFa(limitingStock)} عدد)` : ''}</span>
            </span>
          )}
          {required && !selectedColor && (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
              انتخاب الزامی است
            </span>
          )}
        </div>
        {selectedColor && (
          <div className="flex items-center gap-1.5 text-xs text-soil-700/80 dark:text-dust-200/80">
            <span>انتخاب:</span>
            <span
              className="inline-block size-3.5 rounded-full border border-soil-900/20 dark:border-dust-50/20 shadow-2xs"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="font-mono text-[11px] dir-ltr text-soil-900 dark:text-dust-50 font-bold">
              {selectedColor}
            </span>
            {selectedOpt && (
              <>
                <span className={selectedOpt.stock > 0 ? "text-soil-700/60 dark:text-dust-300 font-medium" : "text-red-600 dark:text-red-400 font-bold"}>
                  ({selectedOpt.stock > 0 ? `موجودی: ${toFa(selectedOpt.stock)}` : 'ناموجود'})
                </span>
                {selectedOpt.priceAdjustment !== 0 && (
                  <span className="font-bold text-flora-700 dark:text-flora-400">
                    ({selectedOpt.priceAdjustment > 0 ? '+' : ''}{toFa(formatToman(selectedOpt.priceAdjustment))} تومان)
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="relative flex items-center gap-1.5">
        {/* Right Arrow (Scroll towards previous/start in RTL) */}
        <button
          type="button"
          onClick={() => handleScroll('prev')}
          disabled={!canScrollStart}
          aria-label="رنگ‌های قبلی"
          className="size-7 shrink-0 rounded-full border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 grid place-items-center text-soil-700 dark:text-dust-200 shadow-2xs transition hover:bg-dust-100 dark:hover:bg-flora-900 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Scrollable Swatches Container */}
        <div
          ref={scrollRef}
          className="flex flex-1 items-center gap-1.5 overflow-x-auto py-1 px-1 scroll-smooth no-scrollbar"
        >
          {colors.map((colorOpt) => {
            const hex = colorOpt.hexCode;
            const isOutOfStock = colorOpt.stock <= 0;
            const isSelected = selectedColor?.toUpperCase() === hex.toUpperCase();
            const light = isLightColor(hex);

            return (
              <button
                key={hex}
                type="button"
                onClick={() => onSelect(hex)}
                title={isOutOfStock ? `${hex} (ناموجود)` : hex}
                aria-label={`رنگ ${hex}${isOutOfStock ? ' (ناموجود)' : ''}`}
                aria-pressed={isSelected}
                className={`group relative w-6 h-6 shrink-0 rounded-full transition-all duration-150 focus:outline-none border border-soil-900/20 dark:border-dust-50/20 ${
                  isOutOfStock
                    ? 'opacity-30 cursor-not-allowed'
                    : 'cursor-pointer hover:scale-105'
                } ${
                  isSelected
                    ? 'ring-2 ring-flora-700 ring-offset-1 scale-105 shadow-xs'
                    : 'shadow-2xs'
                }`}
                style={{ backgroundColor: hex }}
              >
                {/* Red diagonal line if out of stock */}
                {isOutOfStock && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-full">
                    <span className="w-[140%] h-0.5 bg-red-600 rotate-45 transform" />
                  </span>
                )}

                {/* Subtle border for very light colors so they are distinct against white background */}
                {light && !isSelected && (
                  <span className="absolute inset-0 rounded-full border border-soil-900/25 dark:border-dust-50/30 pointer-events-none" />
                )}

                {/* Checkmark indicator when selected */}
                {isSelected && (
                  <span
                    className={`absolute inset-0 flex items-center justify-center ${
                      light ? 'text-soil-900' : 'text-white'
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Left Arrow (Scroll towards next/end in RTL) */}
        <button
          type="button"
          onClick={() => handleScroll('next')}
          disabled={!canScrollEnd}
          aria-label="رنگ‌های بعدی"
          className="size-7 shrink-0 rounded-full border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 grid place-items-center text-soil-700 dark:text-dust-200 shadow-2xs transition hover:bg-dust-100 dark:hover:bg-flora-900 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ColorPicker({
  product,
  bundleItems,
  limitingItemIndex,
  limitingStock,
}: Props) {
  const colorContext = useProductColor();
  const isBundle = (product.bundleSize ?? 1) > 1 || (bundleItems && bundleItems.length > 0);

  // If Context isn't wrapping this component, keep internal fallback
  const [internalSingleColor, setInternalSingleColor] = useState<string | null>(null);
  const [internalBundleColors, setInternalBundleColors] = useState<Record<number, string>>({});

  const selectedColor = colorContext ? colorContext.selectedColor : internalSingleColor;
  const setSelectedColor = colorContext ? colorContext.setSelectedColor : setInternalSingleColor;

  const selectedBundleColors = colorContext
    ? colorContext.selectedBundleColors
    : internalBundleColors;
  const setSelectedBundleColor = colorContext
    ? colorContext.setSelectedBundleColor
    : (idx: number, c: string) => setInternalBundleColors((prev) => ({ ...prev, [idx]: c }));

  const singleColors = product.colorOptions ?? [];
  const items = bundleItems ?? [];

  // TASK 3: If the product is a bundle, do NOT show a single row of swatches.
  // Instead, map through bundleItems and render a separate row of color swatches for each item.
  if (isBundle) {
    if (items.length === 0) return null;

    // Check if any bundle item has colorOptions
    const hasAnyColors = items.some(
      (it) => (it.colorOptions && it.colorOptions.length > 0) || singleColors.length > 0,
    );
    if (!hasAnyColors) return null;

    return (
      <section className="mt-6 space-y-3">
        <h3 className="text-sm font-black text-soil-900 dark:text-dust-50">
          انتخاب رنگ اقلام بسته ({toFa(items.length)} آیتم)
        </h3>
        <p className="text-xs text-soil-700/70 dark:text-dust-200/70">
          برای هر گلدان موجود در این بسته، رنگ مورد نظر خود را مشخص کنید:
        </p>

        <div className="space-y-3">
          {items.map((item, idx) => {
            // Use item's specific colorOptions, or fall back to package-level colorOptions
            const itemColors =
              item.colorOptions && item.colorOptions.length > 0
                ? item.colorOptions
                : singleColors;

            if (itemColors.length === 0) {
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50/60 dark:bg-flora-950/60 p-3 text-xs"
                >
                  <span className="font-bold text-soil-900 dark:text-dust-50">
                    رنگ گلدان {toFa(idx + 1)}{item.title ? `: ${item.title}` : ''}
                  </span>
                  <span className="text-soil-700/60 dark:text-dust-200/60">تک‌رنگ استاندارد (پیش‌فرض)</span>
                </div>
              );
            }

            return (
              <ColorSwatchRow
                key={idx}
                label={`رنگ گلدان ${toFa(idx + 1)}${item.title ? `: ${item.title}` : ''}`}
                colors={itemColors}
                selectedColor={selectedBundleColors[idx] ?? null}
                onSelect={(hex) => setSelectedBundleColor(idx, hex)}
                required
                isLimiting={limitingItemIndex === idx}
                limitingStock={limitingItemIndex === idx ? limitingStock : undefined}
              />
            );
          })}
        </div>
      </section>
    );
  }

  // TASK 2: Frontend UI (Single Product)
  if (!singleColors.length) return null;

  return (
    <section className="mt-6">
      <ColorSwatchRow
        label="انتخاب رنگ گلدان"
        colors={singleColors}
        selectedColor={selectedColor}
        onSelect={setSelectedColor}
      />
    </section>
  );
}
