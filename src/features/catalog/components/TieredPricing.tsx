'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { formatToman, formatWeight, toFa } from '@/lib/format';
import { numberToWordsFa } from '@/lib/number-to-words';
import { nextTierHint, resolveTier, type Tier } from '@/lib/pricing';
import type { BundleItem, ColorOption } from '@/lib/product-features';
import { useProductColor } from './ProductColorContext';

export type LimitingItem = {
  itemIndex: number;
  itemName: string;
  colorName: string;
  stock: number;
};

const DEFAULT_COLOR_NAMES: Record<string, string> = {
  '#000000': 'مشکی',
  '#1F1F1F': 'مشکی',
  '#111111': 'مشکی',
  '#222222': 'مشکی',
  '#FFFFFF': 'سفید',
  '#FAFAFA': 'سفید',
  '#F5F5F5': 'سفید',
  '#C86A4B': 'تراکوتا',
  '#D3D3D3': 'طوسی روشن',
  '#808080': 'طوسی',
  '#8B8B8B': 'طوسی',
  '#A9A9A9': 'طوسی تیره',
  '#E8D8C8': 'خاکی / کرم',
  '#F5F5DC': 'کرم',
  '#7A8B7B': 'سبز صدری',
  '#4A3525': 'قهوه‌ای سوخته',
  '#8D5B4C': 'قهوه‌ای',
  '#8B4513': 'قهوه‌ای',
  '#A52A2A': 'قهوه‌ای',
  '#E0A899': 'گلبهی',
  '#F5EBE6': 'استخوانی',
  '#FF0000': 'قرمز',
  '#0000FF': 'آبی',
  '#008000': 'سبز',
  '#FFFF00': 'زرد',
  '#FFA500': 'نارنجی',
  '#800080': 'بنفش',
  '#FFC0CB': 'صورتی',
  '#D4AF37': 'طلایی',
  '#C0C0C0': 'نقره‌ای',
};

const ORDINAL_ITEM_NAMES = [
  'گلدان اول',
  'گلدان دوم',
  'گلدان سوم',
  'گلدان چهارم',
  'گلدان پنجم',
  'گلدان ششم',
  'گلدان هفتم',
  'گلدان هشتم',
  'گلدان نهم',
  'گلدان دهم',
];

function getColorName(
  hex: string,
  optName?: string,
  globalColors?: Array<{ name: string; hexCode: string }>,
): string {
  if (optName && optName.trim()) return optName.trim();
  const normalized = hex.trim().toUpperCase();

  if (globalColors && globalColors.length > 0) {
    const found = globalColors.find(
      (c) => c.hexCode.trim().toUpperCase() === normalized,
    );
    if (found && found.name) return found.name;
  }

  if (DEFAULT_COLOR_NAMES[normalized]) {
    return DEFAULT_COLOR_NAMES[normalized];
  }

  let expanded = normalized;
  if (!expanded.startsWith('#')) expanded = `#${expanded}`;
  if (/^#([0-9A-F]{3})$/.test(expanded)) {
    expanded = `#${expanded[1]}${expanded[1]}${expanded[2]}${expanded[2]}${expanded[3]}${expanded[3]}`;
    if (DEFAULT_COLOR_NAMES[expanded]) return DEFAULT_COLOR_NAMES[expanded];
  }

  return hex;
}

type Props = {
  product: {
    id: string;
    name: string;
    basePriceToman: number;
    salePriceToman?: number | null;
    weightGrams: number;
    unitsPerCarton?: number;
    stock: number;
    bundleSize?: number;
    bundleItems?: BundleItem[] | null;
    colorOptions?: ColorOption[] | null;
    variants?: Array<{
      id: string;
      title: string;
      priceToman: number;
      stock: number;
      sku?: string | null;
      attributes?: unknown;
    }>;
    minOrderQuantity?: number;
    allowBatchDiscount?: boolean;
  };
  tiers: Tier[];
  isAuthed: boolean;
  allowBatchDiscount?: boolean;
  globalColors?: Array<{ name: string; hexCode: string }>;
};

export default function TieredPricing({
  product,
  tiers,
  isAuthed,
  allowBatchDiscount,
  globalColors,
}: Props) {
  const allowBatch = allowBatchDiscount ?? product.allowBatchDiscount ?? true;
  const bundleSize = Math.max(1, product.bundleSize ?? 1);
  const isBundle = bundleSize > 1;
  const colorCtx = useProductColor();

  const hasVariants = !isBundle && Boolean(product.variants && product.variants.length > 0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasVariants && product.variants && product.variants.length > 0 ? product.variants[0].id : null,
  );

  const activeVariant = useMemo(() => {
    if (!hasVariants || !product.variants) return null;
    return (
      product.variants.find((v) => v.id === selectedVariantId) ??
      product.variants[0] ??
      null
    );
  }, [hasVariants, product.variants, selectedVariantId]);

  const minCount = isBundle
    ? Math.max(1, Math.ceil((product.minOrderQuantity || 1) / bundleSize))
    : Math.max(1, product.minOrderQuantity || 1);

  const { maxCount, limitingItem } = useMemo(() => {
    if (!isBundle) {
      if (hasVariants && activeVariant) {
        return {
          maxCount: Math.max(0, activeVariant.stock),
          limitingItem: null,
        };
      }
      const singleColors = product.colorOptions ?? [];
      if (singleColors.length > 0 && colorCtx?.selectedColor) {
        const opt = singleColors.find(
          (c) => c.hexCode.toUpperCase() === colorCtx.selectedColor?.toUpperCase(),
        );
        if (opt) {
          const colorName = getColorName(opt.hexCode, opt.name, globalColors);
          return {
            maxCount: Math.max(0, opt.stock),
            limitingItem: opt.stock < product.stock ? {
              itemIndex: 0,
              itemName: product.name,
              colorName,
              stock: opt.stock,
            } : null,
          };
        }
      }
      return {
        maxCount: Math.max(0, product.stock),
        limitingItem: null,
      };
    }

    const items = product.bundleItems ?? [];
    if (items.length === 0) {
      return {
        maxCount: Math.max(0, Math.floor(product.stock / bundleSize)),
        limitingItem: null,
      };
    }

    const packageMaxCount = Math.floor(product.stock / bundleSize);
    let minColorStock = packageMaxCount;
    let bottleneck: LimitingItem | null = null;
    let lowestSelectedStock = Infinity;

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const itemColors = it.colorOptions ?? [];
      if (itemColors.length > 0) {
        const selectedHex = colorCtx?.selectedBundleColors[idx];
        if (selectedHex) {
          const opt = itemColors.find(
            (c) => c.hexCode.toUpperCase() === selectedHex.toUpperCase(),
          );
          const s = opt ? opt.stock : 0;
          if (s < lowestSelectedStock) {
            lowestSelectedStock = s;
            const cName = getColorName(selectedHex, opt?.name, globalColors);
            const iName = it.title?.trim() || ORDINAL_ITEM_NAMES[idx] || `گلدان ${toFa(idx + 1)}`;
            bottleneck = {
              itemIndex: idx,
              itemName: iName,
              colorName: cName,
              stock: s,
            };
          }
          minColorStock = Math.min(minColorStock, s);
        } else {
          const maxAvail = Math.max(0, ...itemColors.map((c) => c.stock));
          minColorStock = Math.min(minColorStock, maxAvail);
        }
      }
    }

    const limitingItem =
      bottleneck && lowestSelectedStock <= packageMaxCount ? bottleneck : null;

    return {
      maxCount: Math.max(0, minColorStock),
      limitingItem,
    };
  }, [
    isBundle,
    hasVariants,
    activeVariant,
    product.bundleItems,
    product.colorOptions,
    product.name,
    product.stock,
    bundleSize,
    colorCtx?.selectedBundleColors,
    colorCtx?.selectedColor,
    globalColors,
  ]);

  const maxAllowedQty = isBundle ? maxCount * bundleSize : maxCount;
  const isColorStockLimited = isBundle
    ? maxCount < Math.floor(product.stock / bundleSize)
    : maxCount < product.stock;

  const [count, setCount] = useState<number>(minCount);
  const [colorStockWarning, setColorStockWarning] = useState<string | null>(null);
  const [shakePlus, setShakePlus] = useState(false);
  const [limitError, setLimitError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (limitError) {
      const timer = setTimeout(() => setLimitError(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [limitError]);

  useEffect(() => {
    if (shakePlus) {
      const timer = setTimeout(() => setShakePlus(false), 500);
      return () => clearTimeout(timer);
    }
  }, [shakePlus]);

  const handleIncrement = () => {
    if (count >= maxCount) {
      setShakePlus(true);
      setLimitError(true);
      return;
    }
    setCount((c) => clamp(c + 1));
  };

  useEffect(() => {
    if (isBundle && maxCount > 0 && count > maxCount) {
      setCount(maxCount);
      setColorStockWarning('تعداد سفارش به دلیل موجودی رنگ انتخاب شده کاهش یافت.');
      const timer = setTimeout(() => {
        setColorStockWarning(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isBundle, maxCount, count]);

  useEffect(() => {
    if (hasVariants && activeVariant) {
      const currentMax = Math.max(0, activeVariant.stock);
      if (count > currentMax && currentMax >= minCount) {
        setCount(currentMax);
      } else if (count < minCount) {
        setCount(minCount);
      }
    }
  }, [hasVariants, activeVariant, count, minCount]);

  const hasSale =
    !hasVariants &&
    typeof product.salePriceToman === 'number' &&
    product.salePriceToman > 0 &&
    product.salePriceToman < product.basePriceToman;

  const totalColorAdjustment = useMemo(() => {
    if (!isBundle) {
      if (!colorCtx?.selectedColor) return 0;
      const opt = (product.colorOptions ?? []).find(
        (c) => c.hexCode.toUpperCase() === colorCtx.selectedColor?.toUpperCase(),
      );
      return opt?.priceAdjustment ?? 0;
    }
    let sum = 0;
    const items = product.bundleItems ?? [];
    for (let idx = 0; idx < items.length; idx++) {
      const selectedHex = colorCtx?.selectedBundleColors[idx];
      if (selectedHex) {
        const opt = (items[idx].colorOptions ?? []).find(
          (c) => c.hexCode.toUpperCase() === selectedHex.toUpperCase(),
        );
        if (opt?.priceAdjustment) {
          sum += opt.priceAdjustment;
        }
      }
    }
    return sum;
  }, [
    isBundle,
    colorCtx?.selectedColor,
    colorCtx?.selectedBundleColors,
    product.colorOptions,
    product.bundleItems,
  ]);

  const rawBasePrice =
    hasVariants && activeVariant
      ? activeVariant.priceToman
      : hasSale
        ? product.salePriceToman!
        : product.basePriceToman;
  const effectiveBasePrice = rawBasePrice + totalColorAdjustment;

  const sorted = useMemo(
    () => [...tiers].sort((a, b) => a.minQuantity - b.minQuantity),
    [tiers],
  );

  const { packagePrice, unitEquivalent, total, savings, percent, tierLabel, hint } =
    useMemo(() => {
      const basePackagePrice =
        (hasVariants && activeVariant ? activeVariant.priceToman : product.basePriceToman) +
        totalColorAdjustment;
      if (!allowBatch) {
        const pkgPrice = effectiveBasePrice;
        const tot = pkgPrice * count;
        const save = Math.max(0, (basePackagePrice - pkgPrice) * count);
        const pct =
          basePackagePrice > 0
            ? Math.round(((basePackagePrice - pkgPrice) / basePackagePrice) * 100)
            : 0;
        return {
          packagePrice: pkgPrice,
          unitEquivalent: Math.round(pkgPrice / bundleSize),
          total: tot,
          savings: save,
          percent: pct,
          tierLabel: hasSale ? 'تخفیف ویژه' : 'خرده',
          hint: null,
        };
      }

      const t = resolveTier(sorted, count, effectiveBasePrice, product.basePriceToman);
      const pkgPrice = Math.min(t.unitPriceToman || effectiveBasePrice, effectiveBasePrice);
      const tot = pkgPrice * count;
      const save = Math.max(0, (basePackagePrice - pkgPrice) * count);
      const pct =
        basePackagePrice > 0
          ? Math.round(((basePackagePrice - pkgPrice) / basePackagePrice) * 100)
          : 0;

      return {
        packagePrice: pkgPrice,
        unitEquivalent: Math.round(pkgPrice / bundleSize),
        total: tot,
        savings: save,
        percent: pct,
        tierLabel: t.label ?? (hasSale ? 'تخفیف ویژه' : 'خرده'),
        hint: nextTierHint(sorted, count, effectiveBasePrice, product.basePriceToman),
      };
    }, [
      allowBatch,
      count,
      sorted,
      hasVariants,
      activeVariant,
      product.basePriceToman,
      totalColorAdjustment,
      effectiveBasePrice,
      hasSale,
      bundleSize,
    ]);

  const totalUnits = isBundle ? count * bundleSize : count;
  const singleBundleWeight = isBundle
    ? ((product.bundleItems ?? []).reduce((sum, item) => sum + (item.weightGrams || 0), 0) || product.weightGrams)
    : product.weightGrams;
  const totalWeight = singleBundleWeight * count;

  const clamp = (n: number) => {
    const val = Math.floor(n) || minCount;
    return Math.max(minCount, Math.min(maxCount, val));
  };

  const handleAdd = () => {
    setError(null);
    setAdded(false);

    if (!isAuthed) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const singleColors = product.colorOptions ?? [];
    let selectedColorObj: ColorOption | undefined = undefined;
    let bundleColorsData: Record<number, { hexCode: string; stock: number }> | undefined = undefined;

    if (isBundle) {
      const items = product.bundleItems ?? [];
      const itemsNeedingColor = items
        .map((it, idx) => ({ it, idx }))
        .filter(({ it }) => it.colorOptions && it.colorOptions.length > 0);

      if (itemsNeedingColor.length > 0) {
        for (const { it, idx } of itemsNeedingColor) {
          const chosenHex = colorCtx?.selectedBundleColors[idx];
          if (!chosenHex) {
            setError(
              `لطفاً رنگ ${it.title ? `«${it.title}» (گلدان ${toFa(idx + 1)})` : `گلدان ${toFa(idx + 1)}`} را انتخاب کنید.`,
            );
            return;
          }
          const opt = it.colorOptions?.find(
            (c) => c.hexCode.toUpperCase() === chosenHex.toUpperCase(),
          );
          if (opt && opt.stock < count) {
            setError(`موجودی رنگ ${chosenHex} برای این تعداد کافی نیست.`);
            return;
          }
        }
        const bundleObj: Record<number, { hexCode: string; stock: number }> = {};
        for (const [idxStr, hex] of Object.entries(colorCtx?.selectedBundleColors ?? {})) {
          const i = Number(idxStr);
          const item = items[i];
          const opt = item?.colorOptions?.find(
            (c) => c.hexCode.toUpperCase() === hex.toUpperCase(),
          );
          bundleObj[i] = {
            hexCode: hex,
            stock: opt ? opt.stock : product.stock,
          };
        }
        bundleColorsData = bundleObj;
      }
    } else {
      if (hasVariants) {
        if (!activeVariant) {
          setError('لطفاً یک مدل یا سایز انتخاب کنید.');
          return;
        }
        if (activeVariant.stock < count) {
          setError(`موجودی مدل «${activeVariant.title}» برای این تعداد کافی نیست.`);
          return;
        }
      }
      if (singleColors.length > 0) {
        if (!colorCtx?.selectedColor) {
          setError('لطفاً رنگ مورد نظر خود را انتخاب کنید.');
          return;
        }
        const chosenHex = colorCtx.selectedColor;
        const opt = singleColors.find(
          (c) => c.hexCode.toUpperCase() === chosenHex.toUpperCase(),
        );
        selectedColorObj = opt ?? { hexCode: chosenHex, stock: product.stock, priceAdjustment: 0 };
        if (selectedColorObj.stock < count) {
          setError(`موجودی رنگ ${chosenHex} برای این تعداد کافی نیست.`);
          return;
        }
      }
    }

    startTransition(async () => {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          variantId: hasVariants && activeVariant ? activeVariant.id : undefined,
          quantity: totalUnits,
          color: selectedColorObj ? selectedColorObj.hexCode : undefined,
          selectedColor: selectedColorObj,
          bundleColors: bundleColorsData ?? colorCtx?.selectedBundleColors,
          colorAdjustment: totalColorAdjustment,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? 'افزودن به سبد ناموفق بود');
        return;
      }
      setAdded(true);
      router.refresh();
    });
  };

  function isBundleAvailable(): boolean {
    if (!isBundle) {
      if (hasVariants && activeVariant) {
        return activeVariant.stock >= count;
      }
      const singleColors = product.colorOptions ?? [];
      if (singleColors.length > 0) {
        if (!colorCtx?.selectedColor) {
          return singleColors.some((c) => c.stock >= count);
        }
        const opt = singleColors.find(
          (c) => c.hexCode.toUpperCase() === colorCtx.selectedColor?.toUpperCase(),
        );
        return Boolean(opt && opt.stock >= count);
      }
      return product.stock >= count;
    }

    const items = product.bundleItems ?? [];
    if (items.length === 0) {
      return product.stock >= count * bundleSize;
    }

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const itemColors = it.colorOptions ?? [];
      if (itemColors.length > 0) {
        const selectedHex = colorCtx?.selectedBundleColors[idx];
        if (selectedHex) {
          const selectedOpt = itemColors.find(
            (c) => c.hexCode.toUpperCase() === selectedHex.toUpperCase(),
          );
          if (!selectedOpt || selectedOpt.stock < count) {
            return false;
          }
        } else {
          const hasInStockColor = itemColors.some((c) => c.stock >= count);
          if (!hasInStockColor) return false;
        }
      } else {
        if (product.stock < count * bundleSize) {
          return false;
        }
      }
    }

    return true;
  }

  const outOfStock = isBundle
    ? !isBundleAvailable() || maxCount < minCount
    : hasVariants && activeVariant
      ? activeVariant.stock <= 0 || maxCount < minCount || count > activeVariant.stock
      : !isBundleAvailable() || product.stock <= 0 || maxCount < minCount;

  return (
    <div className="space-y-6">
      {/* For regular products: Variant pills selector if variants exist */}
      {hasVariants && product.variants && product.variants.length > 0 && (
        <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-soil-900 dark:text-dust-50">
              انتخاب سایز / مدل
            </h3>
            {activeVariant && (
              <span className="text-xs text-soil-700/70 dark:text-dust-200/70 font-medium">
                موجودی: {toFa(activeVariant.stock)} عدد
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5 pt-1">
            {product.variants.map((v) => {
              const isSelected = v.id === activeVariant?.id;
              const isOutOfStock = v.stock <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVariantId(v.id);
                    setError(null);
                    setLimitError(false);
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${v.title} - ${formatToman(v.priceToman)} تومان${isOutOfStock ? ' (ناموجود)' : ''}`}
                  className={`group relative flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs transition-all ${
                    isSelected
                      ? 'border-flora-600 bg-flora-50/80 dark:bg-flora-950/80 dark:border-flora-500 shadow-xs ring-1 ring-flora-600 dark:ring-flora-500'
                      : 'border-soil-900/10 dark:border-dust-50/10 bg-dust-50/50 dark:bg-flora-950/40 hover:border-soil-900/25 dark:hover:border-dust-50/30'
                  } ${isOutOfStock ? 'opacity-55' : ''}`}
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      isSelected
                        ? 'bg-flora-600 dark:bg-flora-400'
                        : isOutOfStock
                          ? 'bg-red-400'
                          : 'bg-soil-400 dark:bg-dust-400'
                    }`}
                  />
                  <span className="font-bold text-soil-900 dark:text-dust-50 text-sm">
                    {v.title}
                  </span>
                  <span className="font-bold text-flora-800 dark:text-flora-300 mr-1.5">
                    {formatToman(v.priceToman)}
                    <span className="text-[10px] font-normal text-soil-700/70 dark:text-dust-200/70 mr-1">
                      تومان
                    </span>
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
      )}
      {/* For bundles: Swatches for each bundle item before pricing & quantity */}
      {isBundle &&
        product.bundleItems &&
        product.bundleItems.some((it) => (it.colorOptions ?? []).length > 0) && (
          <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-soil-900 dark:text-dust-50">
                انتخاب رنگ برای اقلام بسته
              </h3>
              <p className="mt-0.5 text-xs text-soil-700/60 dark:text-dust-200/60">
                برای هر گلدان موجود در این پکیج، رنگ مورد نظر خود را مشخص کنید:
              </p>
            </div>

            <div className="space-y-4 divide-y divide-soil-900/5 dark:divide-dust-50/5">
              {product.bundleItems.map((item, idx) => {
                const itemColors = item.colorOptions ?? [];
                if (itemColors.length === 0) return null;

                const selectedHex = colorCtx?.selectedBundleColors[idx] ?? null;

                return (
                  <div key={idx} className={idx > 0 ? 'pt-3.5 space-y-2' : 'space-y-2'}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold transition-colors ${
                          limitingItem?.itemIndex === idx ? 'text-amber-950 dark:text-amber-300 font-black' : 'text-soil-900 dark:text-dust-50'
                        }`}>
                          رنگ {item.title || `گلدان ${toFa(idx + 1)}`}
                        </span>
                        {limitingItem?.itemIndex === idx && (
                          <span
                            title={`این آیتم سقف سفارش را به ${toFa(limitingItem.stock)} عدد محدود کرده است`}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 dark:bg-amber-900/60 border border-amber-300/80 dark:border-amber-700/60 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-200 shadow-2xs"
                          >
                            <span>⚠️</span>
                            <span>محدودیت موجودی ({toFa(limitingItem.stock)} عدد)</span>
                          </span>
                        )}
                      </div>
                      {selectedHex ? (
                        <div className="flex items-center gap-1.5 text-soil-700/80 dark:text-dust-200/80 font-mono text-[11px] dir-ltr">
                          <span
                            className="size-3.5 rounded-full border border-soil-900/20 dark:border-dust-50/20 shadow-2xs"
                            style={{ backgroundColor: selectedHex }}
                          />
                          <span>{selectedHex}</span>
                          {(() => {
                            const opt = itemColors.find(
                              (c) => c.hexCode.toUpperCase() === selectedHex.toUpperCase(),
                            );
                            if (opt && opt.priceAdjustment !== 0) {
                              return (
                                <span className="font-sans font-bold text-flora-700 dark:text-flora-400 dir-rtl text-[10px]">
                                  ({opt.priceAdjustment > 0 ? '+' : ''}
                                  {toFa(formatToman(opt.priceAdjustment))} تومان)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full font-medium">
                          انتخاب الزامی
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2.5 py-1.5 px-0.5">
                      {itemColors.map((colorOpt) => {
                        const hex = colorOpt.hexCode;
                        const isOutOfStock = colorOpt.stock <= 0;
                        const isSelected = selectedHex?.toUpperCase() === hex.toUpperCase();
                        const isLight = (() => {
                          const clean = hex.replace('#', '');
                          const r = parseInt(clean.substring(0, 2), 16) || 0;
                          const g = parseInt(clean.substring(2, 4), 16) || 0;
                          const b = parseInt(clean.substring(4, 6), 16) || 0;
                          return (r * 299 + g * 587 + b * 114) / 1000 > 180;
                        })();

                        return (
                          <div key={hex} className="flex flex-col items-center gap-1 min-w-9">
                            <button
                              type="button"
                              onClick={() => colorCtx?.setSelectedBundleColor(idx, hex)}
                              title={`موجودی: ${toFa(colorOpt.stock)} عدد`}
                              aria-label={`رنگ ${hex}${isOutOfStock ? ' (ناموجود)' : ` - موجودی: ${toFa(colorOpt.stock)} عدد`}`}
                              className={`group relative size-7 shrink-0 rounded-full transition-all focus:outline-none border border-soil-900/20 dark:border-dust-50/20 ${
                                isOutOfStock
                                  ? 'opacity-35 cursor-not-allowed'
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
                              {isLight && !isSelected && (
                                <span className="absolute inset-0 rounded-full border border-soil-900/25 dark:border-dust-50/30 pointer-events-none" />
                              )}
                              {isSelected && (
                                <span
                                  className={`absolute inset-0 flex items-center justify-center ${
                                    isLight ? 'text-soil-900' : 'text-white'
                                  }`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                              )}
                            </button>
                            <span
                              className={`text-[10px] leading-tight select-none text-center ${
                                colorOpt.stock > 0
                                  ? 'text-soil-700/80 dark:text-dust-300 font-medium'
                                  : 'text-red-600 dark:text-red-400 font-bold'
                              }`}
                            >
                              {colorOpt.stock > 0 ? `${toFa(colorOpt.stock)} عدد` : 'ناموجود'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {allowBatch && sorted.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900">
          <table className="w-full text-sm">
            <caption className="sr-only">ماتریس قیمت بر اساس تعداد</caption>
            <thead className="bg-dust-50 dark:bg-flora-950">
              <tr className="text-soil-700/70 dark:text-dust-200/70">
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {isBundle ? 'تعداد بسته' : 'تعداد'}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {isBundle ? 'قیمت هر بسته' : 'قیمت هر عدد'}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">تخفیف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soil-900/5 dark:divide-dust-50/5">
              {sorted.map((t, i) => {
                const isActive =
                  count >= t.minQuantity &&
                  (i === sorted.length - 1 || count < sorted[i + 1].minQuantity);
                const tierResolved = resolveTier(sorted, t.minQuantity, effectiveBasePrice, product.basePriceToman);
                const tierUnitPrice = tierResolved.unitPriceToman;
                const baseRefPrice =
                  (hasVariants && activeVariant ? activeVariant.priceToman : product.basePriceToman) +
                  totalColorAdjustment;
                const off =
                  baseRefPrice > 0
                    ? Math.round(
                        ((baseRefPrice - tierUnitPrice) /
                          baseRefPrice) *
                          100,
                      )
                    : 0;
                const rangeEnd = sorted[i + 1] ? sorted[i + 1].minQuantity - 1 : null;
                return (
                  <tr
                    key={t.minQuantity}
                    className={isActive ? 'bg-flora-100/60 dark:bg-flora-900/40' : undefined}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <td className="px-4 py-3.5 font-medium text-soil-900 dark:text-dust-50">
                      {rangeEnd
                        ? `${toFa(t.minQuantity)} تا ${toFa(rangeEnd)} ${isBundle ? 'بسته' : 'عدد'}`
                        : `${toFa(t.minQuantity)} ${isBundle ? 'بسته' : 'عدد'} به بالا`}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-flora-900 dark:text-flora-300">
                      <div>
                        <span>{formatToman(tierUnitPrice)}</span>
                        {tierUnitPrice >= 1000 && (
                          <span className="block text-[11px] font-normal text-soil-700/70 dark:text-dust-200/70">
                            ({numberToWordsFa(tierUnitPrice)} تومان)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {off > 0 ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{toFa(off)}٪</span>
                      ) : (
                        <span className="text-dust-400 dark:text-dust-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm font-bold text-soil-900 dark:text-dust-50">
            {isBundle ? (
              <span>
                تعداد بسته: {toFa(count)} بسته{' '}
                <span className="font-normal text-xs text-soil-700/70 dark:text-dust-200/70">
                  (شامل {toFa(totalUnits)} عدد گلدان)
                </span>
              </span>
            ) : (
              <span>
                تعداد: {toFa(count)} عدد
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-soil-900/10 dark:border-dust-50/20 dark:bg-flora-950 p-1">
            <button
              type="button"
              onClick={() => setCount((c) => clamp(c - 1))}
              disabled={count <= minCount}
              aria-label={isBundle ? 'کاهش تعداد بسته' : 'کاهش تعداد'}
              className="grid size-9 place-items-center rounded-full text-lg font-bold text-soil-900 dark:text-dust-50 transition hover:bg-dust-100 dark:hover:bg-flora-900 disabled:opacity-35"
            >
              −
            </button>
            <input
              id="quantity-input"
              name="quantity"
              type="number"
              inputMode="numeric"
              step={1}
              min={minCount}
              max={maxCount}
              value={count}
              onChange={(e) => setCount(clamp(Number(e.target.value)))}
              aria-label={isBundle ? 'تعداد بسته سفارش' : 'تعداد سفارش'}
              className="w-16 border-0 bg-transparent text-center text-base font-black text-soil-900 dark:text-dust-50 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <motion.button
              type="button"
              onClick={handleIncrement}
              animate={shakePlus ? { x: [-5, 5, -5, 5, -2, 2, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              aria-label={isBundle ? 'افزایش تعداد بسته' : 'افزایش تعداد'}
              className={`grid size-9 place-items-center rounded-full text-lg font-bold text-soil-900 dark:text-dust-50 transition hover:bg-dust-100 dark:hover:bg-flora-900 ${
                count >= maxCount ? 'opacity-40 hover:bg-red-50 dark:hover:bg-red-950/40' : ''
              }`}
            >
              +
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {limitError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1"
            >
              <span>⚠️</span>
              <span>موجودی کافی نیست</span>
            </motion.p>
          )}
        </AnimatePresence>

        {count >= maxCount && maxCount > 0 && (
          <div className="mt-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/50 px-3.5 py-2.5 text-xs font-semibold text-amber-900 dark:text-amber-200 leading-relaxed">
            <span className="shrink-0 text-sm">⚠️</span>
            <span className="flex-1 break-words">
              {limitingItem ? (
                <>
                  محدودیت موجودی: رنگ <strong className="font-bold text-amber-950 dark:text-amber-100">{limitingItem.colorName}</strong> برای <strong className="font-bold text-amber-950 dark:text-amber-100">{limitingItem.itemName}</strong> تنها <strong className="font-bold text-amber-950 dark:text-amber-100">{toFa(limitingItem.stock)} عدد</strong> موجود دارد.
                </>
              ) : isBundle ? (
                <>
                  حداکثر تعداد قابل سفارش با این ترکیب رنگ: {toFa(maxAllowedQty / bundleSize)} بسته است.
                </>
              ) : (
                <>
                  حداکثر تعداد قابل سفارش: {toFa(maxCount)} عدد است.
                </>
              )}
            </span>
          </div>
        )}

        <AnimatePresence>
          {colorStockWarning && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/50 px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-200"
            >
              <span>ℹ️</span>
              <span>{colorStockWarning}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {allowBatch && sorted.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sorted.map((t) => (
              <button
                key={t.minQuantity}
                type="button"
                onClick={() => setCount(clamp(t.minQuantity))}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  count >= t.minQuantity &&
                  resolveTier(sorted, count, effectiveBasePrice, product.basePriceToman).minQuantity === t.minQuantity
                    ? 'bg-flora-900 text-white dark:bg-flora-700'
                    : 'bg-dust-100 dark:bg-flora-900/50 text-soil-700 dark:text-dust-200 transition-colors hover:bg-dust-200 dark:hover:bg-flora-950'
                }`}
              >
                {t.label ?? 'پله'} · {toFa(t.minQuantity)}+ {isBundle ? 'بسته' : ''}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {allowBatch && hint && (
            <motion.button
              type="button"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onClick={() => setCount(clamp(hint.minQuantity))}
              className="mt-4 block w-full rounded-xl bg-dust-100 dark:bg-flora-900/50 px-4 py-3 text-start text-xs leading-6 text-soil-700 dark:text-dust-200 transition-colors hover:bg-dust-200 dark:hover:bg-flora-950"
            >
              <span className="font-bold text-dust-500 dark:text-dust-400">
                {toFa(hint.minQuantity - count)} {isBundle ? 'بسته' : 'عدد'} دیگر
              </span>{' '}
              اضافه کن و هر {isBundle ? 'بسته' : 'عدد'} را{' '}
              <span className="font-bold text-soil-900 dark:text-dust-50">
                {formatToman(hint.unitPriceToman - packagePrice)}
              </span>{' '}
              ارزان‌تر بخر — مجموعاً{' '}
              <span className="font-bold text-flora-700 dark:text-flora-300">
                {formatToman(hint.saveMoreToman)}
              </span>{' '}
              بیشتر صرفه‌جویی کن.
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        layout
        className="rounded-2xl border border-flora-500/20 dark:border-flora-500/30 bg-flora-100/40 dark:bg-flora-900/60 p-5"
      >
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-soil-700/70 dark:text-dust-200/70">
              {isBundle
                ? 'قیمت پکیج (در این پله)'
                : hasVariants && activeVariant
                  ? `قیمت (${activeVariant.title})`
                  : 'قیمت هر عدد'}
            </dt>
            <dd className="mt-1">
              {hasSale && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-bold line-through text-soil-700/50 dark:text-dust-200/50">
                    {formatToman(product.basePriceToman)}
                  </span>
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                    تخفیف ویژه
                  </span>
                </div>
              )}
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-xl font-black ${hasSale ? 'text-red-600 dark:text-red-400' : 'text-soil-900 dark:text-dust-50'}`}>
                  {formatToman(packagePrice)}
                </span>
                {totalColorAdjustment !== 0 && (
                  <span className="text-xs font-medium text-flora-700 dark:text-flora-400">
                    (شامل تغییر قیمت رنگ:{' '}
                    {totalColorAdjustment > 0 ? '+' : ''}
                    {toFa(formatToman(totalColorAdjustment))} تومان)
                  </span>
                )}
              </div>
              {packagePrice > 0 && (
                <span className="block text-xs font-semibold text-soil-700/80 dark:text-dust-200/80 mt-0.5">
                  ({numberToWordsFa(packagePrice)} تومان)
                </span>
              )}
              {isBundle && (
                <span className="block text-xs font-normal text-soil-700/70 dark:text-dust-200/70 mt-1">
                  (معادل {formatToman(unitEquivalent)} تومان برای هر عدد)
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-soil-700/70 dark:text-dust-200/70">مبلغ کل</dt>
            <dd className="mt-1">
              {hasSale && (
                <div className="mb-1 text-xs font-bold line-through text-soil-700/50 dark:text-dust-200/50">
                  {formatToman(product.basePriceToman * count)}
                </div>
              )}
              <span className="text-xl font-black text-flora-900 dark:text-flora-300">
                {formatToman(total)}
              </span>
              {total > 0 && (
                <span className="block text-xs font-semibold text-flora-700/80 dark:text-flora-300/80 mt-0.5">
                  ({numberToWordsFa(total)} تومان)
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-soil-700/70 dark:text-dust-200/70">وزن تقریبی</dt>
            <dd className="mt-1 font-bold text-soil-900 dark:text-dust-50">
              {formatWeight(totalWeight)}
            </dd>
          </div>
          <div>
            <dt className="text-soil-700/70 dark:text-dust-200/70">تعداد کل</dt>
            <dd className="mt-1 font-bold text-soil-900 dark:text-dust-50">
              {isBundle ? (
                <>
                  {toFa(count)} بسته
                  <span className="block text-xs text-soil-700/60 dark:text-dust-200/60 mt-1">
                    (شامل {toFa(totalUnits)} عدد گلدان)
                  </span>
                </>
              ) : (
                <>
                  {toFa(count)} عدد
                  {product.minOrderQuantity && product.minOrderQuantity > 1 ? (
                    <span className="block text-xs text-soil-700/60 dark:text-dust-200/60 mt-1">
                      (حداقل سفارش: {toFa(product.minOrderQuantity)} عدد)
                    </span>
                  ) : null}
                </>
              )}
            </dd>
          </div>
        </dl>

        {(allowBatch || hasSale) && savings > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-flora-500/15 dark:bg-flora-500/25 px-4 py-2.5 text-xs font-bold text-flora-700 dark:text-flora-300"
          >
            <span className="grid size-5 place-items-center rounded-full bg-flora-500 text-[11px] text-white">
              ✓
            </span>
            {tierLabel} — {toFa(percent)}٪ تخفیف، {formatToman(savings)} صرفه‌جویی
          </motion.p>
        )}

        {isColorStockLimited && (
          <p className="mt-3.5 flex items-center gap-1.5 rounded-xl border border-amber-300/80 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/50 px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-200">
            <span>ℹ️</span>
            <span>توجه: موجودی رنگهای انتخاب شده محدود است.</span>
          </p>
        )}
      </motion.div>

      {/* Dynamic Accordion directly below green summary box */}
      {product.bundleItems && product.bundleItems.length > 0 && (() => {
        const items = product.bundleItems;
        const itemSum = items.reduce(
          (sum, item) => sum + (item.price ?? item.priceToman ?? 0),
          0,
        );
        const totalValue = itemSum * count;
        const activePkgPrice = packagePrice || effectiveBasePrice;
        const totalPackagePrice = activePkgPrice * count;
        const totalSavings = totalValue - totalPackagePrice;

        return (
          <details className="group rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-black text-soil-900 dark:text-dust-50 [&::-webkit-details-marker]:hidden">
              <span>مشاهده محتویات این بسته ({toFa(items.length)} آیتم)</span>
              <span className="transition-transform group-open:rotate-180 text-soil-700/60 dark:text-dust-200/60">▼</span>
            </summary>
            <div className="border-t border-soil-900/10 dark:border-dust-50/10 p-4">
              <div className="space-y-2">
                {items.map((item, i) => {
                  const itemPrice = item.price ?? item.priceToman;
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50/60 dark:bg-flora-950/60 p-3.5 transition-colors hover:bg-dust-50 dark:hover:bg-flora-950"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-soil-900 dark:text-dust-50">{item.title}</p>
                        {itemPrice && itemPrice > 0 ? (
                          <span className="text-xs font-bold text-flora-700 dark:text-flora-300 shrink-0">
                            {formatToman(itemPrice)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-soil-700/70 dark:text-dust-200/70">
                        {item.material && (
                          <span>
                            جنس: <strong className="text-soil-900 dark:text-dust-50">{item.material}</strong>
                          </span>
                        )}
                        {item.diameterCm > 0 && (
                          <span>
                            قطر: <strong className="text-soil-900 dark:text-dust-50">{toFa(item.diameterCm)} سانتی‌متر</strong>
                          </span>
                        )}
                        {item.heightCm > 0 && (
                          <span>
                            ارتفاع: <strong className="text-soil-900 dark:text-dust-50">{toFa(item.heightCm)} سانتی‌متر</strong>
                          </span>
                        )}
                        {item.weightGrams > 0 && (
                          <span>
                            وزن: <strong className="text-soil-900 dark:text-dust-50">{toFa(item.weightGrams)} گرم</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Box with totalValue and totalPackagePrice */}
              <div className="mt-4 rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-100/70 dark:bg-flora-950/70 p-4 space-y-2 text-xs">
                {totalValue > 0 && (
                  <div className="flex items-center justify-between text-soil-700/70 dark:text-dust-200/70">
                    <span>ارزش تک‌فروشی {toFa(count)} بسته:</span>
                    <span className={totalSavings > 0 ? 'line-through text-soil-700/50 dark:text-dust-200/50' : 'font-bold text-soil-900 dark:text-dust-50'}>
                      {formatToman(totalValue)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-soil-900 dark:text-dust-50">
                  <span className="font-bold">قیمت فروش {toFa(count)} بسته:</span>
                  <div className="text-end">
                    <span className="text-sm font-black text-soil-900 dark:text-dust-50">
                      {formatToman(totalPackagePrice)}
                    </span>
                    {totalPackagePrice >= 1000 && (
                      <span className="block text-[11px] font-medium text-soil-700/70 dark:text-dust-200/70">
                        ({numberToWordsFa(totalPackagePrice)} تومان)
                      </span>
                    )}
                  </div>
                </div>
                {totalSavings > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-100/90 dark:bg-emerald-950/60 p-2.5 font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <span>🌱</span>
                      <span>شما {formatToman(totalSavings)} صرفه‌جویی می‌کنید!</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </details>
        );
      })()}

      <div className="space-y-4">
        {/* Selected color summary preview */}
        {!isBundle && colorCtx?.selectedColor && (() => {
          const opt = (product.colorOptions ?? []).find(
            (c) => c.hexCode.toUpperCase() === colorCtx.selectedColor?.toUpperCase(),
          );
          return (
            <div className="flex items-center gap-2 rounded-xl bg-dust-50 dark:bg-flora-950 px-3.5 py-2 text-xs border border-soil-900/10 dark:border-dust-50/10">
              <span className="text-soil-700/70 dark:text-dust-200/70">رنگ انتخابی:</span>
              <span
                className="size-4 rounded-full border border-soil-900/20 dark:border-dust-50/20 shadow-2xs"
                style={{ backgroundColor: colorCtx.selectedColor }}
              />
              <span className="font-mono text-soil-900 dark:text-dust-50 font-bold dir-ltr">
                {colorCtx.selectedColor}
              </span>
              {opt && (
                <span className={opt.stock > 0 ? "text-soil-700/60 dark:text-dust-300 font-medium" : "text-red-600 dark:text-red-400 font-bold"}>
                  ({opt.stock > 0 ? `موجودی: ${toFa(opt.stock)} عدد` : 'ناموجود'})
                </span>
              )}
            </div>
          );
        })()}
        {isBundle && Object.keys(colorCtx?.selectedBundleColors ?? {}).length > 0 && (
          <div className="rounded-xl bg-dust-50 dark:bg-flora-950 p-3 text-xs border border-soil-900/10 dark:border-dust-50/10 space-y-1.5">
            <span className="font-bold text-soil-900 dark:text-dust-50 block">رنگ‌های انتخابی اقلام بسته:</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(colorCtx?.selectedBundleColors ?? {}).map(([idxStr, hex]) => {
                const i = Number(idxStr);
                const item = product.bundleItems?.[i];
                const itName = item?.title || `گلدان ${toFa(i + 1)}`;
                const opt = item?.colorOptions?.find(
                  (c) => c.hexCode.toUpperCase() === hex.toUpperCase(),
                );
                return (
                  <span
                    key={idxStr}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-flora-900 border border-soil-900/10 dark:border-dust-50/10 px-2 py-1 text-[11px]"
                  >
                    <span className="text-soil-700 dark:text-dust-200">{itName}:</span>
                    <span
                      className="size-3.5 rounded-full border border-soil-900/20 dark:border-dust-50/20 shadow-2xs"
                      style={{ backgroundColor: hex }}
                    />
                    {opt && (
                      <span className={opt.stock > 0 ? "text-soil-700/60 dark:text-dust-300 font-medium" : "text-red-600 dark:text-red-400 font-bold"}>
                        ({opt.stock > 0 ? toFa(opt.stock) : 'ناموجود'})
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={pending || outOfStock}
          className="w-full rounded-2xl bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-6 py-4 text-sm font-black shadow-lg shadow-flora-900/20 transition-colors hover:bg-flora-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {outOfStock
            ? hasVariants
              ? 'این مدل موقتاً تمام شده است'
              : 'این محصول موقتاً تمام شده است'
            : pending
              ? 'در حال افزودن…'
              : added
                ? 'به سبد اضافه شد ✓'
                : isBundle
                  ? `افزودن ${toFa(count)} بسته به سبد — ${formatToman(total)}`
                  : `افزودن ${toFa(count)} عدد به سبد — ${formatToman(total)}`}
        </button>

        <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-700/50 px-4 py-3 text-xs font-bold text-amber-700 dark:text-amber-300 text-center">
          📦 توجه: مرسولات فقط در روزهای <strong>یکشنبه</strong> و <strong>چهارشنبه</strong> ارسال می‌شوند.
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/40 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
