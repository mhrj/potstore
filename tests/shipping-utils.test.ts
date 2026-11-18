import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { calculateChargeableWeight } from '../src/lib/shipping-utils';

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

