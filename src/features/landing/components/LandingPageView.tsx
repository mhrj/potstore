'use client';

import Image from 'next/image';
import Link from 'next/link';
import { toFa } from '@/lib/format';
import type { ContentMap } from '@/lib/content';
import DustToFlora from '@/features/landing/components/DustToFlora';
import TrustBar from '@/features/landing/components/TrustBar';
import WhyChooseUs from '@/features/landing/components/WhyChooseUs';
import WholesaleInquiryForm from '@/features/landing/components/WholesaleInquiryForm';
import OrganicTextReveal from '@/features/landing/components/OrganicTextReveal';
import HeroImage from '@/features/landing/components/HeroImage';
import Container from '@/components/ui/Container';
import Skeleton from '@/components/ui/Skeleton';
import { ProductCard } from '@/features/catalog';
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
}: LandingPageViewProps) {
  const ctaImage = landing.cta;
  const heroGlowRef = usePointerGlow<HTMLElement>();

  const hero = (
    <section
      ref={heroGlowRef}
      className="relative overflow-hidden bg-transparent -mb-px min-h-[calc(100dvh-4rem)] flex flex-col justify-center pt-8 pb-8 sm:pt-12 sm:pb-12 lg:pt-16 lg:pb-16"
    >
      {/* Pointer glow layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out z-0 hidden lg:block"
        style={{
          opacity: 'var(--glow-opacity, 0)',
          background:
            'radial-gradient(circle var(--glow-radius, 320px) at var(--mx, 50%) var(--my, 50%), var(--glow-color, rgba(64, 145, 108, 0.18)), transparent 80%)',
        }}
      />
      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-0 items-center">
          {/* Block A: TEXT (Title + Subtitle) - Appears 1st on mobile, Col 1-5 Row 1 on desktop */}
          <div className="order-1 lg:col-span-5 lg:col-start-1 lg:row-start-1 flex flex-col items-center lg:items-start text-center lg:text-start relative z-20">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-dust-300/70 bg-dust-100/70 dark:border-dust-100/20 dark:bg-flora-900/70 px-4 py-1.5 text-xs font-medium text-soil-700 dark:text-dust-200 backdrop-blur">
              <span className="size-1.5 rounded-full bg-dust-400 dark:bg-flora-300" />
              از خاک خالی، تا رویش سبز
            </span>

            {/* H1 Title with Organic Text Reveal */}
            <OrganicTextReveal
              text={content.home_hero_title?.body || 'به فضاهای خالی، جان بدهیم.'}
              className="mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight break-words text-soil-900 dark:text-dust-50 text-center lg:text-start"
            />

            {/* Subtitle */}
            <p className="mt-4 sm:mt-6 text-base sm:text-lg lg:text-xl leading-8 text-soil-700/80 dark:text-dust-200/80 text-center lg:text-start mx-auto lg:mx-0 max-w-md lg:max-w-xl">
              {content.home_hero_subtitle.body}
            </p>
          </div>

          {/* Block B: IMAGE - Appears 2nd on mobile (below subtitle), Col 6-12 Row 1-2 on desktop */}
          <div className="order-2 mt-6 lg:mt-0 lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-2 lg:self-center relative z-10 pointer-events-none select-none flex items-center justify-center w-full max-w-[500px] lg:max-w-[800px] mx-auto">
            <HeroImage />
          </div>

          {/* Block C: BUTTONS (CTA) - Appears 3rd on mobile (below video), Col 1-5 Row 2 on desktop */}
          <div className="order-3 mt-6 lg:mt-8 lg:col-span-5 lg:col-start-1 lg:row-start-2 flex flex-col items-center lg:items-start w-full relative z-20">
            {/* Action Buttons */}
            <div className="flex flex-col w-full sm:flex-row justify-center lg:justify-start gap-4">
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

            {/* Desktop Stats (below buttons on desktop) */}
            <div className="hidden lg:block w-full pt-8 mt-10 border-t border-soil-900/10 dark:border-transparent">
              <dl className="flex items-center gap-6 sm:gap-8 divide-x divide-x-reverse divide-soil-900/10 dark:divide-transparent justify-start">
                {[
                  { k: '۴۲+', v: 'مدل گلدان' },
                  { k: '۳۱', v: 'استان تحت پوشش' },
                  { k: '۱۲٬۰۰۰+', v: 'سفارش موفق' },
                ].map((s) => (
                  <div key={s.v} className="px-3 sm:px-5 first:ps-0 last:pe-0 text-start">
                    <dt className="text-3xl font-black text-soil-900 dark:text-dust-50">{s.k}</dt>
                    <dd className="mt-1 text-xs text-soil-700/60 dark:text-dust-300/70">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Block D: MOBILE STATS - Appears 4th on mobile, hidden on desktop */}
          <div className="order-4 w-full lg:hidden pt-2 mt-6">
            <dl className="flex items-center gap-2 sm:gap-6 pt-6 border-t border-soil-900/10 dark:border-transparent divide-x divide-x-reverse divide-soil-900/10 dark:divide-transparent justify-center">
              {[
                { k: '۴۲+', v: 'مدل گلدان' },
                { k: '۳۱', v: 'استان تحت پوشش' },
                { k: '۱۲٬۰۰۰+', v: 'سفارش موفق' },
              ].map((s) => (
                <div key={s.v} className="px-2 sm:px-4 first:ps-0 last:pe-0 text-center">
                  <dt className="text-xl sm:text-2xl font-black text-soil-900 dark:text-dust-50">{s.k}</dt>
                  <dd className="mt-1 text-[11px] sm:text-xs text-soil-700/60 dark:text-dust-300/70 whitespace-nowrap">{s.v}</dd>
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
            <h2 className="text-2xl sm:text-3xl font-black text-white md:text-4xl">پرفروش‌ترین‌ها</h2>
            <p className="mt-3 text-dust-200/80">قیمت پله‌ای — هرچه بیشتر، ارزان‌تر.</p>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-1.5 text-sm font-bold text-flora-100 hover:text-white transition-colors"
          >
            <span>همه محصولات</span>
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
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
        <div className="relative overflow-hidden rounded-pot bg-flora-900 border border-transparent dark:border-dust-100/10 p-5 sm:p-10 lg:p-14 text-flora-100 shadow-[0_12px_32px_-12px_rgba(62,39,35,0.22)] dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)]">
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
              <h2 className="mt-4 text-2xl sm:text-3xl font-black text-white md:text-4xl leading-tight">
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
              <div className="rounded-pot bg-flora-950/70 border border-flora-700/40 dark:border-dust-100/10 p-4 sm:p-6 lg:p-8 backdrop-blur shadow-xl">
                {/* Mobile: Stacked Card Layout */}
                <div className="flex flex-col gap-3 md:hidden">
                  <div className="flex flex-col gap-2 rounded-2xl bg-white/5 border border-flora-100/10 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white text-sm">
                        {toFa('1')} تا {toFa('4')} عدد
                      </span>
                      <span className="text-xs font-bold text-flora-100 bg-white/10 px-2.5 py-1 rounded-lg">
                        قیمت پایه
                      </span>
                    </div>
                    <p className="text-xs text-flora-100/85 leading-5">
                      مناسب برای خرید شخصی و گیاهان خانگی
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl bg-white/5 border border-flora-100/10 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white text-sm">
                        {toFa('5')} تا {toFa('19')} عدد
                      </span>
                      <span className="inline-flex items-center rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-300 border border-emerald-400/30">
                        {toFa('15')}٪ تخفیف
                      </span>
                    </div>
                    <p className="text-xs text-flora-100/85 leading-5">
                      ایده‌آل برای کافه‌ها، رستوران‌های کوچک و دفاتر
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl bg-white/5 border border-flora-100/10 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white text-sm">
                        {toFa('20')} عدد به بالا
                      </span>
                      <span className="inline-flex items-center rounded-lg bg-emerald-500/25 px-2.5 py-1 text-xs font-black text-emerald-200 border border-emerald-400/40">
                        {toFa('30')}٪ تخفیف
                      </span>
                    </div>
                    <p className="text-xs text-flora-100/85 leading-5">
                      مناسب برای استارتاپ‌ها و مجموعه‌های در حال رشد
                    </p>
                  </div>
                </div>

                {/* Desktop: Standard Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-start text-xs sm:text-sm">
                    <caption className="sr-only">جدول تخفیف خودکار و پلکانی بر اساس تعداد سفارش</caption>
                    <thead>
                      <tr className="border-b border-flora-100/15 text-flora-100 font-bold">
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
                        <td className="py-4 text-flora-100 font-medium whitespace-nowrap">
                          قیمت پایه
                        </td>
                        <td className="py-4 text-flora-100/90">
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
                        <td className="py-4 text-flora-100 font-medium">
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
                        <td className="py-4 text-flora-100 font-medium">
                          مناسب برای استارتاپ‌ها و مجموعه‌های در حال رشد
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="mt-4 text-[11px] sm:text-xs leading-6 text-flora-100/85 font-medium">
                  * تخفیف‌ها به صورت خودکار روی سبد خرید شما اعمال می‌شوند.
                </p>

                {/* B2B Escape Hatch */}
                <div className="mt-6 pt-5 border-t border-flora-100/15">
                  <Link
                    href="#wholesale-inquiry"
                    className="group inline-flex w-full h-auto items-center justify-between gap-3 rounded-xl border border-flora-300/35 bg-white/5 hover:bg-white/10 px-4 py-4 text-xs sm:text-sm font-bold text-white transition-all duration-200 hover:border-flora-300 dark:border-dust-50/20 dark:hover:border-flora-300 text-center sm:text-start whitespace-normal"
                  >
                    <span className="flex-1 text-center sm:text-start leading-6">پروژه بزرگ، هتل یا نیاز سازمانی دارید؟ استعلام اختصاصی B2B</span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 transition-transform duration-200 group-hover:-translate-x-1 text-flora-300 font-bold"
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
    <main>
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
    </main>
  );
}
