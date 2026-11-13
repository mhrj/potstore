'use client';

import Image from 'next/image';
import Link from 'next/link';
import { toFa } from '@/lib/format';
import type { ContentMap } from '@/lib/content';
import DustToFlora from '@/features/landing/components/DustToFlora';
import TrustBar from '@/features/landing/components/TrustBar';
import WhyChooseUs from '@/features/landing/components/WhyChooseUs';
import WholesaleInquiryForm from '@/features/landing/components/WholesaleInquiryForm';
import Typewriter from '@/features/landing/components/Typewriter';
import Container from '@/components/ui/Container';
import Skeleton from '@/components/ui/Skeleton';
import ProductCard from '@/features/catalog/components/ProductCard';
import { isUnoptimizedImage } from '@/lib/image-validation';
import { usePointerGlow } from '@/shared/hooks/usePointerGlow';

type ProductItem = Parameters<typeof ProductCard>[0]['product'];

type LandingPageViewProps = {
  products: ProductItem[];
  landing: Record<string, { key: string; url: string; alt: string | null } | undefined>;
  content: ContentMap;
  wholesaleHighlight: {
    hasWholesaleTiers: boolean;
    maxDiscount: number;
    maxDiscountMinQty: number;
    sampleProductName: string | null;
    tableRows: Array<{ q: string; p: number; d: string }>;
  };
  motionVariant?: 'a' | 'b';
};

function renderFormattedText(text: string) {
  if (!text.includes('**')) return text;
  const parts = text.split('**');
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-bold text-white">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

export default function LandingPageView({
  products,
  landing,
  content,
  wholesaleHighlight,
  motionVariant = 'a',
}: LandingPageViewProps) {
  const ctaImage = landing.cta;
  const heroGlowRef = usePointerGlow<HTMLElement>();

  const hero = (
    <section
      ref={heroGlowRef}
      className="pt-20 pb-16 lg:pt-28 lg:pb-20 relative overflow-hidden bg-transparent"
    >
      {/* Pointer glow layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px transition-opacity duration-500 ease-out z-0 hidden lg:block"
        style={{
          opacity: 'var(--glow-opacity, 0)',
          background:
            'radial-gradient(circle var(--glow-radius, 320px) at var(--mx, 50%) var(--my, 50%), var(--glow-color, rgba(64, 145, 108, 0.18)), transparent 80%)',
        }}
      />
      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-20 items-center">
          {/* Column 1: TEXT COLUMN (Appears on the RIGHT in RTL desktop) */}
          <div className="w-full px-4 flex flex-col items-center lg:items-start text-center lg:text-right lg:col-span-5 lg:row-start-1">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-dust-300/70 bg-dust-100/70 dark:border-dust-100/20 dark:bg-flora-900/70 px-4 py-1.5 text-xs font-medium text-soil-700 dark:text-dust-200 backdrop-blur">
              <span className="size-1.5 rounded-full bg-dust-400 dark:bg-flora-300" />
              از خاک خالی، تا رویش سبز
            </span>

            {/* H1 Title with Typewriter */}
            <Typewriter
              text={content.home_hero_title?.body || 'به فضاهای خالی، جان بدهیم.'}
              className="mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight break-words text-soil-900 dark:text-dust-50 text-center lg:text-right"
            />

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-lg lg:text-xl leading-8 text-soil-700/80 dark:text-dust-200/80 text-center lg:text-right mx-auto lg:mx-0 max-w-md lg:max-w-xl px-4">
              {content.home_hero_subtitle.body}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col w-full sm:flex-row justify-center lg:justify-start gap-4 px-4 mt-10">
              <Link
                href="#catalog"
                className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-8 py-4 text-sm sm:text-base font-bold shadow-lg shadow-flora-900/25 transition-all duration-300 hover:scale-105 hover:bg-flora-700 hover:shadow-2xl hover:shadow-flora-900/40 active:scale-[0.98]"
              >
                <span className="inline-block transition duration-300 group-hover:rotate-12 group-hover:scale-125">
                  🌱
                </span>
                <span>دیدن محصولات</span>
              </Link>
              <Link
                href="#wholesale-inquiry"
                className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-soil-900/15 bg-white/70 dark:border-dust-100/20 dark:bg-flora-900/70 px-8 py-4 text-sm sm:text-base font-bold text-soil-900 dark:text-dust-50 backdrop-blur transition-all duration-300 hover:scale-105 hover:bg-white dark:hover:bg-flora-950 hover:border-soil-900/35 dark:hover:border-dust-100/30 hover:shadow-xl hover:shadow-soil-900/10 active:scale-[0.98]"
              >
                <span>استعلام پروژه و تأمین سازمانی</span>
                <span className="text-flora-700 dark:text-flora-300 transition duration-300 group-hover:translate-x-1">←</span>
              </Link>
            </div>
          </div>

          {/* Column 2: VIDEO COLUMN (Appears on the LEFT in RTL desktop) */}
          <div className="lg:col-span-7 lg:row-start-1 lg:row-span-2 relative w-full aspect-video flex items-center justify-center px-4 my-8 lg:my-0 bg-transparent">
            <video 
              autoPlay 
              muted 
              playsInline 
              preload="metadata"
              poster="/hero-poster.jpg"
              aria-label="انیمیشن طراحی گلدان و گیاه"
              className="w-full h-full object-contain mix-blend-screen scale-100 md:scale-110 lg:scale-[1.5] xl:scale-[1.6] transition-transform duration-700 pointer-events-none"
            >
              <source src="/hero-video.webm" type="video/webm" />
            </video>
          </div>

          {/* Column 3: STATS SECTION (Appears after video on mobile, beneath text on desktop) */}
          <div className="w-full px-4 lg:col-span-5 lg:row-start-2 order-last lg:order-none">
            <dl className="flex items-center gap-6 sm:gap-8 pt-8 border-t border-soil-900/10 dark:border-dust-100/10 divide-x divide-x-reverse divide-soil-900/10 dark:divide-dust-100/10 justify-center lg:justify-start">
              {[
                { k: '۴۲+', v: 'مدل گلدان' },
                { k: '۳۱', v: 'استان تحت پوشش' },
                { k: '۱۲٬۰۰۰+', v: 'سفارش موفق' },
              ].map((s) => (
                <div key={s.v} className="px-3 sm:px-5 first:ps-0 last:pe-0 text-center lg:text-right">
                  <dt className="text-3xl font-black text-soil-900 dark:text-dust-50">{s.k}</dt>
                  <dd className="mt-1 text-xs text-soil-700/60 dark:text-dust-300/70">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );

  const catalog = (
    <section id="catalog" className="scroll-mt-24 py-20 lg:py-28">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-soil-900 dark:text-dust-50 sm:text-4xl">پرفروش‌ترین‌ها</h2>
            <p className="mt-3 text-soil-700/80 dark:text-dust-200/80">قیمت پله‌ای — هرچه بیشتر، ارزان‌تر.</p>
          </div>
          <Link href="/products" className="text-sm font-bold text-flora-700 hover:text-flora-900 dark:text-flora-300 dark:hover:text-flora-100">
            همه محصولات
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 md:h-96 rounded-2xl md:rounded-3xl" />
            ))}
          </div>
        ) : (
          <ul className="stagger-reveal mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );

  const trust = (
    <section id="wholesale" className="scroll-mt-24 py-20 lg:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-pot bg-flora-900 border border-transparent dark:border-dust-100/10 p-10 text-flora-100 shadow-[0_12px_32px_-12px_rgba(62,39,35,0.22)] dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] sm:p-14">
          {ctaImage && (
            <>
              <Image
                src={ctaImage.url}
                alt=""
                aria-hidden
                fill
                sizes="100vw"
                className="object-cover opacity-25"
                unoptimized={isUnoptimizedImage(ctaImage.url)}
              />
              {/* Scrim keeps body text readable over whatever the admin uploads. */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-l from-flora-950/95 via-flora-950/85 to-flora-900/70"
              />
            </>
          )}

          <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Heading, Subtext & Bullets */}
            <div className="lg:col-span-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-flora-300/30 bg-flora-800/60 px-3.5 py-1 text-xs font-bold text-flora-300 backdrop-blur">
                ✨ بدون نیاز به کد تخفیف
              </span>
              <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl leading-tight">
                {content.promo_title?.body || 'خرید هوشمندانه برای کافه‌ها، دفاتر و خانه‌ها'}
              </h2>
              <p className="mt-4 text-sm sm:text-base leading-8 text-flora-100/90">
                {renderFormattedText(
                  content.promo_subtitle?.body ||
                    'نیازی به ثبت درخواست سازمانی ندارید. سیستم ما تخفیف‌ها را به صورت خودکار محاسبه می‌کند. هرچه بیشتر خرید کنید، هزینه کمتری پرداخت خواهید کرد.',
                )}
              </p>
              <ul className="mt-8 space-y-3.5 text-xs sm:text-sm">
                {[
                  'تخفیف پلکانی و خودکار بر اساس تعداد',
                  'مناسب خرید شخصی، کافه‌ها و دفاتر',
                  'قیمت مشخص و شفاف برای هر محصول',
                  'امکان خرید آنلاین از یک عدد تا بسته‌های چندتایی',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-flora-300" />
                    <span className="text-flora-100/90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column: Generic & Clear Table + B2B Escape Hatch */}
            <div className="lg:col-span-6">
              <div className="rounded-pot bg-flora-950/70 border border-flora-700/40 dark:border-dust-100/10 p-6 sm:p-8 backdrop-blur shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs sm:text-sm">
                    <caption className="sr-only">جدول تخفیف خودکار و پلکانی بر اساس تعداد سفارش</caption>
                    <thead>
                      <tr className="border-b border-flora-100/15 text-flora-200/80">
                        <th scope="col" className="pb-3 text-start font-bold">
                          تعداد خرید
                        </th>
                        <th scope="col" className="pb-3 text-start font-bold">
                          تخفیف خودکار
                        </th>
                        <th scope="col" className="pb-3 text-start font-bold">
                          مناسب برای
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-flora-100/10">
                      <tr className="transition-colors hover:bg-white/5">
                        <td className="py-4 font-bold text-white whitespace-nowrap">
                          {toFa('1')} تا {toFa('4')} عدد
                        </td>
                        <td className="py-4 text-flora-100/90 font-medium whitespace-nowrap">
                          قیمت پایه
                        </td>
                        <td className="py-4 text-flora-100/70">
                          مناسب برای خرید شخصی و گیاهان خانگی
                        </td>
                      </tr>
                      <tr className="transition-colors hover:bg-white/5">
                        <td className="py-4 font-bold text-white whitespace-nowrap">
                          {toFa('5')} تا {toFa('19')} عدد
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-300 border border-emerald-400/30">
                            {toFa('15')}٪ تخفیف
                          </span>
                        </td>
                        <td className="py-4 text-flora-100/80 font-medium">
                          ایده‌آل برای کافه‌ها، رستوران‌های کوچک و دفاتر
                        </td>
                      </tr>
                      <tr className="transition-colors hover:bg-white/5">
                        <td className="py-4 font-bold text-white whitespace-nowrap">
                          {toFa('20')} عدد به بالا
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-lg bg-emerald-500/25 px-2.5 py-1 text-xs font-black text-emerald-200 border border-emerald-400/40">
                            {toFa('30')}٪ تخفیف
                          </span>
                        </td>
                        <td className="py-4 text-flora-100/80 font-medium">
                          مناسب برای استارتاپ‌ها و مجموعه‌های در حال رشد
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="mt-4 text-[11px] sm:text-xs leading-6 text-flora-100/60 font-medium">
                  * تخفیف‌ها به صورت خودکار روی سبد خرید شما اعمال می‌شوند.
                </p>

                {/* B2B Escape Hatch */}
                <div className="mt-6 pt-5 border-t border-flora-100/15">
                  <Link
                    href="#wholesale-inquiry"
                    className="group inline-flex w-full items-center justify-between rounded-xl border border-flora-300/35 bg-white/5 hover:bg-white/10 px-4 py-3 text-xs sm:text-sm font-bold text-white transition-all duration-200 hover:border-flora-300 dark:border-dust-50/20 dark:hover:border-flora-300"
                  >
                    <span>پروژه بزرگ، هتل یا نیاز سازمانی دارید؟ استعلام اختصاصی B2B</span>
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-200 group-hover:-translate-x-1 text-flora-300 font-bold"
                    >
                      ←
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );

  return (
    <main data-motion={motionVariant}>
      <DustToFlora
        hero={hero}
        trustBar={
          <TrustBar
            maxDiscount={wholesaleHighlight.maxDiscount}
          />
        }
        whyChooseUs={<WhyChooseUs />}
        catalog={catalog}
        wholesaleInquiry={<WholesaleInquiryForm />}
        trust={trust}
      />

      {/* Motion Prototype Switcher Pill */}
      <aside
        role="region"
        aria-label="تغییر حالت موشن"
        className="fixed bottom-5 start-5 z-50 flex items-center gap-1.5 rounded-full border border-soil-900/15 bg-white/90 p-1.5 shadow-2xl backdrop-blur-md dark:border-dust-100/15 dark:bg-flora-950/90 text-xs font-semibold"
      >
        <span className="px-2 text-soil-700/80 dark:text-dust-200/80 hidden sm:inline">حالت حرکت:</span>
        <Link
          href="/?motion=a"
          scroll={false}
          className={`rounded-full px-3 py-1.5 transition-all ${
            motionVariant === 'a'
              ? 'bg-flora-900 text-white shadow-sm dark:bg-flora-600 dark:text-white font-bold'
              : 'text-soil-700 hover:text-soil-950 dark:text-dust-200 dark:hover:text-white'
          }`}
        >
          حالت الف (سریع)
        </Link>
        <Link
          href="/?motion=b"
          scroll={false}
          className={`rounded-full px-3 py-1.5 transition-all ${
            motionVariant === 'b'
              ? 'bg-flora-900 text-white shadow-sm dark:bg-flora-600 dark:text-white font-bold'
              : 'text-soil-700 hover:text-soil-950 dark:text-dust-200 dark:hover:text-white'
          }`}
        >
          حالت ب (نرم)
        </Link>
      </aside>
    </main>
  );
}
