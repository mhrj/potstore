import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { formatToman, formatDateFa, toFa } from '@/lib/format';
import OrderStatusBadge from '@/features/admin/components/OrderStatusBadge';
import OrderStatusForm from '@/features/admin/components/OrderStatusForm';
import StatusBadge from '@/features/checkout/components/StatusBadge';
import ItemColorBadge from '@/features/catalog/components/ItemColorBadge';
import PrintInvoiceButton from '@/features/checkout/components/PrintInvoiceButton';
import BundleDetailsAccordion from '@/features/checkout/components/BundleDetailsAccordion';
import OrderItemDetails, { GroupedOrderItems } from '@/features/checkout/components/OrderItemDetails';
import { isOrderStatus, ORDER_STATUS_LABELS, TIMELINE, formatCarrierName, getNextShippingDate } from '@/lib/orders';

type Props = { params: Promise<{ id: string }> };

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

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      trackingCode: true,
      shippingCarrier: true,
      note: true,
      subtotalToman: true,
      discountToman: true,
      shippingToman: true,
      totalToman: true,
      channel: true,
      refId: true,
      paidAt: true,
      cardPan: true,
      shipFullName: true,
      shipPhone: true,
      shipProvince: true,
      shipCity: true,
      shipLine1: true,
      shipLine2: true,
      shipPostalCode: true,
      user: { select: { fullName: true, phone: true, email: true } },
      items: {
        select: {
          id: true,
          productId: true,
          productSlug: true,
          productName: true,
          sku: true,
          imageUrl: true,
          material: true,
          diameterCm: true,
          heightCm: true,
          variantId: true,
          variantTitle: true,
          isBundle: true,
          bundleSize: true,
          colorData: true,
          quantity: true,
          unitToman: true,
          lineTotalToman: true,
          tierLabel: true,
          product: {
            select: {
              bundleItems: true,
            },
          },
        },
      },
    },
  });
  if (!order) notFound();

  const status = isOrderStatus(order.status) ? order.status : 'PENDING';
  const isCanceled = status === 'CANCELED';
  const currentIndex = (TIMELINE as readonly string[]).indexOf(status);

  return (
    <div className="space-y-6 print:space-y-2 print:max-w-full print:p-0 print:m-0 invoice-container">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soil-900/10 dark:border-dust-50/10 pb-5 print:pb-2 print:gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-soil-700/70 dark:text-dust-200/70 print:text-[11px]">سفارش شماره:</span>
            <h1 className="font-mono text-2xl font-black text-soil-900 dark:text-dust-50 print:text-lg">
              {toFa(order.orderNumber)}
            </h1>
          </div>
          <p className="mt-1 text-xs text-soil-700/70 dark:text-dust-200/70 print:text-[10px]">
            تاریخ ثبت: {formatDateFa(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PrintInvoiceButton />
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {isCanceled ? (
        <p className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 p-4 text-sm font-bold text-red-700 dark:text-red-300 print:mt-1 print:p-1.5 print:text-xs">
          این سفارش لغو شده است.
        </p>
      ) : (
        <ol className="grid gap-3 grid-cols-2 sm:grid-cols-4 print:hidden">
          {TIMELINE.map((step, index) => {
            const isCurrent = index === currentIndex;
            const isDone = currentIndex >= 0 && index < currentIndex;

            return (
              <li
                key={step}
                className={
                  'rounded-2xl border p-3.5 text-xs font-bold transition ' +
                  (isCurrent
                    ? 'border-flora-500 dark:border-flora-300 bg-flora-50 dark:bg-flora-700 text-flora-950 dark:text-dust-50 ring-2 ring-flora-500/20 dark:ring-flora-300/40'
                    : isDone
                      ? 'border-flora-300 dark:border-flora-700/60 bg-flora-100/70 dark:bg-flora-900/80 text-flora-700 dark:text-flora-300'
                      : 'border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900/50 text-soil-700/40 dark:text-dust-400') +
                  ' print:border-none print:bg-transparent print:p-0 print:shadow-none print:ring-0 print:text-[10px]'
                }
              >
                <div className="flex items-center justify-between mb-1 print:mb-0 print:inline-flex print:gap-1">
                  <span className="text-[10px] print:text-[9px] opacity-75">
                    {isDone ? '✓ ' : ''}مرحله {toFa(index + 1)}:
                  </span>
                  <span className="text-xs font-black print:text-[10px]">{ORDER_STATUS_LABELS[step]}</span>
                  {isCurrent && (
                    <span className="mt-0.5 inline-block text-[10px] print:text-[9px] font-medium text-flora-700 dark:text-flora-300 print:mt-0">
                      (کنونی)
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {order.note && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-950 dark:text-amber-100 print:p-2 print:text-xs">
          <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-200 mb-1">
            <svg className="size-4 shrink-0 text-amber-700 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span>یادداشت مشتری:</span>
          </div>
          <p className="leading-6 text-amber-900/90 dark:text-amber-100/90 whitespace-pre-wrap">{order.note}</p>
        </div>
      )}

      {order.trackingCode && (
        <p className="text-sm text-soil-700/80 dark:text-dust-200/80">
          کد رهگیری {formatCarrierName(order.shippingCarrier)}:{' '}
          <b className="font-mono text-soil-900 dark:text-dust-50" dir="ltr">
            {toFa(order.trackingCode)}
          </b>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2 print:grid print:grid-cols-3 print:gap-2 print:mt-2">
        <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 print:p-2 print:shadow-none print:border print:border-soil-900/10 print:text-[10px]">
          <h2 className="text-sm font-black text-soil-900 dark:text-dust-50 border-b border-soil-900/5 dark:border-dust-50/10 pb-2 print:text-xs print:pb-1">
            اطلاعات مشتری
          </h2>
          <dl className="mt-3 space-y-2 text-sm print:mt-1 print:space-y-1 print:text-[10px]">
            <div className="flex justify-between gap-3">
              <dt className="text-soil-700/70 dark:text-dust-200/70">نام</dt>
              <dd className="font-bold text-soil-900 dark:text-dust-50">{order.user.fullName ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-soil-700/70 dark:text-dust-200/70">موبایل</dt>
              <dd className="font-mono text-xs text-soil-900 dark:text-dust-50 font-bold print:text-[10px]" dir="ltr">
                {toFa(order.user.phone ?? order.shipPhone ?? '—')}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-soil-700/70 dark:text-dust-200/70">ایمیل</dt>
              <dd className="font-mono text-xs text-soil-900 dark:text-dust-50 print:text-[10px]" dir="ltr">
                {order.user.email ?? '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 print:p-2 print:shadow-none print:border print:border-soil-900/10 print:text-[10px]">
          <h2 className="text-sm font-black text-soil-900 dark:text-dust-50 border-b border-soil-900/5 dark:border-dust-50/10 pb-2 print:text-xs print:pb-1">
            آدرس ارسال
          </h2>
          <p className="mt-3 text-sm leading-7 text-soil-700/85 dark:text-dust-200/85 print:mt-1 print:text-[10px] print:leading-4">
            {order.shipFullName}<br />
            {order.shipProvince}، {order.shipCity}، {order.shipLine1}
            {order.shipLine2 ? '، ' + order.shipLine2 : ''}<br />
            <span className="text-xs text-soil-700/60 dark:text-dust-200/60 print:text-[9px]" dir="ltr">
              {toFa(order.shipPhone)} · کد پستی: {toFa(order.shipPostalCode)}
            </span>
          </p>
          <div className="mt-3 pt-2.5 border-t border-soil-900/5 dark:border-dust-50/10 flex items-center justify-between text-xs print:text-[10px]">
            <span className="text-soil-700/70 dark:text-dust-200/70">شرکت حمل و نقل:</span>
            <span className="font-bold text-soil-900 dark:text-dust-50">{formatCarrierName(order.shippingCarrier)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs print:text-[10px]">
            <span className="text-soil-700/70 dark:text-dust-200/70">تاریخ تقریبی تحویل به پست:</span>
            <span className="font-bold text-soil-900 dark:text-dust-50">{formatDateFa(getNextShippingDate(order.createdAt))}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 print:p-2 print:shadow-none print:border print:border-soil-900/10 print:text-[10px]">
          <h2 className="text-sm font-black text-soil-900 dark:text-dust-50 border-b border-soil-900/5 dark:border-dust-50/10 pb-2 print:text-xs print:pb-1">
            اطلاعات پرداخت
          </h2>
          <dl className="mt-3 space-y-2 text-sm print:mt-1 print:space-y-1 print:text-[10px]">
            <div className="flex justify-between gap-3">
              <dt className="text-soil-700/70 dark:text-dust-200/70">وضعیت پرداخت</dt>
              <dd><StatusBadge kind="payment" value={order.paymentStatus} /></dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-soil-700/70 dark:text-dust-200/70">مبلغ کل</dt>
              <dd className="font-bold text-soil-900 dark:text-dust-50">{formatToman(order.totalToman)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-soil-700/70 dark:text-dust-200/70">کد پیگیری شاپرک</dt>
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

        <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 lg:col-span-2 print:col-span-3 print:p-2 print:shadow-none print:border print:border-soil-900/10">
          <h2 className="text-sm font-black text-soil-900 dark:text-dust-50 border-b border-soil-900/5 dark:border-dust-50/10 pb-2 print:text-xs print:pb-1">
            اقلام سفارش
          </h2>
          <div className="mt-4 print:mt-1">
            <GroupedOrderItems items={order.items} linkTargetBlank={true} />
          </div>
        </section>
      </div>

      <div className="print:hidden no-print">
        <OrderStatusForm
          orderId={order.id}
          initialStatus={order.status}
          initialTracking={order.trackingCode ?? ''}
          initialCarrier={formatCarrierName(order.shippingCarrier)}
        />
      </div>
    </div>
  );
}
