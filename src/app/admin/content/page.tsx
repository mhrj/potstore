import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { DEFAULT_CONTENT } from '@/lib/content';
import ContentBlockEditor from '@/features/admin/components/ContentBlockEditor';

export const dynamic = 'force-dynamic';

const CONTENT_SECTIONS = [
  {
    title: 'بخش اصلی صفحه نخست (Hero)',
    description: 'عنوان بزرگ و متن معرفی اولیه که در بالای صفحه اول وب‌سایت نمایش داده می‌شود.',
    blocks: [
      {
        key: 'home_hero_title' as const,
        label: 'عنوان اصلی صفحه نخست',
        multiline: false,
      },
      {
        key: 'home_hero_subtitle' as const,
        label: 'متن معرفی و زیرعنوان صفحه نخست',
        multiline: true,
        rows: 3,
      },
    ],
  },
  {
    title: 'بخش خرید هوشمندانه و تخفیف پلکانی (Smart Shopping & Tiers)',
    description: 'عنوان و توضیحات بخش خرید با تخفیف خودکار پلکانی برای کافه‌ها، دفاتر و خانه‌ها.',
    blocks: [
      {
        key: 'promo_title' as const,
        label: 'عنوان بخش خرید هوشمندانه و تخفیف پلکانی',
        multiline: false,
      },
      {
        key: 'promo_subtitle' as const,
        label: 'توضیحات بخش خرید هوشمندانه و نحوه محاسبه تخفیف',
        multiline: true,
        rows: 3,
      },
    ],
  },
  {
    title: 'بخش درباره ما و داستان فروشگاه (About Us)',
    description: 'روایت ارزش‌های پات استور و انتخاب بهترین کارگاه‌ها که در صفحه اول و صفحه «درباره ما» قرار دارد.',
    blocks: [
      {
        key: 'about_title' as const,
        label: 'عنوان بخش درباره ما',
        multiline: false,
      },
      {
        key: 'about_body' as const,
        label: 'متن کامل داستان و معرفی فروشگاه',
        multiline: true,
        rows: 6,
      },
    ],
  },
  {
    title: 'اطلاعات تماس و فوتر (Footer & Contact Information)',
    description: 'متن معرفی کوتاه فوتر و مشخصات رسمی تماس که در پاورقی تمام صفحات وب‌سایت نمایش داده می‌شوند.',
    blocks: [
      {
        key: 'footer_text' as const,
        label: 'متن توضیحی فوتر',
        multiline: true,
        rows: 2,
      },
      {
        key: 'address' as const,
        label: 'نشانی فیزیکی فروشگاه',
        multiline: false,
      },
      {
        key: 'phone' as const,
        label: 'شماره تلفن تماس',
        multiline: false,
      },
      {
        key: 'email' as const,
        label: 'آدرس ایمیل پشتیبانی',
        multiline: false,
      },
      {
        key: 'hours' as const,
        label: 'ساعات کاری و پاسخ‌گویی',
        multiline: false,
      },
    ],
  },
];

export default async function AdminContentPage() {
  await requireAdmin();

  const existing = await prisma.staticContent.findMany({
    select: { key: true, body: true },
  });
  const map = new Map(existing.map((item) => [item.key, item.body]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">محتوای متنی فروشگاه</h1>
        <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-200/70">
          متن‌های تجاری و کسب‌وکار فروشگاه را در این صفحه ویرایش و منتشر کنید. برچسب‌ها و ساختار بخش‌ها ثابت باقی می‌مانند.
        </p>
      </div>

      <div className="space-y-8">
        {CONTENT_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-4">
            <div className="border-b border-soil-900/10 dark:border-dust-50/10 pb-2">
              <h2 className="text-base font-black text-soil-900 dark:text-dust-50">{section.title}</h2>
              <p className="mt-1 text-xs text-soil-700/60 dark:text-dust-200/60">{section.description}</p>
            </div>

            <div className="grid gap-4">
              {section.blocks.map((b) => (
                <ContentBlockEditor
                  key={b.key}
                  blockKey={b.key}
                  fieldLabel={b.label}
                  initialValue={map.get(b.key) ?? ''}
                  defaultValue={DEFAULT_CONTENT[b.key]}
                  multiline={b.multiline}
                  rows={b.rows}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
