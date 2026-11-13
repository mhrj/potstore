/**
 * Recommendation Engine Pure Scoring Module
 *
 * Implements pure scoring functions for:
 * - SIMILAR: Material (+40), Category (+15), Diameter within ±20% (+15),
 *            Price within ±30% (+10), Color (+10), In-stock (+20). Max 110.
 * - COMPLEMENT: Soil in 'soil-growth' category where soil volume is 1.0x to 1.3x pot volume.
 * - BOUGHT_TOGETHER: Lift metric across paid orders.
 */

export type ScorableProduct = {
  id: string;
  name?: string;
  shortDesc?: string | null;
  material?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  diameterCm: number;
  heightCm: number;
  basePriceToman: number;
  color?: string | null;
  stock: number;
  isActive: boolean;
};

/**
 * Calculates cylindrical volume in Liters:
 * V = (π * (diameterCm / 2)^2 * heightCm) / 1000
 */
export function calculatePotVolumeLiter(diameterCm: number, heightCm: number): number {
  if (diameterCm <= 0 || heightCm <= 0) return 0;
  const radius = diameterCm / 2;
  const volumeCm3 = Math.PI * Math.pow(radius, 2) * heightCm;
  return volumeCm3 / 1000;
}

/**
 * Derives soil volume in Liters from dimensions or textual indication.
 */
export function deriveSoilVolumeLiter(soil: {
  diameterCm?: number;
  heightCm?: number;
  name?: string;
  shortDesc?: string | null;
}): number {
  if (soil.diameterCm && soil.heightCm && soil.diameterCm > 0 && soil.heightCm > 0) {
    return calculatePotVolumeLiter(soil.diameterCm, soil.heightCm);
  }

  const text = `${soil.name || ''} ${soil.shortDesc || ''}`;
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:لیتر|لیتری|L)/i);
  if (match) {
    const parsed = parseFloat(match[1]);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  return 0;
}

/**
 * Scores similarity between target and candidate product.
 * Returns score out of 110.
 */
export function scoreSimilar(target: ScorableProduct, candidate: ScorableProduct): number {
  if (candidate.id === target.id) return 0;
  if (!candidate.isActive) return 0;

  let score = 0;

  // 1. Same material: +40
  if (
    target.material &&
    candidate.material &&
    target.material.trim().toLowerCase() === candidate.material.trim().toLowerCase()
  ) {
    score += 40;
  }

  // 2. Same category: +15
  if (
    target.categoryId &&
    candidate.categoryId &&
    target.categoryId === candidate.categoryId
  ) {
    score += 15;
  }

  // 3. Diameter within ±20%: +15
  if (target.diameterCm > 0 && candidate.diameterCm > 0) {
    const diffRatio = Math.abs(candidate.diameterCm - target.diameterCm) / target.diameterCm;
    if (diffRatio <= 0.20001) {
      score += 15;
    }
  }

  // 4. Price within ±30%: +10
  if (target.basePriceToman > 0 && candidate.basePriceToman > 0) {
    const diffRatio = Math.abs(candidate.basePriceToman - target.basePriceToman) / target.basePriceToman;
    if (diffRatio <= 0.30001) {
      score += 10;
    }
  }

  // 5. Same color: +10
  if (
    target.color &&
    candidate.color &&
    target.color.trim().toLowerCase() === candidate.color.trim().toLowerCase()
  ) {
    score += 10;
  }

  // 6. In stock: +20
  if (candidate.stock > 0) {
    score += 20;
  }

  return score;
}

/**
 * Scores complement fit for potting soil matching a pot.
 * Ideal soil volume is 1.0x to 1.3x pot volume.
 */
export function scoreComplement(pot: ScorableProduct, candidate: ScorableProduct): number {
  if (candidate.id === pot.id) return 0;
  if (!candidate.isActive) return 0;

  // Must belong to soil-growth category
  if (candidate.categorySlug !== 'soil-growth') {
    return 0;
  }

  const potVol = calculatePotVolumeLiter(pot.diameterCm, pot.heightCm);
  if (potVol <= 0) return 0;

  const soilVol = deriveSoilVolumeLiter(candidate);
  if (soilVol <= 0) return 0;

  const ratio = soilVol / potVol;
  if (ratio < 1.0 || ratio > 1.3) {
    return 0;
  }

  // Proximity to midpoint 1.15x ratio gives up to 80 points
  const fitQuality = 1 - Math.abs(ratio - 1.15) / 0.15;
  const fitScore = Math.max(0, Math.min(80, Math.round(fitQuality * 80)));

  // In-stock bonus: +20
  const stockScore = candidate.stock > 0 ? 20 : 0;

  return fitScore + stockScore;
}

/**
 * Statistical Lift across orders:
 * Lift(A, B) = coCount / ((countA * countB) / totalOrders)
 */
export function calculateLift(
  coCount: number,
  countA: number,
  countB: number,
  totalOrders: number,
): number {
  if (totalOrders <= 0 || countA <= 0 || countB <= 0 || coCount <= 0) {
    return 0;
  }

  const expected = (countA * countB) / totalOrders;
  if (expected <= 0) return 0;

  return Math.round((coCount / expected) * 100) / 100;
}

