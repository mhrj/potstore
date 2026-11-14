import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { formatToman, formatDateFa, toFa } from '@/lib/format';
import { OrderStatusBadge, UserManagementActions } from '@/features/admin';
import { StatusBadge, groupOrderItems } from '@/features/checkout';
import { formatCarrierName } from '@/lib/orders';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        addresses: {
          orderBy: { isDefault: 'desc' },
          select: {
            id: true,
            label: true,
            fullName: true,
            phone: true,
            province: true,
            city: true,
            line1: true,
            line2: true,
            postalCode: true,
            isDefault: true,
          },
        },
      },
    }),
    prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        totalToman: true,
        shippingCarrier: true,
        refId: true,
        trackingCode: true,
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            imageUrl: true,
            quantity: true,
            unitToman: true,
            lineTotalToman: true,
            variantTitle: true,
            colorData: true,
            isBundle: true,
            bundleSize: true,
          },
        },
        _count: { select: { items: true } },
      },
    }),
  ]);

  if (!user) notFound();

  const totalSpent = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.totalToman, 0);

  const totalOrders = orders.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-soil-700/60 dark:text-dust-200/60 mb-1">
            <Link href="/admin/users" className="hover:text-soil-900 dark:hover:text-dust-50">
              کاربران
            </Link>
            <span>/</span>
            <span>جزئیات کاربر</span>
          </div>
          <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">
            {user.fullName || 'کاربر بدون نام'}
          </h1>
          <p className="mt-1 text-xs text-soil-700/60 dark:text-dust-200/60">
            شناسه کاربر:{' '}
            <span className="font-mono" dir="ltr">
              {user.id}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              user.role === 'ADMIN'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-dust-100 text-soil-700 dark:bg-flora-900 dark:text-dust-200'
            }`}
          >
            {user.role === 'ADMIN' ? 'مدیر سیستم' : 'مشتری'}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              user.isActive
                ? 'bg-flora-100 text-flora-700 dark:bg-flora-900/60 dark:text-flora-300'
                : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
            }`}
          >
            {user.isActive ? 'حساب فعال' : 'حساب غیرفعال'}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-soil-900/10 dark:border-dust-50/10 pb-3">
            <h2 className="text-sm font-black text-soil-900 dark:text-dust-50">مشخصات کاربر</h2>
            <span className="text-xs text-soil-700/50 dark:text-dust-200/50">
              عضویت: {formatDateFa(user.createdAt)}
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-soil-700/60 dark:text-dust-200/60">نام و نام‌خانوادگی</dt>
              <dd className="mt-1 font-bold text-soil-900 dark:text-dust-50">{user.fullName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-soil-700/60 dark:text-dust-200/60">شماره تلفن همراه</dt>
              <dd className="mt-1 font-mono text-xs font-bold text-soil-900 dark:text-dust-50" dir="ltr">
                {user.phone ? toFa(user.phone) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-soil-700/60 dark:text-dust-200/60">آدرس ایمیل</dt>
              <dd className="mt-1 font-mono text-xs text-soil-900 dark:text-dust-50" dir="ltr">
                {user.email || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-soil-700/60 dark:text-dust-200/60">آخرین ورود به حساب</dt>
              <dd className="mt-1 text-xs text-soil-900 dark:text-dust-50">
                {user.lastLoginAt ? formatDateFa(user.lastLoginAt) : 'نامشخص'}
              </dd>
            </div>
          </dl>

          {/* User management actions: Promote / Demote, Deactivate / Activate */}
          <div className="border-t border-soil-900/10 dark:border-dust-50/10 pt-4">
            <p className="mb-2 text-xs font-bold text-soil-700/80 dark:text-dust-200/80">عملیات حساب کاربری</p>
            <UserManagementActions
              userId={user.id}
              currentRole={user.role}
              currentIsActive={user.isActive}
            />
          </div>
        </div>

        {/* Financial / Purchasing Summary */}
        <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 space-y-4">
          <h2 className="border-b border-soil-900/10 dark:border-dust-50/10 pb-3 text-sm font-black text-soil-900 dark:text-dust-50">
            خلاصه فعالیت خرید
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-soil-700/60 dark:text-dust-200/60">کل سفارش‌ها</p>
              <p className="text-xl font-black text-soil-900 dark:text-dust-50">{toFa(totalOrders)} سفارش</p>
            </div>
            <div>
              <p className="text-xs text-soil-700/60 dark:text-dust-200/60">مجموع خرید موفق</p>
              <p className="text-xl font-black text-flora-700 dark:text-flora-300">{formatToman(totalSpent)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Addresses (if any) */}
      {user.addresses.length > 0 && (
        <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
          <h2 className="mb-3 text-sm font-black text-soil-900 dark:text-dust-50">
            آدرس‌های ثبت‌شده ({toFa(user.addresses.length)})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {user.addresses.map((addr) => (
              <div
                key={addr.id}
                className="rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50/50 dark:bg-flora-950/60 p-3.5 text-xs text-soil-800 dark:text-dust-200"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-soil-900 dark:text-dust-50">{addr.fullName}</span>
                  {addr.isDefault && (
                    <span className="rounded-full bg-flora-100 dark:bg-flora-900/60 px-2 py-0.5 text-[10px] font-bold text-flora-700 dark:text-flora-300">
                      پیش‌فرض
                    </span>
                  )}
                </div>
                <p className="text-soil-700/80 dark:text-dust-200/80 leading-5">
                  {addr.province}، {addr.city}، {addr.line1}
                  {addr.line2 ? `، ${addr.line2}` : ''}
                </p>
                <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-soil-700/60 dark:text-dust-200/60" dir="ltr">
                  <span>کدپستی: {toFa(addr.postalCode)}</span>
                  <span>تلفن: {toFa(addr.phone)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders List */}
      <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900">
        <div className="flex items-center justify-between border-b border-soil-900/10 dark:border-dust-50/10 px-5 py-4">
          <h2 className="text-sm font-black text-soil-900 dark:text-dust-50">
            سفارش‌های کاربر ({toFa(orders.length)})
          </h2>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-soil-700/60 dark:text-dust-200/60">
            هنوز سفارشی توسط این کاربر ثبت نشده است.
          </div>
        ) : (
          <div className="p-5">
            <ul className="space-y-4">
              {orders.map((order) => {
                const groupedProducts = groupOrderItems(order.items);
                const firstProduct = groupedProducts[0];
                const otherProductsCount = Math.max(0, groupedProducts.length - 1);

                return (
                  <li key={order.id}>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="group block rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50/50 dark:bg-flora-950/60 p-5 transition hover:border-soil-900/25 dark:hover:border-dust-50/20 hover:bg-white dark:hover:bg-flora-900 hover:shadow-md dark:hover:shadow-none"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soil-900/5 dark:border-dust-50/5 pb-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-sm font-bold text-soil-900 dark:text-dust-50">
                            {toFa(order.orderNumber)}
                          </span>
                          <OrderStatusBadge status={order.status} />
                          <StatusBadge kind="payment" value={order.paymentStatus} />
                        </div>
                        <span className="text-xs text-soil-700/60 dark:text-dust-200/60">
                          {formatDateFa(order.createdAt)}
                        </span>
                      </div>

                      {/* Item Thumbnails and Names Summary */}
                      <div className="flex flex-wrap items-center gap-4 py-4">
                        {groupedProducts.length > 0 && (
                          <div className="flex -space-x-3 rtl:space-x-reverse shrink-0">
                            {groupedProducts.slice(0, 3).map((grp, idx) =>
                              grp.imageUrl ? (
                                <img
                                  key={grp.productId || idx}
                                  src={grp.imageUrl}
                                  alt={grp.name}
                                  className="relative z-10 w-12 h-12 rounded-full border-2 border-white dark:border-flora-900 object-cover"
                                />
                              ) : (
                                <div
                                  key={grp.productId || idx}
                                  className="relative z-10 flex w-12 h-12 items-center justify-center rounded-full border-2 border-white dark:border-flora-900 bg-dust-100 dark:bg-flora-900 text-soil-700/50 dark:text-dust-200/50 text-xs"
                                >
                                  🏺
                                </div>
                              )
                            )}
                            {groupedProducts.length > 3 && (
                              <div className="relative z-10 flex w-12 h-12 items-center justify-center rounded-full border-2 border-white dark:border-flora-900 bg-dust-200 dark:bg-flora-900 text-xs font-bold text-soil-800 dark:text-dust-100">
                                +{toFa(groupedProducts.length - 3)}
                              </div>
                            )}
                          </div>
                        )}

                        {firstProduct && (
                          <div className="text-xs text-soil-800 dark:text-dust-100">
                            <span className="font-bold">{firstProduct.name}</span>
                            {firstProduct.breakdownSummary && (
                              <span className="text-soil-700/70 dark:text-dust-200/70">
                                {' '}({firstProduct.breakdownSummary})
                              </span>
                            )}
                            {otherProductsCount > 0 && (
                              <span className="text-soil-700/70 dark:text-dust-200/70">
                                {' '}و {toFa(otherProductsCount)} محصول دیگر
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                    {/* Metadata and Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-soil-900/5 dark:border-dust-50/5 pt-4 text-xs text-soil-700/80 dark:text-dust-200/80">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                        <span>
                          مبلغ: <b className="text-soil-900 dark:text-dust-50">{formatToman(order.totalToman)}</b>
                        </span>
                        <span>
                          تعداد اقلام: <b className="text-soil-900 dark:text-dust-50">{toFa(order._count.items)}</b>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-dust-100 dark:bg-flora-900 px-2.5 py-1 text-xs text-soil-700 dark:text-dust-200">
                          <span>🚚</span>
                          <span>ارسال با {formatCarrierName(order.shippingCarrier)}</span>
                        </span>
                        {order.refId && (
                          <span dir="ltr">
                            کد پیگیری: <b className="font-mono text-flora-700 dark:text-flora-300">{toFa(order.refId)}</b>
                          </span>
                        )}
                        {order.trackingCode && (
                          <span>
                            مرسوله: <b className="text-soil-900 dark:text-dust-50">{toFa(order.trackingCode)}</b>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-flora-50 dark:bg-flora-900 px-4 py-2 text-[11px] font-bold text-flora-700 dark:text-flora-300 transition-colors group-hover:bg-flora-100 dark:group-hover:bg-flora-950">
                          مشاهده سفارش ←
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
