import { toFa } from '@/lib/format';
import Container from '@/components/ui/Container';
import type { ContentMap } from '@/lib/content';

export default function AboutPageView({ content }: { content: ContentMap }) {
  return (
    <Container className="py-12 lg:py-16">
      <p className="text-xs font-bold text-flora-700 dark:text-flora-300">پات استور</p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-black text-soil-900 dark:text-dust-50 md:text-4xl">
        {content.about_title.body}
      </h1>

      <div className="mt-6 max-w-3xl space-y-5 text-sm leading-8 text-soil-700/85 dark:text-dust-200/85">
        {content.about_body.body
          .split(/\n{2,}/)
          .map((paragraph: string) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph: string, index: number, array: string[]) => {
            const isFirst = index === 0 && paragraph.length < 60;
            const isLast = index === array.length - 1;

            if (isFirst) {
              return (
                <p key={index} className="text-base font-bold text-soil-900 dark:text-dust-50 leading-8">
                  {paragraph}
                </p>
              );
            }

            if (isLast) {
              return (
                <p key={index} className="pt-2 font-bold text-soil-900 dark:text-dust-50 leading-8">
                  <strong>{paragraph}</strong>
                </p>
              );
            }

            return (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            );
          })}
      </div>

      <section className="mt-12 w-full max-w-3xl rounded-pot border border-soil-900/10 bg-white p-5 sm:p-8 shadow-[0_12px_32px_-12px_rgba(62,39,35,0.22)] dark:border-dust-50/10 dark:bg-flora-900 dark:shadow-none">
        <h2 className="text-xl font-black text-soil-900 dark:text-dust-50">راه‌های ارتباطی</h2>
        <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-200/70">
          هر سوالی دارید، با کمال میل پاسخ می‌دهیم. برای سفارش عمده، مشاوره انتخاب گلدان یا پیگیری سفارش، در کنارتان هستیم.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {/* Address */}
          <div className="flex flex-col text-start">
            <span className="text-xs font-bold text-soil-700/60 dark:text-dust-200/60 mb-1">نشانی</span>
            <span className="text-sm font-bold text-soil-900 dark:text-dust-50 leading-6">
              {content.address.body}
            </span>
          </div>

          {/* Phone */}
          <div className="flex flex-col text-start">
            <span className="text-xs font-bold text-soil-700/60 dark:text-dust-200/60 mb-1">تلفن</span>
            <span className="text-sm font-bold text-soil-900 dark:text-dust-50" dir="ltr">
              {toFa(content.phone.body)}
            </span>
          </div>

          {/* Email */}
          <div className="flex flex-col text-start">
            <span className="text-xs font-bold text-soil-700/60 dark:text-dust-200/60 mb-1">ایمیل</span>
            <span className="text-sm font-bold text-soil-900 dark:text-dust-50" dir="ltr">
              {content.email.body}
            </span>
          </div>

          {/* Hours */}
          <div className="flex flex-col text-start">
            <span className="text-xs font-bold text-soil-700/60 dark:text-dust-200/60 mb-1">ساعات کاری</span>
            <span className="text-sm font-bold text-soil-900 dark:text-dust-50">
              {toFa(content.hours.body)}
            </span>
          </div>
        </div>
      </section>
    </Container>
  );
}
