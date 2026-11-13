import Container from '@/components/ui/Container';
import { toFa } from '@/lib/format';

type TrustBarProps = {
  maxDiscount?: number;
};

export default function TrustBar({ maxDiscount = 0 }: TrustBarProps) {
  const pillars = [
    {
      title: 'ارسال مطمئن',
      description: 'بسته‌بندی مناسب و ارسال سفارش با دقت، تا محصولات سالم به دستتون برسن.',
      icon: (
        <svg className="size-6 text-flora-700 dark:text-flora-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      title: 'انتخاب راحت و شفاف',
      description: 'مشخصات و قیمت محصولات رو ببینید و با خیال راحت انتخاب کنید.',
      icon: (
        <svg className="size-6 text-flora-700 dark:text-flora-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      ),
    },
    {
      title: 'تخفیف پلکانی و خودکار',
      badge: maxDiscount > 0 ? `تا ${toFa(maxDiscount)}٪ تخفیف` : undefined,
      description: 'از یک عدد تا بسته‌های چندتایی، تخفیف هر پله به صورت خودکار محاسبه می‌شود.',
      icon: (
        <svg className="size-6 text-flora-700 dark:text-flora-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      ),
    },
    {
      title: 'همراه گیاه‌هاتون',
      description: 'از انتخاب گلدون و خاک تا وسایل نگهداری، کنارتون هستیم.',
      icon: (
        <svg className="size-6 text-flora-700 dark:text-flora-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative -mt-6 mb-16 lg:mb-20 z-10">
      <Container>
        <div className="rounded-3xl border border-soil-900/10 dark:border-dust-100/10 bg-white/80 dark:bg-flora-900/90 p-6 shadow-xl shadow-soil-900/5 dark:shadow-black/20 backdrop-blur-md sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x-reverse lg:divide-x lg:divide-soil-900/10 dark:lg:divide-dust-100/10">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="group flex flex-col items-center text-center p-3 transition duration-300 hover:-translate-y-1 sm:items-start sm:text-start lg:px-5"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="grid size-12 place-items-center rounded-2xl bg-flora-100 dark:bg-flora-900/50 shadow-sm transition duration-300 group-hover:scale-110 group-hover:bg-flora-300 dark:group-hover:bg-flora-900/60">
                    {pillar.icon}
                  </div>
                  {pillar.badge && (
                    <span className="rounded-full bg-flora-100 text-flora-900 dark:bg-flora-900/80 dark:text-flora-300 border border-flora-300/40 dark:border-flora-500/50 px-2.5 py-0.5 text-[11px] font-bold">
                      {pillar.badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-base font-black text-soil-900 dark:text-dust-50">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-soil-700/80 dark:text-dust-200/80">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
