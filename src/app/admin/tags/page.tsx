import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import TagRow from '@/features/admin/components/TagRow';

async function createTag(formData: FormData) {
  'use server';

  await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;

  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'tag';

  await prisma.tag.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

export default async function AdminTagsPage() {
  await requireAdmin();

  const tags = await prisma.tag.findMany({
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
      <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">برچسب‌ها</h1>
      <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-200/70">مدیریت، ویرایش نام و دسته‌بندی‌های محصولات</p>

      <form noValidate action={createTag} className="mt-6 rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
        <div className="block">
          <label htmlFor="new-tag-name" className="block text-xs font-bold text-soil-900 dark:text-dust-200">
            نام برچسب جدید <span className="text-red-500">*</span>
          </label>
          <input
            id="new-tag-name"
            name="name"
            required
            className="mt-2 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 dark:bg-flora-950 dark:text-dust-50 px-3 py-2.5 text-sm outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20"
            placeholder="مثلاً: گیاهان آپارتمانی"
          />
        </div>
        <button type="submit" className="mt-4 rounded-xl bg-flora-900 dark:bg-flora-700 px-5 py-2.5 text-xs font-black text-white transition hover:bg-flora-700 dark:hover:bg-flora-900">
          افزودن برچسب
        </button>
      </form>

      <div className="mt-6 grid gap-3">
        {tags.map((tag) => (
          <TagRow key={tag.id} tag={tag} />
        ))}
      </div>
    </div>
  );
}
