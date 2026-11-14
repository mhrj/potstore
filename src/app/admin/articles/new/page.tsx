import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { ArticleForm } from '@/features/admin';

export default async function NewArticlePage() {
  await requireAdmin();

  return (
    <div>
      <div className="flex items-center justify-between pb-6 border-b border-soil-900/10 dark:border-dust-50/10 mb-6">
        <div>
          <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">نگارش مقاله جدید</h1>
          <p className="mt-1 text-xs text-soil-700/70 dark:text-dust-200/70">
            تولید محتوای مفید، راهنمای نگهداری و مقالات تخصصی فروشگاه
          </p>
        </div>
        <Link
          href="/admin/articles"
          className="rounded-xl border border-soil-900/15 dark:border-dust-50/10 bg-white dark:bg-flora-900 px-4 py-2 text-xs font-bold text-soil-800 dark:text-dust-100 transition-colors hover:bg-dust-100 dark:hover:bg-flora-950"
        >
          بازگشت به مقالات
        </Link>
      </div>

      <ArticleForm />
    </div>
  );
}
