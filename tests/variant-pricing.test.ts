import test from 'node:test';
import assert from 'node:assert/strict';
import { priceLine, priceCart, type Tier } from '../src/lib/pricing';

test('Variant Pricing: priceLine', async (t) => {
  const product = {
    id: 'pot-regular-1',
    slug: 'minimal-pot',
    name: 'گلدان مینیمال',
    basePriceToman: 100_000,
    weightGrams: 1000,
    unitsPerCarton: 4,
    bundleSize: 1,
    allowBatchDiscount: true,
  };

  const tiers: Tier[] = [
    { minQuantity: 1, unitPriceToman: 100_000, label: 'تک‌فروشی' },
    { minQuantity: 5, unitPriceToman: 85_000, label: 'بسته‌ای' }, // 15% discount
    { minQuantity: 20, unitPriceToman: 70_000, label: 'عمده' }, // 30% discount
  ];

  await t.test('uses variant price as base when variant is selected (quantity 1)', () => {
    const line = priceLine({
      product,
      tiers,
      quantity: 1,
      variantId: 'var-large',
      variantTitle: 'سایز ۲۰',
      variantPriceToman: 150_000,
    });

    assert.equal(line.variantId, 'var-large');
    assert.equal(line.variantTitle, 'سایز ۲۰');
    assert.equal(line.listUnitToman, 150_000);
    assert.equal(line.unitToman, 150_000);
    assert.equal(line.lineTotalToman, 150_000);
  });

  await t.test('scales volume discount tiers proportionally to the variant price', () => {
    // Product base: 100,000 -> 5+ units: 85,000 (15% discount)
    // Variant price: 200,000 -> 5+ units: 200,000 * 0.85 = 170,000 Toman
    const line = priceLine({
      product,
      tiers,
      quantity: 5,
      variantId: 'var-xl',
      variantTitle: 'سایز ۲۵',
      variantPriceToman: 200_000,
    });

    assert.equal(line.unitToman, 170_000);
    assert.equal(line.lineTotalToman, 170_000 * 5);
    assert.equal(line.savingsPercent, 15);
  });

  await t.test('falls back to product base price if no variant is specified', () => {
    const line = priceLine({
      product,
      tiers,
      quantity: 1,
    });

    assert.equal(line.variantId, null);
    assert.equal(line.variantTitle, null);
    assert.equal(line.unitToman, 100_000);
    assert.equal(line.lineTotalToman, 100_000);
  });
});

test('Variant Pricing: priceCart with multiple variants of the same product', async (t) => {
  const product = {
    id: 'pot-regular-1',
    slug: 'minimal-pot',
    name: 'گلدان مینیمال',
    basePriceToman: 100_000,
    weightGrams: 1000,
    unitsPerCarton: 4,
    bundleSize: 1,
  };

  const tiers: Tier[] = [
    { minQuantity: 1, unitPriceToman: 100_000, label: 'تک‌فروشی' },
  ];

  const cartTotals = priceCart([
    {
      product,
      tiers,
      quantity: 2,
      variantId: 'var-15',
      variantTitle: 'سایز ۱۵',
      variantPriceToman: 120_000,
    },
    {
      product,
      tiers,
      quantity: 1,
      variantId: 'var-20',
      variantTitle: 'سایز ۲۰',
      variantPriceToman: 180_000,
    },
  ]);

  assert.equal(cartTotals.totalQuantity, 3);
  assert.equal(cartTotals.lines.length, 2);
  assert.equal(cartTotals.lines[0].lineTotalToman, 240_000);
  assert.equal(cartTotals.lines[1].lineTotalToman, 180_000);
  assert.equal(cartTotals.payableToman, 420_000);
});

test('calculateTotalStock: dynamic stock from variants and color options', async (t) => {
  const { calculateTotalStock } = await import('../src/lib/product-features');

  await t.test('sums stock from variants and ignores base product.stock', () => {
    const product = {
      stock: 112, // base stock in DB
      variants: [
        { stock: 120 },
        { stock: 120 },
      ],
    };

    const total = calculateTotalStock(product);
    assert.equal(total, 240);
    assert.notEqual(total, 112);
  });

  await t.test('sums stock from colorOptions if variants are empty and ignores base stock', () => {
    const product = {
      stock: 112,
      colorOptions: [
        { hexCode: '#FFFFFF', stock: 120 },
        { hexCode: '#000000', stock: 120 },
      ],
    };

    const total = calculateTotalStock(product);
    assert.equal(total, 240);
  });

  await t.test('falls back to base product.stock if no variants or colorOptions', () => {
    const product = {
      stock: 112,
    };

    const total = calculateTotalStock(product);
    assert.equal(total, 112);
  });
});

