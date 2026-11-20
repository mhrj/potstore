'use client';

import React from 'react';
import Link from 'next/link';
import { formatToman, toFa } from '@/lib/format';
import {
  type GroupedCartItem,
  type BundleColorItem,
  groupCartItems,
} from '@/lib/bundle-colors';

export type OrderItemCardProps = {
  group?: GroupedCartItem;
  item?: Record<string, unknown>;
  items?: Record<string, unknown>[];
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
 * Accurately renders Standalone items and Bundles (Identical vs Mixed)
 * adhering strictly to SCENARIO A and SCENARIO B requirements.
 */
export default function OrderItemCard({
  group: explicitGroup,
  item,
  items,
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
  // Determine the grouped item representation
  const group =
    explicitGroup ??
    (items && items.length > 0
      ? groupCartItems(items)[0]
      : item
      ? groupCartItems([item])[0]
      : undefined);

  if (!group) return null;

  const name = group.productName || group.name;
  const slug = group.productSlug || group.slug;
  const unitLabel = group.isBundle ? 'بسته' : 'عدد';

  // Compact layout (e.g. Checkout aside summary)
  if (compact) {
    return (
      <div
        className={`space-y-1.5 py-2.5 text-xs border-b border-soil-900/5 dark:border-dust-50/5 last:border-b-0 ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-soil-900 dark:text-dust-50">{name}</span>
              {group.variantTitle && (
                <span className="rounded-md bg-flora-100 dark:bg-flora-950 px-1.5 py-0.5 text-[10px] font-bold text-flora-800 dark:text-flora-200 border border-flora-300 dark:border-flora-700">
                  {group.variantTitle}
                </span>
              )}
              {group.isBundle && (
                <span className="rounded-md bg-flora-100 dark:bg-flora-950 px-1.5 py-0.5 text-[10px] font-bold text-flora-700 dark:text-flora-300 border border-flora-300 dark:border-flora-700">
                  ست {toFa(group.bundleSize)} عددی
                </span>
              )}
            </div>

            {/* SCENARIO A: Standalone compact breakdown */}
            {group.kind === 'standalone' && (
              <div className="text-[11px] font-medium text-soil-800 dark:text-dust-200">
                {group.colors.length > 0 &&
                !(group.colors.length === 1 && group.colors[0].colorName === 'پیش‌فرض') ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {group.colors.map((c, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-soil-400 dark:text-dust-400">،</span>}
                        <span>{toFa(c.quantity)} عدد</span>
                        <ColorDot color={{ name: c.colorName, hex: c.hexCode }} />
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <span>{toFa(group.totalQuantity)} عدد</span>
                )}
              </div>
            )}

            {/* SCENARIO B: Identical bundle compact breakdown */}
            {group.kind === 'bundle' && group.type === 'identical' && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-soil-800 dark:text-dust-200 flex-wrap">
                <span>{toFa(group.quantity)} بسته (</span>
                {group.config.items.map((it, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-soil-400 dark:text-dust-400">+</span>}
                    <ColorDot color={{ name: it.color, hex: it.hex || '#808080' }} />
                  </React.Fragment>
                ))}
                <span>)</span>
              </div>
            )}

            {/* SCENARIO B: Mixed bundle compact breakdown */}
            {group.kind === 'bundle' && group.type === 'mixed' && (
              <div className="space-y-1.5 text-[11px]">
                {group.configurations.map((conf) => (
                  <details
                    key={conf.bundleIndex}
                    className="group rounded-lg border border-soil-900/5 dark:border-dust-50/5 bg-soil-50/50 dark:bg-flora-950/40 p-1.5"
                  >
                    <summary className="cursor-pointer font-bold text-flora-800 dark:text-flora-300 list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
                      <span>
                        مشاهده جزئیات بسته {toFa(conf.bundleIndex)} ({conf.items.map((it) => it.color).join(' + ')})
                      </span>
                    </summary>
                    <div className="mt-1 space-y-1 ps-2 border-s border-flora-300 dark:border-flora-700">
                      {conf.items.map((it, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span>
                            {it.title || `گلدان ${toFa(i + 1)}`}: {it.color}
                          </span>
                          <ColorDot color={{ name: it.color, hex: it.hex || '#808080' }} />
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}

            <p className="text-[11px] text-soil-700/80 dark:text-dust-200/80">
              {toFa(group.kind === 'bundle' ? group.quantity : group.totalQuantity)} {unitLabel} ×{' '}
              {formatToman(group.unitToman)} تومان
            </p>
          </div>

          <span className="shrink-0 font-bold text-soil-900 dark:text-dust-50 text-sm">
            {formatToman(group.totalToman)} تومان
          </span>
        </div>
      </div>
    );
  }

  // Standard Full Layout (Cart, Invoices, Order Details, Dashboard)
  return (
    <div
      className={`flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between border-b border-soil-900/10 dark:border-dust-50/10 last:border-b-0 print:border-b-0 print:py-2 print:gap-2 print:break-inside-avoid ${className}`}
    >
      <div className="flex items-start gap-4 print:gap-2 flex-1 min-w-0">
        {/* Product Image */}
        {showImage &&
          (group.imageUrl ? (
            <img
              src={group.imageUrl}
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
          ))}

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

            {group.variantTitle && (
              <span className="inline-flex items-center rounded-md bg-flora-100 dark:bg-flora-950 px-2 py-0.5 text-[11px] font-bold text-flora-800 dark:text-flora-200 border border-flora-300 dark:border-flora-700 print:text-[9px]">
                {group.variantTitle}
              </span>
            )}

            {group.isBundle && (
              <span className="inline-flex items-center rounded-md bg-flora-100 dark:bg-flora-950 px-2 py-0.5 text-[11px] font-bold text-flora-700 dark:text-flora-300 border border-flora-300 dark:border-flora-700 print:text-[9px]">
                ست {toFa(group.bundleSize)} عددی
              </span>
            )}
          </div>

          {/* Code & Dimensions / Specs */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-soil-700/70 dark:text-dust-200/70 print:text-[9px]">
            {group.sku && (
              <span>
                کد کالا: <span className="font-mono" dir="ltr">{group.sku}</span>
              </span>
            )}
            {group.sku && group.specs && <span>·</span>}
            {group.specs && <span>{group.specs}</span>}
          </div>

          {/* SCENARIO A: Standalone item color breakdown */}
          {group.kind === 'standalone' && (
            <div className="pt-1">
              {group.colors.length > 0 &&
              !(group.colors.length === 1 && group.colors[0].colorName === 'پیش‌فرض') ? (
                <div className="flex flex-wrap items-center gap-2">
                  {group.colors.map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-soil-50 dark:bg-flora-950/60 border border-soil-900/10 dark:border-dust-50/10 px-2.5 py-1 text-xs font-bold text-soil-900 dark:text-dust-50"
                    >
                      <span>{toFa(c.quantity)} عدد</span>
                      <ColorDot color={{ name: c.colorName, hex: c.hexCode }} />
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-bold text-soil-800 dark:text-dust-200">
                  تعداد: {toFa(group.totalQuantity)} عدد
                </span>
              )}
            </div>
          )}

          {/* SCENARIO B: Identical bundle color display */}
          {group.kind === 'bundle' && group.type === 'identical' && (
            <div className="pt-1 flex items-center gap-2 text-xs font-bold text-soil-900 dark:text-dust-50 flex-wrap">
              <span>{toFa(group.quantity)} بسته (</span>
              {group.config.items.map((it, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-soil-400 dark:text-dust-400">+</span>}
                  <ColorDot color={{ name: it.color, hex: it.hex || '#808080' }} />
                </React.Fragment>
              ))}
              <span>)</span>
            </div>
          )}

          {/* SCENARIO B: Mixed bundle per-bundle accordion dropdowns */}
          {group.kind === 'bundle' && group.type === 'mixed' && (
            <div className="space-y-2 pt-1">
              <div className="space-y-2">
                {group.configurations.map((conf) => {
                  const colorsSummary = conf.items.map((it) => it.color).join(' + ');

                  return (
                    <details
                      key={conf.bundleIndex}
                      className="group rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50/60 dark:bg-flora-950/40 p-2.5 text-xs transition"
                    >
                      <summary className="flex cursor-pointer select-none items-center justify-between font-bold text-soil-800 hover:text-flora-700 dark:text-dust-200 dark:hover:text-flora-300 list-none [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <svg
                            className="size-3.5 text-soil-500 transition-transform duration-200 group-open:rotate-180 dark:text-dust-400 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                          <span className="truncate">
                            مشاهده جزئیات بسته {toFa(conf.bundleIndex)} ({colorsSummary})
                          </span>
                        </span>
                        <span className="text-[11px] font-normal text-soil-700/60 dark:text-dust-200/60 group-open:hidden shrink-0">
                          مشاهده
                        </span>
                      </summary>

                      <div className="mt-2 space-y-1.5 border-t border-soil-900/10 pt-2 dark:border-dust-50/10">
                        {conf.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 rounded-lg bg-white/70 dark:bg-flora-900/70 px-2.5 py-1 text-xs"
                          >
                            <span className="font-medium text-soil-900 dark:text-dust-50">
                              {it.title || `گلدان ${toFa(idx + 1)}`}: {it.color}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-soil-700/70 dark:text-dust-200/70">رنگ:</span>
                              <ColorDot color={{ name: it.color, hex: it.hex || '#808080' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}

          {nextTierHintText && (
            <p className="text-[11px] font-bold text-flora-700 dark:text-flora-300 pt-1">
              💡 {nextTierHintText}
            </p>
          )}
        </div>
      </div>

      {/* Pricing / Actions Column */}
      <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center gap-2 pt-2 sm:pt-0 shrink-0 border-t sm:border-t-0 border-soil-900/5 dark:border-dust-50/5">
        <div className="text-end">
          <span className="font-black text-sm sm:text-base text-soil-900 dark:text-dust-50">
            {formatToman(group.totalToman)} تومان
          </span>
          <p className="text-[11px] text-soil-700/70 dark:text-dust-200/70">
            {toFa(group.kind === 'bundle' ? group.quantity : group.totalQuantity)} {unitLabel} ×{' '}
            {formatToman(group.unitToman)} تومان
          </p>
        </div>

        {/* Stepper controls if in interactive Cart mode */}
        {isCart && onUpdateQuantity && (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center rounded-xl border border-soil-900/15 dark:border-dust-50/15 bg-white dark:bg-flora-950 shadow-2xs">
              <button
                type="button"
                onClick={() => onUpdateQuantity(group.totalQuantity + (group.bundleSize || 1))}
                disabled={isPending || (stock !== undefined && group.totalQuantity >= stock)}
                className="size-8 flex items-center justify-center text-soil-900 dark:text-dust-50 hover:bg-soil-50 dark:hover:bg-flora-900 rounded-s-xl disabled:opacity-40 transition"
                aria-label="افزایش تعداد"
              >
                +
              </button>
              <span className="w-9 text-center font-mono text-xs font-bold text-soil-900 dark:text-dust-50">
                {toFa(group.kind === 'bundle' ? group.quantity : group.totalQuantity)}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateQuantity(
                    Math.max(group.bundleSize || 1, group.totalQuantity - (group.bundleSize || 1)),
                  )
                }
                disabled={isPending || group.totalQuantity <= (group.bundleSize || 1)}
                className="size-8 flex items-center justify-center text-soil-900 dark:text-dust-50 hover:bg-soil-50 dark:hover:bg-flora-900 rounded-e-xl disabled:opacity-40 transition"
                aria-label="کاهش تعداد"
              >
                −
              </button>
            </div>

            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                disabled={isPending}
                className="size-8 flex items-center justify-center rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                title="حذف از سبد"
                aria-label="حذف از سبد"
              >
                🗑
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
