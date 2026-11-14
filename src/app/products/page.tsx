import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ProductCatalogView, type SortKey } from '@/features/catalog';

const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: 'فروشگاه گلدان و فلاورباکس',
  description:
    'خرید گلدان و فلاورباکس سفالی، سرامیکی و بتنی — خرده و عمده. جست‌وجو بر اساس دسته‌بندی، مرتب‌سازی بر اساس قیمت و مشاهده قیمت پله‌ای هر محصول.',
  alternates: { canonical: '/products' },
  openGraph: {
    title: 'فروشگاه گلدان و محصولات گیاهان | پات استور',
    description:
      'خرید گلدان سفالی، سرامیکی، خاک و ابزار گیاهان — خرده و عمده با ارسال به سراسر ایران.',
    type: 'website',
  },
};

const SORTS = {
  newest: { label: 'جدیدترین', orderBy: { createdAt: 'desc' } },
  'price-asc': { label: 'ارزان‌ترین', orderBy: { basePriceToman: 'asc' } },
  'price-desc': { label: 'گران‌ترین', orderBy: { basePriceToman: 'desc' } },
} satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }>;

function parseSort(value: string | undefined): SortKey {
  return value && value in SORTS ? (value as SortKey) : 'newest';
}

function parsePage(value: string | undefined): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

type Props = {
  searchParams: Promise<{ q?: string; tag?: string; category?: string; sort?: string; page?: string }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 80);
  const tagSlug = (sp.tag ?? '').trim();
  const categorySlug = (sp.category ?? '').trim();
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { shortDesc: { contains: q, mode: 'insensitive' } },
            { material: { contains: q, mode: 'insensitive' } },
            { color: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
  };

  const [total, products, tags, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        basePriceToman: true,
        salePriceToman: true,
        stock: true,
        bundleSize: true,
        allowBatchDiscount: true,
        bundleItems: true,
        colorOptions: true,
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          select: { url: true, alt: true },
        },
        tiers: {
          orderBy: { minQuantity: 'asc' },
          select: { minQuantity: true, unitPriceToman: true },
        },
      },
      orderBy: SORTS[sort].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.tag.findMany({ orderBy: { name: 'asc' }, select: { name: true, slug: true } }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (next: Partial<{ q: string; tag: string; category: string; sort: SortKey; page: number }>) => {
    const params = new URLSearchParams();
    const merged = { q, tag: tagSlug, category: categorySlug, sort, page, ...next };
    if (merged.q) params.set('q', merged.q);
    if (merged.tag) params.set('tag', merged.tag);
    if (merged.category) params.set('category', merged.category);
    if (merged.sort !== 'newest') params.set('sort', merged.sort);
    if (merged.page > 1) params.set('page', String(merged.page));
    const qs = params.toString();
    return qs ? `/products?${qs}` : '/products';
  };

  const requestedPage = Number.parseInt(sp.page ?? '', 10);
  const pageOutOfRange =
    sp.page !== undefined &&
    (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > pageCount);

  if (pageOutOfRange) redirect(buildHref({ page: 1 }));

  return (
    <ProductCatalogView
      products={products}
      tags={tags}
      categories={categories}
      total={total}
      page={page}
      pageCount={pageCount}
      q={q}
      tagSlug={tagSlug}
      categorySlug={categorySlug}
      sort={sort}
      buildHref={buildHref}
    />
  );
}
