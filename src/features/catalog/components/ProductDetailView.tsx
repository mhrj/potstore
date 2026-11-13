import Link from 'next/link';
import { toFa } from '@/lib/format';
import { parseFeatures, parseBundleItems, parseColorOptions } from '@/lib/product-features';
import TieredPricing from '@/features/catalog/components/TieredPricing';
import ProductGallery from '@/features/catalog/components/ProductGallery';
import ColorPicker from '@/features/catalog/components/ColorPicker';
import { ProductColorProvider } from '@/features/catalog/components/ProductColorContext';
import Container from '@/components/ui/Container';
import RelatedProducts from '@/features/recommendations/RelatedProducts';
import type { ProductCardData } from '@/features/catalog/components/ProductCard';

type ProductDetailViewProps = {
  product: {
    id: string;
    slug: string;
    name: string;
    shortDesc: string | null;
    description: string;
    sku: string | null;
    material: string;
    color: string | null;
    diameterCm: number;
    heightCm: number;
    weightGrams: number;
    unitsPerCarton: number;
    basePriceToman: number;
    salePriceToman: number | null;
    stock: number;
    bundleSize: number;
    bundleItems: unknown;
    colorOptions: unknown;
    variants?: {
      id: string;
      title: string;
      priceToman: number;
      stock: number;
      sku: string | null;
      attributes: unknown;
    }[];
    minOrderQuantity: number;
    allowBatchDiscount: boolean;
    features: unknown;
    images: { id: string; url: string; alt: string | null }[];
    tiers: { minQuantity: number; unitPriceToman: number; label: string | null }[];
    tags: { tag: { id: string; name: string; slug: string } }[];
    category: { id: string; name: string; slug: string } | null;
  };
  isAuthed: boolean;
  globalColors: { name: string; hexCode: string }[];
  recommendations?: {
    similar: ProductCardData[];
    complement: ProductCardData[];
    boughtTogether: ProductCardData[];
  };
};

export default function ProductDetailView({
  product,
  isAuthed,
  globalColors,
  recommendations,
}: ProductDetailViewProps) {
  const enabledFeatures = parseFeatures(product.features).filter((f) => f.enabled);
  const bundleItems = parseBundleItems(product.bundleItems, product.stock);

  const isBundle = product.bundleSize > 1;
  const displayLabel = isBundle ? `ست ${toFa(product.bundleSize)} عددی` : 'تک‌عدد';

  const specs = isBundle
    ? []
    : [
        { k: 'متریال', v: product.material },
        { k: 'رنگ', v: product.color ?? '—' },
        { k: 'قطر دهانه', v: `${toFa(product.diameterCm)} سانتی‌متر` },
        { k: 'ارتفاع', v: `${toFa(product.heightCm)} سانتی‌متر` },
        { k: 'وزن خالی', v: `${toFa(product.weightGrams)} گرم` },
        { k: 'واحد فروش', v: 'تک‌عددی' },
      ];

  const hasSale =
    typeof product.salePriceToman === 'number' &&
    product.salePriceToman > 0 &&
    product.salePriceToman < product.basePriceToman;
  const effectiveBasePrice = hasSale ? product.salePriceToman! : product.basePriceToman;
  const hasVariants = !isBundle && Boolean(product.variants && product.variants.length > 0);
  const startingPrice = hasVariants ? product.variants![0].priceToman : effectiveBasePrice;
  const totalStock = hasVariants
    ? product.variants!.reduce((sum, v) => sum + v.stock, 0)
    : product.stock;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDesc ?? undefined,
    image: product.images.map((i) => i.url),
    material: product.material,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'IRR',
      lowPrice: Math.min(product.tiers.at(-1)?.unitPriceToman ?? startingPrice, startingPrice) * 10,
      highPrice: startingPrice * 10,
      offerCount: product.tiers.length || 1,
      availability:
        totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <Container className="py-10 lg:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="مسیر" className="mb-8 flex items-center gap-1.5 text-xs text-soil-700/60 dark:text-dust-200/60">
        <Link href="/" className="hover:text-soil-900 dark:hover:text-dust-50 transition">
          خانه
        </Link>
        <span>/</span>
        {product.category ? (
          <>
            <Link
              href={`/products?category=${encodeURIComponent(product.category.slug)}`}
              className="hover:text-soil-900 dark:hover:text-dust-50 transition"
            >
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        ) : (
          <>
            <Link href="/products" className="hover:text-soil-900 dark:hover:text-dust-50 transition">
              گلدان‌ها
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-soil-900 dark:text-dust-50 font-bold">{product.name}</span>
      </nav>

      <ProductColorProvider>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <ProductGallery
              images={product.images.map((img) => ({
                id: img.id,
                url: img.url,
                alt: img.alt,
              }))}
              productName={product.name}
              soldOut={product.stock <= 0}
            />
            {product.bundleSize <= 1 && (
              <ColorPicker
                product={{
                  id: product.id,
                  name: product.name,
                  colorOptions: parseColorOptions(product.colorOptions, product.stock),
                  bundleSize: product.bundleSize,
                }}
              />
            )}
          </div>

          <div className="lg:col-span-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h1 className="text-3xl font-black text-soil-900 dark:text-dust-50 sm:text-4xl">{product.name}</h1>
              {product.sku && (
                <span className="rounded-lg border border-soil-900/10 dark:border-dust-50/10 bg-dust-50 dark:bg-flora-900 px-2.5 py-1 text-xs font-medium text-soil-700/80 dark:text-dust-200/80">
                  کد کالا:{' '}
                  <span dir="ltr" className="font-mono font-bold text-soil-900 dark:text-dust-50">
                    {product.sku}
                  </span>
                </span>
              )}
            </div>
            {product.shortDesc && (
              <p className="mt-4 leading-8 text-soil-700/85 dark:text-dust-200/85">{product.shortDesc}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {!isBundle && (
                <span className="rounded-full bg-dust-100 dark:bg-flora-900/60 px-3 py-1 text-xs font-bold text-soil-700 dark:text-dust-200">
                  {product.material}
                </span>
              )}
              {isBundle && (
                <span className="rounded-full bg-flora-900 px-3 py-1 text-xs font-bold text-white">
                  {displayLabel}
                </span>
              )}
              {product.tags.map((entry) => (
                <Link
                  key={entry.tag.id}
                  href={`/products?tag=${encodeURIComponent(entry.tag.slug)}`}
                  className="rounded-full bg-flora-100 text-flora-700 dark:bg-flora-900/80 dark:text-flora-300 border border-flora-300/40 dark:border-flora-500/50 px-3 py-1 text-xs font-bold transition hover:bg-flora-300 dark:hover:bg-flora-900"
                >
                  {entry.tag.name}
                </Link>
              ))}
              {hasVariants && (
                <span className="rounded-full bg-flora-100 text-flora-800 dark:bg-flora-900/80 dark:text-flora-300 border border-flora-300/40 dark:border-flora-500/50 px-3 py-1 text-xs font-bold">
                  {toFa(product.variants!.length)} مدل / سایز مختلف
                </span>
              )}
              <span className="rounded-full bg-dust-100 dark:bg-flora-900/60 px-3 py-1 text-xs font-bold text-soil-700 dark:text-dust-200">
                موجودی: {toFa(totalStock)} عدد
              </span>
            </div>

            <div className="mt-8">
              <TieredPricing
                product={{
                  id: product.id,
                  name: product.name,
                  basePriceToman: product.basePriceToman,
                  salePriceToman: product.salePriceToman,
                  weightGrams: product.weightGrams,
                  unitsPerCarton: product.unitsPerCarton,
                  stock: product.stock,
                  bundleSize: product.bundleSize,
                  bundleItems: bundleItems,
                  colorOptions: parseColorOptions(product.colorOptions, product.stock),
                  variants: product.variants,
                  minOrderQuantity: product.minOrderQuantity,
                  allowBatchDiscount: product.allowBatchDiscount,
                }}
                tiers={product.tiers.map((t) => ({
                  minQuantity: t.minQuantity,
                  unitPriceToman: t.unitPriceToman,
                  label: t.label,
                }))}
                isAuthed={isAuthed}
                globalColors={globalColors}
              />
            </div>

            {specs.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-black text-soil-900 dark:text-dust-50">مشخصات محصول</h2>
                <dl className="mt-4 divide-y divide-soil-900/5 dark:divide-dust-50/10 overflow-hidden rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900">
                  {specs.map((s) => (
                    <div key={s.k} className="flex justify-between gap-4 px-5 py-3.5 text-sm">
                      <dt className="text-soil-700/70 dark:text-dust-200/70">{s.k}</dt>
                      <dd className="font-bold text-soil-900 dark:text-dust-50">{s.v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {enabledFeatures.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-black text-soil-900 dark:text-dust-50">ویژگی‌ها</h2>
                <ul className="mt-4 space-y-2">
                  {enabledFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-flora-500" />
                      <span className="text-soil-700/85 dark:text-dust-200/85">{f.label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-10">
              <h2 className="text-lg font-black text-soil-900 dark:text-dust-50">درباره این محصول</h2>
              <div className="mt-4 text-sm leading-8 whitespace-pre-line text-soil-700/85 dark:text-dust-200/85">
                {product.description}
              </div>
            </section>
          </div>
        </div>
      </ProductColorProvider>

      {recommendations && (
        <RelatedProducts
          similar={recommendations.similar}
          complement={recommendations.complement}
          boughtTogether={recommendations.boughtTogether}
        />
      )}
    </Container>
  );
}
