import test from 'node:test';
import assert from 'node:assert/strict';
import { priceCart, type Tier } from '../src/lib/pricing';
import {
  extractColorName,
  formatSpecs,
  formatBundleBreakdown,
  groupOrderItems,
  groupOrderItemsByProduct,
  buildProductBreakdownSummary,
  type OrderItemDetailsItem,
} from '../src/features/checkout/components/OrderItemDetails';
import { toFa } from '../src/lib/format';

test('OrderItemDetails & Color/Variant Separation', async (t) => {
  const baseProduct = {
    id: 'pot-ceramic-1',
    slug: 'ceramic-minimal-pot',
    sku: 'POT-CRM-01',
    name: 'گلدان سرامیکی مینیمال',
    material: 'سرامیک',
    diameterCm: 15,
    heightCm: 20,
    basePriceToman: 176_000,
    weightGrams: 800,
    unitsPerCarton: 6,
    bundleSize: 1,
    allowBatchDiscount: true,
  };

  const tiers: Tier[] = [
    { minQuantity: 1, unitPriceToman: 176_000, label: 'تک‌فروشی' },
  ];

  await t.test('priceCart maintains separate lines for different colors with their respective prices', () => {
    // 1 item in black (#000000, no adjustment): 176,000 Toman
    // 1 item in white (#FFFFFF, +14,000 adjustment): 190,000 Toman
    const totals = priceCart([
      {
        product: baseProduct,
        tiers,
        quantity: 1,
        selectedColorHex: '#000000',
        colorAdjustment: 0,
        colorData: { color: '#000000' },
      },
      {
        product: baseProduct,
        tiers,
        quantity: 1,
        selectedColorHex: '#FFFFFF',
        colorAdjustment: 14_000,
        colorData: { color: '#FFFFFF' },
      },
    ]);

    assert.equal(totals.lines.length, 2);

    const [blackLine, whiteLine] = totals.lines;
    assert.equal(blackLine.selectedColorHex, '#000000');
    assert.equal(blackLine.unitToman, 176_000);
    assert.equal(blackLine.lineTotalToman, 176_000);
    assert.equal(blackLine.material, 'سرامیک');
    assert.equal(blackLine.diameterCm, 15);
    assert.equal(blackLine.heightCm, 20);

    assert.equal(whiteLine.selectedColorHex, '#FFFFFF');
    assert.equal(whiteLine.unitToman, 190_000);
    assert.equal(whiteLine.lineTotalToman, 190_000);
    assert.equal(whiteLine.material, 'سرامیک');

    assert.equal(totals.totalQuantity, 2);
    assert.equal(totals.payableToman, 366_000);
  });

  await t.test('extractColorName identifies common colors and Persian names', () => {
    const blackItem: OrderItemDetailsItem = {
      quantity: 1,
      unitToman: 176_000,
      lineTotalToman: 176_000,
      selectedColorHex: '#000000',
    };
    assert.equal(extractColorName(blackItem), 'مشکی');

    const whiteItem: OrderItemDetailsItem = {
      quantity: 1,
      unitToman: 190_000,
      lineTotalToman: 190_000,
      colorData: { selectedColor: { hexCode: '#FFFFFF' } },
    };
    assert.equal(extractColorName(whiteItem), 'سفید');

    const customNameItem: OrderItemDetailsItem = {
      quantity: 1,
      unitToman: 180_000,
      lineTotalToman: 180_000,
      colorData: { selectedColor: { hexCode: '#999999', name: 'نقره‌ای مات' } },
    };
    assert.equal(extractColorName(customNameItem), 'نقره‌ای مات');
  });

  await t.test('formatSpecs creates formatted Persian specs with dimensions and material', () => {
    const item: OrderItemDetailsItem = {
      quantity: 1,
      unitToman: 100_000,
      lineTotalToman: 100_000,
      material: 'سفال',
      diameterCm: 18,
      heightCm: 22,
    };
    const specs = formatSpecs(item);
    assert.ok(specs?.includes('جنس: سفال'));
    assert.ok(specs?.includes(`قطر ${toFa(18)} × ارتفاع ${toFa(22)} سانتی‌متر`));
  });

  await t.test('formatBundleBreakdown formats bundle items into a readable Persian string', () => {
    const bundleItems = [
      { title: 'گلدان ۱۵cm', quantity: 1 },
      { title: 'گلدان ۲۰cm', quantity: 1 },
    ];
    const breakdown = formatBundleBreakdown(bundleItems);
    assert.equal(breakdown, `شامل: ${toFa(1)} عدد گلدان ۱۵cm + ${toFa(1)} عدد گلدان ۲۰cm`);
  });

  await t.test('groupOrderItems groups items by productId and accumulates totals', () => {
    const items: OrderItemDetailsItem[] = [
      {
        id: 'item-1',
        productId: 'pot-minimal',
        productName: 'گلدان بتنی مینیمال',
        imageUrl: 'https://example.com/pot.jpg',
        quantity: 1,
        unitToman: 175_400,
        lineTotalToman: 175_400,
        selectedColorHex: '#FFFFFF',
      },
      {
        id: 'item-2',
        productId: 'pot-minimal',
        productName: 'گلدان بتنی مینیمال',
        imageUrl: 'https://example.com/pot.jpg',
        quantity: 1,
        unitToman: 175_000,
        lineTotalToman: 175_000,
        selectedColorHex: '#000000',
      },
      {
        id: 'item-3',
        productId: 'pot-terracotta',
        productName: 'گلدان سفالی',
        imageUrl: 'https://example.com/terracotta.jpg',
        quantity: 2,
        unitToman: 120_000,
        lineTotalToman: 240_000,
      },
    ];

    const groups = groupOrderItems(items);
    assert.equal(groups.length, 2);

    const minimalGroup = groups.find((g) => g.productId === 'pot-minimal');
    assert.ok(minimalGroup);
    assert.equal(minimalGroup.name, 'گلدان بتنی مینیمال');
    assert.equal(minimalGroup.imageUrl, 'https://example.com/pot.jpg');
    assert.equal(minimalGroup.items.length, 2);
    assert.equal(minimalGroup.totalQuantity, 2);
    assert.equal(minimalGroup.totalToman, 350_400);

    const terracottaGroup = groups.find((g) => g.productId === 'pot-terracotta');
    assert.ok(terracottaGroup);
    assert.equal(terracottaGroup.items.length, 1);
    assert.equal(terracottaGroup.totalQuantity, 2);
    assert.equal(terracottaGroup.totalToman, 240_000);
  });

  await t.test('groupOrderItemsByProduct handles 5 pots in 3 colors with consolidated breakdownSummary', () => {
    // Customer buys 5 pots of the same product in 3 colors: 3 black, 1 white, 1 grey
    const items: OrderItemDetailsItem[] = [
      {
        id: 'line-1',
        productId: 'pot-minimal',
        productName: 'گلدان بتنی مینیمال',
        imageUrl: 'https://example.com/pot-minimal.jpg',
        quantity: 3,
        unitToman: 175_000,
        lineTotalToman: 525_000,
        selectedColorHex: '#000000',
      },
      {
        id: 'line-2',
        productId: 'pot-minimal',
        productName: 'گلدان بتنی مینیمال',
        imageUrl: 'https://example.com/pot-minimal.jpg',
        quantity: 1,
        unitToman: 190_000,
        lineTotalToman: 190_000,
        selectedColorHex: '#FFFFFF',
      },
      {
        id: 'line-3',
        productId: 'pot-minimal',
        productName: 'گلدان بتنی مینیمال',
        imageUrl: 'https://example.com/pot-minimal.jpg',
        quantity: 1,
        unitToman: 180_000,
        lineTotalToman: 180_000,
        colorData: { color: { hexCode: '#808080', name: 'طوسی' } },
      },
    ];

    const uniqueProducts = groupOrderItemsByProduct(items);

    // Assert only 1 unique product group exists
    assert.equal(uniqueProducts.length, 1);
    const product = uniqueProducts[0];

    assert.equal(product.name, 'گلدان بتنی مینیمال');
    assert.equal(product.totalQuantity, 5);
    assert.equal(product.totalToman, 895_000);
    assert.equal(product.imageUrl, 'https://example.com/pot-minimal.jpg');

    // Color breakdown summary must contain all 3 colors with Persian numbers
    assert.equal(
      product.breakdownSummary,
      `${toFa(3)} عدد مشکی، ${toFa(1)} عدد سفید، ${toFa(1)} عدد طوسی`
    );

    // Other products count calculation must be 0 (uniqueProducts.length - 1)
    const otherProductsCount = Math.max(0, uniqueProducts.length - 1);
    assert.equal(otherProductsCount, 0);

    // Color breakdown array
    assert.equal(product.colorBreakdown.length, 3);
    assert.equal(product.colorBreakdown[0].colorName, 'مشکی');
    assert.equal(product.colorBreakdown[0].displayQty, 3);
    assert.equal(product.colorBreakdown[1].colorName, 'سفید');
    assert.equal(product.colorBreakdown[1].displayQty, 1);
    assert.equal(product.colorBreakdown[2].colorName, 'طوسی');
    assert.equal(product.colorBreakdown[2].displayQty, 1);
  });

  await t.test('groupOrderItemsByProduct with multiple distinct products calculates otherProductsCount correctly', () => {
    const items: OrderItemDetailsItem[] = [
      {
        id: 'line-1',
        productId: 'pot-minimal',
        productName: 'گلدان بتنی مینیمال',
        imageUrl: 'https://example.com/pot-minimal.jpg',
        quantity: 2,
        unitToman: 175_000,
        lineTotalToman: 350_000,
        selectedColorHex: '#000000',
      },
      {
        id: 'line-2',
        productId: 'pot-minimal',
        productName: 'گلدان بتنی مینیمال',
        imageUrl: 'https://example.com/pot-minimal.jpg',
        quantity: 1,
        unitToman: 190_000,
        lineTotalToman: 190_000,
        selectedColorHex: '#FFFFFF',
      },
      {
        id: 'line-3',
        productId: 'pot-clay',
        productName: 'گلدان سفالی خمره‌ای',
        imageUrl: 'https://example.com/pot-clay.jpg',
        quantity: 1,
        unitToman: 220_000,
        lineTotalToman: 220_000,
      },
    ];

    const uniqueProducts = groupOrderItemsByProduct(items);
    assert.equal(uniqueProducts.length, 2);

    const firstProduct = uniqueProducts[0];
    assert.equal(firstProduct.name, 'گلدان بتنی مینیمال');
    assert.equal(
      firstProduct.breakdownSummary,
      `${toFa(2)} عدد مشکی، ${toFa(1)} عدد سفید`
    );

    // Exactly 1 other distinct product exists
    const otherProductsCount = Math.max(0, uniqueProducts.length - 1);
    assert.equal(otherProductsCount, 1);
  });

  await t.test('groupOrderItemsByProduct handles bundle as single logical product without duplicating images', () => {
    const bundleItems: OrderItemDetailsItem[] = [
      {
        id: 'bundle-line-1',
        productId: 'pot-bundle-set',
        productName: 'ست ۳ عددی گلدان رومیزی',
        imageUrl: 'https://example.com/bundle.jpg',
        quantity: 6, // 2 sets of 3
        bundleSize: 3,
        isBundle: true,
        unitToman: 100_000, // 100k per pot -> 300k per set
        lineTotalToman: 600_000,
        selectedColorHex: '#000000',
        bundleItems: [
          { title: 'گلدان سایز کوچک', quantity: 1 },
          { title: 'گلدان سایز متوسط', quantity: 1 },
          { title: 'گلدان سایز بزرگ', quantity: 1 },
        ],
      },
    ];

    const uniqueProducts = groupOrderItemsByProduct(bundleItems);
    assert.equal(uniqueProducts.length, 1);

    const bundleGroup = uniqueProducts[0];
    assert.equal(bundleGroup.name, 'ست ۳ عددی گلدان رومیزی');
    assert.equal(bundleGroup.isBundle, true);
    assert.equal(bundleGroup.bundleSize, 3);
    assert.equal(bundleGroup.breakdownSummary, `${toFa(2)} بسته مشکی`);
    assert.equal(bundleGroup.imageUrl, 'https://example.com/bundle.jpg');
    assert.equal(bundleGroup.items.length, 1);
  });
});

