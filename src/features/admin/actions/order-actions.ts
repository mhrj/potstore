'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActiveAdmin } from '@/lib/auth';
import {
  ORDER_STATUSES,
  checkStatusTransition,
  isOrderStatus,
  isPaymentStatus,
  paymentStatusAfterCancel,
  shouldRestoreStockOnCancel,
} from '@/lib/orders';
import { registerTapinOrder, type TapinPackageConfig } from '@/lib/providers/shipping/tapin/register';

const updateOrderSchema = z.object({
  orderId: z.string().min(1, 'شناسه سفارش الزامی است'),
  status: z.enum(ORDER_STATUSES),
  trackingCode: z.string().trim().max(60).nullable().optional(),
  shippingCarrier: z.string().trim().max(50).nullable().optional(),
});

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

function generateTrackingCode(): string {
  return `PS-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function updateOrderStatusAction(input: UpdateOrderInput) {
  const session = await getActiveAdmin();
  if (!session) {
    return { success: false as const, error: 'دسترسی غیرمجاز است' };
  }

  const parsed = updateOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است',
    };
  }

  const { orderId, status: to, trackingCode: submittedTracking, shippingCarrier } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      trackingCode: true,
      shippingCarrier: true,
      shippedAt: true,
      deliveredAt: true,
      items: {
        select: {
          productId: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    return { success: false as const, error: 'سفارش یافت نشد' };
  }

  const from = isOrderStatus(order.status) ? order.status : 'PENDING';
  const paymentStatus = isPaymentStatus(order.paymentStatus) ? order.paymentStatus : 'PENDING';

  const check = checkStatusTransition({ from, to, paymentStatus });
  if (!check.ok) {
    return { success: false as const, error: check.message };
  }

  const isCancelling = to === 'CANCELED' && from !== 'CANCELED';
  const restoreStock = isCancelling && shouldRestoreStockOnCancel(paymentStatus);

  const cleanSubmittedTracking =
    submittedTracking === undefined ? undefined : submittedTracking?.trim() || null;

  const trackingCode =
    to === 'SHIPPED'
      ? cleanSubmittedTracking || order.trackingCode || generateTrackingCode()
      : cleanSubmittedTracking === undefined
        ? order.trackingCode
        : cleanSubmittedTracking;

  const data: Record<string, unknown> = {
    status: to,
    trackingCode,
  };

  if (shippingCarrier !== undefined) {
    data.shippingCarrier = shippingCarrier?.trim() || null;
  }
  if (to === 'SHIPPED' && !order.shippedAt) data.shippedAt = new Date();
  if (to === 'DELIVERED' && !order.deliveredAt) data.deliveredAt = new Date();
  if (isCancelling) {
    data.paymentStatus = paymentStatusAfterCancel(paymentStatus);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: { id: orderId, status: from, paymentStatus },
      data,
    });

    if (claim.count === 0) return null;

    if (restoreStock) {
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        trackingCode: true,
        shippingCarrier: true,
      },
    });
  });

  if (!updated) {
    return {
      success: false as const,
      error: 'وضعیت این سفارش هم‌زمان توسط درخواست دیگری تغییر کرده است. صفحه را بازخوانی کنید.',
    };
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/dashboard/orders/${orderId}`);

  return {
    success: true as const,
    order: updated,
    stockRestored: restoreStock,
  };
}

const registerTapinSchema = z.object({
  orderId: z.string().min(1, 'شناسه سفارش الزامی است'),
  selectedBoxId: z.number().int().positive('شناسه جعبه نامعتبر است').optional(),
  packageWeight: z.number().int().positive('وزن جعبه باید عددی مثبت باشد').optional(),
  packages: z
    .array(
      z.object({
        boxId: z.number().int().positive('شناسه جعبه نامعتبر است'),
        packageWeight: z.number().int().positive('وزن جعبه باید عددی مثبت باشد').optional(),
        weight: z.number().int().positive('وزن جعبه باید عددی مثبت باشد').optional(),
      }),
    )
    .optional(),
});

export type RegisterTapinInput = z.infer<typeof registerTapinSchema>;

export async function registerOrderWithTapinAction(input: RegisterTapinInput) {
  const session = await getActiveAdmin();
  if (!session) {
    return { success: false as const, error: 'دسترسی غیرمجاز است' };
  }

  const parsed = registerTapinSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? 'اطلاعات ارسالی نامعتبر است',
    };
  }

  const { orderId } = parsed.data;
  const packages =
    parsed.data.packages && parsed.data.packages.length > 0
      ? parsed.data.packages.map((p) => ({
          boxId: p.boxId,
          packageWeight: p.weight ?? p.packageWeight ?? 500,
        }))
      : [
          {
            boxId: parsed.data.selectedBoxId ?? 5,
            packageWeight: parsed.data.packageWeight ?? 500,
          },
        ];

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      trackingCode: true,
      barcode: true,
      tapinOrderId: true,
      trackingCodes: true,
      barcodes: true,
      tapinOrderIds: true,
      packageConfigs: true,
      shippingCarrier: true,
      shipFullName: true,
      shipPhone: true,
      shipProvinceCode: true,
      shipCityCode: true,
      shipPostalCode: true,
      shipLine1: true,
      shipLine2: true,
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          unitToman: true,
          lineTotalToman: true,
          isBundle: true,
          bundleSize: true,
          product: {
            select: {
              weightGrams: true,
              isFragile: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return { success: false as const, error: 'سفارش یافت نشد' };
  }

  try {
    const shippingItems = order.items.map((it) => ({
      productName: it.productName,
      quantity: it.quantity,
      unitToman: it.unitToman,
      unitPriceToman: it.unitToman,
      lineTotalToman: it.lineTotalToman,
      isBundle: it.isBundle,
      bundleSize: it.bundleSize,
      weightGrams: it.product?.weightGrams ?? 500,
      isFragile: it.product?.isFragile ?? false,
    }));

    const result = await registerTapinOrder(
      {
        orderNumber: order.orderNumber,
        shipFullName: order.shipFullName,
        shipPhone: order.shipPhone,
        shipProvinceCode: order.shipProvinceCode,
        shipCityCode: order.shipCityCode,
        shipPostalCode: order.shipPostalCode,
        shipLine1: order.shipLine1,
        shipLine2: order.shipLine2,
        items: shippingItems,
      },
      packages,
    );

    const parcels = Array.isArray(result) ? result : [];
    const trackingCodes = parcels.map((p) => p.trackingCode).filter(Boolean);
    const barcodes = parcels.map((p) => p.barcode).filter(Boolean);
    const tapinOrderIds = parcels.map((p) => p.orderId).filter(Boolean);
    const packageConfigs = parcels.map((p) => ({
      boxId: p.boxId,
      packageWeight: p.packageWeight,
      trackingCode: p.trackingCode,
      barcode: p.barcode,
      orderId: p.orderId,
    }));

    const trackingCode =
      (trackingCodes.length > 0 ? trackingCodes.join(', ') : result.trackingCode) ||
      order.trackingCode ||
      null;
    const barcode =
      (barcodes.length > 0 ? barcodes.join(', ') : result.barcode) ||
      order.barcode ||
      null;
    const tapinOrderId =
      (tapinOrderIds.length > 0 ? tapinOrderIds.join(', ') : result.orderId) ||
      order.tapinOrderId ||
      null;

    // Update order with barcode, tracking code, carrier and transition status to PROCESSING
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingCode,
        barcode,
        tapinOrderId,
        trackingCodes: trackingCodes.length > 0 ? trackingCodes : Prisma.JsonNull,
        barcodes: barcodes.length > 0 ? barcodes : Prisma.JsonNull,
        tapinOrderIds: tapinOrderIds.length > 0 ? tapinOrderIds : Prisma.JsonNull,
        packageConfigs: packageConfigs.length > 0 ? packageConfigs : Prisma.JsonNull,
        shippingCarrier: 'پست پیشتاز',
        status: 'PROCESSING',
      },
      select: {
        id: true,
        status: true,
        trackingCode: true,
        barcode: true,
        tapinOrderId: true,
        trackingCodes: true,
        barcodes: true,
        tapinOrderIds: true,
        packageConfigs: true,
        shippingCarrier: true,
      },
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/dashboard/orders/${orderId}`);

    return {
      success: true as const,
      order: updated,
      trackingCode,
      barcode,
      orderId: tapinOrderId,
      trackingCodes,
      barcodes,
      tapinOrderIds,
      packageConfigs,
      parcels: result,
    };
  } catch (err: unknown) {
    console.error('[registerOrderWithTapinAction] Error:', err);
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'خطای ناشناخته در ارتباط با تاپین رخ داد.',
    };
  }
}
