import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { calculateChargeableWeight, chunkItemsIntoBoxes } from '../src/lib/shipping-utils';

describe('calculateChargeableWeight', () => {
  test('returns actualWeight when actual weight exceeds volumetric weight', () => {
    // Dense heavy item: 2000g, 10x10x10cm (volumetric = 1000 / 6 = 167g)
    const result = calculateChargeableWeight([
      {
        weightGrams: 2000,
        packageLengthCm: 10,
        packageWidthCm: 10,
        packageHeightCm: 10,
        quantity: 1,
      },
    ]);

    assert.equal(result.actualWeight, 2000);
    assert.equal(result.volumetricWeight, 167);
    assert.equal(result.chargeableWeight, 2000);
  });

  test('returns volumetricWeight when volumetric weight exceeds actual weight', () => {
    // Bulky light item: 800g, 30x30x30cm (volumetric = 27000 / 6000 * 1000 = 4500g)
    const result = calculateChargeableWeight([
      {
        weightGrams: 800,
        packageLengthCm: 30,
        packageWidthCm: 30,
        packageHeightCm: 30,
        quantity: 1,
      },
    ]);

    assert.equal(result.actualWeight, 800);
    assert.equal(result.volumetricWeight, 4500);
    assert.equal(result.chargeableWeight, 4500);
  });

  test('correctly scales with item quantities across multiple products', () => {
    // Item 1: 2 units, 500g each, 30x20x10cm
    // Volumetric per unit = 6000 / 6000 * 1000 = 1000g -> total vol = 2000g, total actual = 1000g
    // Item 2: 3 units, 1500g each, 10x10x10cm
    // Volumetric per unit = 1000 / 6 = 166.67g -> 3 units = 500g, total actual = 4500g
    const result = calculateChargeableWeight([
      {
        weightGrams: 500,
        packageLengthCm: 30,
        packageWidthCm: 20,
        packageHeightCm: 10,
        quantity: 2,
      },
      {
        weightGrams: 1500,
        packageLengthCm: 10,
        packageWidthCm: 10,
        packageHeightCm: 10,
        quantity: 3,
      },
    ]);

    assert.equal(result.actualWeight, 5500); // 1000 + 4500
    assert.equal(result.volumetricWeight, 2500); // 2000 + 500
    assert.equal(result.chargeableWeight, 5500);
  });

  test('falls back to 30x30x30cm defaults if package dimensions are missing or null', () => {
    // 30x30x30 default = 4500g volumetric
    const result = calculateChargeableWeight([
      {
        weightGrams: 1000,
        packageLengthCm: null,
        packageWidthCm: undefined,
        packageHeightCm: 0,
        quantity: 1,
      },
    ]);

    assert.equal(result.actualWeight, 1000);
    assert.equal(result.volumetricWeight, 4500);
    assert.equal(result.chargeableWeight, 4500);
  });
});

describe('chunkItemsIntoBoxes', () => {
  test('returns 1 box when total weight is well under 29,000g', () => {
    const items = [
      { id: 'item-1', name: 'گلدان ۱', quantity: 2, weightGrams: 1000 },
      { id: 'item-2', name: 'گلدان ۲', quantity: 3, weightGrams: 2000 },
    ]; // total 2*1000 + 3*2000 = 8000g

    const boxes = chunkItemsIntoBoxes(items);
    assert.equal(boxes.length, 1);
    assert.equal(boxes[0].length, 2);
    const boxWeight = boxes[0].reduce((s, it) => s + (it.weightGrams ?? 0) * it.quantity, 0);
    assert.equal(boxWeight, 8000);
    assert.ok(boxWeight <= 29000);
  });

  test('returns exactly 2 boxes for a 39kg order (39 pots of 1000g each)', () => {
    const items = [{ productId: 'p-39', name: 'گلدان بتنی استوانه‌ای', quantity: 39, weightGrams: 1000 }];

    const boxes = chunkItemsIntoBoxes(items);
    assert.equal(boxes.length, 2);

    // Box 1: 28 units = 28,000g (+ 500g box tare = 28,500g <= 29,000g)
    assert.equal(boxes[0][0].quantity, 28);
    assert.equal(boxes[0][0].weightGrams, 1000);

    // Box 2: 11 units = 11,000g (+ 500g box tare = 11,500g <= 29,000g)
    assert.equal(boxes[1][0].quantity, 11);
    assert.equal(boxes[1][0].weightGrams, 1000);

    // Total quantity strictly conserved: 28 + 11 = 39
    const totalQty = boxes.reduce((acc, box) => acc + box.reduce((sum, it) => sum + it.quantity, 0), 0);
    assert.equal(totalQty, 39);
  });

  test('strictly conserves item quantities with First-Fit Decreasing and no duplication', () => {
    // Cart with 4 items of varied weights and quantities
    const items = [
      { productId: 'p1', name: 'گلدان بزرگ ۱۹ کیلویی', quantity: 1, weightGrams: 19000 },
      { productId: 'p2', name: 'گلدان متوسط ۱۰ کیلویی', quantity: 1, weightGrams: 10000 },
      { productId: 'p3', name: 'ست گلدان ۸.۷ کیلویی', quantity: 2, weightGrams: 8700 },
    ]; // Total weight: 19,000 + 10,000 + 17,400 = 46,400g (4 items total)

    const boxes = chunkItemsIntoBoxes(items, 29000);

    // FFD packs 19kg + 8.7kg = 27.7kg into Box 1, and 10kg + 8.7kg = 18.7kg into Box 2
    assert.equal(boxes.length, 2);

    const box1Weight = boxes[0].reduce((s, it) => s + (it.weightGrams ?? 0) * it.quantity, 0);
    const box2Weight = boxes[1].reduce((s, it) => s + (it.weightGrams ?? 0) * it.quantity, 0);

    assert.equal(box1Weight, 27700);
    assert.ok(box1Weight <= 29000);

    assert.equal(box2Weight, 18700);
    assert.ok(box2Weight <= 29000);

    // Total quantity across all boxes must strictly equal 4 (not 6, no duplicate items!)
    const totalQty = boxes.reduce((acc, box) => acc + box.reduce((sum, it) => sum + it.quantity, 0), 0);
    assert.equal(totalQty, 4);

    // Verify per-product quantity matches original
    const qtyByProduct: Record<string, number> = {};
    for (const box of boxes) {
      for (const it of box) {
        qtyByProduct[it.productId] = (qtyByProduct[it.productId] || 0) + it.quantity;
      }
    }
    assert.equal(qtyByProduct['p1'], 1);
    assert.equal(qtyByProduct['p2'], 1);
    assert.equal(qtyByProduct['p3'], 2);
  });

  test('handles multi-item large cart ensuring exact item conservation', () => {
    const items = [
      { productId: 'a', name: 'محصول الف', quantity: 5, weightGrams: 3000 },
      { productId: 'b', name: 'محصول ب', quantity: 4, weightGrams: 6000 },
      { productId: 'c', name: 'محصول ج', quantity: 2, weightGrams: 12000 },
    ];
    // Total quantity: 5 + 4 + 2 = 11 items.
    // Total weight: 5*3000 + 4*6000 + 2*12000 = 15000 + 24000 + 24000 = 63,000g.

    const boxes = chunkItemsIntoBoxes(items, 29000);

    let totalCalculatedQty = 0;
    const itemTotals: Record<string, number> = {};

    for (const box of boxes) {
      const boxWeight = box.reduce((s, it) => s + (it.weightGrams ?? 0) * it.quantity, 0);
      assert.ok(boxWeight <= 29000, `Box weight ${boxWeight} exceeded 29000g limit`);

      for (const it of box) {
        totalCalculatedQty += it.quantity;
        itemTotals[it.productId] = (itemTotals[it.productId] || 0) + it.quantity;
      }
    }

    assert.equal(totalCalculatedQty, 11);
    assert.equal(itemTotals['a'], 5);
    assert.equal(itemTotals['b'], 4);
    assert.equal(itemTotals['c'], 2);
  });

  test('puts a single oversized item (35kg) into its own box', () => {
    const items = [
      { productId: 'heavy', name: 'گلدان بسیار سنگین ۳۵ کیلویی', quantity: 1, weightGrams: 35000 },
      { productId: 'light', name: 'گلدان کوچک', quantity: 2, weightGrams: 1000 },
    ];

    const boxes = chunkItemsIntoBoxes(items, 29000);
    assert.equal(boxes.length, 2);
    // Box 1 has the oversized 35kg item alone
    assert.equal(boxes[0].length, 1);
    assert.equal(boxes[0][0].weightGrams, 35000);
    // Box 2 has the remaining smaller items
    assert.equal(boxes[1].length, 1);
    assert.equal(boxes[1][0].quantity, 2);

    const totalQty = boxes.reduce((acc, box) => acc + box.reduce((sum, it) => sum + it.quantity, 0), 0);
    assert.equal(totalQty, 3);
  });

  test('chunks a 39.3kg mixed bundle order into exactly 2 boxes without duplicating bundles', () => {
    // 4 bundles of "ست ۲ عددی" (quantity: 8, bundleSize: 2, weight: 8700g per bundle = 34.8kg)
    // 3 standalone pots (quantity: 3, weight: 1500g each = 4.5kg)
    // Total weight: 34,800g + 4,500g = 39,300g (39.3kg)
    const items = [
      {
        productId: 'bundle-pot',
        name: 'گلدان سرامیکی هندسی مدرن',
        quantity: 8,
        bundleSize: 2,
        bundleLabel: 'ست ۲ عددی',
        weightGrams: 8700,
        unitToman: 125000,
        lineTotalToman: 1000000, // 4 bundles * 250,000 Toman
      },
      {
        productId: 'single-pot',
        name: 'گلدان بتنی مینیمال کوچک',
        quantity: 3,
        weightGrams: 1500,
        unitToman: 175400,
      },
    ];

    const boxes = chunkItemsIntoBoxes(items);

    // Must be exactly 2 boxes (under 30kg each)
    assert.equal(boxes.length, 2);

    // Box 1 gets: 3 bundles (26,100g) + 1 single pot (1,500g) = 27,600g <= 28,500g
    const b1Bundles = boxes[0].find((it: any) => it.productId === 'bundle-pot');
    const b1Singles = boxes[0].find((it: any) => it.productId === 'single-pot');
    assert.ok(b1Bundles);
    assert.ok(b1Singles);
    assert.equal(b1Bundles.quantity, 3);
    assert.equal(b1Singles.quantity, 1);

    // Box 2 gets: 1 bundle (8,700g) + 2 single pots (3,000g) = 11,700g <= 28,500g
    const b2Bundles = boxes[1].find((it: any) => it.productId === 'bundle-pot');
    const b2Singles = boxes[1].find((it: any) => it.productId === 'single-pot');
    assert.ok(b2Bundles);
    assert.ok(b2Singles);
    assert.equal(b2Bundles.quantity, 1);
    assert.equal(b2Singles.quantity, 2);

    // Total bundles across both boxes = 3 + 1 = 4 (NOT 8!)
    assert.equal(b1Bundles.quantity + b2Bundles.quantity, 4);

    // Total single pots across both boxes = 1 + 2 = 3
    assert.equal(b1Singles.quantity + b2Singles.quantity, 3);
  });

  test('handles empty items array gracefully', () => {
    const boxes = chunkItemsIntoBoxes([], 29000);
    assert.equal(boxes.length, 0);
  });
});

