import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toFa } from '@/lib/format';
import LogoutButton from '@/features/auth/components/LogoutButton';
import MobileNav from '@/components/layout/MobileNav';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default async function Header() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  const cartCount = user
    ? await prisma.cartItem
        .aggregate({ where: { userId: user.id }, _sum: { quantity: true } })
        .then((r) => r._sum.quantity ?? 0)
        .catch(() => 0)
    : 0;

  const links = [
    { href: '/products', label: 'محصولات' },
    { href: '/articles', label: 'مقالات' },
    { href: '/cart', label: 'سبد خرید' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-soil-900/10 bg-dust-50/90 backdrop-blur supports-[backdrop-filter]:bg-dust-50/75 dark:border-dust-100/10 dark:bg-flora-950/90 dark:supports-[backdrop-filter]:bg-flora-950/75 print:hidden no-print">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center gap-5">
          <Link href="/" className="text-lg font-black text-soil-900 dark:text-dust-50">
            پات استور
          </Link>
          <nav aria-label="منوی اصلی" className="hidden items-center gap-4 text-sm font-medium text-soil-700 dark:text-dust-200 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-flora-700 dark:hover:text-flora-300">
                {link.label}
                {link.href === '/cart' && cartCount > 0 && (
                  <span className="ms-1.5 rounded-full bg-flora-900 dark:bg-flora-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {toFa(cartCount)}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle placed next to cart icon */}
          <ThemeToggle />

          {/* Cart stays reachable at every width; the rest of the nav collapses. */}
          <Link
            href="/cart"
            aria-label={cartCount > 0 ? `سبد خرید، ${cartCount} کالا` : 'سبد خرید'}
            className="relative rounded-full border border-soil-900/15 bg-white p-2.5 text-soil-900 transition hover:border-flora-700 hover:text-flora-700 dark:border-dust-100/15 dark:bg-flora-900 dark:text-dust-50 dark:hover:border-flora-300 dark:hover:text-flora-300 md:hidden"
          >
            <CartIcon />
            {cartCount > 0 && (
              <span className="absolute -top-1 -end-1 min-w-4 rounded-full bg-flora-900 dark:bg-flora-700 px-1 text-center text-[10px] font-bold text-white">
                {toFa(cartCount)}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Link
                href={isAdmin ? '/admin' : '/dashboard'}
                className="hidden rounded-full bg-flora-900 dark:bg-flora-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-flora-700 dark:hover:bg-flora-950 sm:block"
              >
                {isAdmin ? 'داشبورد مدیریت' : user.fullName ? 'حساب من' : 'پروفایل'}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="hidden rounded-full border border-soil-900/15 bg-white px-4 py-2 text-xs font-bold text-soil-900 transition hover:border-flora-700 hover:text-flora-700 dark:border-dust-100/15 dark:bg-flora-900 dark:text-dust-50 dark:hover:border-flora-300 dark:hover:text-flora-300 sm:block"
              >
                ساخت حساب کاربری
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-flora-900 dark:bg-flora-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-flora-700 dark:hover:bg-flora-950"
              >
                ورود به حساب
              </Link>
            </>
          )}

          <MobileNav
            links={links}
            cartCount={cartCount}
            accountHref={user ? (isAdmin ? '/admin' : '/dashboard') : null}
            accountLabel={isAdmin ? 'داشبورد مدیریت' : 'حساب من'}
          />
        </div>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="10" cy="20" r="1.2" />
      <circle cx="18" cy="20" r="1.2" />
    </svg>
  );
}

