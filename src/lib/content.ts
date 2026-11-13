import { prisma } from '@/lib/prisma';

export const DEFAULT_CONTENT = {
  home_hero_title: 'به فضاهای خالی، جان بدهیم.',
  home_hero_subtitle:
    'از گلدان‌های سفالی و سرامیکی دست‌ساز تا خاک و ابزار نگهداری گیاهان؛ پات استور با همکاری بهترین کارگاه‌های ایران، هر آنچه برای سبز نگه‌داشتن فضای شما لازم است را فراهم می‌کند.',
  promo_title: 'خرید عمده، به‌صرفه‌تر',
  promo_subtitle:
    'اگر قصد تجهیز یک پروژه بزرگ را دارید یا به **فاکتور رسمی و قرارداد سازمانی** نیاز دارید، فرم زیر را تکمیل کنید تا کارشناسان ما بهترین شرایط را به شما ارائه دهند.',
  about_title: 'درباره پات استور',
  about_body:
    'از گلدون و خاک گرفته تا وسایل نگهداری گیاه، هرچی برای گل‌وگیاه‌هاتون لازم دارید، اینجا پیدا می‌کنید.\n\nچه تازه شروع کرده باشید، چه مدت‌هاست از گیاه‌هاتون مراقبت می‌کنید، سعی می‌کنیم انتخاب رو براتون راحت‌تر کنیم.\n\nپات استور؛ برای حال خوب گیاه‌هاتون 🌱',
  footer_text:
    'پات استور؛ همراه شما در خلق فضایی سرسبز، آرام و چشم‌نواز. ارائه گلدان‌های دست‌ساز، خاک تخصصی و ملزومات باکیفیت گیاهان با ارسال امن به سراسر ایران.',
  address: 'تهران، خیابان ولیعصر، پلاک ۱۰۰',
  phone: '۰۲۱-۹۱۰۰۰۰۰۰',
  email: 'info@potstore.ir',
  hours: 'شنبه تا پنجشنبه، ۹ صبح تا ۶ عصر',
} as const;

/**
 * The editable copy for the whole site, keyed by block.
 *
 * `RootLayout` calls this on every single route, so it must never be the reason
 * a page fails. A content lookup that throws — a dropped connection, a database
 * that is briefly unreachable, a table that has not been pushed yet — used to
 * take the entire site down with a 500, including pages that render no content
 * block at all. Falling back to the built-in copy below keeps the shop up with
 * slightly staler text, which is always the better trade.
 */
export async function getContentMap() {
  let records: { key: string; title: string; body: string }[] = [];

  try {
    records = await prisma.staticContent.findMany({
      where: { isPublished: true },
      select: { key: true, title: true, body: true },
    });
  } catch (error) {
    console.error(
      '[content] database lookup failed, serving built-in copy:',
      error instanceof Error ? error.message : error,
    );
  }

  const map = new Map(records.map((item) => [item.key, item]));
  return Object.fromEntries(
    Object.entries(DEFAULT_CONTENT).map(([key, fallback]) => {
      const record = map.get(key);
      return [key, record ? { title: record.title, body: record.body } : { title: key, body: fallback }];
    }),
  ) as Record<keyof typeof DEFAULT_CONTENT, { title: string; body: string }>;
}

export type ContentMap = Awaited<ReturnType<typeof getContentMap>>;
