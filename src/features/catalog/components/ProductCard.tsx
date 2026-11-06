import Image from 'next/image';
import Link from 'next/link';
import { formatToman, toFa } from '@/lib/format';
import { parseColorOptions, type ColorOption } from '@/lib/product-features';
import { isUnoptimizedImage } from '@/lib/image-validation';

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  shortDesc?: string | null;
  material?: string | null;
  diameterCm?: number | null;
  basePriceToman: number;
  salePriceToman?: number | null;
  stock: number;
  bundleSize?: number | null;
  allowBatchDiscount?: boolean;
  bundleItems?: unknown;
  colorOptions?: unknown;
  images: Array<{ url: string; alt?: string | null }>;
  tiers?: Array<{ minQuantity: number; unitPriceToman: number; label?: string | null }>;
  tags?: Array<{ tag: { id: string; name: string } }>;
};

type Props = {
  product: ProductCardData;
  className?: string;
};

export default function ProductCard({ product, className = '' }: Props) {
  const soldOut = product.stock <= 0;
  const bundleSize = product.bundleSize && product.bundleSize > 1 ? product.bundleSize : 1;
  const isBundle = bundleSize > 1;

  const hasSale =
    typeof product.salePriceToman === 'number' &&
    product.salePriceToman > 0 &&
    product.salePriceToman < product.basePriceToman;

  // Tiers and pricing
  const tiers = product.tiers ?? [];
  const bestTier = tiers[0] ?? {
    minQuantity: 1,
    unitPriceToman: hasSale ? product.salePriceToman! : product.basePriceToman,
    label: 'خرده',
  };
  const hasTierDiscount =
    product.allowBatchDiscount !== false &&
    tiers.length > 1 &&
    tiers.some((t) => t.unitPriceToman < (hasSale ? product.salePriceToman! : product.basePriceToman));

  // Color options count (only for single products, bundles pick colors on product page)
  const colors: ColorOption[] = !isBundle ? parseColorOptions(product.colorOptions, product.stock) : [];
  const hasMultipleColors = colors.length > 1;

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group block rounded-2xl md:rounded-3xl bg-white dark:bg-flora-900 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-soil-900/5 dark:border-dust-100/10 p-2 sm:p-2.5 ${className}`}
    >
      {/* Product Image Wrapper */}
      <div className="relative aspect-square rounded-xl overflow-hidden border border-soil-900/5 dark:border-dust-50/10 bg-white dark:bg-flora-950">
        {product.images?.[0]?.url && product.images[0].url.trim().length > 0 ? (
          <Image
            src={product.images[0].url}
            alt={product.images[0].alt ?? product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
              soldOut ? 'grayscale opacity-70' : ''
            }`}
            unoptimized={isUnoptimizedImage(product.images[0].url)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white dark:bg-flora-950 text-soil-700/30 dark:text-dust-300/30">
            <svg className="size-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Dynamic Badges (Start Corner / Right in RTL) */}
        <div className="absolute top-2 inset-s-2 md:top-3 md:inset-s-3 flex flex-col gap-1 z-10">
          {isBundle && (
            <span className="rounded-lg md:rounded-xl bg-flora-900 dark:bg-flora-700 text-white px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-black shadow-xs">
              ست {toFa(bundleSize)} عددی
            </span>
          )}
          {hasTierDiscount && (
            <span className="rounded-lg md:rounded-xl bg-amber-600 dark:bg-amber-700 text-white px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-black shadow-xs">
              تخفیف پلکانی
            </span>
          )}
        </div>

        {/* Top-left Badges (Left Corner) */}
        <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col gap-1 z-10 items-start">
          {hasSale && (
            <span className="rounded-lg md:rounded-xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-black shadow-xs">
              تخفیف ویژه
            </span>
          )}
          {soldOut && (
            <span className="rounded-lg md:rounded-xl bg-soil-900/85 dark:bg-flora-950/85 text-white px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-black backdrop-blur-xs">
              موقتاً ناموجود
            </span>
          )}
        </div>
      </div>

      {/* Product Details Content */}
      <div className="px-1 pt-3 pb-1 md:px-1.5 md:pt-3.5 md:pb-1.5">
        {/* Title */}
        <h3 className="text-sm md:text-base font-bold text-soil-900 dark:text-dust-50 transition-colors group-hover:text-flora-700 dark:group-hover:text-flora-300 line-clamp-1 md:line-clamp-2">
          {product.name}
        </h3>

        {/* Description or Material specs */}
        {(product.shortDesc || product.material) && (
          <p className="mt-1 text-[11px] md:text-xs text-soil-700/70 dark:text-dust-200/70 line-clamp-1">
            {product.shortDesc || product.material}
            {product.diameterCm ? ` · قطر ${toFa(product.diameterCm)} سانتی‌متر` : ''}
          </p>
        )}

        {/* Price & Label Row */}
        <div className="mt-3 md:mt-4 flex items-end justify-between gap-2 border-t border-soil-900/5 dark:border-dust-100/10 pt-2 md:pt-3">
          <div>
            {hasSale ? (
              <div>
                <span className="text-xs text-soil-700/50 dark:text-dust-300/50 line-through">
                  {formatToman(product.basePriceToman)}
                </span>
                <div className="text-base md:text-lg font-black text-red-600 dark:text-red-400">
                  {formatToman(product.salePriceToman!)}
                </div>
              </div>
            ) : (
              <div className="text-base md:text-lg font-black text-flora-900 dark:text-flora-300">
                {formatToman(bestTier.unitPriceToman)}
              </div>
            )}
            <div className="text-[10px] md:text-[11px] text-soil-700/60 dark:text-dust-300/60">
              {isBundle
                ? `قیمت هر ست`
                : bestTier.minQuantity > 1
                  ? `از ${toFa(bestTier.minQuantity)} عدد`
                  : '/ هر عدد'}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
            {hasMultipleColors && (
              <span className="rounded-full bg-dust-100 text-soil-700 dark:bg-flora-900 dark:text-dust-300 border border-transparent dark:border-dust-50/10 px-2 py-0.5 text-[10px] font-medium">
                شامل {toFa(colors.length)} رنگ
              </span>
            )}
            {bestTier.label && (
              <span className="rounded-md md:rounded-lg bg-dust-100 text-soil-700 dark:bg-flora-900 dark:text-dust-300 border border-transparent dark:border-dust-50/10 px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-bold">
                {bestTier.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
