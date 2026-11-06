'use client';

import Link from 'next/link';

import type { ColorOption } from '@/lib/product-features';
import { toFa } from '@/lib/format';

export type GlobalColorOption = {
  id: string;
  name: string;
  hexCode: string;
};

type Props = {
  globalColors: GlobalColorOption[];
  selectedColors?: ColorOption[];
  selectedHexes?: string[];
  onToggleColor: (hexCode: string) => void;
  onRemoveColor: (hexCode: string) => void;
  onUpdateStock?: (hexCode: string, stock: number) => void;
  onUpdatePriceAdjustment?: (hexCode: string, priceAdjustment: number) => void;
  compact?: boolean;
};

// Determine whether a color is light to show a dark border/checkmark
function isLightColor(hex: string): boolean {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 180;
}

export default function GlobalColorPicker({
  globalColors,
  selectedColors,
  selectedHexes,
  onToggleColor,
  onRemoveColor,
  onUpdateStock,
  onUpdatePriceAdjustment,
  compact = false,
}: Props) {
  if (globalColors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-soil-900/15 dark:border-dust-50/15 bg-dust-50/50 dark:bg-flora-900 p-4 text-xs text-soil-700/70 dark:text-dust-200/70">
        <span>هنوز رنگی در پالت سیستم ثبت نشده است. </span>
        <Link
          href="/admin/colors"
          target="_blank"
          className="font-bold text-flora-700 dark:text-flora-300 underline hover:text-flora-900 dark:hover:text-flora-300 transition ms-1"
        >
          مدیریت و ثبت رنگ‌ها در پنل
        </Link>
      </div>
    );
  }

  const colorsList: ColorOption[] = selectedColors
    ? selectedColors
    : (selectedHexes ?? []).map((h) => ({ hexCode: h, stock: 0, priceAdjustment: 0 }));

  // Find color name for each selected hex
  const hexMap = new Map<string, string>();
  for (const c of globalColors) {
    hexMap.set(c.hexCode.toUpperCase(), c.name);
  }

  return (
    <div className="space-y-3">
      {/* Clickable Swatch Palette */}
      <div>
        <span className="block text-[11px] font-medium text-soil-700/70 dark:text-dust-200/70 mb-2">
          برای فعال‌سازی یا حذف رنگ، روی آن کلیک کنید:
        </span>
        <div className="flex flex-wrap gap-2">
          {globalColors.map((color) => {
            const normalizedHex = color.hexCode.toUpperCase();
            const isSelected = colorsList.some(
              (c) => c.hexCode.toUpperCase() === normalizedHex,
            );
            const light = isLightColor(color.hexCode);

            return (
              <button
                key={color.id}
                type="button"
                onClick={() => onToggleColor(color.hexCode)}
                title={`${color.name} (${color.hexCode})`}
                aria-pressed={isSelected}
                className={`group flex items-center gap-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                  compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
                } ${
                  isSelected
                    ? 'border-flora-500 dark:border-flora-300 bg-flora-50/80 dark:bg-flora-700/80 text-flora-900 dark:text-flora-300 font-bold shadow-xs dark:shadow-none ring-2 ring-flora-500/30 dark:ring-flora-300/30'
                    : 'border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 text-soil-800 dark:text-dust-200 hover:border-soil-900/30 dark:hover:border-dust-50/30 hover:bg-dust-50 dark:hover:bg-flora-950'
                }`}
              >
                <span
                  className="relative size-4 sm:size-4.5 rounded-full border border-soil-900/20 dark:border-dust-50/20 shrink-0 shadow-2xs flex items-center justify-center"
                  style={{ backgroundColor: color.hexCode }}
                >
                  {light && (
                    <span className="absolute inset-0 rounded-full border border-soil-900/20 dark:border-dust-50/20 pointer-events-none" />
                  )}
                  {isSelected && (
                    <span
                      className={`text-[9px] font-black leading-none ${
                        light ? 'text-soil-900 dark:text-soil-950' : 'text-white'
                      }`}
                    >
                      ✓
                    </span>
                  )}
                </span>
                <span>{color.name}</span>
                <span className="font-mono text-[10px] text-soil-700/50 dark:text-dust-200/50 dir-ltr">
                  {color.hexCode}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Color Chips */}
      {colorsList.length > 0 && (
        <div className="pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <span className="block text-[11px] font-bold text-soil-900 dark:text-dust-50">
              رنگ‌های انتخاب‌شده ({toFa(colorsList.length)}):
            </span>
            <span className="text-[11px] text-soil-700/60 dark:text-dust-200/60">
              اگر این رنگ گران‌تر است عدد مثبت (مثلاً ۵۰٬۰۰۰) و اگر ارزان‌تر است عدد منفی وارد کنید.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {colorsList.map((color, i) => {
              const name = hexMap.get(color.hexCode.toUpperCase()) || color.hexCode;
              return (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 px-3 py-1.5 text-xs shadow-2xs dark:shadow-none"
                >
                  <span
                    className="size-3.5 rounded-full border border-soil-900/20 dark:border-dust-50/20 shadow-xs shrink-0"
                    style={{ backgroundColor: color.hexCode }}
                  />
                  <span className="font-bold text-soil-900 dark:text-dust-50">{name}</span>
                  <span className="font-mono text-[10px] text-soil-700/60 dark:text-dust-200/60 dir-ltr">{color.hexCode}</span>

                  <div className="flex items-center gap-1.5 text-[11px] text-soil-700 dark:text-dust-200 font-medium border-e border-soil-900/10 dark:border-dust-50/10 pe-2 me-1">
                    <label htmlFor={`color-stock-${color.hexCode.replace('#', '')}`}>
                      موجودی:
                    </label>
                    <input
                      id={`color-stock-${color.hexCode.replace('#', '')}`}
                      name={`colorStock_${color.hexCode.replace('#', '')}`}
                      type="number"
                      min={0}
                      value={color.stock}
                      onChange={(e) => {
                        const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
                        onUpdateStock?.(color.hexCode, val);
                      }}
                      className="w-16 rounded-lg border border-soil-900/15 dark:border-dust-50/20 bg-dust-50/70 dark:bg-flora-950 px-1.5 py-0.5 text-center text-xs font-bold text-soil-900 dark:text-dust-50 outline-none focus:border-flora-500 focus:bg-white dark:focus:bg-flora-900 focus:ring-1 focus:ring-flora-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-soil-700 dark:text-dust-200 font-medium border-e border-soil-900/10 dark:border-dust-50/10 pe-2 me-1">
                    <label
                      htmlFor={`color-adj-${color.hexCode.replace('#', '')}`}
                      title="اگر این رنگ گران‌تر است عدد مثبت (مثلاً ۵۰٬۰۰۰) و اگر ارزان‌تر است عدد منفی وارد کنید."
                    >
                      تغییر قیمت (تومان):
                    </label>
                    <input
                      id={`color-adj-${color.hexCode.replace('#', '')}`}
                      name={`colorAdj_${color.hexCode.replace('#', '')}`}
                      type="number"
                      placeholder="0"
                      title="اگر این رنگ گران‌تر است عدد مثبت (مثلاً ۵۰٬۰۰۰) و اگر ارزان‌تر است عدد منفی وارد کنید."
                      value={color.priceAdjustment ?? 0}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val = raw === '' ? 0 : Math.round(Number(raw) || 0);
                        onUpdatePriceAdjustment?.(color.hexCode, val);
                      }}
                      className="w-24 rounded-lg border border-soil-900/15 dark:border-dust-50/20 bg-dust-50/70 dark:bg-flora-950 px-1.5 py-0.5 text-center text-xs font-bold text-soil-900 dark:text-dust-50 outline-none focus:border-flora-500 focus:bg-white dark:focus:bg-flora-900 focus:ring-1 focus:ring-flora-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveColor(color.hexCode)}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-bold leading-none p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                    title="حذف رنگ"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
