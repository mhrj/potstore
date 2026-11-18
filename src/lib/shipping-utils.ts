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

