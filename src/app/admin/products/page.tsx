import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { formatToman, toFa } from '@/lib/format';
import { isUnoptimizedImage } from '@/lib/image-validation';

export default async function AdminProductsPage() {
  await requireAdmin();

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      material: true,
      basePriceToman: true,
      bundleSize: true,
      stock: true,
      isActive: true,
      isFeatured: true,
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
        select: { url: true, alt: true },
      },
      tags: {
        select: {
          tag: { select: { id: true, name: true } },
        },
      },
      _count: { select: { orderItems: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">محصولات</h1>
          <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-200/70">
            {toFa(products.length)} محصول ثبت‌شده
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-xl bg-flora-900 px-5 py-2.5 text-xs font-black text-white transition hover:bg-flora-700"
        >
          + افزودن محصول
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-soil-900/15 dark:border-dust-50/20 px-6 py-12 text-center text-sm text-soil-700/70 dark:text-dust-200/70">
          هیچ محصولی ثبت نشده.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-3"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white dark:bg-flora-950 border border-soil-900/5 dark:border-dust-50/10">
                {p.images[0]?.url ? (
                  <Image
                    src={p.images[0].url}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized={isUnoptimizedImage(p.images[0].url)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-soil-700/40 dark:text-dust-400">
                    🖼️
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-soil-900 dark:text-dust-50">{p.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {p.bundleSize > 1 && (
                    <span className="rounded-full bg-flora-100 dark:bg-flora-950 px-2 py-0.5 text-[10px] font-bold text-flora-700 dark:text-flora-300 border border-flora-300 dark:border-flora-700">
                      ست {toFa(p.bundleSize)} عددی
                    </span>
                  )}
                  {p.tags.slice(0, 3).map((entry) => (
                    <span key={entry.tag.id} className="rounded-full bg-dust-100 dark:bg-flora-950 px-2 py-0.5 text-[10px] font-bold text-soil-700 dark:text-dust-200">
                      {entry.tag.name}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-xs text-soil-700/60 dark:text-dust-200/60">
                  {formatToman(p.basePriceToman)} · موجودی {toFa(p.stock)} ·{' '}
                  {toFa(p._count.orderItems)} فروش
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {!p.isActive && (
                  <span className="rounded-full bg-red-50 dark:bg-red-950/60 px-2.5 py-1 text-[10px] font-bold text-red-700 dark:text-red-300">
                    غیرفعال
                  </span>
                )}
                <Link
                  href={'/admin/products/' + p.id}
                  className="rounded-full bg-dust-100 text-soil-900 hover:bg-dust-200 dark:bg-flora-950 dark:text-dust-300 dark:hover:bg-flora-900 border border-transparent dark:border-dust-50/10 px-4 py-1.5 text-[11px] font-bold transition-colors"
                >
                  ویرایش
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
