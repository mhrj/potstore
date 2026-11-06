import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { isUnoptimizedImage } from "@/lib/image-validation";
import ArticleDeleteButton from "@/features/admin/components/ArticleDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  await requireAdmin();

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">
            مقالات و راهنماها
          </h1>
          <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-300/70">
            {toFa(articles.length)} مقاله ثبت‌شده در وبلاگ
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="rounded-xl bg-flora-900 px-5 py-2.5 text-xs font-black text-white transition hover:bg-flora-700 cursor-pointer shadow-sm dark:bg-flora-700 dark:hover:bg-flora-900"
        >
          + افزودن مقاله جدید
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-soil-900/15 bg-white p-12 text-center dark:border-dust-50/20 dark:bg-flora-900">
          <p className="text-sm font-bold text-soil-800 dark:text-dust-50">
            هنوز مقاله‌ای منتشر نشده است
          </p>
          <p className="mt-2 text-xs text-soil-700/70 dark:text-dust-300/70">
            با انتشار مقالات تخصصی نگهداری گل و گیاه، ترافیک ارگانیک سایت را
            افزایش دهید.
          </p>
          <Link
            href="/admin/articles/new"
            className="mt-6 inline-block rounded-xl bg-flora-900 px-5 py-2.5 text-xs font-black text-white transition hover:bg-flora-700 cursor-pointer shadow-sm dark:bg-flora-700 dark:hover:bg-flora-900"
          >
            نوشتن اولین مقاله
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {articles.map((article) => (
            <li
              key={article.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-soil-900/10 bg-white p-4 shadow-sm transition hover:border-soil-900/20 dark:border-dust-50/10 dark:bg-flora-900 dark:hover:border-dust-50/20"
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-soil-900/5 dark:border-dust-50/10 bg-white dark:bg-flora-950">
                  {article.coverImage ? (
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      fill
                      unoptimized={isUnoptimizedImage(article.coverImage)}
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-soil-700/40 dark:text-dust-400">
                      📄
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold text-soil-900 text-sm md:text-base dark:text-dust-50">
                      {article.title}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        article.isPublished
                          ? "border border-flora-300/40 bg-flora-100 text-flora-900 dark:border-flora-700 dark:bg-flora-950 dark:text-flora-300"
                          : "bg-dust-200 text-soil-700 dark:bg-flora-900 dark:text-dust-300"
                      }`}
                    >
                      {article.isPublished ? "منتشر شده" : "پیش‌نویس"}
                    </span>
                  </div>

                  {article.excerpt && (
                    <p className="mt-1 line-clamp-1 text-xs text-soil-700/70 dark:text-dust-300/70">
                      {article.excerpt}
                    </p>
                  )}

                  {/* Tags as pills */}
                  {article.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {article.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-dust-100 text-soil-700 dark:bg-flora-900 dark:text-dust-300 px-2 py-0.5 text-[10px] font-bold"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-soil-700/50 dark:text-dust-300/50">
                    <span>اسلاگ: {article.slug}</span>
                    {article.isPublished && (
                      <Link
                        href={`/articles/${article.slug}`}
                        target="_blank"
                        className="font-bold text-flora-700 hover:underline dark:text-flora-300"
                      >
                        نمایش عمومی ↗
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                <Link
                  href={`/admin/articles/${article.id}`}
                  className="rounded-full bg-dust-100 text-soil-900 dark:bg-flora-950 dark:text-dust-300 dark:hover:bg-flora-900 border border-transparent dark:border-dust-50/10 px-4 py-1.5 text-[11px] font-bold transition-colors hover:bg-dust-200"
                >
                  ویرایش
                </Link>
                <ArticleDeleteButton id={article.id} title={article.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
