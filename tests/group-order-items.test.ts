import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groupOrderItems,
  groupOrderItemsByProduct,
  buildProductBreakdownSummary,
  type OrderItemDetailsItem,
} from '../src/features/checkout/components/OrderItemDetails';
import { toFa } from '../src/lib/format';

test('groupOrderItems - aggregates variants, quantities, and prices by productId', async (t) => {
  await t.test('aggregates multiple color variants of the same product into a single group', () => {
    const items: OrderItemDetailsItem[] = [
      {
        id: 'item-black-1',
        productId: 'pot-ceramic-cyl',
        productName: 'گلدان سرامیکی استوانه‌ای',
        imageUrl: '/images/pot-ceramic.jpg',
        quantity: 3,
        unitToman: 150_000,
        lineTotalToman: 450_000,
        selectedColorHex: '#000000',
      },
      {
        id: 'item-white-1',
        productId: 'pot-ceramic-cyl',
        productName: 'گلدان سرامیکی استوانه‌ای',
        imageUrl: '/images/pot-ceramic.jpg',
        quantity: 2,
        unitToman: 160_000,
        lineTotalToman: 320_000,
        selectedColorHex: '#FFFFFF',
      },
    ];

    const groups = groupOrderItems(items);

    assert.equal(groups.length, 1);
    const group = groups[0];
    assert.equal(group.productId, 'pot-ceramic-cyl');
    assert.equal(group.name, 'گلدان سرامیکی استوانه‌ای');
    assert.equal(group.imageUrl, '/images/pot-ceramic.jpg');
    // Quantities must aggregate correctly
    assert.equal(group.totalQuantity, 5);
    // Prices must aggregate correctly: 450,000 + 320,000 = 770,000
    assert.equal(group.totalToman, 770_000);
    // Variant items must be preserved in group
    assert.equal(group.items.length, 2);
    // Variant breakdown summary: "۳ عدد مشکی، ۲ عدد سفید"
    assert.equal(group.breakdownSummary, `${toFa(3)} عدد مشکی، ${toFa(2)} عدد سفید`);
  });

  await t.test('calculates correct "other products" count using unique products array length', () => {
    // 3 order items total, but only 2 unique products (2 variants of pot 1, 1 variant of pot 2)
    const items: OrderItemDetailsItem[] = [
      {
        id: 'i1',
        productId: 'pot-a',
        productName: 'گلدان مدل آلفا',
        quantity: 1,
        unitToman: 100_000,
        lineTotalToman: 100_000,
        selectedColorHex: '#000000',
      },
      {
        id: 'i2',
        productId: 'pot-a',
        productName: 'گلدان مدل آلفا',
        quantity: 2,
        unitToman: 110_000,
        lineTotalToman: 220_000,
        selectedColorHex: '#FFFFFF',
      },
      {
        id: 'i3',
        productId: 'pot-b',
        productName: 'گلدان مدل بتا',
        quantity: 1,
        unitToman: 200_000,
        lineTotalToman: 200_000,
      },
    ];

    const uniqueProducts = groupOrderItems(items);
    assert.equal(uniqueProducts.length, 2);

    // If we used raw items.length - 1, it would be 3 - 1 = 2 (INCORRECT)
    // With uniqueProducts.length - 1, it is 2 - 1 = 1 (CORRECT)
    const otherProductsCount = Math.max(0, uniqueProducts.length - 1);
    assert.equal(otherProductsCount, 1);
  });

  await t.test('handles bundle items aggregation and displays package quantities', () => {
    const items: OrderItemDetailsItem[] = [
      {
        id: 'b1',
        productId: 'bundle-trio',
        productName: 'ست ۳ عددی گلدان رومیزی',
        bundleSize: 3,
        isBundle: true,
        quantity: 6, // 2 bundles
        unitToman: 50_000,
        lineTotalToman: 300_000,
        selectedColorHex: '#000000',
      },
      {
        id: 'b2',
        productId: 'bundle-trio',
        productName: 'ست ۳ عددی گلدان رومیزی',
        bundleSize: 3,
        isBundle: true,
        quantity: 3, // 1 bundle
        unitToman: 50_000,
        lineTotalToman: 150_000,
        selectedColorHex: '#FFFFFF',
      },
    ];

    const groups = groupOrderItems(items);
    assert.equal(groups.length, 1);
    const group = groups[0];
    assert.equal(group.totalQuantity, 9);
    assert.equal(group.totalToman, 450_000);
    assert.equal(group.breakdownSummary, `${toFa(2)} بسته مشکی، ${toFa(1)} بسته سفید`);
  });
});

