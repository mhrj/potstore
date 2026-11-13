import Link from 'next/link';
import { formatToman, toFa } from '@/lib/format';
import ItemColorBadge, { resolveColorName } from '@/features/catalog/components/ItemColorBadge';
import BundleDetailsAccordion from './BundleDetailsAccordion';
import { parseBundleItems } from '@/lib/product-features';

export type OrderItemDetailsItem = {
  id?: string;
  productId?: string | null;
  productSlug?: string | null;
  slug?: string | null;
  productName?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  sku?: string | null;
  material?: string | null;
  diameterCm?: number | null;
  heightCm?: number | null;
  quantity: number;
  unitToman: number;
  listUnitToman?: number | null;
  lineTotalToman: number;
  tierLabel?: string | null;
  variantId?: string | null;
  variantTitle?: string | null;
  colorData?: unknown;
  selectedColorHex?: string | null;
  colorAdjustment?: number | null;
  isBundle?: boolean;
  bundleSize?: number | null;
  bundleItems?: Array<{
    title: string;
    quantity?: number;
    diameterCm?: number | null;
    heightCm?: number | null;
    material?: string | null;
    weightGrams?: number | null;
  }> | null;
  product?: {
    bundleItems?: unknown;
    material?: string | null;
    diameterCm?: number | null;
    heightCm?: number | null;
  } | null;
};

type Props = {
  item: OrderItemDetailsItem;
  compact?: boolean;
  className?: string;
  showImage?: boolean;
  linkTargetBlank?: boolean;
  showAccordion?: boolean;
};

export function extractColorName(item: OrderItemDetailsItem): string | null {
  if (item.selectedColorHex) {
    const name = resolveColorName(item.selectedColorHex);
    if (name) return name;
  }

  if (item.colorData && typeof item.colorData === 'object') {
    const data = item.colorData as Record<string, unknown>;
    if (typeof data.selectedColorHex === 'string') {
      const name = resolveColorName(data.selectedColorHex);
      if (name) return name;
    }
    if (data.selectedColor && typeof data.selectedColor === 'object') {
      const sel = data.selectedColor as Record<string, unknown>;
      if (typeof sel.name === 'string' && sel.name.trim()) return sel.name.trim();
      if (typeof sel.hexCode === 'string') {
        const name = resolveColorName(sel.hexCode);
        if (name) return name;
      }
    }
    if (typeof data.color === 'string') {
      const name = resolveColorName(data.color);
      if (name) return name;
    } else if (data.color && typeof data.color === 'object') {
      const col = data.color as Record<string, unknown>;
      if (typeof col.name === 'string' && col.name.trim()) return col.name.trim();
      if (typeof col.hexCode === 'string') {
        const name = resolveColorName(col.hexCode);
        if (name) return name;
      }
    }
  }

  return null;
}

export function formatSpecs(item: OrderItemDetailsItem): string | null {
  const material = item.material || item.product?.material;
  const diameter = item.diameterCm ?? item.product?.diameterCm;
  const height = item.heightCm ?? item.product?.heightCm;

  const parts: string[] = [];
  if (material) {
    parts.push(`جنس: ${material}`);
  }
  if (diameter && height) {
    parts.push(`ابعاد: قطر ${toFa(diameter)} × ارتفاع ${toFa(height)} سانتی‌متر`);
  } else if (diameter) {
    parts.push(`قطر ${toFa(diameter)} سانتی‌متر`);
  } else if (height) {
    parts.push(`ارتفاع ${toFa(height)} سانتی‌متر`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function extractBundleItemsList(item: OrderItemDetailsItem): Array<{
  title: string;
  quantity?: number;
  diameterCm?: number | null;
  heightCm?: number | null;
}> {
  if (item.bundleItems && Array.isArray(item.bundleItems) && item.bundleItems.length > 0) {
    return item.bundleItems;
  }

  if (item.product?.bundleItems) {
    const parsed = parseBundleItems(item.product.bundleItems);
    if (parsed.length > 0) {
      return parsed.map((p) => ({
        title: p.title,
        quantity: 1,
        diameterCm: p.diameterCm,
        heightCm: p.heightCm,
      }));
    }
  }

  if (item.colorData && typeof item.colorData === 'object') {
    const cd = item.colorData as Record<string, unknown>;
    if (Array.isArray(cd.bundleItems) && cd.bundleItems.length > 0) {
      return cd.bundleItems as Array<{
        title: string;
        quantity?: number;
        diameterCm?: number | null;
        heightCm?: number | null;
      }>;
    }
  }

  return [];
}

export function formatBundleBreakdown(itemsList: Array<{ title: string; quantity?: number }>): string | null {
  if (!itemsList || itemsList.length === 0) return null;
  const itemsText = itemsList
    .map((bi) => `${toFa(bi.quantity || 1)} عدد ${bi.title}`)
    .join(' + ');
  return `شامل: ${itemsText}`;
}

export default function OrderItemDetails({
  item,
  compact = false,
  className = '',
  showImage = true,
  linkTargetBlank = false,
  showAccordion = true,
}: Props) {
  const name = item.productName || item.name || 'محصول بدون نام';
  const slug = item.productSlug || item.slug || null;
  const bundleSize = item.bundleSize && item.bundleSize > 1 ? item.bundleSize : 1;
  const isBundle = item.isBundle ?? bundleSize > 1;
  const displayQty = isBundle ? Math.round(item.quantity / bundleSize) : item.quantity;
  const displayUnitPrice = isBundle ? item.unitToman * bundleSize : item.unitToman;

  const colorName = extractColorName(item);
  const specs = formatSpecs(item);
  const bundleItems = isBundle ? extractBundleItemsList(item) : [];
  const bundleBreakdown = isBundle ? formatBundleBreakdown(bundleItems) : null;

  // Breakdown text: e.g. "۱ عدد - رنگ مشکی - ۱۷۶,۰۰۰ تومان"
  const itemUnitLabel = isBundle ? 'بسته' : 'عدد';
  const variationBreakdownParts: string[] = [
    `${toFa(displayQty)} ${itemUnitLabel}`,
  ];
  if (colorName) {
    variationBreakdownParts.push(`رنگ ${colorName}`);
  }
  variationBreakdownParts.push(`${formatToman(displayUnitPrice)} تومان`);
  const variationBreakdownText = variationBreakdownParts.join(' - ');

  // Compact layout (e.g. for Checkout aside)
  if (compact) {
    return (
      <div className={`space-y-1 py-2 text-xs ${className}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-soil-900 dark:text-dust-50">{name}</span>
              {item.variantTitle && (
                <span className="rounded-md bg-flora-100 dark:bg-flora-950 px-1.5 py-0.5 text-[10px] font-bold text-flora-800 dark:text-flora-200 border border-flora-300 dark:border-flora-700">
                  {item.variantTitle}
                </span>
              )}
              <ItemColorBadge colorData={item.colorData ?? (item.selectedColorHex ? { selectedColorHex: item.selectedColorHex } : undefined)} />
              {isBundle && (
                <span className="rounded-md bg-flora-100 dark:bg-flora-950 px-1.5 py-0.5 text-[10px] font-bold text-flora-700 dark:text-flora-300 border border-flora-300 dark:border-flora-700">
                  ست {toFa(bundleSize)} عددی
                </span>
              )}
            </div>

            {/* Color & Price Variation breakdown */}
            <p className="text-[11px] font-medium text-soil-800 dark:text-dust-200">
              {variationBreakdownText}
            </p>

            {/* Bundle breakdown */}
            {bundleBreakdown && (
              <p className="text-[11px] text-flora-800 dark:text-flora-300 font-medium bg-flora-50 dark:bg-flora-950/60 p-1.5 rounded-lg border border-flora-200/60 dark:border-flora-800/40">
                {bundleBreakdown}
              </p>
            )}

            {/* Full Specs & Tier */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-soil-700/70 dark:text-dust-200/70">
              {specs && <span>{specs}</span>}
              {item.tierLabel && (
                <span className="rounded bg-flora-50 dark:bg-flora-950 px-1.5 py-0.2 text-[10px] text-flora-700 dark:text-flora-300 border border-flora-300/40 dark:border-flora-700">
                  سطح: {item.tierLabel}
                </span>
              )}
            </div>
          </div>

          <span className="shrink-0 font-bold text-soil-900 dark:text-dust-50 text-sm">
            {formatToman(item.lineTotalToman)}
          </span>
        </div>
      </div>
    );
  }

  // Standard / Invoice layout
  return (
    <div
      className={`flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between print:flex-row print:items-center print:justify-between print:py-1 print:gap-2 print:break-inside-avoid ${className}`}
    >
      <div className="flex items-start sm:items-center gap-4 print:gap-2">
        {showImage && (
          item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={name}
              className="w-20 h-20 rounded-xl object-cover shrink-0 border border-soil-900/10 dark:border-dust-50/10 shadow-2xs dark:shadow-none print:w-10 print:h-10 print:rounded-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-dust-100 dark:bg-flora-950 border border-soil-900/10 dark:border-dust-50/10 flex items-center justify-center text-soil-700/40 dark:text-dust-400 shrink-0 print:w-10 print:h-10 print:rounded-md">
              <svg className="w-7 h-7 print:w-5 print:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )
        )}

        <div className="space-y-1.5 print:space-y-0.5 print:text-[10px]">
          <div className="flex items-center gap-2 flex-wrap">
            {slug ? (
              <Link
                href={`/products/${slug}`}
                target={linkTargetBlank ? '_blank' : undefined}
                rel={linkTargetBlank ? 'noopener noreferrer' : undefined}
                className="font-bold text-soil-900 dark:text-dust-50 hover:text-flora-700 dark:hover:text-flora-300 transition print:text-xs"
              >
                {name}
              </Link>
            ) : (
              <span className="font-bold text-soil-900 dark:text-dust-50 print:text-xs">{name}</span>
            )}

            {item.variantTitle && (
              <span className="inline-flex items-center rounded-md bg-flora-100 dark:bg-flora-950 px-2 py-0.5 text-[11px] font-bold text-flora-800 dark:text-flora-200 border border-flora-300 dark:border-flora-700 print:text-[9px] print:px-1.5 print:py-0">
                {item.variantTitle}
              </span>
            )}

            {isBundle && (
              <span className="inline-flex items-center rounded-md bg-flora-100 dark:bg-flora-950 px-2 py-0.5 text-[11px] font-bold text-flora-700 dark:text-flora-300 border border-flora-300 dark:border-flora-700 print:text-[9px] print:px-1.5 print:py-0">
                شامل {toFa(bundleSize)} عدد گلدان
              </span>
            )}
          </div>

          {item.sku && (
            <p className="text-xs text-soil-700/60 dark:text-dust-200/60 print:text-[9px]">
              کد کالا:{' '}
              <span className="font-mono font-medium" dir="ltr">
                {item.sku}
              </span>
            </p>
          )}

          {/* Color & Price Variations line */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-soil-900 dark:text-dust-100 print:text-[9px]">
            <span>{variationBreakdownText}</span>
            {!isBundle && (
              <ItemColorBadge colorData={item.colorData ?? (item.selectedColorHex ? { selectedColorHex: item.selectedColorHex } : undefined)} />
            )}
          </div>

          {/* Full Specs */}
          {specs && (
            <p className="text-xs text-soil-700/75 dark:text-dust-200/75 print:text-[9px]">
              {specs}
            </p>
          )}

          {/* Bundle breakdown text (always visible in print and web) */}
          {bundleBreakdown && (
            <p className="text-xs text-flora-800 dark:text-flora-300 font-medium bg-flora-50/70 dark:bg-flora-950/50 px-2 py-1 rounded-lg border border-flora-200/60 dark:border-flora-800/40 print:bg-transparent print:border-none print:p-0 print:text-[9px]">
              {bundleBreakdown}
            </p>
          )}

          {/* Detailed accordion for bundle items */}
          {isBundle && showAccordion && (
            <BundleDetailsAccordion
              bundleSize={bundleSize}
              bundleCount={displayQty}
              colorData={item.colorData}
              productBundleItems={item.product?.bundleItems}
            />
          )}

          {/* Total & Tier label */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-soil-700/80 dark:text-dust-200/80 print:text-[9px]">
            <p>
              {isBundle ? (
                <>
                  {toFa(displayQty)} بسته × {formatToman(displayUnitPrice)} ={' '}
                  <span className="font-bold text-soil-900 dark:text-dust-50">
                    {formatToman(item.lineTotalToman)}
                  </span>
                </>
              ) : (
                <>
                  {toFa(displayQty)} عدد × {formatToman(displayUnitPrice)} ={' '}
                  <span className="font-bold text-soil-900 dark:text-dust-50">
                    {formatToman(item.lineTotalToman)}
                  </span>
                </>
              )}
            </p>
            {item.tierLabel && (
              <span className="rounded-md bg-flora-50 dark:bg-flora-950 px-2 py-0.5 text-[11px] font-medium text-flora-700 dark:text-flora-300 border border-flora-300/60 dark:border-flora-700 print:text-[9px]">
                سطح: {item.tierLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-0 border-soil-900/5 dark:border-dust-50/5 pt-2 sm:pt-0 shrink-0 print:border-0 print:pt-0">
        <span className="text-xs text-soil-700/60 dark:text-dust-200/60 sm:hidden">مبلغ کل:</span>
        <p className="font-bold text-flora-900 dark:text-flora-300 text-sm sm:text-base print:text-xs">
          {formatToman(item.lineTotalToman)}
        </p>
      </div>
    </div>
  );
}

export type ProductColorBreakdownItem = {
  lineId?: string;
  colorName: string | null;
  variantTitle?: string | null;
  quantity: number;
  displayQty: number;
  unitLabel: string;
  summaryText: string;
};

export type GroupedOrderProduct = {
  productId: string;
  name: string;
  productName: string;
  slug: string | null;
  productSlug: string | null;
  imageUrl: string | null;
  sku: string | null;
  specs: string | null;
  items: OrderItemDetailsItem[];
  lines: OrderItemDetailsItem[];
  totalQuantity: number;
  totalToman: number;
  bundleSize?: number | null;
  isBundle?: boolean;
  colorBreakdown: ProductColorBreakdownItem[];
  breakdownSummary: string;
};

export function buildProductBreakdownSummary(items: OrderItemDetailsItem[]): string {
  const hasVariationOrBundle = items.some(
    (i) => extractColorName(i) || i.variantTitle || (i.bundleSize && i.bundleSize > 1) || i.isBundle
  );
  if (items.length === 1 && items[0].quantity === 1 && !hasVariationOrBundle) {
    return '';
  }

  const lineSummaries = new Map<string, { displayQty: number; unitLabel: string; descriptor: string }>();

  for (const item of items) {
    const bundleSize = item.bundleSize && item.bundleSize > 1 ? item.bundleSize : 1;
    const isBundle = item.isBundle ?? bundleSize > 1;
    const displayQty = isBundle ? Math.round(item.quantity / bundleSize) : item.quantity;
    const unitLabel = isBundle ? 'بسته' : 'عدد';
    const colorName = extractColorName(item);

    const parts: string[] = [];
    if (colorName && item.variantTitle) {
      parts.push(`${colorName} (${item.variantTitle})`);
    } else if (colorName) {
      parts.push(colorName);
    } else if (item.variantTitle) {
      parts.push(item.variantTitle);
    }
    const descriptor = parts.join(' ');
    const key = `${unitLabel}:::${descriptor}`;

    const existing = lineSummaries.get(key);
    if (existing) {
      existing.displayQty += displayQty;
    } else {
      lineSummaries.set(key, { displayQty, unitLabel, descriptor });
    }
  }

  return Array.from(lineSummaries.values())
    .map((ls) => {
      const descPart = ls.descriptor ? ` ${ls.descriptor}` : '';
      return `${toFa(ls.displayQty)} ${ls.unitLabel}${descPart}`;
    })
    .join('، ');
}

export function groupOrderItemsByProduct(items: OrderItemDetailsItem[]): GroupedOrderProduct[] {
  const map = new Map<string, GroupedOrderProduct>();

  for (const item of items) {
    const key =
      item.productId ||
      item.productSlug ||
      item.slug ||
      item.productName ||
      item.name ||
      item.id ||
      'unknown';
    const name = item.productName || item.name || 'محصول بدون نام';
    const slug = item.productSlug || item.slug || null;
    const imageUrl = item.imageUrl || null;
    const sku = item.sku || null;
    const specs = formatSpecs(item);
    const bundleSize = item.bundleSize && item.bundleSize > 1 ? item.bundleSize : 1;
    const isBundle = item.isBundle ?? bundleSize > 1;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        productId: key,
        name,
        productName: name,
        slug,
        productSlug: slug,
        imageUrl,
        sku,
        specs,
        items: [item],
        lines: [item],
        totalQuantity: item.quantity,
        totalToman: item.lineTotalToman,
        bundleSize,
        isBundle,
        colorBreakdown: [],
        breakdownSummary: '',
      });
    } else {
      existing.items.push(item);
      existing.lines.push(item);
      existing.totalQuantity += item.quantity;
      existing.totalToman += item.lineTotalToman;
      if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
      if (!existing.specs && specs) existing.specs = specs;
      if (!existing.sku && sku) existing.sku = sku;
    }
  }

  const groups = Array.from(map.values());
  for (const group of groups) {
    group.breakdownSummary = buildProductBreakdownSummary(group.items);
    group.colorBreakdown = group.items.map((it) => {
      const bSize = it.bundleSize && it.bundleSize > 1 ? it.bundleSize : 1;
      const isB = it.isBundle ?? bSize > 1;
      const dQty = isB ? Math.round(it.quantity / bSize) : it.quantity;
      const uLabel = isB ? 'بسته' : 'عدد';
      const cName = extractColorName(it);
      const parts: string[] = [];
      if (cName && it.variantTitle) parts.push(`${cName} (${it.variantTitle})`);
      else if (cName) parts.push(cName);
      else if (it.variantTitle) parts.push(it.variantTitle);
      const desc = parts.length > 0 ? ` ${parts.join(' ')}` : '';

      return {
        lineId: it.id,
        colorName: cName,
        variantTitle: it.variantTitle ?? null,
        quantity: it.quantity,
        displayQty: dQty,
        unitLabel: uLabel,
        summaryText: `${toFa(dQty)} ${uLabel}${desc}`,
      };
    });
  }

  return groups;
}

export const groupOrderItems = groupOrderItemsByProduct;

export function GroupedOrderItems({
  items,
  compact = false,
  className = '',
  linkTargetBlank = false,
  showAccordion = true,
}: {
  items: OrderItemDetailsItem[];
  compact?: boolean;
  className?: string;
  linkTargetBlank?: boolean;
  showAccordion?: boolean;
}) {
  const groups = groupOrderItems(items);

  if (groups.length === 0) return null;

  if (compact) {
    return (
      <div className={`divide-y divide-soil-900/10 dark:divide-dust-50/10 ${className}`}>
        {groups.map((group) => {
          return (
            <div key={group.productId} className="py-3 text-xs space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-soil-900 dark:text-dust-50 text-xs sm:text-sm">
                      {group.name}
                    </span>
                    {group.breakdownSummary && (
                      <span className="text-[11px] text-soil-700/75 dark:text-dust-200/75 font-medium">
                        ({group.breakdownSummary})
                      </span>
                    )}
                    {group.isBundle && (
                      <span className="rounded-md bg-flora-100 dark:bg-flora-950 px-1.5 py-0.5 text-[10px] font-bold text-flora-700 dark:text-flora-300 border border-flora-300 dark:border-flora-700">
                        ست {toFa(group.bundleSize || 1)} عددی
                      </span>
                    )}
                  </div>

                  {group.specs && (
                    <p className="text-[11px] text-soil-700/70 dark:text-dust-200/70">
                      {group.specs}
                    </p>
                  )}

                  {/* Sub-rows for variants */}
                  <ul className="space-y-1.5 mt-1 pr-2 border-r-2 border-flora-500/30 dark:border-flora-400/20">
                    {group.items.map((subItem, idx) => {
                      const colorName = extractColorName(subItem);
                      const bundleSize = subItem.bundleSize && subItem.bundleSize > 1 ? subItem.bundleSize : 1;
                      const isBundle = subItem.isBundle ?? bundleSize > 1;
                      const displayQty = isBundle ? Math.round(subItem.quantity / bundleSize) : subItem.quantity;
                      const unitLabel = isBundle ? 'بسته' : 'عدد';

                      const labelParts: string[] = [];
                      if (colorName) labelParts.push(`رنگ ${colorName}`);
                      if (subItem.variantTitle) labelParts.push(subItem.variantTitle);
                      const variantLabel = labelParts.length > 0 ? labelParts.join(' - ') : 'مدل استاندارد';

                      return (
                        <li key={subItem.id ?? idx} className="flex items-center justify-between text-[11px] gap-2">
                          <span className="flex items-center gap-1.5 text-soil-800 dark:text-dust-200">
                            <ItemColorBadge colorData={subItem.colorData ?? (subItem.selectedColorHex ? { selectedColorHex: subItem.selectedColorHex } : undefined)} />
                            <span>{variantLabel}:</span>
                            <span className="font-bold">{toFa(displayQty)} {unitLabel}</span>
                          </span>
                          <span className="font-semibold text-soil-900 dark:text-dust-100">
                            ({formatToman(subItem.lineTotalToman)} تومان)
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Group total */}
                  <div className="pt-1.5 text-[11px] flex justify-between font-bold text-soil-900 dark:text-dust-50 border-t border-soil-900/5 dark:border-dust-50/10">
                    <span>مجموع:</span>
                    <span className="text-flora-900 dark:text-flora-300 font-black">
                      {formatToman(group.totalToman)} تومان
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`divide-y divide-soil-900/10 dark:divide-dust-50/10 ${className}`}>
      {groups.map((group) => {
        return (
          <div
            key={group.productId}
            className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between print:py-2 print:gap-3 print:break-inside-avoid"
          >
            <div className="flex items-start gap-4 print:gap-2 flex-1 min-w-0">
              {/* Product image shown once */}
              {group.imageUrl ? (
                <img
                  src={group.imageUrl}
                  alt={group.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0 border border-soil-900/10 dark:border-dust-50/10 shadow-2xs dark:shadow-none print:w-12 print:h-12 print:rounded-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-dust-100 dark:bg-flora-950 border border-soil-900/10 dark:border-dust-50/10 flex items-center justify-center text-soil-700/40 dark:text-dust-400 shrink-0 print:w-12 print:h-12 print:rounded-md">
                  <svg className="w-7 h-7 print:w-5 print:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}

              <div className="space-y-2 flex-1 min-w-0 print:space-y-1 print:text-[10px]">
                <div className="flex items-center gap-2 flex-wrap">
                  {group.slug ? (
                    <Link
                      href={`/products/${group.slug}`}
                      target={linkTargetBlank ? '_blank' : undefined}
                      rel={linkTargetBlank ? 'noopener noreferrer' : undefined}
                      className="font-bold text-soil-900 dark:text-dust-50 hover:text-flora-700 dark:hover:text-flora-300 transition text-base print:text-xs"
                    >
                      {group.name}
                    </Link>
                  ) : (
                    <span className="font-bold text-soil-900 dark:text-dust-50 text-base print:text-xs">
                      {group.name}
                    </span>
                  )}

                  {group.breakdownSummary && (
                    <span className="text-xs text-soil-700/80 dark:text-dust-200/80 font-medium print:text-[10px]">
                      ({group.breakdownSummary})
                    </span>
                  )}

                  {group.isBundle && (
                    <span className="inline-flex items-center rounded-md bg-flora-100 dark:bg-flora-950 px-2 py-0.5 text-[11px] font-bold text-flora-700 dark:text-flora-300 border border-flora-300 dark:border-flora-700 print:text-[9px]">
                      شامل {toFa(group.bundleSize || 1)} عدد گلدان
                    </span>
                  )}
                </div>

                {group.sku && (
                  <p className="text-xs text-soil-700/60 dark:text-dust-200/60 print:text-[9px]">
                    کد کالا:{' '}
                    <span className="font-mono font-medium" dir="ltr">
                      {group.sku}
                    </span>
                  </p>
                )}

                {group.specs && (
                  <p className="text-xs text-soil-700/75 dark:text-dust-200/75 print:text-[9px]">
                    {group.specs}
                  </p>
                )}

                {/* Sub-rows for each variant */}
                <div className="rounded-xl bg-dust-50/80 dark:bg-flora-950/40 border border-soil-900/5 dark:border-dust-50/5 p-3 space-y-2 print:p-1 print:bg-transparent print:border-none print:space-y-1">
                  {group.items.map((subItem, idx) => {
                    const colorName = extractColorName(subItem);
                    const bundleSize = subItem.bundleSize && subItem.bundleSize > 1 ? subItem.bundleSize : 1;
                    const isBundle = subItem.isBundle ?? bundleSize > 1;
                    const displayQty = isBundle ? Math.round(subItem.quantity / bundleSize) : subItem.quantity;
                    const unitLabel = isBundle ? 'بسته' : 'عدد';

                    const labelParts: string[] = [];
                    if (colorName) labelParts.push(`رنگ ${colorName}`);
                    if (subItem.variantTitle) labelParts.push(subItem.variantTitle);
                    const variantLabel = labelParts.length > 0 ? labelParts.join(' - ') : 'مدل استاندارد';

                    const bundleItems = isBundle ? extractBundleItemsList(subItem) : [];
                    const bundleBreakdown = isBundle ? formatBundleBreakdown(bundleItems) : null;

                    return (
                      <div key={subItem.id ?? idx} className="space-y-1 text-xs print:text-[9px]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-flora-600 dark:bg-flora-400 shrink-0" />
                            <span className="font-bold text-soil-900 dark:text-dust-50">
                              {variantLabel}:
                            </span>
                            <span className="font-medium text-soil-700 dark:text-dust-200">
                              {toFa(displayQty)} {unitLabel}
                            </span>
                            <ItemColorBadge colorData={subItem.colorData ?? (subItem.selectedColorHex ? { selectedColorHex: subItem.selectedColorHex } : undefined)} />
                          </div>
                          <span className="font-bold text-soil-900 dark:text-dust-50">
                            ({formatToman(subItem.lineTotalToman)} تومان)
                          </span>
                        </div>

                        {bundleBreakdown && (
                          <p className="text-[11px] text-flora-800 dark:text-flora-300 font-medium bg-flora-50/80 dark:bg-flora-900/40 px-2 py-0.5 rounded-md border border-flora-200/60 dark:border-flora-800/40 print:bg-transparent print:border-none print:p-0">
                            {bundleBreakdown}
                          </p>
                        )}

                        {isBundle && showAccordion && (
                          <BundleDetailsAccordion
                            bundleSize={bundleSize}
                            bundleCount={displayQty}
                            colorData={subItem.colorData}
                            productBundleItems={subItem.product?.bundleItems}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Group Total row */}
                <div className="flex items-center justify-between pt-1 text-xs print:text-[10px]">
                  <span className="font-bold text-soil-700/80 dark:text-dust-200/80">
                    مجموع:
                  </span>
                  <span className="font-black text-sm text-flora-900 dark:text-flora-300 print:text-xs">
                    {formatToman(group.totalToman)} تومان
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
