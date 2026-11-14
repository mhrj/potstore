'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatToman, toFa, toEn, formatDateFa } from '@/lib/format';

type SearchResults = {
  users: Array<{
    id: string;
    fullName: string | null;
    phone: string | null;
    email: string | null;
    role: string;
    isActive: boolean;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    totalToman: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    user: { id: string; fullName: string | null } | null;
  }>;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    basePriceToman: number;
    stock: number;
    images: Array<{ url: string }>;
  }>;
};

function Highlight({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed || !text) return <>{text}</>;
  const qFa = toFa(trimmed);
  const qEn = toEn(trimmed);
  const patterns = Array.from(new Set([trimmed, qFa, qEn]))
    .filter(Boolean)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        patterns.some((p) => p.toLowerCase() === part.toLowerCase()) ? (
          <mark
            key={i}
            className="rounded bg-amber-200/80 px-1 py-0.5 font-bold text-amber-950"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    users: [],
    orders: [],
    products: [],
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ users: [], orders: [], products: [] });
    }
  }, [open]);

  // 300ms Debounce search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({ users: [], orders: [], products: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch {
        // silent error in search
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults =
    results.users.length > 0 ||
    results.orders.length > 0 ||
    results.products.length > 0;

  const handleSelect = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center justify-between rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50 dark:bg-flora-900/50 px-3 py-2.5 text-xs text-soil-700/70 dark:text-dust-200/70 transition hover:border-flora-500 dark:hover:border-flora-500/50 hover:bg-dust-100 dark:hover:bg-flora-950 hover:text-soil-900 dark:hover:text-dust-50"
      >
        <span className="flex items-center gap-2">
          <span>🔍</span>
          <span className="font-medium">جستجوی سراسری…</span>
        </span>
        <kbd className="rounded border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 px-1.5 py-0.5 font-mono text-[10px] text-soil-700/70 dark:text-dust-200/70 shadow-xs">
          Ctrl+K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-soil-900/60 dark:bg-black/70 p-4 pt-16 backdrop-blur-xs sm:pt-24">
          <div
            className="fixed inset-0"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 shadow-2xl transition-all"
          >
            {/* Header / Input bar */}
            <div className="flex items-center border-b border-soil-900/10 dark:border-dust-50/10 px-4 py-3.5">
              <span className="text-soil-700/60 dark:text-dust-200/60 me-3 text-lg">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجو در کاربران، سفارش‌ها، محصولات..."
                className="flex-1 bg-transparent text-sm text-soil-900 dark:text-dust-50 placeholder:text-soil-700/50 dark:placeholder:text-dust-200/50 outline-none"
              />
              {loading && (
                <span className="size-4 animate-spin rounded-full border-2 border-flora-700 dark:border-flora-300 border-t-transparent me-2" />
              )}
              {query && !loading && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full p-1 text-xs text-soil-700/50 dark:text-dust-200/50 hover:bg-dust-100 dark:hover:bg-flora-950 hover:text-soil-900 dark:hover:text-dust-50 me-2"
                >
                  ✕
                </button>
              )}
              <kbd
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded border border-soil-900/15 dark:border-dust-50/20 bg-dust-100 dark:bg-flora-950 px-1.5 py-0.5 font-mono text-[10px] text-soil-700/70 dark:text-dust-200/70 hover:bg-dust-200 dark:hover:bg-flora-950"
              >
                ESC
              </kbd>
            </div>

            {/* Content area */}
            <div className="max-h-[70dvh] overflow-y-auto p-4 space-y-5">
              {!query.trim() && (
                <div className="py-8 text-center text-xs text-soil-700/50 dark:text-dust-200/50">
                  <p className="text-2xl mb-2">⚡</p>
                  <p>شماره سفارش، نام مشتری، شماره موبایل یا عنوان کالا را تایپ کنید.</p>
                </div>
              )}

              {query.trim() && !loading && !hasResults && (
                <div className="py-8 text-center text-xs text-soil-700/60 dark:text-dust-200/60">
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="font-bold">هیچ موردی یافت نشد.</p>
                  <p className="mt-1 text-soil-700/50 dark:text-dust-200/50">
                    عبارت دیگری را امتحان کنید یا املای آن را بررسی فرمایید.
                  </p>
                </div>
              )}

              {/* Group: Users */}
              {results.users.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between px-2 text-[11px] font-bold text-soil-700/60 dark:text-dust-200/60">
                    <span>👤 کاربران ({toFa(results.users.length)})</span>
                    <Link
                      href="/admin/users"
                      onClick={() => setOpen(false)}
                      className="text-flora-700 dark:text-flora-300 hover:text-flora-900 dark:hover:text-flora-300 normal-case"
                    >
                      مشاهده همه کاربران
                    </Link>
                  </div>
                  <ul className="space-y-1">
                    {results.users.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(`/admin/users/${user.id}`)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start transition hover:bg-dust-50 dark:hover:bg-flora-950/70 focus:bg-dust-100 dark:focus:bg-flora-950"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-soil-900 dark:text-dust-50 truncate">
                              <Highlight text={user.fullName || 'بدون نام'} query={query} />
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs text-soil-700/70 dark:text-dust-200/70 mt-0.5">
                              {user.phone && (
                                <span dir="ltr">
                                  <Highlight text={user.phone} query={query} />
                                </span>
                              )}
                              {user.email && (
                                <span dir="ltr">
                                  <Highlight text={user.email} query={query} />
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ms-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                user.role === 'ADMIN'
                                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                                  : 'bg-dust-100 dark:bg-flora-700 text-soil-700 dark:text-dust-200'
                              }`}
                            >
                              {user.role === 'ADMIN' ? 'مدیر' : 'مشتری'}
                            </span>
                            {!user.isActive && (
                              <span className="rounded-full bg-red-100 dark:bg-red-900/60 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300">
                                غیرفعال
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Group: Orders */}
              {results.orders.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between px-2 text-[11px] font-bold text-soil-700/60 dark:text-dust-200/60">
                    <span>📦 سفارش‌ها ({toFa(results.orders.length)})</span>
                    <Link
                      href="/admin/orders"
                      onClick={() => setOpen(false)}
                      className="text-flora-700 dark:text-flora-300 hover:text-flora-900 dark:hover:text-flora-300 normal-case"
                    >
                      مشاهده همه سفارش‌ها
                    </Link>
                  </div>
                  <ul className="space-y-1">
                    {results.orders.map((order) => (
                      <li key={order.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(`/admin/orders/${order.id}`)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start transition hover:bg-dust-50 dark:hover:bg-flora-950/70 focus:bg-dust-100 dark:focus:bg-flora-950"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-soil-900 dark:text-dust-50 truncate">
                              شماره سفارش:{' '}
                              <span dir="ltr" className="font-mono">
                                <Highlight text={order.orderNumber} query={query} />
                              </span>
                            </p>
                            <p className="text-xs text-soil-700/70 dark:text-dust-200/70 mt-0.5">
                              مشتری: {order.user?.fullName || 'کاربر ناشناس'}
                            </p>
                          </div>
                          <div className="text-end ms-3">
                            <p className="text-xs font-black text-soil-900 dark:text-dust-50">
                              {formatToman(order.totalToman)}
                            </p>
                            <span className="mt-0.5 inline-block text-[10px] text-soil-700/60 dark:text-dust-200/60">
                              {formatDateFa(order.createdAt)}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Group: Products */}
              {results.products.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between px-2 text-[11px] font-bold text-soil-700/60 dark:text-dust-200/60">
                    <span>🪴 محصولات ({toFa(results.products.length)})</span>
                    <Link
                      href="/admin/products"
                      onClick={() => setOpen(false)}
                      className="text-flora-700 dark:text-flora-300 hover:text-flora-900 dark:hover:text-flora-300 normal-case"
                    >
                      مشاهده همه محصولات
                    </Link>
                  </div>
                  <ul className="space-y-1">
                    {results.products.map((prod) => (
                      <li key={prod.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(`/admin/products/${prod.id}`)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start transition hover:bg-dust-50 dark:hover:bg-flora-950/70 focus:bg-dust-100 dark:focus:bg-flora-950"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {prod.images?.[0]?.url ? (
                              <img
                                src={prod.images[0].url}
                                alt={prod.name}
                                className="size-10 rounded-lg object-cover border border-soil-900/10 dark:border-dust-50/10 shrink-0"
                              />
                            ) : (
                              <div className="size-10 rounded-lg bg-dust-100 dark:bg-flora-700 flex items-center justify-center text-base shrink-0">
                                🪴
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-soil-900 dark:text-dust-50 truncate">
                                <Highlight text={prod.name} query={query} />
                              </p>
                              <p className="text-xs text-soil-700/60 dark:text-dust-200/60 font-mono truncate" dir="ltr">
                                {prod.slug}
                              </p>
                            </div>
                          </div>
                          <div className="text-end ms-3">
                            <p className="text-xs font-black text-soil-900 dark:text-dust-50">
                              {formatToman(prod.basePriceToman)}
                            </p>
                            <span className="text-[10px] text-soil-700/60 dark:text-dust-200/60">
                              موجودی: {toFa(prod.stock)} عدد
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-soil-900/10 dark:border-dust-50/10 bg-dust-50/70 dark:bg-flora-950/70 px-4 py-2.5 text-[11px] text-soil-700/60 dark:text-dust-200/60 flex items-center justify-between">
              <span>با کلیدهای جهت‌نما یا ماوس انتخاب کنید</span>
              <span>ESC برای خروج</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
