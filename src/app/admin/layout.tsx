import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { GlobalSearch } from '@/features/admin';

const NAV = [
  { href: '/admin', label: 'داشبورد' },
  { href: '/admin/products', label: 'محصولات' },
  { href: '/admin/categories', label: 'دسته‌بندی‌ها' },
  { href: '/admin/tags', label: 'برچسب‌ها' },
  { href: '/admin/colors', label: 'رنگ‌ها' },
  { href: '/admin/articles', label: 'مقالات' },
  { href: '/admin/content', label: 'محتوای فروشگاه' },
  { href: '/admin/orders', label: 'سفارش‌ها' },
  { href: '/admin/users', label: 'کاربران' },
  { href: '/admin/settings', label: 'تنظیمات' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8 print:max-w-full print:p-0 print:m-0">
      <div className="grid gap-8 lg:grid-cols-12 print:block">
        <aside className="lg:col-span-3 print:hidden no-print">
          <nav className="sticky top-6 rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-950 p-4">
            <p className="px-3 pb-3 text-[11px] font-bold text-soil-700/50 dark:text-dust-200/50">
              پنل مدیریت
            </p>
            <GlobalSearch />
            <ul className="space-y-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="block rounded-xl px-3 py-2.5 text-sm font-bold text-soil-900 dark:text-dust-50 transition hover:bg-dust-100 dark:hover:bg-flora-900"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main className="lg:col-span-9 print:w-full print:p-0 print:m-0">{children}</main>
      </div>
    </div>
  );
}
