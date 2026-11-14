import Link from 'next/link';
import Container from '@/components/ui/Container';

export default function NotFound() {
  return (
    <Container className="flex min-h-[60dvh] flex-col items-center justify-center py-20 text-center">
      <p className="font-mono text-5xl font-black text-flora-700 dark:text-flora-300">۴۰۴</p>
      <h1 className="mt-5 text-2xl font-black text-soil-900 dark:text-dust-50">این صفحه پیدا نشد</h1>
      <p className="mt-3 max-w-md text-sm leading-7 text-soil-700/75 dark:text-dust-200/75">
        ممکن است نشانی تغییر کرده باشد یا محصول موردنظر حذف شده باشد. از مسیرهای
        زیر می‌توانید ادامه دهید.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-flora-900 dark:bg-flora-700 px-6 py-3 text-sm font-black text-white transition hover:bg-flora-700 dark:hover:bg-flora-900"
        >
          صفحه اصلی
        </Link>
        <Link
          href="/products"
          className="rounded-full border border-soil-900/15 dark:border-dust-50/20 px-6 py-3 text-sm font-bold text-soil-900 dark:text-dust-100 transition hover:bg-dust-100 dark:hover:bg-flora-900"
        >
          مشاهده محصولات
        </Link>
      </div>
    </Container>
  );
}
