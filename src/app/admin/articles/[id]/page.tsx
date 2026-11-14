import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ArticleForm } from '@/features/admin';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditArticlePage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const article = await prisma.article.findUnique({
    where: { id },
  });

  if (!article) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center justify-between pb-6 border-b border-soil-900/10 dark:border-dust-50/10 mb-6">
        <div>
          <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">ویرایش مقاله</h1>
          <p className="mt-1 text-xs text-soil-700/70 dark:text-dust-200/70">{article.title}</p>
        </div>
        <div className="flex items-center gap-3">
          {article.isPublished && (
            <Link
              href={`/articles/${article.slug}`}
              target="_blank"
              className="rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 px-4 py-2 text-xs font-bold text-flora-700 dark:text-flora-300 transition-colors hover:bg-dust-100 dark:hover:bg-flora-950"
            >
              مشاهده عمومی ↗
            </Link>
          )}
          <Link
            href="/admin/articles"
            className="rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 px-4 py-2 text-xs font-bold text-soil-800 dark:text-dust-100 transition-colors hover:bg-dust-100 dark:hover:bg-flora-950"
          >
            بازگشت به مقالات
          </Link>
        </div>
      </div>

      <ArticleForm initialData={article} />
    </div>
  );
}
