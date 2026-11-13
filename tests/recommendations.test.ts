import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreSimilar,
  calculatePotVolumeLiter,
  scoreComplement,
  calculateLift,
  type ScorableProduct,
} from '../src/features/recommendations/scoring';

test('Recommendations: scoreSimilar', async (t) => {
  const basePot: ScorableProduct = {
    id: 'pot-1',
    material: 'سفال',
    categoryId: 'cat-pots',
    categorySlug: 'pots-decor',
    diameterCm: 20,
    heightCm: 18,
    basePriceToman: 100_000,
    color: 'قرمز',
    stock: 5,
    isActive: true,
  };

  await t.test('returns 0 when candidate is the product itself', () => {
    const score = scoreSimilar(basePot, { ...basePot });
    assert.equal(score, 0);
  });

  await t.test('returns 0 when candidate is inactive', () => {
    const score = scoreSimilar(basePot, { ...basePot, id: 'pot-2', isActive: false });
    assert.equal(score, 0);
  });

  await t.test('awards +40 for same material', () => {
    const candidate: ScorableProduct = {
      id: 'pot-2',
      material: 'سفال',
      categoryId: 'other-cat',
      diameterCm: 50, // > 20% diff
      heightCm: 50,
      basePriceToman: 300_000, // > 30% diff
      color: 'آبی',
      stock: 0,
      isActive: true,
    };
    const score = scoreSimilar(basePot, candidate);
    assert.equal(score, 40);
  });

  await t.test('awards +15 for same category', () => {
    const candidate: ScorableProduct = {
      id: 'pot-2',
      material: 'سرامیک',
      categoryId: 'cat-pots',
      diameterCm: 50,
      heightCm: 50,
      basePriceToman: 300_000,
      color: 'آبی',
      stock: 0,
      isActive: true,
    };
    const score = scoreSimilar(basePot, candidate);
    assert.equal(score, 15);
  });

  await t.test('awards +15 for diameter within ±20%', () => {
    // 20cm * 0.20 = ±4cm -> [16, 24]
    const inRange: ScorableProduct = {
      id: 'pot-2',
      material: 'سرامیک',
      categoryId: 'other-cat',
      diameterCm: 23, // within 20%
      heightCm: 20,
      basePriceToman: 300_000,
      color: 'آبی',
      stock: 0,
      isActive: true,
    };
    assert.equal(scoreSimilar(basePot, inRange), 15);

    const outOfRange: ScorableProduct = {
      ...inRange,
      diameterCm: 25, // > 20%
    };
    assert.equal(scoreSimilar(basePot, outOfRange), 0);
  });

  await t.test('awards +10 for price within ±30%', () => {
    // 100k * 0.30 = ±30k -> [70k, 130k]
    const inRange: ScorableProduct = {
      id: 'pot-2',
      material: 'سرامیک',
      categoryId: 'other-cat',
      diameterCm: 50,
      heightCm: 50,
      basePriceToman: 125_000, // within 30%
      color: 'آبی',
      stock: 0,
      isActive: true,
    };
    assert.equal(scoreSimilar(basePot, inRange), 10);

    const outOfRange: ScorableProduct = {
      ...inRange,
      basePriceToman: 135_000, // > 30%
    };
    assert.equal(scoreSimilar(basePot, outOfRange), 0);
  });

  await t.test('awards +10 for same color and +20 for inStock', () => {
    const candidate: ScorableProduct = {
      id: 'pot-2',
      material: 'سرامیک',
      categoryId: 'other-cat',
      diameterCm: 50,
      heightCm: 50,
      basePriceToman: 300_000,
      color: 'قرمز', // +10
      stock: 10, // +20
      isActive: true,
    };
    assert.equal(scoreSimilar(basePot, candidate), 30);
  });

  await t.test('aggregates to 110 for a fully matching candidate', () => {
    const identicalCandidate: ScorableProduct = {
      id: 'pot-2',
      material: 'سفال', // +40
      categoryId: 'cat-pots', // +15
      diameterCm: 20, // +15
      heightCm: 18,
      basePriceToman: 100_000, // +10
      color: 'قرمز', // +10
      stock: 2, // +20
      isActive: true,
    };
    assert.equal(scoreSimilar(basePot, identicalCandidate), 110);
  });
});

test('Recommendations: calculatePotVolumeLiter & scoreComplement', async (t) => {
  // Pot with 20cm diameter and 20cm height
  // Radius r = 10cm. Area = pi * 100 = 314.159 cm^2
  // Volume = 314.159 * 20 = 6283.185 cm^3 = ~6.283 Liters
  const pot: ScorableProduct = {
    id: 'pot-cylinder',
    material: 'سفال',
    diameterCm: 20,
    heightCm: 20,
    basePriceToman: 150_000,
    stock: 5,
    isActive: true,
  };

  await t.test('calculatePotVolumeLiter produces cylinder volume in liters', () => {
    const vol = calculatePotVolumeLiter(pot.diameterCm, pot.heightCm);
    assert.ok(Math.abs(vol - 6.283) < 0.01);
  });

  await t.test('rejects non soil-growth products as complements', () => {
    const ceramicPot: ScorableProduct = {
      id: 'pot-other',
      material: 'سرامیک',
      categorySlug: 'pots-decor',
      diameterCm: 20,
      heightCm: 20,
      basePriceToman: 50_000,
      stock: 10,
      isActive: true,
    };
    assert.equal(scoreComplement(pot, ceramicPot), 0);
  });

  await t.test('scores complement positively when soil volume is 1.0x to 1.3x pot volume', () => {
    const potVol = calculatePotVolumeLiter(pot.diameterCm, pot.heightCm); // ~6.283 L

    // Ideal soil volume: ~7.0L (ratio = 7.0 / 6.283 = ~1.11x, in range [1.0, 1.3])
    // Cylinder: diameter 22cm, height 18.5cm -> pi * 11^2 * 18.5 / 1000 = ~7.03 L
    const goodSoil: ScorableProduct = {
      id: 'soil-1',
      name: 'خاک گیاهان آپارتمانی ۷ لیتری',
      categorySlug: 'soil-growth',
      diameterCm: 22,
      heightCm: 18.5,
      basePriceToman: 45_000,
      stock: 20,
      isActive: true,
    };

    const score = scoreComplement(pot, goodSoil);
    assert.ok(score > 50, `Expected score > 50, got ${score}`);
  });

  await t.test('returns 0 when soil volume is too small (< 1.0x) or too big (> 1.3x)', () => {
    // Too small soil: ~3.0L
    const smallSoil: ScorableProduct = {
      id: 'soil-small',
      name: 'خاک کوچک ۳ لیتری',
      categorySlug: 'soil-growth',
      diameterCm: 15,
      heightCm: 17, // ~3.0L
      basePriceToman: 20_000,
      stock: 10,
      isActive: true,
    };
    assert.equal(scoreComplement(pot, smallSoil), 0);

    // Too big soil: ~15.0L
    const bigSoil: ScorableProduct = {
      id: 'soil-big',
      name: 'خاک بزرگ ۱۵ لیتری',
      categorySlug: 'soil-growth',
      diameterCm: 32,
      heightCm: 19, // ~15.2L
      basePriceToman: 80_000,
      stock: 10,
      isActive: true,
    };
    assert.equal(scoreComplement(pot, bigSoil), 0);
  });
});

test('Recommendations: calculateLift', async (t) => {
  await t.test('calculates correct lift ratio', () => {
    // Total 100 orders, product A in 20 orders, product B in 20 orders, co-occurred in 10 orders
    // Expected co-occurrences = (20 * 20) / 100 = 4
    // Lift = 10 / 4 = 2.5
    const lift = calculateLift(10, 20, 20, 100);
    assert.equal(lift, 2.5);
  });

  await t.test('handles zero orders or zero counts safely', () => {
    assert.equal(calculateLift(0, 0, 0, 0), 0);
    assert.equal(calculateLift(5, 0, 10, 100), 0);
    assert.equal(calculateLift(5, 10, 0, 100), 0);
    assert.equal(calculateLift(5, 10, 10, 0), 0);
  });
});

