'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toFa } from '@/lib/format';

/**
 * Mobile navigation drawer.
 *
 * The desktop nav is hidden below `md`, so this keeps every destination — and
 * the cart count — reachable on a phone. It closes on route change and on Esc,
 * and is rendered inline (not a portal) so focus order stays predictable.
 */
export default function MobileNav({
  links,
  cartCount,
  accountHref,
  accountLabel,
}: {
  links: { href: string; label: string }[];
  cartCount: number;
  accountHref: string | null;
  accountLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const filteredLinks = links.filter((link) => link.href !== accountHref);
  const items = accountHref
    ? [...filteredLinks, { href: accountHref, label: accountLabel }]
    : filteredLinks;

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? 'بستن منو' : 'باز کردن منو'}
        className="rounded-full border border-soil-900/15 bg-white p-2.5 text-soil-900 transition hover:border-flora-700 dark:border-dust-100/15 dark:bg-flora-900 dark:text-dust-50 dark:hover:border-flora-300"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="size-4"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="منوی موبایل"
          className="absolute inset-x-0 top-full border-b border-soil-900/10 bg-dust-50 px-4 py-3 shadow-[0_16px_32px_-20px_rgba(62,39,35,0.4)] dark:border-dust-100/10 dark:bg-flora-950 dark:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.8)]"
        >
          <ul className="flex flex-col">
            {items.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center justify-between border-b border-soil-900/5 py-3 text-sm font-bold text-soil-900 last:border-b-0 dark:border-dust-100/10 dark:text-dust-50 dark:hover:text-flora-300"
                >
                  {link.label}
                  {link.href === '/cart' && cartCount > 0 && (
                    <span className="rounded-full bg-flora-900 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-flora-700">
                      {toFa(cartCount)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
