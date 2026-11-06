import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { priceCart, type CartTotals, type Tier } from '@/lib/pricing';
import { parseBundleItems, parseColorOptions } from '@/lib/product-features';
import { toFa } from '@/lib/format';

export function getStockShortages(
  items: Array<{ name: string; quantity: number; stock: number }>,
): Array<{ name: string; available: number }> {
  return items
    .filter((item) => item.quantity > item.stock)
    .map((item) => ({ name: item.name, available: item.stock }));
}

export function isPaymentAlreadyProcessed(
  order: { paymentStatus?: string | null; refId?: string | null } | null,
) {
  return !!order && order.paymentStatus === 'PAID' && !!order.refId;
}

export async function getCartTotals(userId: string): Promise<CartTotals> {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    select: {
      id: true,
      productId: true,
      quantity: true,
      colorData: true,
      selectedColorHex: true,
      colorAdjustment: true,
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          basePriceToman: true,
          salePriceToman: true,
          weightGrams: true,
          unitsPerCarton: true,
          bundleSize: true,
          bundleItems: true,
          stock: true,
          allowBatchDiscount: true,
          isActive: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true, alt: true } },
          tiers: {
            orderBy: { minQuantity: 'asc' },
            select: { minQuantity: true, unitPriceToman: true, label: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return priceCart(
    items
      .filter((i) => i.product.isActive)
      .map((i) => ({
        product: {
          id: i.product.id,
          slug: i.product.slug,
          name: i.product.name,
          basePriceToman: i.product.basePriceToman,
          salePriceToman: i.product.salePriceToman,
          weightGrams: i.product.weightGrams,
          unitsPerCarton: i.product.unitsPerCarton,
          bundleSize: i.product.bundleSize,
          bundleItems: parseBundleItems(i.product.bundleItems, i.product.stock),
          images: i.product.images,
          allowBatchDiscount: i.product.allowBatchDiscount,
        },
        tiers: i.product.tiers.map(
          (t): Tier => ({
            minQuantity: t.minQuantity,
            unitPriceToman: t.unitPriceToman,
            label: t.label,
          }),
        ),
        quantity: i.quantity,
        colorData: i.colorData,
        colorAdjustment: i.colorAdjustment ?? 0,
      })),
  );
}

export async function addToCart(
  userId: string,
  productId: string,
  quantity: number,
  colorData?: Record<string, unknown> | null,
  clientSelectedColorHex?: string | null,
  clientColorAdjustment?: number,
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: {
      id: true,
      stock: true,
      bundleSize: true,
      minOrderQuantity: true,
      colorOptions: true,
      bundleItems: true,
    },
  });
  if (!product) throw new Error('محصول یافت نشد');

  const bundleSize = product.bundleSize || 1;
  const isBundle = bundleSize > 1;
  const minQty = isBundle
    ? Math.max(product.minOrderQuantity || 1, bundleSize)
    : (product.minOrderQuantity || 1);

  if (quantity < minQty) {
    throw new Error(`حداقل تعداد سفارش برای این محصول ${toFa(minQty)} عدد است`);
  }

  if (isBundle && quantity % bundleSize !== 0) {
    throw new Error(`تعداد سفارش باید مضربی از ${toFa(bundleSize)} باشد`);
  }

  // Validate the resulting line, not just this increment: adding 10 to a cart
  // that already holds 10 must fail against a stock of 15. Checkout re-checks
  // stock before creating an order, so this only spares the customer a trip to
  // the gateway for a basket that cannot be filled — it is not the authority.
  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { quantity: true },
  });
  const target = (existing?.quantity ?? 0) + quantity;

  if (product.stock < target) {
    throw new Error(
      existing
        ? `موجودی کافی نیست — ${toFa(existing.quantity)} عدد در سبد شماست و حداکثر موجودی ${toFa(product.stock)} عدد است`
        : 'موجودی کافی نیست',
    );
  }

  let finalAdjustment = 0;
  let finalColorHex: string | null = clientSelectedColorHex ?? null;

  if (!isBundle) {
    const singleColors = parseColorOptions(product.colorOptions, product.stock);
    const selColor = colorData?.selectedColor as { hexCode?: string } | undefined;
    const chosenHex =
      clientSelectedColorHex ??
      selColor?.hexCode ??
      (typeof colorData?.color === 'string' ? colorData.color : null);

    if (chosenHex) {
      finalColorHex = chosenHex;
      if (singleColors.length > 0) {
        const opt = singleColors.find(
          (c) => c.hexCode.toUpperCase() === chosenHex.toUpperCase(),
        );
        if (opt) {
          if (opt.stock < target) {
            throw new Error(`موجودی رنگ ${opt.hexCode} کافی نیست (موجودی: ${toFa(opt.stock)} عدد)`);
          }
          finalAdjustment = opt.priceAdjustment;
        }
      }
    }
  } else if (colorData?.bundleColors) {
    const bundleItems = parseBundleItems(product.bundleItems, product.stock);
    const bColors = colorData.bundleColors as Record<string | number, unknown>;
    const bundleCount = Math.max(1, Math.floor(target / bundleSize));

    for (let idx = 0; idx < bundleItems.length; idx++) {
      const it = bundleItems[idx];
      const itColors = it.colorOptions ?? [];
      const chosen = bColors[idx] ?? bColors[String(idx)];
      const chosenHex = typeof chosen === 'string' ? chosen : (chosen as { hexCode?: string })?.hexCode;

      if (chosenHex && itColors.length > 0) {
        const opt = itColors.find(
          (c) => c.hexCode.toUpperCase() === chosenHex.toUpperCase(),
        );
        if (opt) {
          if (opt.stock < bundleCount) {
            throw new Error(
              `موجودی رنگ ${opt.hexCode} برای ${it.title} کافی نیست (موجودی: ${toFa(opt.stock)} عدد)`,
            );
          }
          finalAdjustment += opt.priceAdjustment;
        }
      }
    }
  }

  if (finalAdjustment === 0 && typeof clientColorAdjustment === 'number' && Number.isFinite(clientColorAdjustment)) {
    finalAdjustment = clientColorAdjustment;
  }

  const jsonColorData = (colorData as Prisma.InputJsonValue) ?? Prisma.JsonNull;

  return prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: {
      quantity: target,
      selectedColorHex: finalColorHex,
      colorAdjustment: finalAdjustment,
      ...(colorData !== undefined ? { colorData: jsonColorData } : {}),
    },
    create: {
      userId,
      productId,
      quantity: target,
      selectedColorHex: finalColorHex,
      colorAdjustment: finalAdjustment,
      colorData: jsonColorData,
    },
  });
}

export async function clearCart(userId: string) {
  return prisma.cartItem.deleteMany({ where: { userId } });
}
