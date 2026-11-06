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

export default function LandingPageView({
  products,
  landing,
  content,
  wholesaleHighlight,
}: LandingPageViewProps) {
  const heroImage = landing.hero;
  const journeyImage = landing.journey;
  const ctaImage = landing.cta;

  const hero = (
    <section className="relative flex flex-col items-center justify-center text-center overflow-hidden pt-20 pb-16 bg-dust-50 dark:bg-flora-950 transition-colors duration-500">
      {/* Background Decorative Orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-75 h-75 bg-flora-300/20 dark:bg-flora-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-44 right-1/4 w-65 h-65 bg-dust-300/35 dark:bg-flora-900/40 blur-[100px] rounded-full pointer-events-none" />
      </div>

      <Container className="flex flex-col items-center justify-center text-center">
        {/* 1. Badge, H1, Subtitle */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-dust-300/70 bg-dust-100/70 dark:border-dust-100/20 dark:bg-flora-900/70 px-4 py-1.5 text-xs font-medium text-soil-700 dark:text-dust-200 backdrop-blur">
            <span className="size-1.5 rounded-full bg-dust-400 dark:bg-flora-300" />
            از خاک خالی، تا رویش سبز
          </span>

          <Typewriter
            text={content.home_hero_title?.body || 'به فضاهای خالی، جان بدهیم.'}
            className="mt-6 mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight font-black text-soil-900 dark:text-dust-50 text-center"
          />

          <p className="max-w-2xl text-base leading-8 text-soil-700/85 dark:text-dust-200/85 sm:text-lg mx-auto text-center">
            {content.home_hero_subtitle.body}
          </p>
        </div>

        {/* 2. Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 sm:mt-8">
          <Link
            href="#catalog"
            className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-7 py-3.5 text-sm font-bold shadow-lg shadow-flora-900/25 transition-all duration-300 hover:scale-105 hover:bg-flora-700 hover:shadow-2xl hover:shadow-flora-900/40 active:scale-[0.98]"
          >
            <span className="inline-block transition duration-300 group-hover:rotate-12 group-hover:scale-125">
              🌱
            </span>
            <span>دیدن محصولات</span>
          </Link>
          <Link
            href="#wholesale-inquiry"
            className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-soil-900/15 bg-white/70 dark:border-dust-100/20 dark:bg-flora-900/70 px-7 py-3.5 text-sm font-bold text-soil-900 dark:text-dust-50 backdrop-blur transition-all duration-300 hover:scale-105 hover:bg-white dark:hover:bg-flora-950 hover:border-soil-900/35 dark:hover:border-dust-100/30 hover:shadow-xl hover:shadow-soil-900/10 active:scale-[0.98]"
          >
            <span>خرید عمده و استعلام قیمت</span>
            <span className="text-flora-700 dark:text-flora-300 transition duration-300 group-hover:translate-x-1">←</span>
          </Link>
        </div>

        {/* 3. Stats */}
        <dl className="flex justify-center items-center gap-6 sm:gap-10 mt-6 sm:mt-8 w-full max-w-lg mx-auto border-t border-soil-900/10 dark:border-dust-100/10 pt-5 divide-x divide-x-reverse divide-soil-900/10 dark:divide-dust-100/10">
          {[
            { k: '۴۲+', v: 'مدل گلدان' },
            { k: '۳۱', v: 'استان تحت پوشش' },
            { k: '۱۲٬۰۰۰+', v: 'سفارش موفق' },
          ].map((s) => (
            <div key={s.v} className="px-2 text-center">
              <dt className="text-xl sm:text-2xl font-black text-soil-900 dark:text-dust-50">{s.k}</dt>
              <dd className="mt-1 text-[10px] sm:text-xs text-soil-700/70 dark:text-dust-300/70">{s.v}</dd>
            </div>
          ))}
        </dl>

        {/* 4. The Video Container */}
        <div className="w-full max-w-[100vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto aspect-video rounded-2xl md:rounded-3xl mt-6 md:mt-8 overflow-hidden shadow-2xl border border-soil-900/5 dark:border-dust-50/10">
          <video 
            autoPlay 
            muted 
            playsInline 
            preload="metadata"
            poster="/hero-poster.jpg"
            aria-label="انیمیشن طراحی گلدان و گیاه"
            className="w-full h-full object-cover mix-blend-multiply dark:brightness-[0.85] dark:contrast-[1.1]"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
        </div>
      </Container>
    </section>
  );

  const journey = (
    <section className="py-24">
      <Container className="max-w-3xl text-center">
        <h2 className="text-3xl font-black text-soil-900 dark:text-dust-50 sm:text-4xl">
          درباره پات استور
        </h2>
        <p className="mt-5 leading-8 text-soil-700/85 dark:text-dust-200/85 whitespace-pre-line">
          از گلدون و خاک گرفته تا وسایل نگهداری گیاه، هرچی برای گل‌وگیاه‌هاتون لازم دارید، اینجا پیدا می‌کنید.
          {'\n\n'}
          چه تازه شروع کرده باشید، چه مدت‌هاست از گیاه‌هاتون مراقبت می‌کنید، سعی می‌کنیم انتخاب رو براتون راحت‌تر کنیم.
        </p>
        <p className="mt-5 text-base font-bold text-flora-700 dark:text-flora-300">
          پات استور؛ برای حال خوب گیاه‌هاتون 🌱
        </p>
      </Container>

      {journeyImage && (
        <Container className="mt-16">
          <div className="relative aspect-21/9 overflow-hidden rounded-pot bg-white dark:bg-flora-950 border border-soil-900/5 dark:border-dust-50/10 shadow-[0_12px_32px_-12px_rgba(62,39,35,0.22)] dark:shadow-none">
            <Image
              src={journeyImage.url}
              alt={journeyImage.alt ?? 'همراهی با گیاهان از خاک تا رویش'}
              fill
              sizes="(max-width: 1024px) 100vw, 80vw"
              className="object-cover"
              unoptimized={isUnoptimizedImage(journeyImage.url)}
            />
          </div>
        </Container>
      )}

      {/* Three equal cards on one baseline. */}
      <Container className="mt-16 grid gap-6 md:grid-cols-3">
        {[
          {
            title: 'خاک',
            subtitle: 'بستر مناسب برای هر گیاه',
            description:
              'خاک‌های مختلف، کاربردهای متفاوتی دارند. با توجه به نیاز گیاه به رطوبت، هوادهی و زهکشی، بستر مناسب‌تری برای رشد آن انتخاب کنید.',
            icon: '🏺',
            card: 'bg-dust-200 dark:bg-flora-900',
            accent: 'border-t-dust-400 dark:border-t-flora-300',
          },
          {
            title: 'ریشه',
            subtitle: 'گلدان مناسب، شروعی بهتر',
            description:
              'اندازه گلدان، فضای ریشه و خروج آب اضافی در سلامت گیاه اهمیت دارند. گلدانی انتخاب کنید که با اندازه و نیاز گیاهتان متناسب باشد.',
            icon: '🪴',
            card: 'bg-flora-100 dark:bg-flora-900',
            accent: 'border-t-flora-300 dark:border-t-flora-300',
          },
          {
            title: 'رویش',
            subtitle: 'از کاشت تا مراقبت روزمره',
            description:
              'با انتخاب گلدان، خاک و لوازم مناسب، برای رسیدگی به گیاهانتان آماده‌تر باشید؛ چه در حال شروع باشید و چه بخواهید مجموعه‌تان را گسترش دهید.',
            icon: '🌸',
            card: 'bg-flora-300/50 dark:bg-flora-900',
            accent: 'border-t-flora-500 dark:border-t-flora-300',
          },
        ].map((card) => (
          <div
            key={card.title}
            className={`flex flex-col h-full rounded-pot border-t-4 border border-soil-900/5 dark:border-dust-100/10 ${card.accent} ${card.card} p-8 shadow-[0_12px_32px_-12px_rgba(62,39,35,0.22)] dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_44px_-16px_rgba(62,39,35,0.32)] dark:hover:shadow-[0_22px_44px_-16px_rgba(0,0,0,0.7)]`}
          >
            <span
              aria-hidden
              className="grid size-12 place-items-center rounded-2xl bg-white/60 dark:bg-white/10 text-2xl"
            >
              {card.icon}
            </span>
            <h3 className="mt-5 text-xl font-black text-soil-900 dark:text-dust-50">{card.title}</h3>
            <p className="mt-2 text-sm font-bold text-flora-700 dark:text-flora-300">{card.subtitle}</p>
            <p className="mt-3 text-xs leading-6 text-soil-700/80 dark:text-dust-200/80">{card.description}</p>
          </div>
        ))}
      </Container>
    </section>
  );

  const catalog = (
    <section id="catalog" className="scroll-mt-24 py-24">
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
          <ul className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
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
    <section id="wholesale" className="scroll-mt-24 py-24">
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
                خرید عمده، به‌صرفه‌تر
              </h2>
              <p className="mt-4 text-sm sm:text-base leading-8 text-flora-100/90">
                برای خریدهای کم و زیاد، قیمت مناسب داریم. هرچه تعداد بیشتری بخرید، تخفیف بیشتری می‌گیرید.
              </p>
              <ul className="mt-8 space-y-3.5 text-xs sm:text-sm">
                {[
                  'تخفیف خرید عمده و تعداد بالا',
                  'مناسب خرید خانه، گلخانه و فروشگاه‌ها',
                  'قیمت مشخص و شفاف برای هر محصول',
                  'امکان خرید از یک عدد تا تعداد بالا',
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
                    <caption className="sr-only">جدول خرید عمده و تخفیف پلکانی بر اساس تعداد سفارش</caption>
                    <thead>
                      <tr className="border-b border-flora-100/15 text-flora-200/80">
                        <th scope="col" className="pb-3 text-start font-bold">
                          تعداد
                        </th>
                        <th scope="col" className="pb-3 text-start font-bold">
                          میزان تخفیف
                        </th>
                        <th scope="col" className="pb-3 text-start font-bold">
                          توضیحات
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
                          بدون تخفیف
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
                          مناسب کافه‌ها و شرکت‌های کوچک
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
                          مناسب پروژه‌های بزرگ و عمده
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
                    <span>خرید تعداد بالا دارید؟ با ما تماس بگیرید.</span>
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
        journey={journey}
        wholesaleInquiry={<WholesaleInquiryForm />}
        trust={trust}
      />
    </main>
  );
}
