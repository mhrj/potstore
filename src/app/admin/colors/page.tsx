import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ColorRow, NewColorForm } from '@/features/admin';
import { toFa } from '@/lib/format';

export default async function AdminColorsPage() {
  await requireAdmin();

  const colors = await prisma.globalColor.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">پالت رنگ‌های فروشگاه</h1>
          <p className="mt-1 text-sm text-soil-700/70 dark:text-dust-300/70">
            مدیریت رنگ‌های استاندارد برای استفاده در محصولات و پکیج‌ها ({toFa(colors.length)} رنگ)
          </p>
        </div>
      </div>

      <NewColorForm />

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-soil-900 dark:text-dust-50">رنگ‌های ثبت‌شده</h2>
        {colors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-soil-900/15 bg-white p-8 text-center dark:border-dust-50/20 dark:bg-flora-900">
            <p className="text-sm text-soil-700/60 dark:text-dust-300/60">هنوز رنگی در سیستم ثبت نشده است.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {colors.map((color) => (
              <ColorRow key={color.id} color={color} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
