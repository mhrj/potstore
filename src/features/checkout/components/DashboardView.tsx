import Link from 'next/link';
import { formatToman, formatDateFa, toFa } from '@/lib/format';
import Container from '@/components/ui/Container';
import StatusBadge from '@/features/checkout/components/StatusBadge';
import AddressBook from '@/features/checkout/components/AddressBook';
import ReorderButton from '@/features/checkout/components/ReorderButton';
import LogoutButton from '@/features/auth/components/LogoutButton';
import { formatCarrierName } from '@/lib/orders';
import ShippingScheduleNotice from '@/features/checkout/components/ShippingScheduleNotice';
import { groupOrderItemsByProduct, type OrderItemDetailsItem } from '@/features/checkout/components/OrderItemDetails';

type DashboardOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  totalToman: number;
  shippingCarrier: string | null;
  refId: string | null;
  trackingCode: string | null;
  items: OrderItemDetailsItem[];
};

import type { AddressRecord } from '@/features/checkout/components/AddressForm';

type DashboardViewProps = {
  user: {
    id: string;
    fullName: string | null;
  };
  orders: DashboardOrder[];
  addresses: AddressRecord[];
};

export default function DashboardView({ user, orders, addresses }: DashboardViewProps) {
  return (
    <Container className="py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">
            سلام{user.fullName ? `، ${user.fullName}` : ''} 👋
          </h1>
          <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-200/70">سفارش‌ها و آدرس‌های شما</p>
        </div>
        <LogoutButton />
      </header>

      <div className="mt-6">
        <ShippingScheduleNotice />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-black text-soil-900 dark:text-dust-50">سفارش‌های من</h2>

        {orders.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-soil-900/15 dark:border-dust-50/20 px-6 py-10 text-center">
            <p className="text-sm font-medium text-soil-700/80 dark:text-dust-200/80">
              شما هنوز سفارشی ثبت نکرده‌اید. اولین گلدان خود را انتخاب کنید تا اینجا نمایش داده شود.
            </p>
            <Link
              href="/products"
              className="mt-4 inline-block rounded-full bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-5 py-2 text-xs font-bold transition-colors hover:bg-flora-700"
            >
              مشاهده محصولات
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {orders.map((order) => {
              const groupedProducts = groupOrderItemsByProduct(order.items);
              const firstProduct = groupedProducts[0];
              const otherProductsCount = Math.max(0, groupedProducts.length - 1);
              const totalPieces = order.items.reduce((sum, it) => sum + it.quantity, 0);

              return (
                <li key={order.id}>
                  <Link
                    href={"/dashboard/orders/" + order.id}
                    className="group block rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 transition hover:border-soil-900/25 dark:hover:border-dust-50/25 hover:shadow-md dark:hover:shadow-none"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soil-900/5 dark:border-dust-50/10 pb-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-bold text-soil-900 dark:text-dust-50">
                          {toFa(order.orderNumber)}
                        </span>
                        <StatusBadge kind="order" value={order.status} />
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
                                className="relative z-10 flex w-12 h-12 items-center justify-center rounded-full border-2 border-white dark:border-flora-900 bg-dust-100 dark:bg-flora-700 text-soil-700/50 dark:text-dust-200/50 text-xs"
                              >
                                🏺
                              </div>
                            )
                          )}
                          {groupedProducts.length > 3 && (
                            <div className="relative z-10 flex w-12 h-12 items-center justify-center rounded-full border-2 border-white dark:border-flora-900 bg-dust-200 dark:bg-flora-700 text-xs font-bold text-soil-800 dark:text-dust-100">
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
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-soil-900/5 dark:border-dust-50/10 pt-4 text-xs text-soil-700/80 dark:text-dust-200/80">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                        <span>
                          مبلغ: <b className="text-soil-900 dark:text-dust-50">{formatToman(order.totalToman)}</b>
                        </span>
                        <span>
                          تعداد اقلام: <b className="text-soil-900 dark:text-dust-50">{toFa(totalPieces)} عدد</b>
                        </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-dust-100 dark:bg-flora-900/80 px-2.5 py-1 text-xs text-soil-700 dark:text-dust-200 border border-transparent dark:border-dust-50/10">
                        <span>🚚</span>
                        <span>ارسال با {formatCarrierName(order.shippingCarrier)}</span>
                      </span>
                      {order.refId && (
                        <span dir="ltr" className="inline-flex items-center gap-1 rounded-full bg-dust-100 dark:bg-flora-900 px-2.5 py-1 text-xs text-soil-700 dark:text-flora-300">
                          <span>کد پیگیری:</span>
                          <b className="font-mono font-bold text-flora-700 dark:text-flora-300">{toFa(order.refId)}</b>
                        </span>
                      )}
                      {order.trackingCode && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-dust-100 dark:bg-flora-900 px-2.5 py-1 text-xs text-soil-700 dark:text-dust-200">
                          <span>مرسوله:</span>
                          <b className="text-soil-900 dark:text-dust-50">{toFa(order.trackingCode)}</b>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-dust-100 text-soil-900 dark:bg-flora-900 dark:text-dust-200 dark:hover:bg-flora-950 px-4 py-2 text-[11px] font-bold transition-colors">
                        جزئیات سفارش
                      </span>
                      <ReorderButton orderId={order.id} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-black text-soil-900 dark:text-dust-50">آدرس‌های ذخیره‌شده</h2>
        <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-200/70">
          آدرس پیش‌فرض هنگام تسویه‌حساب به‌صورت خودکار انتخاب می‌شود.
        </p>
        <div className="mt-5">
          <AddressBook initial={addresses} />
        </div>
      </section>
    </Container>
  );
}
