import Link from 'next/link';
import { formatToman, formatDateFa, toFa } from '@/lib/format';
import Container from '@/components/ui/Container';
import StatusBadge from '@/features/checkout/components/StatusBadge';
import { allowedTransitions, ORDER_STATUS_LABELS, isOrderStatus, TIMELINE, formatCarrierName, getNextShippingDate } from '@/lib/orders';
import { channelLabel } from '@/lib/analytics';
import CancelOrderButton from '@/features/checkout/components/CancelOrderButton';
import ItemColorBadge from '@/features/catalog/components/ItemColorBadge';
import PrintInvoiceButton from '@/features/checkout/components/PrintInvoiceButton';
import BundleDetailsAccordion from '@/features/checkout/components/BundleDetailsAccordion';
import ShippingScheduleNotice from '@/features/checkout/components/ShippingScheduleNotice';
import OrderItemDetails, { GroupedOrderItems } from '@/features/checkout/components/OrderItemDetails';

type OrderItem = {
  id: string;
  productSlug: string;
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  material: string | null;
  diameterCm: number | null;
  heightCm: number | null;
  bundleSize: number | null;
  colorData: unknown;
  quantity: number;
  unitToman: number;
  lineTotalToman: number;
  tierLabel: string | null;
  product?: {
    bundleItems: unknown;
  } | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  paidAt: Date | null;
  shippingCarrier: string | null;
  trackingCode: string | null;
  note: string | null;
  subtotalToman: number;
  discountToman: number;
  shippingToman: number;
  totalToman: number;
  channel: string;
  refId: string | null;
  shipFullName: string | null;
  shipPhone: string | null;
  shipProvince: string;
  shipCity: string;
  shipLine1: string;
  shipLine2: string | null;
  shipPostalCode: string;
  items: OrderItem[];
  user: {
    fullName: string | null;
    phone: string | null;
    email: string | null;
  };
};

function renderItemSpecs(item: {
  material?: string | null;
  diameterCm?: number | null;
  heightCm?: number | null;
}) {
  const parts: string[] = [];
  if (item.material) parts.push(`جنس: ${item.material}`);
  if (item.diameterCm && item.heightCm) {
    parts.push(`ابعاد: قطر ${toFa(item.diameterCm)} × ارتفاع ${toFa(item.heightCm)} سانتیمتر`);
  } else if (item.diameterCm) {
    parts.push(`قطر ${toFa(item.diameterCm)} سانتیمتر`);
  } else if (item.heightCm) {
    parts.push(`ارتفاع ${toFa(item.heightCm)} سانتیمتر`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export default function OrderDetailView({ order }: { order: OrderDetail }) {
  const status = isOrderStatus(order.status) ? order.status : 'PENDING';
  const isCanceled = status === 'CANCELED';
  const currentIndex = (TIMELINE as readonly string[]).indexOf(status);
  const canCancel = allowedTransitions(status).includes('CANCELED');

  return (
    <Container className="py-12 print:max-w-full print:p-0 print:m-0 print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <nav className="text-xs text-soil-700/60 dark:text-dust-200/60">
          <Link href="/dashboard" className="hover:text-flora-700 dark:hover:text-flora-300">
            حساب من
          </Link>
          <span className="mx-2">/</span>
          <span>سفارش {toFa(order.orderNumber)}</span>
        </nav>
        <PrintInvoiceButton />
      </div>

      <header className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-soil-900/10 pb-5 dark:border-dust-50/10 print:mt-1 print:pb-2 print:gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-soil-700/70 dark:text-dust-200/70 print:text-[11px]">شماره سفارش:</span>
            <h1 className="font-mono text-2xl font-black text-soil-900 dark:text-dust-50 print:text-lg">
              {toFa(order.orderNumber)}
            </h1>
          </div>
          <p className="mt-1 text-xs text-soil-700/70 dark:text-dust-200/70 print:text-[10px]">
            تاریخ ثبت: {formatDateFa(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="order" value={order.status} />
          <StatusBadge kind="payment" value={order.paymentStatus} />
        </div>
      </header>

      {isCanceled ? (
        <p className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-bold text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 print:hidden">
          این سفارش لغو شده است.
        </p>
      ) : (
        <div className="mt-8 print:hidden">
          {status === 'PENDING' && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200 print:hidden">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              در انتظار پرداخت — پس از نهایی‌سازی پرداخت، سفارش شما وارد فرآیند آماده‌سازی می‌شود.
            </div>
          )}
          <ol className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {TIMELINE.map((step, index) => {
              const isCurrent = index === currentIndex;
              const isDone = currentIndex >= 0 && index < currentIndex;

              return (
                <li
                  key={step}
                  className={
                    'rounded-2xl border p-4 text-xs font-bold transition ' +
                    (isCurrent
                      ? 'border-flora-500 bg-flora-50 text-flora-950 shadow-xs ring-2 ring-flora-500/25 dark:border-flora-300 dark:bg-flora-700 dark:text-dust-50 dark:ring-flora-300/40'
                      : isDone
                        ? 'border-flora-300 bg-flora-100/70 text-flora-700 dark:border-flora-700/60 dark:bg-flora-900/80 dark:text-flora-300'
                        : 'border-soil-900/10 bg-white text-soil-700/40 dark:border-dust-50/10 dark:bg-flora-900/50 dark:text-dust-400')
                  }
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] opacity-75">
                      {isDone ? '✓ ' : ''}مرحله {toFa(index + 1)}:
                    </span>
                    <span className="text-sm font-black">{ORDER_STATUS_LABELS[step]}</span>
                    {isCurrent && (
                      <span className="mt-1 inline-block text-[10px] font-medium text-flora-700 dark:text-flora-300">
                        (کنونی)
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 print:hidden">
            <ShippingScheduleNotice compact={true} />
          </div>
        </div>
      )}

      {order.trackingCode && (
        <p className="mt-4 text-sm text-soil-700/80 dark:text-dust-200/80">
          کد رهگیری {formatCarrierName(order.shippingCarrier)}:{' '}
          <b className="font-mono text-soil-900 dark:text-dust-50" dir="ltr">
            {toFa(order.trackingCode)}
          </b>
        </p>
      )}

      {order.note && (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-200 mb-1">
            <svg className="size-4 shrink-0 text-amber-700 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span>یادداشت مشتری:</span>
          </div>
          <p className="leading-6 text-amber-900/90 whitespace-pre-wrap dark:text-amber-200/90">{order.note}</p>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr] print:mt-2 print:grid-cols-1">
        <section className="rounded-2xl border border-soil-900/10 bg-white p-6 dark:border-dust-50/10 dark:bg-flora-900 print:p-2 print:shadow-none print:border print:border-soil-900/10">
          <h2 className="text-sm font-black text-soil-900 dark:text-dust-50 print:text-xs">اقلام سفارش</h2>
          <div className="mt-4 print:mt-1">
            <GroupedOrderItems items={order.items} />
          </div>

          <dl className="mt-5 space-y-2 border-t border-soil-900/10 dark:border-dust-50/10 pt-4 text-sm print:mt-2 print:pt-2 print:space-y-1 print:text-[10px]">
            <div className="flex justify-between">
              <dt className="text-soil-700/70 dark:text-dust-200/70">جمع کالاها</dt>
              <dd className="text-soil-900 dark:text-dust-50">{formatToman(order.subtotalToman)}</dd>
            </div>
            {order.discountToman > 0 && (
              <div className="flex justify-between">
                <dt className="text-soil-700/70 dark:text-dust-200/70">تخفیف</dt>
                <dd className="text-flora-700 dark:text-flora-300">−{formatToman(order.discountToman)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-soil-700/70 dark:text-dust-200/70">هزینه ارسال</dt>
              <dd className="text-soil-900 dark:text-dust-50">
                {order.shippingToman === 0 ? 'رایگان' : formatToman(order.shippingToman)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-soil-900/10 dark:border-dust-50/10 pt-3 text-base print:pt-1.5 print:text-xs">
              <dt className="font-black text-soil-900 dark:text-dust-50">مبلغ پرداختی</dt>
              <dd className="font-black text-soil-900 dark:text-dust-50">{formatToman(order.totalToman)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6 print:space-y-0 print:grid print:grid-cols-2 print:gap-2 print:mt-2">
          <section className="rounded-2xl border border-soil-900/10 bg-white p-6 space-y-3 dark:border-dust-50/10 dark:bg-flora-900 print:p-2 print:space-y-1 print:shadow-none print:border print:border-soil-900/10 print:text-[10px]">
            <h2 className="text-sm font-black text-soil-900 dark:text-dust-50 border-b border-soil-900/5 dark:border-dust-50/10 pb-2 print:text-xs print:pb-1">
              اطلاعات تحویل و خریدار
            </h2>
            <dl className="space-y-2.5 text-sm print:space-y-1 print:text-[10px]">
              <div className="flex justify-between gap-3">
                <dt className="text-soil-700/70 dark:text-dust-200/70">نام گیرنده:</dt>
                <dd className="font-bold text-soil-900 dark:text-dust-50">
                  {order.shipFullName || order.user.fullName || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-soil-700/70 dark:text-dust-200/70">شماره موبایل:</dt>
                <dd className="font-mono text-xs text-soil-900 dark:text-dust-50 font-bold print:text-[10px]" dir="ltr">
                  {toFa(order.shipPhone || order.user.phone || '—')}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-soil-700/70 dark:text-dust-200/70">ایمیل:</dt>
                <dd className="font-mono text-xs text-soil-900 dark:text-dust-50 print:text-[10px]" dir="ltr">
                  {order.user.email || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-soil-700/70 dark:text-dust-200/70">شرکت حمل و نقل:</dt>
                <dd className="font-bold text-soil-900 dark:text-dust-50">
                  {formatCarrierName(order.shippingCarrier)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-soil-700/70 dark:text-dust-200/70">تاریخ تقریبی تحویل به پست:</dt>
                <dd className="font-bold text-soil-900 dark:text-dust-50">
                  {formatDateFa(getNextShippingDate(order.createdAt))}
                </dd>
              </div>
              <div className="pt-2 border-t border-soil-900/5 dark:border-dust-50/10 print:pt-1">
                <dt className="text-soil-700/70 dark:text-dust-200/70 mb-1 print:mb-0.5">نشانی پستی:</dt>
                <dd className="text-xs leading-6 text-soil-800 dark:text-dust-200 font-medium print:text-[10px] print:leading-4">
                  {order.shipProvince}، {order.shipCity}، {order.shipLine1}
                  {order.shipLine2 ? `، ${order.shipLine2}` : ''}
                  <div className="mt-1 font-mono text-soil-700/70 dark:text-dust-200/70 print:mt-0.5 print:text-[10px]" dir="ltr">
                    کد پستی: {toFa(order.shipPostalCode)}
                  </div>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-soil-900/10 bg-white p-6 dark:border-dust-50/10 dark:bg-flora-900 print:p-2 print:shadow-none print:border print:border-soil-900/10 print:text-[10px]">
            <h2 className="text-sm font-black text-soil-900 dark:text-dust-50 border-b border-soil-900/5 dark:border-dust-50/10 pb-2 print:text-xs print:pb-1">
              اطلاعات پرداخت
            </h2>
            <dl className="mt-3 space-y-2 text-sm print:mt-1 print:space-y-1 print:text-[10px]">
              <div className="flex justify-between gap-3">
                <dt className="text-soil-700/70 dark:text-dust-200/70">کانال خرید</dt>
                <dd className="font-bold text-soil-900 dark:text-dust-50">{channelLabel(order.channel)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-soil-700/70 dark:text-dust-200/70">کد پیگیری</dt>
                <dd className="font-mono text-xs text-soil-900 dark:text-dust-50 print:text-[10px]" dir="ltr">
                  {order.refId ? toFa(order.refId) : '—'}
                </dd>
              </div>
              {order.paidAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-soil-700/70 dark:text-dust-200/70">زمان پرداخت</dt>
                  <dd className="text-xs text-soil-900 dark:text-dust-50 print:text-[10px]">{formatDateFa(order.paidAt)}</dd>
                </div>
              )}
            </dl>
          </section>

          <div className="flex flex-wrap gap-3 print:hidden">
            <form action="/api/cart/reorder" method="post">
              <input type="hidden" name="orderId" value={order.id} />
              <button className="rounded-full bg-flora-900 px-5 py-2.5 text-xs font-black text-white hover:bg-flora-700 dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 transition-colors cursor-pointer">
                سفارش مجدد
              </button>
            </form>

            {canCancel && order.status === 'PENDING' && (
              <CancelOrderButton orderId={order.id} />
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
