import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupCartItems,
  parseBundleConfigurations,
  type GroupedCartItem,
} from '../src/lib/bundle-colors';

describe('TASK 2 — Grouping Logic (groupCartItems)', () => {
  it('Scenario A: Standalone items with multiple colors show ONE group with color breakdown', () => {
    // User buys 1 Red pot and 2 White pots of the same product
    const rawItems = [
      {
        productId: 'pot-ceramic-1',
        productName: 'گلدان سرامیکی لاله',
        productSlug: 'pot-ceramic-laleh',
        quantity: 1,
        selectedColorHex: '#FF0000',
        unitToman: 100000,
        lineTotalToman: 100000,
        isBundle: false,
        bundleSize: 1,
      },
      {
        productId: 'pot-ceramic-1',
        productName: 'گلدان سرامیکی لاله',
        productSlug: 'pot-ceramic-laleh',
        quantity: 2,
        selectedColorHex: '#FFFFFF',
        unitToman: 100000,
        lineTotalToman: 200000,
        isBundle: false,
        bundleSize: 1,
      },
    ];

    const groups = groupCartItems(rawItems);

    // Must return ONE group for the pot, not 2 or 3
    assert.equal(groups.length, 1);
    const grp = groups[0];

    assert.equal(grp.kind, 'standalone');
    assert.equal(grp.totalQuantity, 3);
    assert.equal(grp.totalToman, 300000);

    if (grp.kind === 'standalone') {
      assert.equal(grp.colors.length, 2);
      // Check Red item
      const red = grp.colors.find((c) => c.colorName === 'قرمز');
      assert.ok(red);
      assert.equal(red.quantity, 1);
      assert.equal(red.hexCode.toUpperCase(), '#FF0000');

      // Check White item
      const white = grp.colors.find((c) => c.colorName === 'سفید');
      assert.ok(white);
      assert.equal(white.quantity, 2);
      assert.equal(white.hexCode.toUpperCase(), '#FFFFFF');

      // Summary text contains "1 عدد قرمز" and "2 عدد سفید"
      assert.ok(grp.summaryText.includes('۱ عدد قرمز') || grp.summaryText.includes('قرمز'));
      assert.ok(grp.summaryText.includes('۲ عدد سفید') || grp.summaryText.includes('سفید'));
    }
  });

  it('Scenario B1: Bundles with IDENTICAL configurations return { type: "identical", quantity, config }', () => {
    // 2 bundles, both configured as (Red + White)
    const rawItems = [
      {
        productId: 'bundle-set-2',
        productName: 'ست دو عددی گلدان مینیمال',
        productSlug: 'minimal-pot-set-2',
        quantity: 4, // 2 bundles of size 2
        bundleSize: 2,
        isBundle: true,
        unitToman: 90000,
        lineTotalToman: 360000,
        colorData: {
          bundleConfigurations: [
            {
              bundleIndex: 1,
              items: [
                { title: 'گلدان ۱', color: 'قرمز', hex: '#FF0000' },
                { title: 'گلدان ۲', color: 'سفید', hex: '#FFFFFF' },
              ],
            },
            {
              bundleIndex: 2,
              items: [
                { title: 'گلدان ۱', color: 'قرمز', hex: '#FF0000' },
                { title: 'گلدان ۲', color: 'سفید', hex: '#FFFFFF' },
              ],
            },
          ],
        },
      },
    ];

    const groups = groupCartItems(rawItems);
    assert.equal(groups.length, 1);
    const grp = groups[0];

    assert.equal(grp.kind, 'bundle');
    if (grp.kind === 'bundle') {
      assert.equal(grp.type, 'identical');
      assert.equal(grp.quantity, 2);
      assert.equal(grp.config.items.length, 2);
      assert.equal(grp.config.items[0].color, 'قرمز');
      assert.equal(grp.config.items[1].color, 'سفید');
      // Summary text says e.g. "۲ بسته (قرمز + سفید)"
      assert.equal(grp.summaryText, '۲ بسته (قرمز + سفید)');
    }
  });

  it('Scenario B2: Bundles with MIXED configurations return { type: "mixed", configurations: [...] }', () => {
    // Bundle 1: (Red + White), Bundle 2: (White + Red)
    const rawItems = [
      {
        productId: 'bundle-set-2',
        productName: 'ست دو عددی گلدان مینیمال',
        productSlug: 'minimal-pot-set-2',
        quantity: 4, // 2 bundles of size 2
        bundleSize: 2,
        isBundle: true,
        unitToman: 90000,
        lineTotalToman: 360000,
        colorData: {
          bundleConfigurations: [
            {
              bundleIndex: 1,
              items: [
                { title: 'گلدان ۱', color: 'قرمز', hex: '#FF0000' },
                { title: 'گلدان ۲', color: 'سفید', hex: '#FFFFFF' },
              ],
            },
            {
              bundleIndex: 2,
              items: [
                { title: 'گلدان ۱', color: 'سفید', hex: '#FFFFFF' },
                { title: 'گلدان ۲', color: 'قرمز', hex: '#FF0000' },
              ],
            },
          ],
        },
      },
    ];

    const groups = groupCartItems(rawItems);
    assert.equal(groups.length, 1);
    const grp = groups[0];

    assert.equal(grp.kind, 'bundle');
    if (grp.kind === 'bundle') {
      assert.equal(grp.type, 'mixed');
      assert.equal(grp.quantity, 2);
      assert.equal(grp.configurations.length, 2);

      // Accordion 1 items
      assert.equal(grp.configurations[0].bundleIndex, 1);
      assert.equal(grp.configurations[0].items[0].color, 'قرمز');
      assert.equal(grp.configurations[0].items[1].color, 'سفید');

      // Accordion 2 items
      assert.equal(grp.configurations[1].bundleIndex, 2);
      assert.equal(grp.configurations[1].items[0].color, 'سفید');
      assert.equal(grp.configurations[1].items[1].color, 'قرمز');
    }
  });

  it('Scenario B3: Mixed bundles added as separate cart lines are merged into one group with separate configurations', () => {
    const rawItems = [
      {
        productId: 'bundle-set-2',
        productName: 'ست دو عددی گلدان مینیمال',
        quantity: 2,
        bundleSize: 2,
        isBundle: true,
        unitToman: 90000,
        lineTotalToman: 180000,
        colorData: {
          bundleConfigurations: [
            {
              bundleIndex: 1,
              items: [
                { title: 'گلدان ۱', color: 'مشکی', hex: '#000000' },
                { title: 'گلدان ۲', color: 'سفید', hex: '#FFFFFF' },
              ],
            },
          ],
        },
      },
      {
        productId: 'bundle-set-2',
        productName: 'ست دو عددی گلدان مینیمال',
        quantity: 2,
        bundleSize: 2,
        isBundle: true,
        unitToman: 90000,
        lineTotalToman: 180000,
        colorData: {
          bundleConfigurations: [
            {
              bundleIndex: 1,
              items: [
                { title: 'گلدان ۱', color: 'تراکوتا', hex: '#C86A4B' },
                { title: 'گلدان ۲', color: 'مشکی', hex: '#000000' },
              ],
            },
          ],
        },
      },
    ];

    const groups = groupCartItems(rawItems);
    assert.equal(groups.length, 1);
    const grp = groups[0];

    assert.equal(grp.kind, 'bundle');
    if (grp.kind === 'bundle') {
      assert.equal(grp.type, 'mixed');
      assert.equal(grp.quantity, 2);
      assert.equal(grp.configurations.length, 2);
      assert.equal(grp.configurations[0].items[0].color, 'مشکی');
      assert.equal(grp.configurations[1].items[0].color, 'تراکوتا');
    }
  });

  it('Scenario B4: Inverted color choices (Bundle 1: Black + White, Bundle 2: White + Black) are strictly MIXED', () => {
    // Exact user scenario: Bundle 1 (Black + White), Bundle 2 (White + Black)
    const rawItems = [
      {
        productId: 'ceramic-set-2',
        productName: 'ست دو عددی گلدان سرامیکی',
        productSlug: 'ceramic-pot-set-2',
        quantity: 4, // 2 bundles of size 2
        bundleSize: 2,
        isBundle: true,
        unitToman: 150000,
        lineTotalToman: 600000,
        colorData: {
          bundleConfigurations: [
            {
              bundleIndex: 1,
              items: [
                { title: 'گلدان ۱', color: 'مشکی', hex: '#000000' },
                { title: 'گلدان ۲', color: 'سفید', hex: '#FFFFFF' },
              ],
            },
            {
              bundleIndex: 2,
              items: [
                { title: 'گلدان ۱', color: 'سفید', hex: '#FFFFFF' },
                { title: 'گلدان ۲', color: 'مشکی', hex: '#000000' },
              ],
            },
          ],
        },
      },
    ];

    const groups = groupCartItems(rawItems);
    assert.equal(groups.length, 1);
    const grp = groups[0];

    assert.equal(grp.kind, 'bundle');
    if (grp.kind === 'bundle') {
      // Must NOT be identical — [{color: "black"}, {color: "white"}] !== [{color: "white"}, {color: "black"}]
      assert.equal(grp.type, 'mixed');
      assert.equal(grp.quantity, 2);
      assert.equal(grp.configurations.length, 2);
      assert.equal(grp.summaryText, '۲ بسته با رنگ‌بندی متفاوت');

      // Dropdown 1
      assert.equal(grp.configurations[0].bundleIndex, 1);
      assert.equal(grp.configurations[0].items[0].color, 'مشکی');
      assert.equal(grp.configurations[0].items[1].color, 'سفید');

      // Dropdown 2
      assert.equal(grp.configurations[1].bundleIndex, 2);
      assert.equal(grp.configurations[1].items[0].color, 'سفید');
      assert.equal(grp.configurations[1].items[1].color, 'مشکی');
    }
  });
});

