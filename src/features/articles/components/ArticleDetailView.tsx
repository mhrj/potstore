import Image from 'next/image';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import { isUnoptimizedImage } from '@/lib/image-validation';

type ArticleDetailViewProps = {
  article: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
    excerpt: string | null;
    content: string;
    tags: string[];
    createdAt: Date;
  };
  relatedArticles: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
    excerpt: string | null;
  }[];
  formattedDate: string;
};

export default function ArticleDetailView({
  article,
  relatedArticles,
  formattedDate,
}: ArticleDetailViewProps) {
  return (
    <main className="py-10 md:py-16 dark:bg-flora-950">
      <Container>
        {/* Breadcrumb */}
        <nav aria-label="راهنمای مسیر" className="text-xs font-bold text-soil-700/60 dark:text-dust-200/60 mb-8">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-flora-700 dark:hover:text-flora-300 transition">
                صفحه اصلی
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/articles" className="hover:text-flora-700 dark:hover:text-flora-300 transition">
                مقالات
              </Link>
            </li>
            <li>/</li>
            <li className="text-soil-900 dark:text-dust-50 truncate max-w-xs sm:max-w-md">{article.title}</li>
          </ol>
        </nav>

        {/* Article Container */}
        <article className="mx-auto max-w-3xl rounded-3xl bg-white dark:bg-flora-900 p-6 md:p-10 border border-soil-900/10 dark:border-dust-50/10 shadow-sm dark:shadow-none text-soil-900 dark:text-dust-100">
          {/* Header */}
          <header className="mb-8">
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {article.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/articles?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-flora-100 text-flora-700 dark:bg-flora-900 dark:text-flora-300 px-3 py-1 text-xs font-bold border border-flora-300/40 dark:border-flora-500/30 hover:bg-flora-300 dark:hover:bg-flora-950 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            <h1 className="text-3xl font-black text-soil-900 dark:text-dust-50 sm:text-4xl lg:text-5xl leading-tight">
              {article.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-soil-900/10 dark:border-dust-50/10 py-3 text-xs text-soil-700/70 dark:text-dust-200/70">
              <div className="flex items-center gap-3">
                <span className="font-bold text-soil-900 dark:text-dust-50">تحریریه تخصصی پات استور</span>
                <span>·</span>
                <time dateTime={article.createdAt.toISOString()}>{formattedDate}</time>
              </div>
              <Link
                href="/articles"
                className="text-xs font-bold text-flora-700 dark:text-flora-300 hover:text-flora-900 dark:hover:text-flora-300 transition"
              >
                ← بازگشت به لیست مقالات
              </Link>
            </div>
          </header>

          {/* Cover Image */}
          {article.coverImage && (
            <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-soil-900/10 dark:border-dust-50/10 shadow-lg shadow-soil-900/5 dark:shadow-none mb-10 bg-white dark:bg-flora-950">
              <Image
                src={article.coverImage}
                alt={article.title}
                fill
                priority
                className="object-cover"
                sizes="(min-width: 1024px) 768px, 100vw"
                unoptimized={isUnoptimizedImage(article.coverImage)}
              />
            </div>
          )}

          {/* Excerpt Lead */}
          {article.excerpt && (
            <div className="rounded-2xl border-r-4 border-flora-500 bg-flora-50/50 dark:bg-flora-900/40 p-6 text-sm md:text-base leading-8 text-soil-800 dark:text-dust-100 font-medium mb-10">
              {article.excerpt}
            </div>
          )}

          {/* Article HTML Content with Tailwind typography styling */}
          <div
            className="prose-potshop text-soil-900 dark:text-dust-100 leading-relaxed text-sm md:text-base
              [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-soil-900 dark:[&_h1]:text-dust-50 [&_h1]:mt-10 [&_h1]:mb-4
              [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-soil-900 dark:[&_h2]:text-dust-50 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:border-b [&_h2]:border-soil-900/10 dark:[&_h2]:border-dust-50/10 [&_h2]:pb-2
              [&_h3]:text-lg [&_h3]:font-black [&_h3]:text-soil-900 dark:[&_h3]:text-dust-50 [&_h3]:mt-8 [&_h3]:mb-3
              [&_p]:my-4 [&_p]:leading-8 [&_p]:text-soil-800/90 dark:[&_p]:text-dust-200
              [&_b]:font-black [&_strong]:font-black [&_strong]:text-soil-900 dark:[&_strong]:text-dust-50
              [&_i]:italic [&_em]:italic
              [&_a]:text-flora-700 dark:[&_a]:text-flora-300 [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-flora-500 dark:hover:[&_a]:text-flora-300
              [&_ul]:list-disc [&_ul]:ps-6 [&_ul]:my-5 [&_ul]:space-y-2
              [&_ol]:list-decimal [&_ol]:ps-6 [&_ol]:my-5 [&_ol]:space-y-2
              [&_li]:text-soil-800 dark:[&_li]:text-dust-200 [&_li]:leading-8
              [&_blockquote]:border-s-4 [&_blockquote]:border-flora-500 dark:[&_blockquote]:border-dust-50/20 [&_blockquote]:ps-4 [&_blockquote]:py-3 [&_blockquote]:my-6 [&_blockquote]:bg-flora-50/40 dark:[&_blockquote]:bg-flora-900/30 [&_blockquote]:rounded-e-2xl [&_blockquote]:text-soil-800 dark:[&_blockquote]:text-dust-200 [&_blockquote]:italic
              [&_img]:rounded-3xl [&_img]:my-8 [&_img]:w-full [&_img]:max-h-[550px] [&_img]:object-cover [&_img]:shadow-md dark:[&_img]:shadow-none [&_img]:border [&_img]:border-soil-900/10 dark:[&_img]:border-dust-50/10
              [&_hr]:my-10 [&_hr]:border-soil-900/10 dark:[&_hr]:border-dust-50/10
              [&_table]:w-full [&_table]:my-6 [&_table]:border-collapse
              [&_th]:border-b [&_th]:border-soil-900/20 dark:[&_th]:border-dust-50/20 [&_th]:p-3 [&_th]:text-start [&_th]:font-bold [&_th]:text-soil-900 dark:[&_th]:text-dust-50
              [&_td]:border-b [&_td]:border-soil-900/10 dark:[&_td]:border-dust-50/10 [&_td]:p-3 [&_td]:text-soil-800 dark:[&_td]:text-dust-200"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Post Footer */}
          <footer className="mt-14 pt-8 border-t border-soil-900/10 dark:border-dust-50/10 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 rounded-2xl bg-dust-100 dark:bg-flora-900/60 px-5 py-2.5 text-xs font-bold text-soil-900 dark:text-dust-50 hover:bg-dust-200 dark:hover:bg-flora-950 transition-colors"
            >
              <span>← بازگشت به دانشنامه و مقالات</span>
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-2xl bg-flora-900 dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-5 py-2.5 text-xs font-black text-white hover:bg-flora-700 transition-colors"
            >
              <span>مشاهده محصولات مرتبط در فروشگاه</span>
              <span>→</span>
            </Link>
          </footer>
        </article>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <section className="mt-20 pt-12 border-t border-soil-900/10 dark:border-dust-50/10">
            <h2 className="text-xl font-black text-soil-900 dark:text-dust-50 mb-8">سایر مقالات پیشنهادی</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/articles/${rel.slug}`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 shadow-sm dark:shadow-none transition hover:-translate-y-1 hover:shadow-lg dark:hover:border-dust-50/20"
                >
                  {rel.coverImage && (
                    <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl mb-4 bg-white dark:bg-flora-950 border border-soil-900/5 dark:border-dust-50/10">
                      <Image
                        src={rel.coverImage}
                        alt={rel.title}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-105"
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        unoptimized={isUnoptimizedImage(rel.coverImage)}
                      />
                    </div>
                  )}
                  <h3 className="text-sm font-black text-soil-900 dark:text-dust-50 group-hover:text-flora-700 dark:group-hover:text-flora-300 transition line-clamp-2">
                    {rel.title}
                  </h3>
                  {rel.excerpt && (
                    <p className="mt-2 text-xs leading-6 text-soil-700/70 dark:text-dust-200/70 line-clamp-2">
                      {rel.excerpt}
                    </p>
                  )}
                  <span className="mt-4 text-[11px] font-bold text-flora-700 dark:text-flora-300">
                    مطالعه مقاله ←
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </Container>
    </main>
  );
}
