import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import CategoryRow from '@/features/admin/components/CategoryRow';

async function createCategory(formData: FormData) {
  'use server';

  await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;

  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'category';

  const existing = await prisma.category.findFirst({
    where: { OR: [{ name }, { slug }] },
  });

  if (existing) {
    return;
  }

  await prisma.category.create({
    data: { name, slug, isActive: true },
  });

  revalidatePath('/admin/categories');
  revalidatePath('/admin/products');
}

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">دسته‌بندی‌ها</h1>
      <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-300/70">مدیریت، ایجاد و ویرایش دسته‌بندی‌های محصولات</p>

      <form noValidate action={createCategory} className="mt-6 rounded-2xl border border-soil-900/10 bg-white p-5 dark:border-dust-50/10 dark:bg-flora-900">
        <div className="block">
          <label htmlFor="new-category-name" className="block text-xs font-bold text-soil-900 dark:text-dust-200">
            نام دسته‌بندی جدید <span className="text-red-500">*</span>
          </label>
          <input
            id="new-category-name"
            name="name"
            required
            className="mt-2 w-full rounded-xl border border-soil-900/15 bg-white px-3 py-2.5 text-sm text-soil-900 outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20 dark:border-dust-50/20 dark:bg-flora-950 dark:text-dust-50"
            placeholder="مثلاً: گلدان و فلاورباکس"
          />
        </div>
        <button type="submit" className="mt-4 rounded-xl bg-flora-900 px-5 py-2.5 text-xs font-black text-white transition hover:bg-flora-700 cursor-pointer shadow-sm dark:bg-flora-700 dark:hover:bg-flora-900">
          افزودن دسته‌بندی
        </button>
      </form>

      <div className="mt-6 grid gap-3">
        {categories.map((cat) => (
          <CategoryRow key={cat.id} category={cat} />
        ))}
        {categories.length === 0 && (
          <p className="rounded-2xl border border-soil-900/10 bg-white p-6 text-center text-sm text-soil-700/60 dark:border-dust-50/10 dark:bg-flora-900 dark:text-dust-300/60">
            هیچ دسته‌بندی‌ای یافت نشد. با استفاده از فرم بالا اولین دسته‌بندی را ایجاد کنید.
          </p>
        )}
      </div>
    </div>
  );
}
