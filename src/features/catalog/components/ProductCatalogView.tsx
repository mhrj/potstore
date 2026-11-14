import Link from 'next/link';
import { toFa } from '@/lib/format';
import Container from '@/components/ui/Container';
import ProductCard from '@/features/catalog/components/ProductCard';
import TagFilterSelect from '@/features/catalog/components/TagFilterSelect';
import { BotanicalCanvas } from '@/features/landing';

export const SORTS = {
  newest: { label: 'جدیدترین' },
  'price-asc': { label: 'ارزان‌ترین' },
  'price-desc': { label: 'گران‌ترین' },
} as const;

export type SortKey = keyof typeof SORTS;

function pageWindow(current: number, count: number): (number | 'gap')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);

  const keep = new Set<number>([1, count, current]);
  for (let offset = -2; offset <= 2; offset += 1) {
    const candidate = current + offset;
    if (candidate > 1 && candidate < count) keep.add(candidate);
  }

  const ordered = [...keep].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  let previous = 0;
  for (const page of ordered) {
    if (previous && page - previous > 1) out.push('gap');
    out.push(page);
    previous = page;
  }
  return out;
}

type ProductItem = Parameters<typeof ProductCard>[0]['product'];

type ProductCatalogViewProps = {
  products: ProductItem[];
  tags: { name: string; slug: string }[];
  categories: { id: string; name: string; slug: string }[];
  total: number;
  page: number;
  pageCount: number;
  q: string;
  tagSlug: string;
  categorySlug: string;
  sort: SortKey;
  buildHref: (next: Partial<{ q: string; tag: string; category: string; sort: SortKey; page: number }>) => string;
};

export default function ProductCatalogView({
  products,
  tags,
  categories,
  total,
  page,
  pageCount,
  q,
  tagSlug,
  categorySlug,
  sort,
  buildHref,
}: ProductCatalogViewProps) {
  const filtered = Boolean(q || tagSlug || categorySlug || sort !== 'newest');
  const firstShown = (page - 1) * 12 + 1;
  const lastShown = Math.min(page * 12, total);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#F2F7F4]/90 via-[#E2F0E6]/85 to-flora-100/90 dark:from-flora-950/90 dark:via-flora-950/85 dark:to-flora-900/90">
      <BotanicalCanvas active={true} variant="flora" />
      <Container className="relative z-10 py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-flora-700 dark:text-flora-300">کاتالوگ</p>
            <h1 className="mt-2 text-3xl font-black text-soil-900 dark:text-dust-50">گلدان‌ها و فلاورباکس‌ها</h1>
          </div>
          <p className="text-sm text-soil-700/70 dark:text-dust-200/70">{toFa(total)} محصول در دسترس</p>
        </header>

        {/* Categories and Tags Pill Filters */}
        <div className="mt-8 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-soil-700/80 dark:text-dust-200/80">دسته‌بندی:</span>
            <Link
              href={buildHref({ category: '', page: 1 })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                !categorySlug
                  ? 'bg-flora-900 text-white shadow-sm dark:bg-flora-700'
                  : 'border border-soil-900/10 bg-white text-soil-700 hover:bg-dust-100 dark:border-dust-50/10 dark:bg-flora-900 dark:text-dust-200 dark:hover:bg-flora-950'
              }`}
            >
              همه
            </Link>
            {categories.map((c) => {
              const active = categorySlug === c.slug;
              return (
                <Link
                  key={c.slug}
                  href={buildHref({ category: active ? '' : c.slug, page: 1 })}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    active
                      ? 'bg-flora-900 text-white shadow-sm dark:bg-flora-700'
                      : 'border border-soil-900/10 bg-white text-soil-700 hover:bg-dust-100 dark:border-dust-50/10 dark:bg-flora-900 dark:text-dust-200 dark:hover:bg-flora-950'
                  }`}
                >
                  {c.name}
                </Link>
              );
            })}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-soil-700/80 dark:text-dust-200/80">برچسب‌ها:</span>
              <Link
                href={buildHref({ tag: '', page: 1 })}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  !tagSlug
                    ? 'bg-flora-900 text-white shadow-sm dark:bg-flora-700'
                    : 'border border-soil-900/10 bg-white text-soil-700 hover:bg-dust-100 dark:border-dust-50/10 dark:bg-flora-900 dark:text-dust-200 dark:hover:bg-flora-950'
                }`}
              >
                همه
              </Link>
              {tags.map((t) => {
                const active = tagSlug === t.slug;
                return (
                  <Link
                    key={t.slug}
                    href={buildHref({ tag: active ? '' : t.slug, page: 1 })}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      active
                        ? 'bg-flora-900 text-white shadow-sm dark:bg-flora-700'
                        : 'border border-soil-900/10 bg-white text-soil-700 hover:bg-dust-100 dark:border-dust-50/10 dark:bg-flora-900 dark:text-dust-200 dark:hover:bg-flora-950'
                    }`}
                  >
                    {t.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <search className="mt-6 block">
          <form
            method="get"
            action="/products"
            className="flex flex-col gap-4 lg:flex-row lg:items-end"
          >
            {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            <div className="flex flex-wrap items-end gap-4">
              <label className="min-w-56 flex-1 text-xs font-bold text-soil-700/80 dark:text-dust-200/80">
                جست‌وجو
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="نام، جنس یا رنگ محصول…"
                  className="mt-2 w-full rounded-xl border border-soil-900/15 bg-white px-4 py-2.5 text-sm text-soil-900 outline-none transition focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20 dark:border-dust-50/20 dark:bg-flora-950 dark:text-dust-50 dark:placeholder:text-dust-400 focus:dark:border-flora-500"
                />
              </label>

              <label className="text-xs font-bold text-soil-700/80 dark:text-dust-200/80">
                برچسب
                <TagFilterSelect tags={tags} tagSlug={tagSlug} />
              </label>

              <button
                type="submit"
                className="rounded-xl bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 transition-colors px-6 py-2.5 text-xs font-black hover:bg-flora-700 cursor-pointer shadow-sm"
              >
                اعمال
              </button>

              {filtered && (
                <Link
                  href="/products"
                  className="rounded-xl border border-soil-900/15 bg-white px-5 py-2.5 text-xs font-bold text-soil-900 transition-colors hover:bg-dust-100 dark:border-dust-50/20 dark:bg-flora-900 dark:text-dust-50 dark:hover:bg-flora-950"
                >
                  حذف فیلترها
                </Link>
              )}
            </div>

            <div className="flex items-end border-t border-soil-900/10 pt-4 lg:ms-auto lg:border-s lg:border-t-0 lg:border-soil-900/10 lg:ps-4 lg:pt-0 dark:border-dust-50/10 dark:lg:border-dust-50/10">
              <label className="text-xs font-bold text-soil-700/80 dark:text-dust-200/80">
                ترتیب
                <select
                  name="sort"
                  defaultValue={sort}
                  className="mt-2 w-full rounded-xl border border-soil-900/15 bg-white px-4 py-2.5 text-sm text-soil-900 outline-none transition focus:border-flora-500 dark:border-dust-50/20 dark:bg-flora-950 dark:text-dust-50"
                >
                  {(Object.keys(SORTS) as SortKey[]).map((key) => (
                    <option key={key} value={key}>
                      {SORTS[key].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </form>
        </search>

        {products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-soil-900/15 bg-white/60 px-6 py-12 text-center text-sm text-soil-700/80 dark:border-dust-50/20 dark:bg-flora-900/60 dark:text-dust-200/80">
            {filtered ? (
              <>
                <p className="font-bold text-soil-900 dark:text-dust-50">
                  متأسفانه محصولی با این مشخصات پیدا نکردیم.
                </p>
                <p className="mt-2 text-xs text-soil-700/70 dark:text-dust-200/70">
                  عبارت دیگری را جستجو کنید یا همه محصولات را ببینید.
                </p>
                <div className="mt-5">
                  <Link
                    href="/products"
                    className="inline-block rounded-full bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-5 py-2 text-xs font-bold transition-colors hover:bg-flora-700"
                  >
                    مشاهده همه محصولات
                  </Link>
                </div>
              </>
            ) : (
              'در حال حاضر محصولی برای نمایش وجود ندارد.'
            )}
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}

        {total > 0 && (
          <div className="mt-10 flex flex-col items-center gap-4">
            <p className="text-xs font-bold text-soil-700/70 dark:text-dust-200/70">
              نمایش {toFa(firstShown)} تا {toFa(lastShown)} از {toFa(total)} محصول
            </p>

            {pageCount > 1 && (
              <nav aria-label="صفحه‌بندی" className="flex flex-wrap items-center justify-center gap-2">
                {page > 1 ? (
                  <Link
                    href={buildHref({ page: page - 1 })}
                    rel="prev"
                    className="rounded-full border border-soil-900/15 bg-white px-5 py-2.5 text-xs font-bold text-soil-900 transition-colors hover:bg-dust-100 dark:border-dust-50/20 dark:bg-flora-900 dark:text-dust-50 dark:hover:bg-flora-950"
                  >
                    قبلی
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="rounded-full border border-soil-900/10 px-5 py-2.5 text-xs font-bold text-soil-700/35 dark:border-dust-50/10 dark:text-dust-200/35"
                  >
                    قبلی
                  </span>
                )}

                {pageWindow(page, pageCount).map((entry, index) =>
                  entry === 'gap' ? (
                    <span key={`gap-${index}`} className="px-1 text-xs text-soil-700/50 dark:text-dust-200/50">
                      …
                    </span>
                  ) : entry === page ? (
                    <span
                      key={entry}
                      aria-current="page"
                      className="min-w-10 rounded-full bg-flora-900 px-3 py-2.5 text-center text-xs font-black text-white dark:bg-flora-700"
                    >
                      {toFa(entry)}
                    </span>
                  ) : (
                    <Link
                      key={entry}
                      href={buildHref({ page: entry })}
                      className="min-w-10 rounded-full border border-soil-900/15 bg-white px-3 py-2.5 text-center text-xs font-bold text-soil-900 transition-colors hover:bg-dust-100 dark:border-dust-50/20 dark:bg-flora-900 dark:text-dust-50 dark:hover:bg-flora-950"
                    >
                      {toFa(entry)}
                    </Link>
                  ),
                )}

                {page < pageCount ? (
                  <Link
                    href={buildHref({ page: page + 1 })}
                    rel="next"
                    className="rounded-full border border-soil-900/15 bg-white px-5 py-2.5 text-xs font-bold text-soil-900 transition-colors hover:bg-dust-100 dark:border-dust-50/20 dark:bg-flora-900 dark:text-dust-50 dark:hover:bg-flora-950"
                  >
                    بعدی
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="rounded-full border border-soil-900/10 px-5 py-2.5 text-xs font-bold text-soil-700/35 dark:border-dust-50/10 dark:text-dust-200/35"
                  >
                    بعدی
                  </span>
                )}
              </nav>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}
