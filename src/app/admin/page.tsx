import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { formatToman, toFa } from '@/lib/format';
import {
  summarizeChannels,
  summarizeFulfillment,
  type ReportingOrder,
} from '@/lib/analytics';
import { StatusBadge } from '@/features/checkout';
import { LandingImageManager, SalesChart, VisitsChart } from '@/features/admin';

export const revalidate = 300;

const WINDOW_DAYS = 90;

function formatPathLabel(path: string): string {
  if (path === '/') return 'صفحه اصلی';
  if (path === '/products') return 'کاتالوگ محصولات';
  if (path === '/cart') return 'سبد خرید';
  if (path === '/about') return 'درباره ما';
  if (path === '/checkout') return 'تسویه‌حساب';
  if (path.startsWith('/products/')) {
    const slug = path.replace('/products/', '');
    return `محصول: ${slug}`;
  }
  return path;
}

export default async function AdminPage() {
  await requireAdmin();

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

  // Generate 7 trailing days for visitor stats
  const today = new Date();
  const trailingDays: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    const key = d.toISOString().split('T')[0];
    const label = new Intl.DateTimeFormat('fa-IR', {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
    }).format(d);
    trailingDays.push({ key, label, start: d, end });
  }

  const sevenDaysStart = trailingDays[0].start;
  const todayStart = trailingDays[6].start;

  const [
    revenue,
    totalOrderCount,
    paidOrderCount,
    awaitingCount,
    windowOrders,
    lowStock,
    topProducts,
    recentOrders,
    landingImages,
    // Analytics queries
    totalViewsCount,
    todayVisitorsGroups,
    recentPageViews,
    topPagesGroups,
  ] = await Promise.all([
    // Revenue counts verified payments only.
    prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalToman: true },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { paymentStatus: 'PAID' } }),
    prisma.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] } } }),
    prisma.order.findMany({
      where: { createdAt: { gte: windowStart } },
      select: {
        paymentStatus: true,
        status: true,
        channel: true,
        totalToman: true,
        createdAt: true,
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lt: 20 } },
      select: { id: true, name: true, stock: true },
      orderBy: { stock: 'asc' },
      take: 6,
    }),
    // Best sellers are measured on verified orders only, so a failed or
    // abandoned checkout never inflates the ranking.
    prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { order: { paymentStatus: 'PAID' } },
      _sum: { quantity: true, lineTotalToman: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        totalToman: true,
        status: true,
        paymentStatus: true,
        refId: true,
        createdAt: true,
        user: { select: { fullName: true, phone: true } },
      },
    }),
    prisma.landingImage.findMany({
      orderBy: { key: 'asc' },
      select: { key: true, url: true, alt: true },
    }),
    // 1. Total page views
    prisma.pageView.count(),
    // 2. Unique visitors today (distinct ipHash)
    prisma.pageView.groupBy({
      by: ['ipHash'],
      where: { createdAt: { gte: todayStart } },
    }),
    // 3. Views for trailing 7 days
    prisma.pageView.findMany({
      where: { createdAt: { gte: sevenDaysStart } },
      select: { createdAt: true, ipHash: true },
    }),
    // 4. Top 5 pages
    prisma.pageView.groupBy({
      by: ['path'],
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 5,
    }),
  ]);

  const uniqueVisitorsTodayCount = todayVisitorsGroups.length;

  const dailyVisitsPoints = trailingDays.map((td) => {
    const dayViews = recentPageViews.filter(
      (v) => v.createdAt >= td.start && v.createdAt <= td.end,
    );
    const uniqueSet = new Set(dayViews.map((v) => v.ipHash));
    return {
      key: td.key,
      label: td.label,
      viewsCount: dayViews.length,
      uniqueVisitors: uniqueSet.size,
    };
  });

  const topPages = topPagesGroups.map((p) => ({
    path: p.path,
    count: p._count.path,
  }));

  const orders = windowOrders as ReportingOrder[];
  const channels = summarizeChannels(orders);
  const fulfillment = summarizeFulfillment(windowOrders);
  const maxFulfillment = Math.max(...fulfillment.map((f) => f.count), 1);
  const hasAnyOrder = totalOrderCount > 0;

  const stats = [
    {
      k: 'درآمد تأییدشده',
      v: formatToman(revenue._sum.totalToman ?? 0),
      hint: 'فقط سفارش‌های پرداخت‌شده',
    },
    {
      k: 'کل سفارش‌ها',
      v: toFa(totalOrderCount) + ' سفارش',
      hint: 'شامل سفارش‌های ناتمام',
    },
    {
      k: 'پرداخت‌شده',
      v: toFa(paidOrderCount) + ' سفارش',
      hint: 'تأییدشده توسط درگاه',
    },
    {
      k: 'در انتظار اقدام',
      v: toFa(awaitingCount) + ' سفارش',
      hint: 'آماده‌سازی یا ارسال',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">پنل مدیریت</h1>
      <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-200/70">
        مدیریت محصولات، سفارش‌ها و ترافیک فروشگاه
      </p>

      {/* ── Visitor & Traffic Analytics Section ── */}
      <section className="mt-8 rounded-3xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50/70 dark:bg-flora-950/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-soil-900 dark:text-dust-50">آمار و ترافیک بازدیدکنندگان</h2>
            <p className="mt-1 text-xs text-soil-700/60 dark:text-dust-200/60">
              سیستم آمارگیر بومی و مستقل از گوگل آنالیتیکس (با رعایت حریم خصوصی)
            </p>
          </div>
          <span className="rounded-full bg-flora-100 dark:bg-flora-900/80 px-3 py-1 text-xs font-bold text-flora-700 dark:text-flora-300 border border-flora-300 dark:border-flora-700">
            بروزرسانی ۵ دقیقه‌ای
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 flex items-center justify-between shadow-2xs dark:shadow-none">
            <div>
              <p className="text-xs text-soil-700/70 dark:text-dust-200/70 font-medium">کل بازدیدهای سایت (Page Views)</p>
              <p className="mt-2 text-2xl font-black text-soil-900 dark:text-dust-50">{toFa(totalViewsCount)}</p>
              <p className="mt-1 text-[11px] text-soil-700/50 dark:text-dust-200/50">مجموع تمام صفحات دیده شده</p>
            </div>
            <div className="size-12 rounded-xl bg-flora-50 dark:bg-flora-900/60 border border-flora-300/60 dark:border-flora-700/60 flex items-center justify-center text-flora-700 dark:text-flora-300 shrink-0">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>

          <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 flex items-center justify-between shadow-2xs dark:shadow-none">
            <div>
              <p className="text-xs text-soil-700/70 dark:text-dust-200/70 font-medium">کاربران یکتای امروز (Unique Visitors)</p>
              <p className="mt-2 text-2xl font-black text-flora-700 dark:text-flora-300">{toFa(uniqueVisitorsTodayCount)}</p>
              <p className="mt-1 text-[11px] text-soil-700/50 dark:text-dust-200/50">بر اساس آی‌پی هش‌شده روزانه</p>
            </div>
            <div className="size-12 rounded-xl bg-dust-100 dark:bg-flora-900/60 border border-dust-300 dark:border-dust-50/20 flex items-center justify-center text-dust-500 dark:text-dust-300 shrink-0">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <VisitsChart points={dailyVisitsPoints} />
          </div>

          <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-soil-900/10 dark:border-dust-50/10 pb-3">
                <div>
                  <h3 className="text-base font-black text-soil-900 dark:text-dust-50">۵ صفحه پربازدید</h3>
                  <p className="mt-1 text-xs text-soil-700/60 dark:text-dust-200/60">محبوب‌ترین صفحات سایت</p>
                </div>
                <span className="text-xs font-bold text-soil-500 dark:text-dust-200/70">رتبه‌بندی</span>
              </div>

              {topPages.length === 0 ? (
                <p className="mt-6 text-center text-xs text-soil-700/60 dark:text-dust-200/60 py-8">
                  هنوز بازدیدی برای صفحات ثبت نشده است.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {topPages.map((page, idx) => {
                    const maxPageViews = topPages[0]?.count || 1;
                    const pct = Math.max(8, Math.round((page.count / maxPageViews) * 100));
                    return (
                      <div
                        key={page.path}
                        className="group rounded-xl border border-soil-900/5 dark:border-dust-50/10 bg-dust-50/60 dark:bg-flora-950/60 p-3 transition hover:bg-dust-100 dark:hover:bg-flora-900"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-flora-100 dark:bg-flora-900 text-[10px] font-bold text-flora-700 dark:text-flora-300">
                              {toFa(idx + 1)}
                            </span>
                            <div className="min-w-0">
                              <Link
                                href={page.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block font-bold text-xs text-soil-900 dark:text-dust-50 hover:text-flora-700 dark:hover:text-flora-300 truncate"
                              >
                                {formatPathLabel(page.path)}
                              </Link>
                              <span className="block font-mono text-[10px] text-soil-700/50 dark:text-dust-200/50 truncate" dir="ltr">
                                {page.path}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-soil-900 dark:text-dust-50">
                            {toFa(page.count)}{' '}
                            <span className="text-[10px] text-soil-700/60 dark:text-dust-200/60 font-normal">بازدید</span>
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-soil-900/5 dark:bg-dust-50/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-flora-700/70 transition-all duration-300 group-hover:bg-flora-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Financial & Order Metrics ── */}
      <h2 className="mt-10 text-lg font-black text-soil-900 dark:text-dust-50">عملکرد فروش و سفارش‌ها</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
            <dt className="text-xs text-soil-700/70 dark:text-dust-200/70">{s.k}</dt>
            <dd className="mt-2 text-xl font-black text-soil-900 dark:text-dust-50">{s.v}</dd>
            <p className="mt-1 text-[11px] text-soil-700/50 dark:text-dust-200/50">{s.hint}</p>
          </div>
        ))}
      </dl>

      {!hasAnyOrder && (
        <p className="mt-6 rounded-2xl border border-dashed border-soil-900/15 dark:border-dust-50/20 px-6 py-8 text-center text-sm text-soil-700/70 dark:text-dust-200/70">
          هنوز سفارشی ثبت نشده است. آمار با ثبت اولین سفارش نمایش داده می‌شود.
        </p>
      )}

      <div className="mt-8">
        <SalesChart orders={orders} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-6">
          <h2 className="text-base font-black text-soil-900 dark:text-dust-50">فروش بر پایه کانال</h2>
          <p className="mt-1.5 text-xs text-soil-700/60 dark:text-dust-200/60">
            سفارش‌های پرداخت‌شده در {toFa(WINDOW_DAYS)} روز گذشته
          </p>
          <table className="mt-4 w-full text-sm">
            <thead className="text-soil-700/60 dark:text-dust-200/60">
              <tr>
                <th scope="col" className="py-2 text-start font-medium">کانال</th>
                <th scope="col" className="py-2 text-start font-medium">سفارش</th>
                <th scope="col" className="py-2 text-start font-medium">درآمد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soil-900/5 dark:divide-dust-50/10">
              {channels.map((c) => (
                <tr key={c.channel}>
                  <td className="py-3 font-bold text-soil-900 dark:text-dust-50">{c.label}</td>
                  <td className="py-3 text-soil-700/80 dark:text-dust-200/80">{toFa(c.orderCount)}</td>
                  <td className="py-3 font-bold text-flora-900 dark:text-flora-300">
                    {formatToman(c.revenueToman)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-6">
          <h2 className="text-base font-black text-soil-900 dark:text-dust-50">وضعیت انجام سفارش‌ها</h2>
          <p className="mt-1.5 text-xs text-soil-700/60 dark:text-dust-200/60">
            همه سفارش‌های {toFa(WINDOW_DAYS)} روز گذشته
          </p>
          <ul className="mt-4 space-y-3">
            {fulfillment.map((f) => (
              <li key={f.status}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-soil-900 dark:text-dust-50">{f.label}</span>
                  <span className="text-soil-700/70 dark:text-dust-200/70">{toFa(f.count)} سفارش</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded bg-dust-100 dark:bg-flora-950">
                  <div
                    style={{ width: `${(f.count / maxFulfillment) * 100}%` }}
                    className="h-full rounded bg-flora-500"
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-10 rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-6">
        <h2 className="text-base font-black text-soil-900 dark:text-dust-50">تصاویر صفحه اصلی</h2>
        <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-200/70">
          تصویر را از دستگاه خود انتخاب کنید؛ فایل روی سرور ذخیره و در صفحه اصلی
          نمایش داده می‌شود.
        </p>
        <div className="mt-5">
          <LandingImageManager initial={landingImages} />
        </div>
      </section>

      <div className="mt-10 grid gap-6">
        <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-6">
          <h2 className="text-base font-black text-soil-900 dark:text-dust-50">پرفروش‌ترین محصولات</h2>
          <p className="mt-1.5 text-xs text-soil-700/60 dark:text-dust-200/60">
            بر پایه سفارش‌های پرداخت‌شده
          </p>
          <ul className="mt-4 divide-y divide-soil-900/5 dark:divide-dust-50/10">
            {topProducts.map((p) => (
              <li
                key={p.productId ?? p.productName}
                className="flex items-center justify-between py-3 text-sm"
              >
                <span className="text-soil-900 dark:text-dust-50">{p.productName}</span>
                <span className="text-xs text-soil-700/70 dark:text-dust-200/70">
                  {toFa(p._sum.quantity ?? 0)} عدد · {formatToman(p._sum.lineTotalToman ?? 0)}
                </span>
              </li>
            ))}
            {topProducts.length === 0 && (
              <li className="py-4 text-sm text-soil-700/60 dark:text-dust-200/60">
                هنوز خریدی ثبت نشده است.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-6">
          <h2 className="text-base font-black text-soil-900 dark:text-dust-50">هشدار موجودی</h2>
          <ul className="mt-4 divide-y divide-soil-900/5 dark:divide-dust-50/10">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-soil-900 dark:text-dust-50">{p.name}</span>
                <span
                  className={
                    'rounded-full px-2.5 py-0.5 text-[11px] font-bold ' +
                    (p.stock === 0
                      ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300')
                  }
                >
                  {toFa(p.stock)} عدد
                </span>
              </li>
            ))}
            {lowStock.length === 0 && (
              <li className="py-4 text-sm text-soil-700/60 dark:text-dust-200/60">موجودی همه اقلام مناسب است</li>
            )}
          </ul>
        </section>
      </div>

      <section className="mt-10 overflow-hidden rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900">
        <h2 className="border-b border-soil-900/5 dark:border-dust-50/10 px-6 py-4 text-base font-black text-soil-900 dark:text-dust-50">
          آخرین سفارش‌ها
        </h2>
        {recentOrders.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-soil-700/70 dark:text-dust-200/70">
            هنوز سفارشی ثبت نشده است.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dust-50 dark:bg-flora-950 text-soil-700/70 dark:text-dust-200/70">
                <tr>
                  <th className="px-5 py-3 text-start font-medium">شماره</th>
                  <th className="px-5 py-3 text-start font-medium">مشتری</th>
                  <th className="px-5 py-3 text-start font-medium">مبلغ</th>
                  <th className="px-5 py-3 text-start font-medium">وضعیت پرداخت</th>
                  <th className="px-5 py-3 text-start font-medium">وضعیت سفارش</th>
                  <th className="px-5 py-3 text-start font-medium">کد پیگیری</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soil-900/5 dark:divide-dust-50/10">
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-3.5 font-mono text-xs">
                      <Link
                        href={'/admin/orders/' + o.id}
                        className="font-bold text-flora-700 dark:text-flora-300 hover:text-flora-900 dark:hover:text-flora-300"
                      >
                        {toFa(o.orderNumber)}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-soil-900 dark:text-dust-50">
                      {o.user.fullName ?? toFa(o.user.phone ?? '—')}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-soil-900 dark:text-dust-50">{formatToman(o.totalToman)}</td>
                    <td className="px-5 py-3.5 text-xs">
                      <StatusBadge kind="payment" value={o.paymentStatus} />
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <StatusBadge kind="order" value={o.status} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-soil-700 dark:text-dust-300" dir="ltr">
                      {o.refId ? toFa(o.refId) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
