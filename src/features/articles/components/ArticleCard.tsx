import Image from 'next/image';
import Link from 'next/link';
import { isUnoptimizedImage } from '@/lib/image-validation';

export type ArticleCardData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  tags: string[];
  createdAt: Date;
};

export default function ArticleCard({ article }: { article: ArticleCardData }) {
  const formattedDate = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.createdAt));

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 shadow-sm dark:shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-soil-900/5 dark:hover:border-dust-50/20 p-2 sm:p-2.5">
      {/* Cover Image */}
      <Link
        href={`/articles/${article.slug}`}
        className="relative block aspect-16/10 w-full overflow-hidden rounded-2xl border border-soil-900/5 dark:border-dust-50/10 bg-white dark:bg-flora-950"
      >
        {article.coverImage ? (
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            unoptimized={isUnoptimizedImage(article.coverImage)}
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-white dark:bg-flora-950 text-4xl">
            🪴
          </div>
        )}
      </Link>

      {/* Body Content */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 pt-3">
        <div>
          {/* Meta info */}
          <div className="flex items-center justify-between text-[11px] font-bold text-soil-700/60 dark:text-dust-200/60 mb-3">
            <span>{formattedDate}</span>
            <span className="rounded-full bg-flora-50 dark:bg-flora-950/70 px-2 py-0.5 text-flora-700 dark:text-flora-300">
              راهنمای آموزشی
            </span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-black text-soil-900 dark:text-dust-50 leading-snug group-hover:text-flora-700 dark:group-hover:text-flora-300 transition">
            <Link href={`/articles/${article.slug}`}>{article.title}</Link>
          </h2>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="mt-3 line-clamp-3 text-xs leading-6 text-soil-700/80 dark:text-dust-200/80">
              {article.excerpt}
            </p>
          )}
        </div>

        {/* Bottom: Tags & Link */}
        <div className="mt-6 pt-4 border-t border-soil-900/5 dark:border-dust-50/10">
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {article.tags.slice(0, 3).map((tag) => (
                <Link
                  key={tag}
                  href={`/articles?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-dust-100 dark:bg-flora-950 dark:text-dust-300 dark:hover:bg-flora-900 border border-transparent dark:border-dust-50/10 px-2.5 py-0.5 text-[10px] font-bold text-soil-700 hover:bg-dust-200 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          <Link
            href={`/articles/${article.slug}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-flora-700 dark:text-flora-300 group-hover:text-flora-900 dark:group-hover:text-flora-300 transition"
          >
            <span>مطالعه کامل مقاله</span>
            <span className="transition-transform duration-300 group-hover:-translate-x-1">
              ←
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
