import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { formatToman, toFa, formatDateFa } from '@/lib/format';
import Container from '@/components/ui/Container';
import OrderItemDetails, { GroupedOrderItems } from '@/features/checkout/components/OrderItemDetails';
import PrintInvoiceButton from '@/features/checkout/components/PrintInvoiceButton';

type Props = {
  searchParams: Promise<{ ref_id?: string; order?: string }>;
};

export default async function SuccessPage({ searchParams }: Props) {
  const [{ ref_id, order: orderNumber }, session] = await Promise.all([
    searchParams,
    getSession(),
  ]);

  const order = orderNumber
    ? await prisma.order.findUnique({
        where: { orderNumber },
        select: {
          id: true,
          orderNumber: true,
          paymentStatus: true,
          refId: true,
          userId: true,
          createdAt: true,
          paidAt: true,
          totalToman: true,
          shippingToman: true,
          shippingCarrier: true,
          shipProvince: true,
          shipCity: true,
          shipLine1: true,
          shipLine2: true,
          shipPostalCode: true,
          shipFullName: true,
          shipPhone: true,
          items: {
            select: {
              id: true,
              productId: true,
              productName: true,
              productSlug: true,
              sku: true,
              imageUrl: true,
              material: true,
              diameterCm: true,
              heightCm: true,
              variantId: true,
              variantTitle: true,
              quantity: true,
              listUnitToman: true,
              unitToman: true,
              lineTotalToman: true,
              tierLabel: true,
              isBundle: true,
              bundleSize: true,
              colorData: true,
            },
          },
        },
      })
    : null;

  const isPaid =
    order?.paymentStatus === 'PAID' && !!order.refId && (!ref_id || order.refId === ref_id);

  // The gateway return is a top-level navigation, so the customer's own session
  // cookie is normally present. Without it the order still confirms, but its
  // figures are withheld: the order number alone should not disclose what
  // someone else paid.
  const isOwner =
    !!session && !!order && (session.sub === order.userId || session.role === 'ADMIN');

  if (!isPaid) {
    return (
      <Container className="flex min-h-dvh items-center justify-center py-16">
        <div className="w-full max-w-xl rounded-pot border border-transparent bg-white p-8 shadow-[0_12px_32px_-12px_rgba(62,39,35,0.22)] dark:border-dust-50/10 dark:bg-flora-900 dark:shadow-none sm:p-12">
          <div className="grid size-16 place-items-center rounded-full bg-amber-100 text-3xl dark:bg-amber-950/60">
            ⏳
          </div>

          <h1 className="mt-6 text-2xl font-black text-soil-900 dark:text-dust-50 sm:text-3xl">
            پرداخت هنوز تکمیل نشده است
          </h1>
          <p className="mt-3 text-sm leading-7 text-soil-700/80 dark:text-dust-200/80">
            وضعیت سفارش در سیستم ثبت شده و در صورت موفقیت‌آمیز بودن پرداخت، اطلاعات آن در این صفحه به‌روزرسانی می‌شود.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-6 py-3 text-sm font-bold transition-colors hover:bg-flora-700 cursor-pointer shadow-sm"
            >
              پیگیری سفارش
            </Link>
            <Link
              href="/cart"
              className="rounded-full border border-soil-900/15 px-6 py-3 text-sm font-bold text-soil-900 transition-colors hover:bg-dust-50 dark:border-dust-50/20 dark:text-dust-50 dark:hover:bg-flora-950"
            >
              بازگشت به سبد خرید
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="flex min-h-dvh items-center justify-center py-16">
      <div className="w-full max-w-2xl rounded-pot border border-transparent bg-white p-8 shadow-[0_12px_32px_-12px_rgba(62,39,35,0.22)] dark:border-dust-50/10 dark:bg-flora-900 dark:shadow-none sm:p-12">
        <div className="grid size-16 place-items-center rounded-full bg-flora-100 text-3xl dark:bg-flora-900/50 dark:text-flora-300">
          ✓
        </div>

        <h1 className="mt-6 text-2xl font-black text-soil-900 dark:text-dust-50 sm:text-3xl">
          پرداخت با موفقیت انجام شد
        </h1>
        <p className="mt-3 text-sm leading-7 text-soil-700/80 dark:text-dust-200/80">
          از خرید شما سپاسگزاریم. سفارش شما ثبت شد و پس از آماده‌سازی ارسال خواهد شد.
        </p>

        <dl className="mt-8 divide-y divide-soil-900/5 overflow-hidden rounded-2xl border border-soil-900/10 text-sm dark:divide-dust-50/10 dark:border-dust-50/10">
          <div className="flex justify-between gap-4 px-5 py-4">
            <dt className="text-soil-700/70 dark:text-dust-200/70">شماره سفارش</dt>
            <dd className="font-bold text-soil-900 dark:text-dust-50">{toFa(orderNumber ?? '—')}</dd>
          </div>
          {isOwner && order && (
            <>
              <div className="flex justify-between gap-4 px-5 py-4">
                <dt className="text-soil-700/70 dark:text-dust-200/70">کد پیگیری پرداخت (شاپرک)</dt>
                <dd className="font-mono font-bold text-flora-900 dark:text-flora-300" dir="ltr">
                  {toFa(order.refId ?? ref_id ?? '—')}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-4">
                <dt className="text-soil-700/70 dark:text-dust-200/70">مبلغ پرداخت‌شده</dt>
                <dd className="font-bold text-soil-900 dark:text-dust-50">{formatToman(order.totalToman)}</dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-4">
                <dt className="text-soil-700/70 dark:text-dust-200/70">تاریخ</dt>
                <dd className="font-bold text-soil-900 dark:text-dust-50">
                  {formatDateFa(order.paidAt ?? order.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-4">
                <dt className="text-soil-700/70 dark:text-dust-200/70">تعداد اقلام</dt>
                <dd className="font-bold text-soil-900 dark:text-dust-50">{toFa(order.items.length)} قلم</dd>
              </div>
            </>
          )}
        </dl>

        {!isOwner && (
          <p className="mt-4 text-[11px] leading-6 text-soil-700/60 dark:text-dust-200/60">
            جزئیات این سفارش فقط برای صاحب حساب نمایش داده می‌شود.{' '}
            <Link href="/login" className="font-bold text-flora-700 underline dark:text-flora-300">
              ورود به حساب
            </Link>
          </p>
        )}

        {isOwner && order && order.items && order.items.length > 0 && (
          <div className="mt-8 rounded-2xl border border-soil-900/10 bg-dust-50/40 p-5 dark:border-dust-50/10 dark:bg-flora-950/40">
            <h2 className="text-sm font-black text-soil-900 dark:text-dust-50 mb-3">
              اقلام ثبت‌شده در سفارش
            </h2>
            <GroupedOrderItems items={order.items} />
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {order?.id ? (
            <Link
              href={`/dashboard/orders/${order.id}`}
              className="rounded-full bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-6 py-3 text-sm font-bold transition-colors hover:bg-flora-700 cursor-pointer shadow-sm"
            >
              مشاهده و چاپ فاکتور
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-full bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-6 py-3 text-sm font-bold transition-colors hover:bg-flora-700 cursor-pointer shadow-sm"
            >
              پیگیری سفارش
            </Link>
          )}
          <Link
            href="/dashboard"
            className="rounded-full border border-soil-900/15 px-6 py-3 text-sm font-bold text-soil-900 transition-colors hover:bg-dust-50 dark:border-dust-50/20 dark:text-dust-50 dark:hover:bg-flora-950"
          >
            سفارش‌های من
          </Link>
          <Link
            href="/"
            className="rounded-full border border-soil-900/15 px-6 py-3 text-sm font-bold text-soil-900 transition-colors hover:bg-dust-50 dark:border-dust-50/20 dark:text-dust-50 dark:hover:bg-flora-950"
          >
            بازگشت به فروشگاه
          </Link>
        </div>
      </div>
    </Container>
  );
}
