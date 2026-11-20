export type ShippingWeightItem = {
  weightGrams?: number | null;
  packageLengthCm?: number | null;
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  quantity?: number | null;
};

/**
 * Calculates chargeable weight for shipping according to postal and courier volumetric rules.
 *
 * - actualWeight = Sum of (item.weightGrams * item.quantity)
 * - volumetricWeight = Sum of ((item.packageLengthCm * item.packageWidthCm * item.packageHeightCm) / 6000 * 1000 * item.quantity)
 * - chargeableWeight = Math.max(actualWeight, volumetricWeight)
 */
export function calculateChargeableWeight(items: ShippingWeightItem[]): {
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
} {
  let actualWeight = 0;
  let volumetricWeightRaw = 0;

  for (const it of items) {
    const qty = Math.max(1, it.quantity || 1);
    const itemActualWeight = Math.max(0, it.weightGrams ?? 0);
    const length = it.packageLengthCm && it.packageLengthCm > 0 ? it.packageLengthCm : 30;
    const width = it.packageWidthCm && it.packageWidthCm > 0 ? it.packageWidthCm : 30;
    const height = it.packageHeightCm && it.packageHeightCm > 0 ? it.packageHeightCm : 30;

    actualWeight += itemActualWeight * qty;
    const itemVolumetric = ((length * width * height) / 6000) * 1000 * qty;
    volumetricWeightRaw += itemVolumetric;
  }

  const volumetricWeight = Math.round(volumetricWeightRaw);
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);

  return {
    actualWeight,
    volumetricWeight,
    chargeableWeight,
  };
}

export function chunkItemsIntoBoxes(cartItems: any[], maxWeight = 29000): any[][] {
  const units: any[] = [];
  
  // 1. Expand items into individual units, extracting proper data
  for (const item of cartItems) {
    // If the item is a bundle, quantity is the total individual items (e.g. 8 pots for 4 sets of 2).
    // The physical shipping units to pack are the bundles themselves (4 bundles).
    const bundleSize = Math.max(1, Number(item.bundleSize) || 1);
    const isBundle = bundleSize > 1 || Boolean(item.bundleLabel);
    const shippingCount = isBundle
      ? Math.max(1, Math.round(item.quantity / bundleSize))
      : Math.max(1, Number(item.quantity) || 1);

    // Weight of 1 shipping unit (1 bundle or 1 regular product)
    const weight =
      item.weightGrams ||
      item.product?.weightGrams ||
      (item.lineWeightGrams && shippingCount ? Math.round(item.lineWeightGrams / shippingCount) : 0) ||
      1000;

    // Price of 1 shipping unit (1 bundle or 1 regular product)
    const price =
      (isBundle && item.lineTotalToman && shippingCount)
        ? Math.round(item.lineTotalToman / shippingCount)
        : (isBundle && item.unitToman && bundleSize)
          ? Math.round(item.unitToman * bundleSize)
          : (item.unitToman ||
             item.unitPriceToman ||
             item.priceToman ||
             item.listUnitToman ||
             item.product?.salePriceToman ||
             item.product?.basePriceToman ||
             0);

    const title =
      item.productName ||
      item.name ||
      item.product?.name ||
      item.title ||
      "گلدان";

    for (let i = 0; i < shippingCount; i++) {
      units.push({ 
        ...item, 
        quantity: 1, 
        weightGrams: weight, 
        priceToman: price,
        unitToman: price,
        productName: title,
        name: title,
      });
    }
  }

  // 2. Sort descending by weight (heaviest first)
  units.sort((a, b) => b.weightGrams - a.weightGrams);

  // 3. Pack into boxes (First-Fit Decreasing)
  const boxes: any[][] = [];
  const boxWeights: number[] = [];

  for (const unit of units) {
    let placed = false;
    for (let i = 0; i < boxes.length; i++) {
      if (boxWeights[i] + unit.weightGrams + 500 <= maxWeight) {
        boxes[i].push(unit);
        boxWeights[i] += unit.weightGrams;
        placed = true;
        break;
      }
    }
    if (!placed) {
      boxes.push([unit]);
      boxWeights.push(unit.weightGrams);
    }
  }

  // 4. Aggregate back into grouped CartItems for each box
  return boxes.map(box => {
    const map = new Map();
    for (const unit of box) {
      const key = unit.id || unit.productId || unit.productName || unit.name; 
      if (map.has(key)) {
        map.get(key).quantity += 1;
      } else {
        map.set(key, { ...unit, quantity: 1 });
      }
    }
    return Array.from(map.values());
  });
}

