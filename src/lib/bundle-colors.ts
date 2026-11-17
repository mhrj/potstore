import { toFa } from '@/lib/format';
import { DEFAULT_COLOR_NAMES } from '@/features/catalog/components/ItemColorBadge';

export type BundleColorItem = {
  name: string;
  hex: string;
};

export type BundleSelection = {
  bundleIndex: number;
  colors: BundleColorItem[];
};

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

  // Case 2: Object with bundleSelections or metadata.bundleSelections
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

  // Case 3: Legacy bundleColors dictionary (map of index -> color)
  if (obj.bundleColors && typeof obj.bundleColors === 'object') {
    const bColors = obj.bundleColors as Record<string | number, unknown>;
    const colorEntries = Object.entries(bColors)
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

  // Check if all bundles in selections have identical colors
  const firstBundleColors = selections[0].colors;
  const firstSig = firstBundleColors.map((c) => c.name.trim()).join('|');

  const isIdentical =
    selections.length === 1 ||
    selections.every((s) => s.colors.map((c) => c.name.trim()).join('|') === firstSig);

  if (isIdentical) {
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

  // If incoming is already an array of BundleSelections
  if (
    Array.isArray(incomingColorsOrSelections) &&
    incomingColorsOrSelections.length > 0 &&
    typeof (incomingColorsOrSelections[0] as Record<string, unknown>).bundleIndex === 'number'
  ) {
    for (const item of incomingColorsOrSelections as BundleSelection[]) {
      result.push({
        bundleIndex: nextBundleIndex++,
        colors: item.colors.map(resolveColorItem),
      });
    }
    return result;
  }

  // If incoming is an array of colors e.g. ["سفید", "تراکوتا"]
  if (Array.isArray(incomingColorsOrSelections)) {
    const resolvedColors = incomingColorsOrSelections.map(resolveColorItem);
    for (let i = 0; i < incomingBundleCount; i++) {
      result.push({
        bundleIndex: nextBundleIndex++,
        colors: [...resolvedColors],
      });
    }
    return result;
  }

  // If incoming is an object with bundleColors or bundleSelections
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

