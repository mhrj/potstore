import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { isPaymentAlreadyProcessed } from '@/lib/cart';
import { zarinpalVerify, ZARINPAL_ERRORS } from '@/lib/zarinpal';
import { isRetryableGatewayFailure } from '@/lib/orders';
import { formatToman } from '@/lib/format';
import { sendEitaaNotification } from '@/lib/eitaa';
import { sendTelegramNotification } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Thrown inside the settlement transaction when a line cannot be filled. It is
 * distinguished from every other error so that a genuine stock shortage — the
 * customer's payment cannot be honoured — is not confused with an
 * infrastructure failure, which must stay retryable.
 */
class StockShortageError extends Error {
  constructor(readonly productName: string) {
    super(`insufficient stock for ${productName}`);
    this.name = 'StockShortageError';
  }
}

/**
 * Purges the cached server output that renders the cart.
 *
 * Clearing `cartItem` in the database is not enough on its own: the cart page
 * and the header's cart badge are server-rendered, and Next serves them from the
 * client Router Cache, so a customer who paid could still be shown the basket
 * they had just bought. `revalidatePath('/cart')` handles the cart page, and the
 * layout-scoped call covers the header badge, which lives in the root layout and
 * therefore appears on every route.
 */
function clearCartCaches() {
  revalidatePath('/cart');
  revalidatePath('/', 'layout');
}

/**
 * Zarinpal redirects the user back here with ?Authority=...&Status=OK|NOK.
 * This route must be idempotent — Zarinpal may call it more than once.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const authority = url.searchParams.get('Authority');
  const status = url.searchParams.get('Status');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const proto = req.headers.get('x-forwarded-proto') || (url.protocol ? url.protocol.replace(':', '') : 'http');
  const hostOrigin = `${proto}://${host}`;
  const origin = req.headers.get('origin') || hostOrigin;
  const appUrl =
    process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL
      : origin;

  const fail = (reason: string, orderNumber?: string) => {
    const target = new URL('/checkout/failed', appUrl);
    target.searchParams.set('reason', reason);
    if (orderNumber) target.searchParams.set('order', orderNumber);
    return NextResponse.redirect(target, { status: 303 });
  };

  if (!authority) return fail('authority_missing');

  // 1) Look up the order by authority. The database is the source of truth.
  const order = await prisma.order.findUnique({
    where: { zarinpalAuthority: authority },
    include: { items: true },
  });

  if (!order) return fail('order_not_found');

  // 2) Already paid — the settlement below has already run for this order.
  //    The basket is still cleared here before returning: this branch is taken
  //    on a repeated delivery of the callback (a browser refresh on this URL, a
  //    gateway retry, or the customer pressing back), and any of those must not
  //    leave a bought basket sitting in the cart.
  if (isPaymentAlreadyProcessed(order)) {
    await prisma.cartItem.deleteMany({ where: { userId: order.userId } });
    clearCartCaches();

    const success = new URL('/checkout/success', appUrl);
    if (order.refId) success.searchParams.set('ref_id', order.refId);
    success.searchParams.set('order', order.orderNumber);
    return NextResponse.redirect(success.toString(), { status: 303 });
  }

  // 3) User canceled or the gateway reported a failure. Guarded on the order
  //    still being unsettled, so a late NOK delivery cannot cancel an order a
  //    concurrent OK delivery has already paid.
  if (status !== 'OK') {
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { not: 'PAID' } },
      data: {
        paymentStatus: 'CANCELED',
        status: 'CANCELED',
        failureReason: 'پرداخت توسط کاربر لغو شد یا درگاه خطا داد',
      },
    });
    return fail('canceled', order.orderNumber);
  }

  // 4) Verify authenticity with Zarinpal. Amount comes from the DB, never from the query string.
  const verification = await zarinpalVerify({
    amountToman: order.totalToman,
    authority,
  });

  if (!verification.ok) {
    // A gateway that could not be reached is not a declined payment. The
    // customer may well have paid, so the order is left unsettled for a retry
    // rather than recorded as FAILED.
    if (isRetryableGatewayFailure(verification.code)) {
      return fail('verify_unavailable', order.orderNumber);
    }

    // Guarded the same way as the cancel branch above: a decline must never
    // overwrite a settlement another delivery has already recorded.
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { not: 'PAID' } },
      data: {
        paymentStatus: 'FAILED',
        status: 'CANCELED',
        failureReason: ZARINPAL_ERRORS[verification.code] ?? verification.message,
      },
    });
    return fail('verify_failed', order.orderNumber);
  }

  // 5) Settle the order exactly once. Zarinpal may deliver this callback more
  //    than once, and two deliveries can arrive at the same time, so the
  //    settlement is a *conditional* update: whichever request flips the order
  //    off its unsettled state wins, and every other one is a no-op. That is
  //    what keeps stock from being decremented twice for one payment.
  let claimed = false;

  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.order.updateMany({
        where: { id: order.id, paymentStatus: { not: 'PAID' } },
        data: {
          paymentStatus: 'PAID',
          status: 'PAID',
          refId: verification.refId,
          cardPan: verification.cardPan,
          paidAt: new Date(),
          failureReason: null,
        },
      });

      // Lost the race: another delivery already settled this order.
      if (claim.count === 0) return;
      claimed = true;

      // Each decrement is guarded by the stock it is allowed to consume, so the
      // check and the write cannot be interleaved by a concurrent order. A
      // failing line throws and rolls the whole settlement back, including the
      // PAID claim made above.
      for (const item of order.items) {
        if (!item.productId) continue;

        const decremented = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (decremented.count === 0) {
          throw new StockShortageError(item.productName);
        }

        if (item.variantId) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      await tx.cartItem.deleteMany({ where: { userId: order.userId } });
    });
  } catch (error) {
    if (error instanceof StockShortageError) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          status: 'CANCELED',
          failureReason: `موجودی ${error.productName} برای تکمیل سفارش کافی نبود`,
        },
      });
      return fail('stock_shortage', order.orderNumber);
    }

    // Anything else is our failure, not the customer's, and the gateway has
    // already taken the money — so this is not reported as a declined payment.
    // The error is logged for reconciliation, and the customer is sent to the
    // success page. That page re-reads the order from the database before it
    // claims anything, so it shows «پرداخت هنوز تکمیل نشده است» rather than a
    // false confirmation. The order is left unsettled, so a retried callback can
    // still settle it.
    console.error(
      '[payment/verify] settlement failed:',
      error instanceof Error ? error.message : error,
    );

    const retry = new URL('/checkout/success', appUrl);
    retry.searchParams.set('ref_id', verification.refId);
    retry.searchParams.set('order', order.orderNumber);
    return NextResponse.redirect(retry.toString(), { status: 303 });
  }

  if (!claimed) {
    const settled = await prisma.order.findUnique({
      where: { id: order.id },
      select: { paymentStatus: true, refId: true },
    });

    if (isPaymentAlreadyProcessed(settled) && settled?.refId) {
      // Another delivery won the claim and cleared the cart; purge the caches so
      // this browser is not still showing the basket either.
      clearCartCaches();

      const already = new URL('/checkout/success', appUrl);
      already.searchParams.set('ref_id', settled.refId);
      already.searchParams.set('order', order.orderNumber);
      return NextResponse.redirect(already.toString(), { status: 303 });
    }

    return fail('verify_failed', order.orderNumber);
  }

  // 6) Send Eitaa and Telegram notification to admin if claimed
  if (claimed) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? appUrl;
      const message = `🎉 <b>سفارش جدید ثبت شد!</b>

📦 شماره سفارش: <code>${order.orderNumber}</code>
👤 مشتری: ${order.shipFullName}
📞 تلفن: <code>${order.shipPhone}</code>
💰 مبلغ کل: ${formatToman(order.totalToman)}
🛒 تعداد اقلام: ${order.items.length} قلم
🚚 روش ارسال: ${order.shippingCarrier || 'پست پیشتاز'}

👉 <a href="${baseUrl}/admin/orders/${order.id}">مشاهده در پنل مدیریت</a>`;

      await Promise.allSettled([
        sendEitaaNotification(message),
        sendTelegramNotification(message),
      ]);
    } catch (err) {
      console.error('[payment/verify] Admin notification failed:', err);
    }
  }

  // 7) The settlement committed, so the basket is now empty in the database.
  //    Purge the cached rendering of it before sending the customer onward.
  clearCartCaches();

  // 8) Send the user to the success page with the Shaparak reference.
  const success = new URL('/checkout/success', appUrl);
  success.searchParams.set('ref_id', verification.refId);
  success.searchParams.set('order', order.orderNumber);
  return NextResponse.redirect(success.toString(), { status: 303 });
}
