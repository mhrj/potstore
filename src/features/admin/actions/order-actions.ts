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
import {
  registerTapinOrder,
  registerSingleTapinBox,
  type TapinPackageConfig,
} from '@/lib/providers/shipping/tapin/register';

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
  isNonStandard: z.boolean().optional(),
  packages: z
    .array(
      z.object({
        boxId: z.number().int().positive('شناسه جعبه نامعتبر است'),
        packageWeight: z.number().int().positive('وزن جعبه باید عددی مثبت باشد').optional(),
        weight: z.number().int().positive('وزن جعبه باید عددی مثبت باشد').optional(),
        isNonStandard: z.boolean().optional(),
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
  const orderIsNonStandard = Boolean(parsed.data.isNonStandard);
  const packages =
    parsed.data.packages && parsed.data.packages.length > 0
      ? parsed.data.packages.map((p) => ({
          boxId: p.boxId,
          packageWeight: p.weight ?? p.packageWeight ?? 500,
          isNonStandard: p.isNonStandard ?? orderIsNonStandard,
        }))
      : [
          {
            boxId: parsed.data.selectedBoxId ?? 5,
            packageWeight: parsed.data.packageWeight ?? 500,
            isNonStandard: orderIsNonStandard,
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
      500,
      orderIsNonStandard,
    );

    const parcels = Array.isArray(result) ? result : [];
    const trackingCodes = parcels.map((p) => p.trackingCode).filter(Boolean);
    const barcodes = parcels.map((p) => p.barcode).filter(Boolean);
    const tapinOrderIds = parcels.map((p) => p.orderId).filter(Boolean);
    const packageConfigs = parcels.map((p) => ({
      boxId: p.boxId,
      packageWeight: p.packageWeight,
      isNonStandard: Boolean(p.isNonStandard),
      trackingCode: p.trackingCode,
      barcode: p.barcode,
      orderId: p.orderId,
    }));
    const anyNonStandard =
      orderIsNonStandard || parcels.some((p) => Boolean(p.isNonStandard));

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
        isNonStandard: anyNonStandard,
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
        isNonStandard: true,
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

const registerTapinBoxSchema = z.object({
  orderId: z.string().min(1, 'شناسه سفارش الزامی است'),
  boxIndex: z.number().int().nonnegative('شماره جعبه نامعتبر است'),
  boxId: z.number().int().positive('شناسه جعبه نامعتبر است'),
  packageWeight: z.number().int().positive('وزن جعبه باید عددی مثبت باشد').default(1500),
  isNonStandard: z.boolean().optional(),
  allowReRegister: z.boolean().optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1, 'شناسه قلم سفارش الزامی است'),
        quantity: z.number().int().positive('تعداد باید عددی مثبت باشد'),
      }),
    )
    .min(1, 'حداقل یک محصول برای ثبت در این کارتن الزامی است'),
});

export type RegisterTapinBoxInput = z.infer<typeof registerTapinBoxSchema>;

export async function registerTapinBoxAction(input: RegisterTapinBoxInput) {
  const session = await getActiveAdmin();
  if (!session) {
    return { success: false as const, error: 'دسترسی غیرمجاز است' };
  }

  const parsed = registerTapinBoxSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? 'اطلاعات ارسالی نامعتبر است',
    };
  }

  const { orderId, boxIndex, boxId, packageWeight, items: boxItemsInput } = parsed.data;
  const isNonStandard = Boolean(parsed.data.isNonStandard);

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
          colorData: true,
          product: {
            select: {
              weightGrams: true,
              bundleItems: true,
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

  // Parse existing package configs
  const existingConfigs: any[] = Array.isArray(order.packageConfigs)
    ? (order.packageConfigs as any[])
    : [];

  // Check if boxIndex is already registered
  const existingBox = existingConfigs.find((b) => b.boxIndex === boxIndex);
  if (
    existingBox &&
    !parsed.data.allowReRegister &&
    (existingBox.status === 'REGISTERED' || existingBox.trackingCode || existingBox.barcode)
  ) {
    return {
      success: false as const,
      error: 'این بسته قبلاً در تاپین ثبت شده است. برای ثبت دوباره، ابتدا ثبت قبلی را لغو کنید.',
    };
  }

  // Calculate registered quantities per orderItemId (excluding current box if re-registering)
  const registeredCounts = new Map<string, number>();
  for (const b of existingConfigs) {
    if (b.boxIndex === boxIndex) continue;
    if (b.status === 'REGISTERED' || b.trackingCode || b.barcode) {
      if (Array.isArray(b.items)) {
        for (const it of b.items) {
          registeredCounts.set(
            it.orderItemId,
            (registeredCounts.get(it.orderItemId) || 0) + Number(it.quantity || 0),
          );
        }
      }
    }
  }

  // Validate items in this box
  const boxShippingItems: Array<{
    productName: string;
    quantity: number;
    unitPriceToman: number;
    unitToman: number;
    weightGrams: number;
    isFragile: boolean;
  }> = [];

  const storedBoxItems: Array<{
    orderItemId: string;
    productName: string;
    quantity: number;
    unitWeightGrams: number;
    unitPriceToman: number;
    isBundle: boolean;
    bundleSize: number;
  }> = [];

  let totalProductWeightGrams = 0;

  for (const requestedItem of boxItemsInput) {
    const orderItem = order.items.find((i) => i.id === requestedItem.orderItemId);
    if (!orderItem) {
      return { success: false as const, error: `قلم سفارش با شناسه ${requestedItem.orderItemId} یافت نشد.` };
    }

    const bundleSize = Math.max(1, Number(orderItem.bundleSize) || 1);
    const isBundle = Boolean(orderItem.isBundle) || bundleSize > 1;
    const maxShippingCount = isBundle
      ? Math.max(1, Math.round(orderItem.quantity / bundleSize))
      : orderItem.quantity;

    const alreadyRegistered = registeredCounts.get(orderItem.id) || 0;
    const remainingCount = maxShippingCount - alreadyRegistered;

    if (requestedItem.quantity > remainingCount) {
      return {
        success: false as const,
        error: `تعداد انتخابی برای «${orderItem.productName}» (${requestedItem.quantity}) از مانده ثبت نشده (${remainingCount}) بیشتر است.`,
      };
    }

    // Weight of 1 shipping unit (bundle or single pot)
    const bundleItemsArr = Array.isArray(orderItem.product?.bundleItems)
      ? (orderItem.product!.bundleItems as Array<{ weightGrams?: number }>)
      : [];
    const bundleItemsWeight = bundleItemsArr.reduce((s, it) => s + (it.weightGrams || 0), 0);
    const colorWeight =
      typeof (orderItem.colorData as any)?.weightGrams === 'number'
        ? Number((orderItem.colorData as any).weightGrams)
        : 0;

    const unitWeightGrams = isBundle
      ? bundleItemsWeight > 0
        ? bundleItemsWeight
        : colorWeight > 0
        ? colorWeight
        : orderItem.product?.weightGrams || 1000
      : orderItem.product?.weightGrams || 1000;

    // Price of 1 shipping unit in Toman
    const unitPriceToman = isBundle
      ? orderItem.lineTotalToman && maxShippingCount
        ? Math.round(orderItem.lineTotalToman / maxShippingCount)
        : orderItem.unitToman * bundleSize
      : orderItem.unitToman;

    totalProductWeightGrams += unitWeightGrams * requestedItem.quantity;

    boxShippingItems.push({
      productName: orderItem.productName,
      quantity: requestedItem.quantity,
      unitPriceToman,
      unitToman: unitPriceToman,
      weightGrams: unitWeightGrams,
      isFragile: orderItem.product?.isFragile ?? false,
    });

    storedBoxItems.push({
      orderItemId: orderItem.id,
      productName: orderItem.productName,
      quantity: requestedItem.quantity,
      unitWeightGrams,
      unitPriceToman,
      isBundle,
      bundleSize,
    });
  }

  const totalGrossWeightGrams = totalProductWeightGrams + packageWeight;
  if (totalGrossWeightGrams > 30000) {
    return {
      success: false as const,
      error: `وزن ناخالص این بسته با احتساب کارتن (${totalGrossWeightGrams} گرم) از سقف مجاز ۳۰۰۰۰ گرم (۳۰ کیلوگرم) بیشتر است. لطفاً اقلام را سبک‌تر کنید.`,
    };
  }

  try {
    const address = {
      fullName: order.shipFullName,
      phone: order.shipPhone,
      provinceCode: order.shipProvinceCode,
      cityCode: order.shipCityCode,
      postalCode: order.shipPostalCode,
      line1: order.shipLine1,
      line2: order.shipLine2,
    };

    const manualId = order.orderNumber
      ? `${order.orderNumber}-${boxIndex + 1}`
      : undefined;

    const parcel = await registerSingleTapinBox(
      address,
      boxShippingItems,
      boxId,
      packageWeight,
      manualId,
      isNonStandard,
    );

    const registeredBox = {
      boxIndex,
      boxId,
      isNonStandard,
      packageWeight,
      totalProductWeightGrams,
      status: 'REGISTERED' as const,
      trackingCode: parcel.trackingCode,
      barcode: parcel.barcode,
      tapinOrderId: parcel.orderId,
      registeredAt: new Date().toISOString(),
      items: storedBoxItems,
    };

    // Update or append in packageConfigs
    let updatedConfigs = [...existingConfigs];
    const targetIdx = updatedConfigs.findIndex((b) => b.boxIndex === boxIndex);
    if (targetIdx >= 0) {
      updatedConfigs[targetIdx] = registeredBox;
    } else {
      updatedConfigs.push(registeredBox);
    }

    // Keep sorted by boxIndex
    updatedConfigs.sort((a, b) => (a.boxIndex ?? 0) - (b.boxIndex ?? 0));

    const allRegistered = updatedConfigs.filter(
      (b) => b.status === 'REGISTERED' || b.trackingCode || b.barcode,
    );
    const allTrackingCodes = allRegistered.map((b) => b.trackingCode).filter(Boolean);
    const allBarcodes = allRegistered.map((b) => b.barcode).filter(Boolean);
    const allTapinOrderIds = allRegistered.map((b) => b.tapinOrderId || b.orderId).filter(Boolean);
    const orderIsNonStandard = allRegistered.some((b) => Boolean(b.isNonStandard));

    const primaryTracking = allTrackingCodes.join(', ');
    const primaryBarcode = allBarcodes.join(', ');
    const primaryTapinOrderId = allTapinOrderIds.join(', ');

    const newStatus =
      order.status === 'PENDING' || order.status === 'PAID' ? 'PROCESSING' : order.status;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingCode: primaryTracking || null,
        barcode: primaryBarcode || null,
        tapinOrderId: primaryTapinOrderId || null,
        trackingCodes: allTrackingCodes.length > 0 ? allTrackingCodes : Prisma.JsonNull,
        barcodes: allBarcodes.length > 0 ? allBarcodes : Prisma.JsonNull,
        tapinOrderIds: allTapinOrderIds.length > 0 ? allTapinOrderIds : Prisma.JsonNull,
        packageConfigs: updatedConfigs,
        isNonStandard: orderIsNonStandard,
        shippingCarrier: 'پست پیشتاز',
        status: newStatus,
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
        isNonStandard: true,
        shippingCarrier: true,
      },
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/dashboard/orders/${orderId}`);

    return {
      success: true as const,
      parcel,
      box: registeredBox,
      order: updatedOrder,
      packageConfigs: updatedConfigs,
      trackingCodes: allTrackingCodes,
      barcodes: allBarcodes,
    };
  } catch (err: unknown) {
    console.error('[registerTapinBoxAction] Error:', err);
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'خطای ناشناخته در ارتباط با تاپین رخ داد.',
    };
  }
}

const resetTapinBoxSchema = z.object({
  orderId: z.string().min(1, 'شناسه سفارش الزامی است'),
  boxIndex: z.number().int().nonnegative('شماره جعبه نامعتبر است'),
});

export type ResetTapinBoxInput = z.infer<typeof resetTapinBoxSchema>;

export async function resetTapinBoxAction(input: ResetTapinBoxInput) {
  const session = await getActiveAdmin();
  if (!session) {
    return { success: false as const, error: 'دسترسی غیرمجاز است' };
  }

  const parsed = resetTapinBoxSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? 'اطلاعات ارسالی نامعتبر است',
    };
  }

  const { orderId, boxIndex } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      packageConfigs: true,
    },
  });

  if (!order) {
    return { success: false as const, error: 'سفارش یافت نشد' };
  }

  const existingConfigs: any[] = Array.isArray(order.packageConfigs)
    ? (order.packageConfigs as any[])
    : [];

  const targetBox = existingConfigs.find((b) => b.boxIndex === boxIndex);
  if (!targetBox) {
    return { success: false as const, error: 'کارتن مورد نظر یافت نشد.' };
  }

  // Reset this box's status to PENDING and clear parcel codes, preserving items and box settings
  const updatedConfigs = existingConfigs.map((b) => {
    if (b.boxIndex !== boxIndex) return b;
    return {
      ...b,
      status: 'PENDING' as const,
      trackingCode: undefined,
      barcode: undefined,
      tapinOrderId: undefined,
      registeredAt: undefined,
    };
  });

  // Re-aggregate remaining registered boxes
  const remainingRegistered = updatedConfigs.filter(
    (b) => b.status === 'REGISTERED' && (b.trackingCode || b.barcode),
  );
  const remainingTrackingCodes = remainingRegistered.map((b) => b.trackingCode).filter(Boolean);
  const remainingBarcodes = remainingRegistered.map((b) => b.barcode).filter(Boolean);
  const remainingTapinOrderIds = remainingRegistered
    .map((b) => b.tapinOrderId || b.orderId)
    .filter(Boolean);
  const remainingIsNonStandard = remainingRegistered.some((b) => Boolean(b.isNonStandard));

  const primaryTracking = remainingTrackingCodes.join(', ') || null;
  const primaryBarcode = remainingBarcodes.join(', ') || null;
  const primaryTapinOrderId = remainingTapinOrderIds.join(', ') || null;

  // If no boxes are registered anymore, revert status to PAID (or previous status)
  let nextStatus = order.status;
  if (remainingRegistered.length === 0 && order.status === 'PROCESSING') {
    nextStatus = order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING';
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingCode: primaryTracking,
      barcode: primaryBarcode,
      tapinOrderId: primaryTapinOrderId,
      trackingCodes: remainingTrackingCodes.length > 0 ? remainingTrackingCodes : Prisma.JsonNull,
      barcodes: remainingBarcodes.length > 0 ? remainingBarcodes : Prisma.JsonNull,
      tapinOrderIds: remainingTapinOrderIds.length > 0 ? remainingTapinOrderIds : Prisma.JsonNull,
      packageConfigs: updatedConfigs,
      isNonStandard: remainingIsNonStandard,
      status: nextStatus,
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
      isNonStandard: true,
    },
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/dashboard/orders/${orderId}`);

  return {
    success: true as const,
    order: updatedOrder,
    packageConfigs: updatedConfigs,
  };
}
