import { toFa } from '@/lib/format';
import { DEFAULT_COLOR_NAMES } from '@/features/catalog/components/ItemColorBadge';

export type BundleColorItem = {
  name: string;
  hex: string;
};

export type BundleItemConfig = {
  title?: string;
  color: string;
  hex?: string;
};

export type BundleConfiguration = {
  bundleIndex: number;
  items: BundleItemConfig[];
};

export type BundleSelection = {
  bundleIndex: number;
  colors: BundleColorItem[];
};

export type StandaloneColorBreakdown = {
  colorName: string;
  hexCode: string;
  quantity: number;
};

export type GroupedCartItem = {
  productId: string;
  name: string;
  productName: string;
  slug?: string | null;
  productSlug?: string | null;
  imageUrl?: string | null;
  sku?: string | null;
  specs?: string | null;
  material?: string | null;
  diameterCm?: number | null;
  heightCm?: number | null;
  variantId?: string | null;
  variantTitle?: string | null;
  totalQuantity: number;
  totalToman: number;
  unitToman: number;
  isBundle: boolean;
  bundleSize: number;
  bundleCount: number;
  rawItems: any[];
} & (
  | {
      kind: 'standalone';
      colors: StandaloneColorBreakdown[];
      summaryText: string;
    }
  | {
      kind: 'bundle';
      type: 'identical';
      quantity: number; // bundleCount
      config: BundleConfiguration;
      summaryText: string;
    }
  | {
      kind: 'bundle';
      type: 'mixed';
      quantity: number; // bundleCount
      configurations: BundleConfiguration[];
      summaryText: string;
    }
);

export type BundleColorSummary =
  | {
      isIdentical: true;
      bundleCount: number;
      colors: BundleColorItem[];
      summaryText: string; // e.g. "۲ بسته (رنگ‌ها: سفید + تراکوتا)"
    }
  | {
      isIdentical: false;
      bundleCount: number;
      lines: Array<{
        bundleIndex: number;
        label: string; // e.g. "بسته ۱:"
        text: string;  // e.g. "سفید + تراکوتا"
        colors: BundleColorItem[];
      }>;
    };

export const PERSIAN_NAME_TO_HEX: Record<string, string> = {
  سفید: '#FFFFFF',
  مشکی: '#000000',
  تراکوتا: '#C86A4B',
  'طوسی روشن': '#D3D3D3',
  طوسی: '#808080',
  'طوسی تیره': '#A9A9A9',
  'خاکی / کرم': '#E8D8C8',
  کرم: '#F5F5DC',
  'سبز صدری': '#7A8B7B',
  'قهوه‌ای سوخته': '#4A3525',
  'قهوه ای سوخته': '#4A3525',
  'قهوه‌ای': '#8D5B4C',
  'قهوه ای': '#8D5B4C',
  گلبهی: '#E0A899',
  استخوانی: '#F5EBE6',
  قرمز: '#FF0000',
  آبی: '#0000FF',
  سبز: '#008000',
  زرد: '#FFFF00',
  نارنجی: '#FFA500',
  بنفش: '#800080',
  صورتی: '#FFC0CB',
  طلایی: '#D4AF37',
  'نقره‌ای': '#C0C0C0',
  'نقره ای': '#C0C0C0',
};

/**
 * Resolves any raw color representation (string name, hex code, or object)
 * into a standardized { name, hex } tuple with valid Persian name and Hex code.
 */
export function resolveColorItem(input: unknown): BundleColorItem {
  if (!input) {
    return { name: 'نامشخص', hex: '#808080' };
  }

  // If input is an object
  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>;
    const hex =
      typeof obj.hexCode === 'string'
        ? obj.hexCode.trim()
        : typeof obj.hex === 'string'
        ? obj.hex.trim()
        : typeof obj.color === 'string'
        ? obj.color.trim()
        : '';

    const explicitName = typeof obj.name === 'string' ? obj.name.trim() : '';

    if (explicitName && hex) {
      return { name: explicitName, hex };
    }
    if (explicitName) {
      const mappedHex = PERSIAN_NAME_TO_HEX[explicitName] || '#808080';
      return { name: explicitName, hex: mappedHex };
    }
    if (hex) {
      const mappedName = DEFAULT_COLOR_NAMES[hex.toUpperCase()] || hex;
      return { name: mappedName, hex };
    }
  }

  // If input is a string
  if (typeof input === 'string') {
    const str = input.trim();
    if (str.startsWith('#')) {
      const upper = str.toUpperCase();
      const mappedName = DEFAULT_COLOR_NAMES[upper] || str;
      return { name: mappedName, hex: str };
    }
    // It's a Persian name
    const mappedHex = PERSIAN_NAME_TO_HEX[str] || '#808080';
    return { name: str, hex: mappedHex };
  }

  return { name: String(input), hex: '#808080' };
}

/**
 * Parses bundleSelections from any raw colorData payload.
 * Supports:
 * - colorData.bundleSelections
 * - raw array
 * - legacy colorData.bundleColors (replicated across bundle count)
 * - colorData.selectedColor / colorData.color
 */
export function parseBundleSelections(
  colorData: unknown,
  totalQuantity?: number,
  bundleSize?: number,
  productBundleItems?: unknown,
): BundleSelection[] {
  if (!colorData) return [];

  let data = colorData;
  if (typeof colorData === 'string') {
    try {
      data = JSON.parse(colorData);
    } catch {
      return [];
    }
  }

  const bSize = bundleSize && bundleSize > 1 ? bundleSize : 1;
  const bundleCount = Math.max(1, Math.floor((totalQuantity || bSize) / bSize));

  // Case 1: Raw array of selections
  if (Array.isArray(data)) {
    return data.map((item, idx) => {
      const selObj = item as Record<string, unknown>;
      const bIndex = typeof selObj.bundleIndex === 'number' ? selObj.bundleIndex : idx + 1;
      const rawColors = Array.isArray(selObj.colors)
        ? selObj.colors
        : Array.isArray(item)
        ? item
        : [];
      return {
        bundleIndex: bIndex,
        colors: rawColors.map(resolveColorItem),
      };
    });
  }

  if (typeof data !== 'object' || data === null) {
    return [];
  }

  const obj = data as Record<string, unknown>;

  // Case 2: Object with bundleConfigurations or bundleSelections or metadata.bundleSelections
  if (Array.isArray(obj.bundleConfigurations) && obj.bundleConfigurations.length > 0) {
    return (obj.bundleConfigurations as Record<string, unknown>[]).map((item, idx) => {
      const bIndex = typeof item.bundleIndex === 'number' ? item.bundleIndex : idx + 1;
      const rawItems = Array.isArray(item.items) ? item.items : [];
      return {
        bundleIndex: bIndex,
        colors: rawItems.map((it: unknown) => {
          if (typeof it === 'string') return resolveColorItem(it);
          const itObj = (it || {}) as Record<string, unknown>;
          return resolveColorItem(itObj.color || itObj.name || itObj.hexCode || itObj.hex);
        }),
      };
    });
  }

  const rawSelections =
    Array.isArray(obj.bundleSelections)
      ? obj.bundleSelections
      : obj.metadata && typeof obj.metadata === 'object' && Array.isArray((obj.metadata as Record<string, unknown>).bundleSelections)
      ? (obj.metadata as Record<string, unknown>).bundleSelections
      : null;

  if (rawSelections && Array.isArray(rawSelections) && rawSelections.length > 0) {
    return rawSelections.map((item, idx) => {
      const selObj = item as Record<string, unknown>;
      const bIndex = typeof selObj.bundleIndex === 'number' ? selObj.bundleIndex : idx + 1;
      const rawColors = Array.isArray(selObj.colors) ? selObj.colors : [];
      return {
        bundleIndex: bIndex,
        colors: rawColors.map(resolveColorItem),
      };
    });
  }

  // Case 3: Legacy bundleColors dictionary (map of index -> color) or direct numeric map
  let bColorsObj: Record<string | number, unknown> | null = null;
  if (obj.bundleColors && typeof obj.bundleColors === 'object') {
    bColorsObj = obj.bundleColors as Record<string | number, unknown>;
  } else if (
    !obj.bundleConfigurations &&
    !obj.bundleSelections &&
    Object.keys(obj).length > 0 &&
    Object.keys(obj).every((k) => !isNaN(Number(k)))
  ) {
    bColorsObj = obj as Record<string | number, unknown>;
  }

  if (bColorsObj) {
    const colorEntries = Object.entries(bColorsObj)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, val]) => resolveColorItem(val));

    if (colorEntries.length > 0) {
      return Array.from({ length: bundleCount }, (_, bIdx) => ({
        bundleIndex: bIdx + 1,
        colors: [...colorEntries],
      }));
    }
  }

  // Case 4: Single color fallback
  const singleColor = obj.selectedColor || obj.color;
  if (singleColor) {
    const resolved = resolveColorItem(singleColor);
    return Array.from({ length: bundleCount }, (_, bIdx) => ({
      bundleIndex: bIdx + 1,
      colors: [resolved],
    }));
  }

  return [];
}

/**
 * Computes the color summary for a bundle according to TASK 3 rules:
 * - If all bundles have the exact same colors:
 *   "X بسته (رنگ‌ها: سفید + تراکوتا)"
 * - If bundles have different colors:
 *   بسته ۱: سفید + تراکوتا
 *   بسته ۲: مشکی + مشکی
 *
 * NOTE: Strict Persian half-space (ZWNJ) is enforced on "رنگ‌ها" and "بسته‌ها".
 */
export function getBundleColorSummary(
  selections: BundleSelection[],
  bundleCount?: number,
): BundleColorSummary | null {
  if (!selections || selections.length === 0) return null;

  const count = Math.max(selections.length, bundleCount || 1);

  // Check if all bundles in selections have identical colors (strict order-dependent comparison)
  const extractColors = (s: BundleSelection) =>
    s.colors.map((c) => ({ color: (c.name || '').trim() }));

  const firstJson =
    selections.length > 0 ? JSON.stringify(extractColors(selections[0])) : '';

  const isIdentical =
    selections.length > 0 &&
    selections.every((s) => JSON.stringify(extractColors(s)) === firstJson);

  if (isIdentical) {
    const firstBundleColors = selections[0].colors;
    const colorNames = firstBundleColors.map((c) => c.name).join(' + ');
    const countFa = toFa(count);
    return {
      isIdentical: true,
      bundleCount: count,
      colors: firstBundleColors,
      summaryText: `${countFa} بسته (رنگ\u200Cها: ${colorNames})`,
    };
  }

  return {
    isIdentical: false,
    bundleCount: count,
    lines: selections.map((sel) => ({
      bundleIndex: sel.bundleIndex,
      label: `بسته ${toFa(sel.bundleIndex)}:`,
      text: sel.colors.map((c) => c.name).join(' + '),
      colors: sel.colors,
    })),
  };
}

/**
 * Merges newly incoming bundle selections with existing bundle selections
 * when a user adds bundles to cart. Prevents overwriting previously added
 * bundle color choices.
 */
export function mergeBundleSelections(
  existingSelections: BundleSelection[],
  incomingColorsOrSelections: unknown,
  incomingBundleCount = 1,
): BundleSelection[] {
  const result: BundleSelection[] = [...existingSelections];
  let nextBundleIndex = result.length > 0 ? Math.max(...result.map((s) => s.bundleIndex)) + 1 : 1;

  if (!incomingColorsOrSelections) return result;

  // Case 1: Raw array of selections or configurations
  if (Array.isArray(incomingColorsOrSelections) && incomingColorsOrSelections.length > 0) {
    const first = incomingColorsOrSelections[0] as Record<string, unknown>;
    if (typeof first === 'object' && first !== null && ('colors' in first || 'bundleIndex' in first)) {
      for (const item of incomingColorsOrSelections as BundleSelection[]) {
        result.push({
          bundleIndex: nextBundleIndex++,
          colors: (item.colors || []).map(resolveColorItem),
        });
      }
      return result;
    }
    if (typeof first === 'object' && first !== null && 'items' in first) {
      for (const item of incomingColorsOrSelections as BundleConfiguration[]) {
        result.push({
          bundleIndex: nextBundleIndex++,
          colors: (item.items || []).map((it) => resolveColorItem(it.color || it.hex)),
        });
      }
      return result;
    }

    const resolvedColors = incomingColorsOrSelections.map(resolveColorItem);
    for (let i = 0; i < incomingBundleCount; i++) {
      result.push({
        bundleIndex: nextBundleIndex++,
        colors: [...resolvedColors],
      });
    }
    return result;
  }

  // Case 2: Object with bundleColors, bundleSelections, etc.
  if (typeof incomingColorsOrSelections === 'object' && incomingColorsOrSelections !== null) {
    const parsed = parseBundleSelections(
      incomingColorsOrSelections,
      incomingBundleCount,
      1,
    );
    if (parsed.length > 0) {
      for (const sel of parsed) {
        result.push({
          bundleIndex: nextBundleIndex++,
          colors: sel.colors,
        });
      }
      return result;
    }
  }

  return result;
}

/**
 * Parses bundle configurations from colorData.
 * Supports:
 * - colorData.bundleConfigurations (or array directly)
 * - colorData.bundleSelections
 * - colorData.bundleColors
 */
export function parseBundleConfigurations(
  colorData: unknown,
  totalQuantity?: number,
  bundleSize?: number,
  productBundleItems?: unknown,
): BundleConfiguration[] {
  if (!colorData) return [];

  let data = colorData;
  if (typeof colorData === 'string') {
    try {
      data = JSON.parse(colorData);
    } catch {
      return [];
    }
  }

  // Case 1: Raw array of configurations
  if (Array.isArray(data)) {
    return data.map((item, idx) => {
      const obj = item as Record<string, unknown>;
      const bIndex = typeof obj.bundleIndex === 'number' ? obj.bundleIndex : idx + 1;
      const rawItems = Array.isArray(obj.items)
        ? obj.items
        : Array.isArray(obj.colors)
        ? obj.colors
        : [];
      return {
        bundleIndex: bIndex,
        items: rawItems.map((raw, i) => {
          if (typeof raw === 'string') {
            const resolved = resolveColorItem(raw);
            return { title: `گلدان ${toFa(i + 1)}`, color: resolved.name, hex: resolved.hex };
          }
          const rawObj = (raw || {}) as Record<string, unknown>;
          const colorName = String(rawObj.color || rawObj.name || '').trim();
          const resolved = resolveColorItem(colorName || rawObj.hexCode || rawObj.hex);
          return {
            title: (typeof rawObj.title === 'string' && rawObj.title) || `گلدان ${toFa(i + 1)}`,
            color: resolved.name,
            hex: resolved.hex,
          };
        }),
      };
    });
  }

  if (typeof data !== 'object' || data === null) return [];
  const obj = data as Record<string, unknown>;

  // Case 2: Object with bundleConfigurations
  if (Array.isArray(obj.bundleConfigurations) && obj.bundleConfigurations.length > 0) {
    return parseBundleConfigurations(obj.bundleConfigurations, totalQuantity, bundleSize, productBundleItems);
  }

  // Case 3: Convert from bundleSelections
  const selections = parseBundleSelections(colorData, totalQuantity, bundleSize, productBundleItems);
  return selections.map((s) => ({
    bundleIndex: s.bundleIndex,
    items: s.colors.map((c, i) => ({
      title: `گلدان ${toFa(i + 1)}`,
      color: c.name,
      hex: c.hex,
    })),
  }));
}

export function formatSpecs(item: any): string | null {
  const material = item?.material || item?.product?.material;
  const diameter = item?.diameterCm ?? item?.product?.diameterCm;
  const height = item?.heightCm ?? item?.product?.heightCm;

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

export function extractColorName(item: any): string | null {
  if (item?.selectedColorHex) {
    const name = DEFAULT_COLOR_NAMES[item.selectedColorHex.toUpperCase()] || resolveColorItem(item.selectedColorHex).name;
    if (name && name !== 'نامشخص') return name;
  }

  if (item?.colorData && typeof item.colorData === 'object') {
    const data = item.colorData as Record<string, unknown>;
    if (typeof data.selectedColorHex === 'string') {
      const name = DEFAULT_COLOR_NAMES[data.selectedColorHex.toUpperCase()] || resolveColorItem(data.selectedColorHex).name;
      if (name && name !== 'نامشخص') return name;
    }
    if (data.selectedColor && typeof data.selectedColor === 'object') {
      const sel = data.selectedColor as Record<string, unknown>;
      if (typeof sel.name === 'string' && sel.name.trim()) return sel.name.trim();
      if (typeof sel.hexCode === 'string') {
        const name = DEFAULT_COLOR_NAMES[sel.hexCode.toUpperCase()] || resolveColorItem(sel.hexCode).name;
        if (name && name !== 'نامشخص') return name;
      }
    }
    if (typeof data.color === 'string') {
      const name = DEFAULT_COLOR_NAMES[data.color.toUpperCase()] || resolveColorItem(data.color).name;
      if (name && name !== 'نامشخص') return name;
    } else if (data.color && typeof data.color === 'object') {
      const col = data.color as Record<string, unknown>;
      if (typeof col.name === 'string' && col.name.trim()) return col.name.trim();
      if (typeof col.hexCode === 'string') {
        const name = DEFAULT_COLOR_NAMES[col.hexCode.toUpperCase()] || resolveColorItem(col.hexCode).name;
        if (name && name !== 'نامشخص') return name;
      }
    }
  }

  return null;
}

/**
 * TASK 2: Grouping Logic for the UI
 * Groups items by productId.
 *
 * For Standalone items: Group by color and sum the quantities.
 * For Bundles: Group by productId. Compare the bundleConfigurations of all items in that group.
 * If all configurations are identical, returns { type: 'identical', quantity, config }.
 * If they are different, returns { type: 'mixed', configurations: [...] }.
 */
export function groupCartItems(items: any[]): GroupedCartItem[] {
  if (!items || items.length === 0) return [];

  const groupsMap = new Map<string, any[]>();

  for (const item of items) {
    const baseKey =
      item.productId ||
      item.productSlug ||
      item.slug ||
      item.productName ||
      item.name ||
      item.id ||
      'unknown';
    const key = item.variantId
      ? `${baseKey}::${item.variantId}`
      : item.variantTitle
        ? `${baseKey}::${item.variantTitle}`
        : baseKey;

    const list = groupsMap.get(key) || [];
    list.push(item);
    groupsMap.set(key, list);
  }

  const result: GroupedCartItem[] = [];

  for (const [groupKey, groupItems] of groupsMap.entries()) {
    const first = groupItems[0];
    const productId = first.productId || groupKey;
    const name = first.productName || first.name || 'محصول بدون نام';
    const slug = first.productSlug || first.slug || null;
    const imageUrl = groupItems.find((it) => it.imageUrl)?.imageUrl || null;
    const sku = groupItems.find((it) => it.sku)?.sku || null;
    const specs = formatSpecs(first);
    const material = first.material || first.product?.material || null;
    const diameterCm = first.diameterCm ?? first.product?.diameterCm ?? null;
    const heightCm = first.heightCm ?? first.product?.heightCm ?? null;
    const variantId = first.variantId || null;
    const variantTitle = first.variantTitle || null;

    const bundleSize =
      groupItems.find((it) => it.bundleSize && it.bundleSize > 1)?.bundleSize ?? 1;
    const isBundle = Boolean(
      first.isBundle ||
      bundleSize > 1 ||
      groupItems.some((it) => it.isBundle || (it.bundleSize && it.bundleSize > 1)),
    );

    const totalQuantity = groupItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const totalToman = groupItems.reduce(
      (sum, it) => sum + (it.lineTotalToman ?? (it.unitToman ?? 0) * (it.quantity || 1)),
      0,
    );
    const unitToman =
      totalQuantity > 0 ? Math.round(totalToman / totalQuantity) : first.unitToman ?? 0;
    const bundleCount = isBundle ? Math.max(1, Math.round(totalQuantity / bundleSize)) : totalQuantity;

    const baseData = {
      productId,
      name,
      productName: name,
      slug,
      productSlug: slug,
      imageUrl,
      sku,
      specs,
      material,
      diameterCm,
      heightCm,
      variantId,
      variantTitle,
      totalQuantity,
      totalToman,
      unitToman,
      isBundle,
      bundleSize,
      bundleCount,
      rawItems: groupItems,
    };

    if (isBundle) {
      // Gather configurations from all items in this group
      const allConfigurations: BundleConfiguration[] = [];
      for (const it of groupItems) {
        const configs = parseBundleConfigurations(
          it.colorData,
          it.quantity,
          bundleSize,
          it.bundleItems || it.product?.bundleItems,
        );
        allConfigurations.push(...configs);
      }

      // Expand configurations if fewer configurations than bundleCount were recorded
      let expandedConfigurations = allConfigurations;
      if (allConfigurations.length > 0 && allConfigurations.length < bundleCount) {
        expandedConfigurations = [];
        const perItemCount = Math.ceil(bundleCount / allConfigurations.length);
        for (const cfg of allConfigurations) {
          for (let b = 0; b < perItemCount && expandedConfigurations.length < bundleCount; b++) {
            expandedConfigurations.push({
              bundleIndex: expandedConfigurations.length + 1,
              items: cfg.items.map((it) => ({ ...it })),
            });
          }
        }
      }

      // Re-index configurations sequentially
      const indexedConfigurations: BundleConfiguration[] =
        expandedConfigurations.length > 0
          ? expandedConfigurations.map((c, idx) => ({
              bundleIndex: idx + 1,
              items: c.items,
            }))
          : Array.from({ length: bundleCount }, (_, idx) => ({
              bundleIndex: idx + 1,
              items: Array.from({ length: bundleSize }, (__, i) => ({
                title: `گلدان ${toFa(i + 1)}`,
                color: 'پیش‌فرض',
                hex: '#808080',
              })),
            }));

      // TASK 1: Strict, order-dependent deep comparison of selected colors for each slot
      // Format: [{ color: "black" }, { color: "white" }] !== [{ color: "white" }, { color: "black" }]
      const extractSlotColors = (c: BundleConfiguration) =>
        c.items.map((it) => ({ color: (it.color || '').trim() }));

      const firstConfigJson =
        indexedConfigurations.length > 0
          ? JSON.stringify(extractSlotColors(indexedConfigurations[0]))
          : '';

      const isIdentical =
        indexedConfigurations.length > 0 &&
        indexedConfigurations.every(
          (c) => JSON.stringify(extractSlotColors(c)) === firstConfigJson,
        );

      if (isIdentical) {
        const colorsList = indexedConfigurations[0].items.map((it) => it.color).join(' + ');
        const summaryText = `${toFa(bundleCount)} بسته (${colorsList})`;

        result.push({
          ...baseData,
          kind: 'bundle',
          type: 'identical',
          quantity: bundleCount,
          config: indexedConfigurations[0],
          summaryText,
        });
      } else {
        result.push({
          ...baseData,
          kind: 'bundle',
          type: 'mixed',
          quantity: bundleCount,
          configurations: indexedConfigurations,
          summaryText: `${toFa(bundleCount)} بسته با رنگ‌بندی متفاوت`,
        });
      }
    } else {
      // Standalone items: Group by color and sum quantities
      const colorMap = new Map<string, StandaloneColorBreakdown>();

      for (const it of groupItems) {
        const cName = extractColorName(it);
        const cHex =
          it.selectedColorHex ||
          (cName ? PERSIAN_NAME_TO_HEX[cName] : null) ||
          '#808080';
        const finalName =
          cName ||
          (cHex && DEFAULT_COLOR_NAMES[cHex.toUpperCase()]) ||
          'پیش‌فرض';

        const key = `${finalName}-${cHex}`;
        const existing = colorMap.get(key);
        if (existing) {
          existing.quantity += it.quantity || 1;
        } else {
          colorMap.set(key, {
            colorName: finalName,
            hexCode: cHex,
            quantity: it.quantity || 1,
          });
        }
      }

      const colors = Array.from(colorMap.values());
      const hasSpecificColors =
        colors.length > 0 && !(colors.length === 1 && colors[0].colorName === 'پیش‌فرض');

      const summaryText = hasSpecificColors
        ? colors.map((c) => `${toFa(c.quantity)} عدد ${c.colorName}`).join('، ')
        : `${toFa(totalQuantity)} عدد`;

      result.push({
        ...baseData,
        kind: 'standalone',
        colors,
        summaryText,
      });
    }
  }

  return result;
}

