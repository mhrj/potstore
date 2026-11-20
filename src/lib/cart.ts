import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { priceCart, type CartTotals, type Tier } from '@/lib/pricing';
import { parseBundleItems, parseColorOptions } from '@/lib/product-features';
import { toFa } from '@/lib/format';
import {
  parseBundleSelections,
  mergeBundleSelections,
  parseBundleConfigurations,
  groupCartItems,
  type GroupedCartItem,
  type BundleConfiguration,
} from '@/lib/bundle-colors';

export { groupCartItems, type GroupedCartItem, type BundleConfiguration };

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
      variantId: true,
      variantTitle: true,
      quantity: true,
      colorData: true,
      selectedColorHex: true,
      colorAdjustment: true,
      variant: {
        select: {
          id: true,
          title: true,
          priceToman: true,
          stock: true,
        },
      },
      product: {
        select: {
          id: true,
          slug: true,
          sku: true,
          material: true,
          diameterCm: true,
          heightCm: true,
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
          isFragile: true,
          packageLengthCm: true,
          packageWidthCm: true,
          packageHeightCm: true,
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
          sku: i.product.sku,
          material: i.product.material,
          diameterCm: i.product.diameterCm,
          heightCm: i.product.heightCm,
          name: i.product.name,
          basePriceToman: i.product.basePriceToman,
          salePriceToman: i.product.salePriceToman,
          weightGrams: i.product.weightGrams,
          unitsPerCarton: i.product.unitsPerCarton,
          bundleSize: i.product.bundleSize,
          bundleItems: parseBundleItems(i.product.bundleItems, i.product.stock),
          images: i.product.images,
          allowBatchDiscount: i.product.allowBatchDiscount,
          isFragile: i.product.isFragile,
          packageLengthCm: i.product.packageLengthCm,
          packageWidthCm: i.product.packageWidthCm,
          packageHeightCm: i.product.packageHeightCm,
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
        selectedColorHex: i.selectedColorHex,
        colorAdjustment: i.colorAdjustment ?? 0,
        variantId: i.variantId,
        variantTitle: i.variantTitle ?? i.variant?.title,
        variantPriceToman: i.variant?.priceToman,
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
  variantId?: string | null,
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: {
      id: true,
      stock: true,
      weightGrams: true,
      bundleSize: true,
      minOrderQuantity: true,
      colorOptions: true,
      bundleItems: true,
    },
  });
  if (!product) throw new Error('محصول یافت نشد');

  let chosenVariant: { id: string; title: string; priceToman: number; stock: number } | null = null;
  if (variantId) {
    chosenVariant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true, title: true, priceToman: true, stock: true },
    });
    if (!chosenVariant) throw new Error('تنوع انتخابی یافت نشد');
  }

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

  let finalAdjustment = 0;
  let finalColorHex: string | null = clientSelectedColorHex ?? null;

  if (!isBundle) {
    const selColor = colorData?.selectedColor as { hexCode?: string } | undefined;
    const chosenHex =
      clientSelectedColorHex ??
      selColor?.hexCode ??
      (typeof colorData?.color === 'string' ? colorData.color : null);

    if (chosenHex) {
      finalColorHex = chosenHex;
    }
  }

  const existing = await prisma.cartItem.findFirst({
    where: {
      userId,
      productId,
      variantId: variantId ?? null,
      selectedColorHex: finalColorHex ?? null,
    },
  });
  const target = (existing?.quantity ?? 0) + quantity;

  const maxAvailable = chosenVariant ? chosenVariant.stock : product.stock;
  if (maxAvailable < target) {
    throw new Error(
      existing
        ? `موجودی کافی نیست — ${toFa(existing.quantity)} عدد در سبد شماست و حداکثر موجودی ${toFa(maxAvailable)} عدد است`
        : `موجودی کافی نیست (حداکثر: ${toFa(maxAvailable)} عدد)`,
    );
  }

  if (!isBundle) {
    const singleColors = parseColorOptions(product.colorOptions, product.stock);
    if (finalColorHex && singleColors.length > 0) {
      const opt = singleColors.find(
        (c) => c.hexCode.toUpperCase() === finalColorHex!.toUpperCase(),
      );
      if (opt) {
        if (opt.stock < target) {
          throw new Error(`موجودی رنگ ${opt.hexCode} کافی نیست (موجودی: ${toFa(opt.stock)} عدد)`);
        }
        finalAdjustment = opt.priceAdjustment;
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

  const bItems = parseBundleItems(product.bundleItems, product.stock);
  const bundleItemsWeight = bItems.reduce((sum, item) => sum + (item.weightGrams || 0), 0);
  const singleBundleWeight = bundleItemsWeight > 0 ? bundleItemsWeight : product.weightGrams;
  const effectiveWeightGrams = isBundle ? singleBundleWeight : product.weightGrams;

  let jsonColorData: Prisma.InputJsonValue = (colorData as Prisma.InputJsonValue) ?? Prisma.JsonNull;

  if (isBundle && colorData) {
    const selections = parseBundleSelections(
      colorData,
      quantity,
      bundleSize,
      product.bundleItems,
    );
    if (selections.length > 0) {
      const bundleConfigurations: BundleConfiguration[] = selections.map((s) => ({
        bundleIndex: s.bundleIndex,
        items: s.colors.map((c, i) => ({
          title: bItems[i]?.title || `گلدان ${toFa(i + 1)}`,
          color: c.name,
          hex: c.hex,
        })),
      }));

      jsonColorData = {
        ...(typeof colorData === 'object' && colorData !== null ? colorData : {}),
        weightGrams: effectiveWeightGrams,
        singleBundleWeight: effectiveWeightGrams,
        bundleSelections: selections,
        bundleConfigurations,
      } as Prisma.InputJsonValue;
    } else {
      jsonColorData = {
        ...(typeof colorData === 'object' && colorData !== null ? colorData : {}),
        weightGrams: effectiveWeightGrams,
        singleBundleWeight: effectiveWeightGrams,
      } as Prisma.InputJsonValue;
    }
  }

  if (existing) {
    let finalColorDataToSave = jsonColorData;

    if (isBundle) {
      const existingSelections = parseBundleSelections(
        existing.colorData,
        existing.quantity,
        bundleSize,
        product.bundleItems,
      );
      const incomingBundleCount = Math.max(1, Math.floor(quantity / bundleSize));
      const incomingRaw =
        (colorData as Record<string, unknown>)?.bundleConfigurations ||
        (colorData as Record<string, unknown>)?.bundleSelections ||
        (colorData as Record<string, unknown>)?.bundleColors ||
        colorData;

      const incomingSelections = parseBundleSelections(
        incomingRaw,
        quantity,
        bundleSize,
        product.bundleItems,
      );

      const mergedSelections = mergeBundleSelections(
        existingSelections,
        incomingSelections.length > 0 ? incomingSelections : incomingRaw,
        incomingBundleCount,
      );

      const mergedConfigurations: BundleConfiguration[] = mergedSelections.map((s) => ({
        bundleIndex: s.bundleIndex,
        items: s.colors.map((c, i) => ({
          title: bItems[i]?.title || `گلدان ${toFa(i + 1)}`,
          color: c.name,
          hex: c.hex,
        })),
      }));

      const existingObj =
        typeof existing.colorData === 'object' && existing.colorData !== null
          ? (existing.colorData as Record<string, unknown>)
          : {};

      finalColorDataToSave = {
        ...existingObj,
        ...(typeof colorData === 'object' && colorData !== null ? colorData : {}),
        weightGrams: effectiveWeightGrams,
        singleBundleWeight: effectiveWeightGrams,
        bundleSelections: mergedSelections,
        bundleConfigurations: mergedConfigurations,
      } as Prisma.InputJsonValue;
    }

    return prisma.cartItem.update({
      where: { id: existing.id },
      data: {
        quantity: target,
        selectedColorHex: finalColorHex,
        colorAdjustment: finalAdjustment,
        variantTitle: chosenVariant?.title ?? existing.variantTitle,
        colorData: finalColorDataToSave,
      },
    });
  }

  return prisma.cartItem.create({
    data: {
      userId,
      productId,
      variantId: variantId ?? null,
      variantTitle: chosenVariant?.title ?? null,
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
