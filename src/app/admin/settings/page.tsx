import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { StoreSettingsForm } from '@/features/admin';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdmin();

  const settings = await prisma.storeSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      originProvince: 'تهران',
      originCity: 'تهران',
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">تنظیمات فروشگاه</h1>
        <p className="mt-1 text-sm text-soil-700/70 dark:text-dust-200/70">
          پیکربندی کلی فروشگاه، مبدا ارسال و تنظیمات یکپارچه‌سازی خدمات لجستیک
        </p>
      </div>

      <StoreSettingsForm initialSettings={settings} />
    </div>
  );
}
