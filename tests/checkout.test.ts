import assert from 'node:assert/strict';
import test from 'node:test';

import { calcShippingToman, priceCart } from '../src/lib/pricing';
import { getStockShortages, isPaymentAlreadyProcessed } from '../src/lib/cart';
import { parseColorOptions } from '../src/lib/product-features';

test('checkout pricing uses tiered prices and shipping rules', () => {
  const totals = priceCart([
    {
      product: {
        id: 'p1',
        slug: 'harvest-pot',
        name: 'گلدان برداشت',
        basePriceToman: 150000,
        weightGrams: 1200,
        unitsPerCarton: 6,
      },
      tiers: [
        { minQuantity: 1, unitPriceToman: 150000, label: 'خرده' },
        { minQuantity: 5, unitPriceToman: 127500, label: 'بسته‌ای' },
      ],
      quantity: 5,
    },
  ]);

  assert.equal(totals.subtotalToman, 750000);
  assert.equal(totals.discountToman, 112500);
  assert.equal(totals.payableToman, 637500);
  assert.equal(totals.channel, 'BATCH');
  assert.equal(calcShippingToman(totals, 'تهران'), 180000);
});

test('checkout validation rejects items that exceed available stock', () => {
  const shortages = getStockShortages([
    { name: 'گلدان آبی', quantity: 2, stock: 1 },
    { name: 'گلدان سبز', quantity: 1, stock: 3 },
  ]);

  assert.deepEqual(shortages, [{ name: 'گلدان آبی', available: 1 }]);
});

test('payment success is resolved only from the stored paid state', () => {
  assert.equal(isPaymentAlreadyProcessed({ paymentStatus: 'PAID', refId: 'ABC123' }), true);
  assert.equal(isPaymentAlreadyProcessed({ paymentStatus: 'PENDING', refId: 'ABC123' }), false);
  assert.equal(isPaymentAlreadyProcessed({ paymentStatus: 'PAID', refId: null }), false);
});

test('priceCart enforces allowBatchDiscount=false so bulk orders do not get discounts', () => {
  const totals = priceCart([
    {
      product: {
        id: 'p2',
        slug: 'no-discount-pot',
        name: 'گلدان بدون تخفیف',
        basePriceToman: 100000,
        weightGrams: 500,
        unitsPerCarton: 1,
        allowBatchDiscount: false,
      },
      tiers: [
        { minQuantity: 1, unitPriceToman: 100000, label: 'خرده' },
        { minQuantity: 5, unitPriceToman: 80000, label: 'بسته‌ای' },
      ],
      quantity: 10,
    },
  ]);

  // Even with 10 units, unit price stays 100,000 and discount is 0
  assert.equal(totals.lines[0].unitToman, 100000);
  assert.equal(totals.lines[0].lineSavingsToman, 0);
  assert.equal(totals.lines[0].lineTotalToman, 1000000);
  assert.equal(totals.payableToman, 1000000);
  assert.equal(totals.discountToman, 0);
});

test('parseColorOptions converts legacy string arrays to objects with defaultStock fallback', () => {
  const legacyStrings = ['#ff0000', '00ff00', '#123'];
  const parsed = parseColorOptions(legacyStrings, 7);
  assert.deepEqual(parsed, [
    { hexCode: '#FF0000', stock: 7, priceAdjustment: 0 },
    { hexCode: '#00FF00', stock: 7, priceAdjustment: 0 },
    { hexCode: '#123', stock: 7, priceAdjustment: 0 },
  ]);
});

test('parseColorOptions preserves stock and parses priceAdjustment when raw contains objects', () => {
  const objects = [
    { hexCode: '#FF0000', stock: 2, priceAdjustment: 20000 },
    { hex: '#00FF00', stock: 0, priceAdjustment: -5000 },
    { hexCode: '#AABBCC' },
  ];
  const parsed = parseColorOptions(objects, 10);
  assert.deepEqual(parsed, [
    { hexCode: '#FF0000', stock: 2, priceAdjustment: 20000 },
    { hexCode: '#00FF00', stock: 0, priceAdjustment: -5000 },
    { hexCode: '#AABBCC', stock: 10, priceAdjustment: 0 },
  ]);
});

test('color-based pricing calculates tiered discounts on adjusted base price (100k base + 20k color with 10% tier discount costs 108k, not 110k)', () => {
  const totals = priceCart([
    {
      product: {
        id: 'pot-color-tier',
        slug: 'gold-glazed-pot',
        name: 'گلدان طلایی',
        basePriceToman: 100000,
        weightGrams: 500,
        unitsPerCarton: 1,
      },
      tiers: [
        { minQuantity: 1, unitPriceToman: 100000, label: 'خرده' },
        { minQuantity: 5, unitPriceToman: 90000, label: 'بسته‌ای (۱۰٪ تخفیف)' },
      ],
      quantity: 5,
      colorAdjustment: 20000,
    },
  ]);

  const line = totals.lines[0];
  // Base 100k + 20k color = 120k effective base price
  // 10% tier discount on 120k gives unit price 108k (not 110k)
  assert.equal(line.colorAdjustment, 20000);
  assert.equal(line.listUnitToman, 120000);
  assert.equal(line.unitToman, 108000);
  assert.equal(line.lineTotalToman, 108000 * 5); // 540,000 Toman
  assert.equal(totals.payableToman, 540000);
  assert.equal(totals.discountToman, 60000); // (120k - 108k) * 5
});

test('priceCart calculates bundle weight by multiplying single bundle weight by bundle count', () => {
  const totals = priceCart([
    {
      product: {
        id: 'bundle-1',
        slug: 'trio-pot-set',
        name: 'ست سه عددی گلدان',
        basePriceToman: 300000,
        weightGrams: 1500, // Top-level bundle weight fallback
        bundleSize: 3,
        bundleItems: [
          { title: 'گلدان ۱', material: 'سفال', diameterCm: 10, heightCm: 15, weightGrams: 400 },
          { title: 'گلدان ۲', material: 'سفال', diameterCm: 12, heightCm: 18, weightGrams: 500 },
          { title: 'گلدان ۳', material: 'سفال', diameterCm: 15, heightCm: 22, weightGrams: 600 },
        ],
      },
      tiers: [{ minQuantity: 1, unitPriceToman: 300000, label: 'خرده' }],
      quantity: 6, // 6 individual units = 2 bundles (since bundleSize=3)
    },
  ]);

  // Single bundle weight = 400 + 500 + 600 = 1500g
  // 2 bundles = 1500 * 2 = 3000g (NOT 1500 * 6 = 9000g)
  assert.equal(totals.lines[0].weightGrams, 1500);
  assert.equal(totals.lines[0].lineWeightGrams, 3000);
  assert.equal(totals.totalWeightGrams, 3000);
});
