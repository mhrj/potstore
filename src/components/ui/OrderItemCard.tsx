'use client';

import React from 'react';
import Link from 'next/link';
import { formatToman, toFa } from '@/lib/format';
import {
  parseBundleSelections,
  getBundleColorSummary,
  resolveColorItem,
  type BundleColorItem,
} from '@/lib/bundle-colors';
import { parseBundleItems, type BundleItem } from '@/lib/product-features';
import { formatSpecs, type OrderItemDetailsItem } from '@/features/checkout/components/OrderItemDetails';

export type OrderItemCardProps = {
  item: OrderItemDetailsItem;
  isCart?: boolean;
  stock?: number;
  onUpdateQuantity?: (nextQuantity: number) => void;
  onRemove?: () => void;
  isPending?: boolean;
  compact?: boolean;
  className?: string;
  showImage?: boolean;
  linkTargetBlank?: boolean;
  nextTierHintText?: string | null;
};

/**
 * Color dot pill with tooltip and accessible label.
 */
export function ColorDot({
  color,
  showName = true,
  className = '',
}: {
  color: BundleColorItem;
  showName?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="size-3.5 rounded-full border border-soil-900/20 dark:border-dust-50/20 shadow-2xs shrink-0"
        style={{ backgroundColor: color.hex }}
        title={`${color.name} (${color.hex})`}
        aria-hidden="true"
      />
      {showName && (
        <span className="text-xs font-medium text-soil-900 dark:text-dust-100">
          {color.name}
        </span>
      )}
    </span>
  );
}

/**
 * Unified Order Item Card for Cart, Checkout, Invoices, and Dashboard.
 * Accurately renders both standard items and bundles with multiple color selections.
 */
export default function OrderItemCard({
  item,
  isCart = false,
  stock,
  onUpdateQuantity,
  onRemove,
  isPending = false,
  compact = false,
  className = '',
  showImage = true,
  linkTargetBlank = false,
  nextTierHintText,
}: OrderItemCardProps) {
  const name = item.productName || item.name || 'محصول بدون نام';
  const slug = item.productSlug || item.slug || null;
  const bundleSize = item.bundleSize && item.bundleSize > 1 ? item.bundleSize : 1;
  const isBundle = item.isBundle ?? bundleSize > 1;
  const displayQty = isBundle ? Math.max(1, Math.round(item.quantity / bundleSize)) : item.quantity;
  const displayUnitPrice = isBundle ? item.unitToman * bundleSize : item.unitToman;
  const unitLabel = isBundle ? 'بسته' : 'عدد';

  const specs = formatSpecs(item);

  // Bundle Items definition from snapshot or product
  let bundleItemsList: BundleItem[] = [];
  if (isBundle) {
    if (item.bundleItems && Array.isArray(item.bundleItems) && item.bundleItems.length > 0) {
      bundleItemsList = item.bundleItems as BundleItem[];
    } else if (item.product?.bundleItems) {
      bundleItemsList = parseBundleItems(item.product.bundleItems);
    } else if (item.colorData && typeof item.colorData === 'object') {
      const cd = item.colorData as Record<string, unknown>;
      if (Array.isArray(cd.bundleItems) && cd.bundleItems.length > 0) {
        bundleItemsList = cd.bundleItems as BundleItem[];
      }
    }
    if (bundleItemsList.length === 0) {
      bundleItemsList = Array.from({ length: bundleSize }, (_, idx) => ({
        title: `گلدان شماره ${toFa(idx + 1)}`,
        material: '',
        diameterCm: 0,
        heightCm: 0,
        weightGrams: 0,
      }));
    }
  }

  // Bundle Color Selections (multi-bundle aware)
  const bundleSelections = isBundle
    ? parseBundleSelections(item.colorData, item.quantity, bundleSize, bundleItemsList)
    : [];
  const colorSummary = isBundle ? getBundleColorSummary(bundleSelections, displayQty) : null;

  // Single Product Color resolution
  const singleColor = !isBundle
    ? resolveColorItem(
        item.selectedColorHex ||
          (item.colorData && typeof item.colorData === 'object'
            ? (item.colorData as Record<string, unknown>).selectedColor ||
              (item.colorData as Record<string, unknown>).color
            : null),
      )
    : null;

  // Stepper handlers for Cart
  const handleStepMinus = () => {
    if (!onUpdateQuantity) return;
    const next = item.quantity - bundleSize;
    if (next >= bundleSize) {
      onUpdateQuantity(next);
    }
  };

  const handleStepPlus = () => {
    if (!onUpdateQuantity) return;
    const next = item.quantity + bundleSize;
    if (stock === undefined || next <= stock) {
      onUpdateQuantity(next);
    }
  };

  // Compact layout (e.g. Checkout aside summary)
  if (compact) {
    return (
      <div className={`space-y-1.5 py-2.5 text-xs border-b border-soil-900/5 dark:border-dust-50/5 last:border-b-0 ${className}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-soil-900 dark:text-dust-50">{name}</span>
              {item.variantTitle && (
                <span className="rounded-md bg-flora-100 dark:bg-flora-950 px-1.5 py-0.5 text-[10px] font-bold text-flora-800 dark:text-flora-200 border border-flora-300 dark:border-flora-700">
                  {item.variantTitle}
                </span>
              )}
              {isBundle && (
                <span className="rounded-md bg-flora-100 dark:bg-flora-950 px-1.5 py-0.5 text-[10px] font-bold text-flora-700 dark:text-flora-300 border border-flora-300 dark:border-flora-700">
                  ست {toFa(bundleSize)} عددی
                </span>
              )}
            </div>

            {/* Colors Breakdown */}
            {isBundle && colorSummary ? (
              colorSummary.isIdentical ? (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-soil-800 dark:text-dust-200 flex-wrap">
                  <span>{toFa(colorSummary.bundleCount)} بسته (رنگ&#8204;ها:</span>
                  {colorSummary.colors.map((c, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-soil-400 dark:text-dust-400">+</span>}
                      <ColorDot color={c} />
                    </React.Fragment>
                  ))}
                  <span>)</span>
                </div>
              ) : (
                <div className="space-y-1 text-[11px]">
                  {colorSummary.lines.map((l) => (
                    <div key={l.bundleIndex} className="flex items-center gap-1.5 flex-wrap text-soil-800 dark:text-dust-200">
                      <span className="font-bold text-soil-900 dark:text-dust-50">{l.label}</span>
                      {l.colors.map((c, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="text-soil-400 dark:text-dust-400">+</span>}
                          <ColorDot color={c} />
                        </React.Fragment>
                      ))}
                    </div>
                  ))}
                </div>
              )
            ) : singleColor && singleColor.name !== 'نامشخص' ? (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-soil-800 dark:text-dust-200">
                <span>رنگ:</span>
                <ColorDot color={singleColor} />
              </div>
            ) : null}

            {/* Variation & Unit details */}
            <p className="text-[11px] text-soil-700/80 dark:text-dust-200/80">
              {toFa(displayQty)} {unitLabel} × {formatToman(displayUnitPrice)} تومان
            </p>

            {specs && (
              <p className="text-[10px] text-soil-700/60 dark:text-dust-200/60">
                {specs}
              </p>
            )}
          </div>

          <span className="shrink-0 font-bold text-soil-900 dark:text-dust-50 text-sm">
            {formatToman(item.lineTotalToman)} تومان
          </span>
        </div>
      </div>
    );
  }

  // Standard Full Layout (Cart, Invoices, Success, Dashboard)
  return (
    <div
      className={`flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between border-b border-soil-900/10 dark:border-dust-50/10 last:border-b-0 print:border-b-0 print:py-2 print:gap-2 print:break-inside-avoid ${className}`}
    >
      <div className="flex items-start gap-4 print:gap-2 flex-1 min-w-0">
        {/* Product Image */}
        {showImage && (
          item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0 border border-soil-900/10 dark:border-dust-50/10 shadow-xs dark:shadow-none print:w-12 print:h-12 print:rounded-md"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-dust-100 dark:bg-flora-950 border border-soil-900/10 dark:border-dust-50/10 flex items-center justify-center text-soil-700/40 dark:text-dust-400 shrink-0 print:w-12 print:h-12 print:rounded-md">
              <svg className="w-8 h-8 print:w-5 print:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )
        )}

        {/* Product Details */}
        <div className="space-y-2 flex-1 min-w-0 print:space-y-1 print:text-[10px]">
          {/* Title and Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {slug ? (
              <Link
                href={`/products/${slug}`}
                target={linkTargetBlank ? '_blank' : undefined}
                rel={linkTargetBlank ? 'noopener noreferrer' : undefined}
                className="font-bold text-soil-900 dark:text-dust-50 hover:text-flora-700 dark:hover:text-flora-300 transition text-base print:text-xs"
              >
                {name}
              </Link>
            ) : (
              <span className="font-bold text-soil-900 dark:text-dust-50 text-base print:text-xs">
                {name}
              </span>
            )}

            {item.variantTitle && (
              <span className="inline-flex items-center rounded-md bg-flora-100 dark:bg-flora-950 px-2 py-0.5 text-[11px] font-bold text-flora-800 dark:text-flora-200 border border-flora-300 dark:border-flora-700 print:text-[9px]">
                {item.variantTitle}
              </span>
            )}

            {isBundle && (
              <span className="inline-flex items-center rounded-md bg-flora-100 dark:bg-flora-950 px-2 py-0.5 text-[11px] font-bold text-flora-700 dark:text-flora-300 border border-flora-300 dark:border-flora-700 print:text-[9px]">
                شامل {toFa(bundleSize)} عدد گلدان
              </span>
            )}
          </div>

          {/* Code & Dimensions / Specs */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-soil-700/70 dark:text-dust-200/70 print:text-[9px]">
            {item.sku && (
              <span>
                کد کالا: <span className="font-mono" dir="ltr">{item.sku}</span>
              </span>
            )}
            {item.sku && specs && <span>·</span>}
            {specs && <span>{specs}</span>}
          </div>

          {/* Color Breakdown Header (TASK 3) */}
          <div className="pt-0.5">
            {isBundle && colorSummary ? (
              colorSummary.isIdentical ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-soil-800 dark:text-dust-100 flex-wrap">
                  <span className="text-soil-900 dark:text-dust-50 font-bold">
                    {toFa(colorSummary.bundleCount)} بسته (رنگ&#8204;ها:
                  </span>
                  {colorSummary.colors.map((c, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-soil-400 dark:text-dust-400">+</span>}
                      <ColorDot color={c} />
                    </React.Fragment>
                  ))}
                  <span className="text-soil-900 dark:text-dust-50 font-bold">)</span>
                </div>
              ) : (
                <div className="space-y-1.5 rounded-xl bg-dust-50/70 dark:bg-flora-950/40 p-2.5 border border-soil-900/5 dark:border-dust-50/5">
                  <p className="text-[11px] font-bold text-soil-700/80 dark:text-dust-200/80">
                    رنگ&#8204;بندی بسته&#8204;ها:
                  </p>
                  {colorSummary.lines.map((l) => (
                    <div key={l.bundleIndex} className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="font-bold text-soil-900 dark:text-dust-50">
                        {l.label}
                      </span>
                      {l.colors.map((c, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="text-soil-400 dark:text-dust-400">+</span>}
                          <ColorDot color={c} />
                        </React.Fragment>
                      ))}
                    </div>
                  ))}
                </div>
              )
            ) : singleColor && singleColor.name !== 'نامشخص' ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-soil-800 dark:text-dust-100">
                <span>رنگ انتخابی:</span>
                <ColorDot color={singleColor} />
              </div>
            ) : null}
          </div>

          {/* Bundle Accordion (TASK 2) */}
          {isBundle && (
            <details className="group mt-2 rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-white/50 dark:bg-flora-900/50 p-2.5 text-xs transition print:mt-1 print:p-0 print:border-none print:bg-transparent">
              <summary className="flex cursor-pointer select-none items-center justify-between font-bold text-soil-800 hover:text-flora-700 dark:text-dust-200 dark:hover:text-flora-300 list-none [&::-webkit-details-marker]:hidden print:text-[9px]">
                <span className="flex items-center gap-1.5">
                  <svg
                    className="size-3.5 text-soil-500 transition-transform duration-200 group-open:rotate-180 dark:text-dust-400 print:hidden"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span>مشاهده جزئیات این بسته</span>
                </span>
                <span className="text-[11px] font-normal text-soil-700/60 group-open:hidden dark:text-dust-200/60 print:inline print:text-[9px]">
                  ({toFa(bundleItemsList.length)} قلم در بسته)
                </span>
              </summary>

              <div className="mt-2.5 space-y-2 border-t border-soil-900/10 pt-2.5 dark:border-dust-50/10 print:space-y-1 print:border-none print:pt-1">
                {/* If multiple bundles have different colors, list per bundle */}
                {!colorSummary?.isIdentical && bundleSelections.length > 1 ? (
                  bundleSelections.map((sel) => (
                    <div key={sel.bundleIndex} className="space-y-1.5 pb-2 last:pb-0 border-b border-soil-900/5 dark:border-dust-50/5 last:border-b-0">
                      <div className="font-bold text-[11px] text-flora-800 dark:text-flora-300">
                        بسته {toFa(sel.bundleIndex)}:
                      </div>
                      {bundleItemsList.map((bItem, idx) => {
                        const assignedColor = sel.colors[idx] ?? null;
                        const dimParts: string[] = [];
                        if (bItem.diameterCm) dimParts.push(`قطر ${toFa(bItem.diameterCm)}`);
                        if (bItem.heightCm) dimParts.push(`ارتفاع ${toFa(bItem.heightCm)}`);
                        const dimsText = dimParts.length > 0 ? `(${dimParts.join(' × ')} سانتی‌متر)` : null;

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 rounded-lg border border-soil-900/5 bg-white/70 px-2.5 py-1.5 dark:border-dust-50/10 dark:bg-flora-950/70 text-xs"
                          >
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="flex size-4.5 items-center justify-center rounded-full bg-soil-100 text-[10px] font-bold text-soil-700 shrink-0 dark:bg-flora-900 dark:text-dust-300">
                                {toFa(idx + 1)}
                              </span>
                              <span className="font-bold text-soil-900 dark:text-dust-50">
                                {bItem.title || `گلدان ${toFa(idx + 1)}`}
                              </span>
                              {dimsText && (
                                <span className="text-[11px] text-soil-700/60 dark:text-dust-200/60">
                                  {dimsText}
                                </span>
                              )}
                              {bItem.material && (
                                <span className="text-[11px] text-soil-700/60 dark:text-dust-200/60">
                                  · جنس: {bItem.material}
                                </span>
                              )}
                            </div>
                            {assignedColor && (
                              <div className="flex items-center gap-1.5 shrink-0 bg-dust-50 px-2 py-0.5 rounded-md border border-soil-900/10 dark:bg-flora-900 dark:border-dust-50/10">
                                <span className="text-[11px] text-soil-700/70 dark:text-dust-200/70">رنگ:</span>
                                <ColorDot color={assignedColor} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  /* Single bundle or identical bundles list */
                  bundleItemsList.map((bItem, idx) => {
                    const assignedColor =
                      bundleSelections[0]?.colors[idx] ??
                      (singleColor && singleColor.name !== 'نامشخص' ? singleColor : null);

                    const dimParts: string[] = [];
                    if (bItem.diameterCm) dimParts.push(`قطر ${toFa(bItem.diameterCm)}`);
                    if (bItem.heightCm) dimParts.push(`ارتفاع ${toFa(bItem.heightCm)}`);
                    const dimsText = dimParts.length > 0 ? `(${dimParts.join(' × ')} سانتی‌متر)` : null;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-lg border border-soil-900/5 bg-white/70 px-2.5 py-1.5 dark:border-dust-50/10 dark:bg-flora-950/70 text-xs"
                      >
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="flex size-4.5 items-center justify-center rounded-full bg-soil-100 text-[10px] font-bold text-soil-700 shrink-0 dark:bg-flora-900 dark:text-dust-300">
                            {toFa(idx + 1)}
                          </span>
                          <span className="font-bold text-soil-900 dark:text-dust-50">
                            {bItem.title || `گلدان ${toFa(idx + 1)}`}
                          </span>
                          {dimsText && (
                            <span className="text-[11px] text-soil-700/60 dark:text-dust-200/60">
                              {dimsText}
                            </span>
                          )}
                          {bItem.material && (
                            <span className="text-[11px] text-soil-700/60 dark:text-dust-200/60">
                              · جنس: {bItem.material}
                            </span>
                          )}
                        </div>
                        {assignedColor && (
                          <div className="flex items-center gap-1.5 shrink-0 bg-dust-50 px-2 py-0.5 rounded-md border border-soil-900/10 dark:bg-flora-900 dark:border-dust-50/10">
                            <span className="text-[11px] text-soil-700/70 dark:text-dust-200/70">رنگ:</span>
                            <ColorDot color={assignedColor} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </details>
          )}

          {/* Pricing Calculation Display */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap text-xs text-soil-700/80 dark:text-dust-200/80">
              <span>
                {toFa(displayQty)} {unitLabel} × {formatToman(displayUnitPrice)} تومان =
              </span>
              <span className="font-bold text-soil-900 dark:text-dust-50">
                {formatToman(item.lineTotalToman)} تومان
              </span>
              {item.tierLabel && (
                <span className="rounded bg-flora-50 dark:bg-flora-950 px-1.5 py-0.5 text-[10px] text-flora-700 dark:text-flora-300 border border-flora-300/40 dark:border-flora-700">
                  سطح: {item.tierLabel}
                </span>
              )}
            </div>

            {/* In Cart: Stepper and Remove Controls */}
            {isCart && onUpdateQuantity && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-full border border-soil-900/15 dark:border-dust-50/20 dark:bg-flora-950 p-0.5">
                  <button
                    type="button"
                    onClick={handleStepMinus}
                    disabled={isPending || item.quantity <= bundleSize}
                    aria-label="کاهش تعداد"
                    className="grid size-7 place-items-center rounded-full text-sm font-bold text-soil-900 dark:text-dust-50 transition hover:bg-dust-100 dark:hover:bg-flora-900 disabled:opacity-35 cursor-pointer"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-xs font-black text-soil-900 dark:text-dust-50">
                    {toFa(displayQty)}
                  </span>
                  <button
                    type="button"
                    onClick={handleStepPlus}
                    disabled={isPending || (stock !== undefined && item.quantity + bundleSize > stock)}
                    aria-label="افزایش تعداد"
                    className="grid size-7 place-items-center rounded-full text-sm font-bold text-soil-900 dark:text-dust-50 transition hover:bg-dust-100 dark:hover:bg-flora-900 disabled:opacity-35 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {onRemove && (
                  <button
                    type="button"
                    onClick={onRemove}
                    disabled={isPending}
                    aria-label="حذف این مورد از سبد"
                    className="rounded-full p-1.5 text-soil-700/60 dark:text-dust-200/60 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 cursor-pointer"
                  >
                    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Next Tier Hint */}
          {nextTierHintText && (
            <p className="text-[11px] text-flora-700 dark:text-flora-400 font-medium pt-1">
              {nextTierHintText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

