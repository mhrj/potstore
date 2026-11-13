import { toFa } from '@/lib/format';

type Props = {
  colorData?: unknown;
  className?: string;
};

export const DEFAULT_COLOR_NAMES: Record<string, string> = {
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

export function resolveColorName(hex: string, explicitName?: string): string {
  if (explicitName && explicitName.trim()) return explicitName.trim();
  const normalized = hex.trim().toUpperCase();
  return DEFAULT_COLOR_NAMES[normalized] || '';
}

export default function ItemColorBadge({ colorData, className = '' }: Props) {
  if (!colorData) return null;

  let singleColor: string | null = null;
  let singleColorName: string | null = null;
  let bundleColors: Record<string, { hex: string; name?: string }> | null = null;

  if (typeof colorData === 'string') {
    singleColor = colorData;
  } else if (typeof colorData === 'object' && colorData !== null) {
    const data = colorData as Record<string, unknown>;
    if (typeof data.color === 'string') {
      singleColor = data.color;
    } else if (typeof data.color === 'object' && data.color !== null && 'hexCode' in data.color) {
      const col = data.color as Record<string, unknown>;
      singleColor = String(col.hexCode);
      if ('name' in col && col.name) {
        singleColorName = String(col.name);
      }
    } else if (typeof data.selectedColor === 'object' && data.selectedColor !== null && 'hexCode' in data.selectedColor) {
      const col = data.selectedColor as Record<string, unknown>;
      singleColor = String(col.hexCode);
      if ('name' in col && col.name) {
        singleColorName = String(col.name);
      }
    } else if (typeof data.selectedColorHex === 'string') {
      singleColor = data.selectedColorHex;
    }
    if (typeof data.bundleColors === 'object' && data.bundleColors !== null) {
      const bMap: Record<string, { hex: string; name?: string }> = {};
      for (const [k, v] of Object.entries(data.bundleColors as Record<string, unknown>)) {
        if (typeof v === 'string') {
          bMap[k] = { hex: v };
        } else if (typeof v === 'object' && v !== null && 'hexCode' in v) {
          const valObj = v as Record<string, unknown>;
          bMap[k] = { hex: String(valObj.hexCode), name: valObj.name ? String(valObj.name) : undefined };
        }
      }
      bundleColors = bMap;
    }
  }

  if (bundleColors && Object.keys(bundleColors).length > 0) {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 text-[11px] text-soil-700 dark:text-dust-200 ${className}`}>
        <span className="text-[10px] text-soil-700/60 dark:text-dust-200/60 font-medium">رنگ‌ها:</span>
        {Object.entries(bundleColors).map(([idx, item]) => {
          const num = Number(idx);
          const label = !isNaN(num) ? `گلدان ${toFa(num + 1)}` : idx;
          const colorName = resolveColorName(item.hex, item.name);
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-md border border-soil-900/10 dark:border-dust-50/10 bg-dust-50 dark:bg-flora-950 px-1.5 py-0.5"
            >
              <span className="text-[10px]">{label}:</span>
              <span
                className="size-2.5 rounded-full border border-soil-900/20 dark:border-dust-50/20 shadow-2xs shrink-0"
                style={{ backgroundColor: item.hex }}
                title={item.hex}
              />
              {colorName && <span className="text-[10px] font-medium">{colorName}</span>}
            </span>
          );
        })}
      </div>
    );
  }

  if (singleColor) {
    const colorName = resolveColorName(singleColor, singleColorName ?? undefined);
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs text-soil-700/80 dark:text-dust-200/80 ${className}`}
      >
        <span className="text-soil-700/70 dark:text-dust-200/70">رنگ:</span>
        <span
          className="size-3.5 rounded-full border border-soil-900/20 dark:border-dust-50/20 shadow-2xs shrink-0"
          style={{ backgroundColor: singleColor }}
          title={singleColor}
        />
        {colorName ? (
          <span className="font-bold text-soil-900 dark:text-dust-50">{colorName}</span>
        ) : (
          <span className="font-mono text-[11px] dir-ltr font-bold text-soil-800 dark:text-dust-100">
            {singleColor}
          </span>
        )}
      </span>
    );
  }

  return null;
}
