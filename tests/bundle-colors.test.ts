import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBundleSelections,
  getBundleColorSummary,
  resolveColorItem,
  mergeBundleSelections,
  type BundleSelection,
} from '../src/lib/bundle-colors';

describe('Bundle Colors: resolveColorItem', () => {
  test('resolves known Persian color name to name and hex', () => {
    const res = resolveColorItem('سفید');
    assert.equal(res.name, 'سفید');
    assert.equal(res.hex.toUpperCase(), '#FFFFFF');
  });

  test('resolves known hex code to Persian name and hex', () => {
    const res = resolveColorItem('#C86A4B');
    assert.equal(res.name, 'تراکوتا');
    assert.equal(res.hex.toUpperCase(), '#C86A4B');
  });

  test('resolves object with hexCode and name', () => {
    const res = resolveColorItem({ hexCode: '#000000', name: 'مشکی مات' });
    assert.equal(res.name, 'مشکی مات');
    assert.equal(res.hex.toUpperCase(), '#000000');
  });

  test('handles unknown color safely without throwing', () => {
    const res = resolveColorItem('بنفش کهکشانی');
    assert.equal(res.name, 'بنفش کهکشانی');
    assert.ok(res.hex.startsWith('#'));
  });
});

describe('Bundle Colors: parseBundleSelections', () => {
  test('parses bundleSelections array of string colors', () => {
    const raw = {
      bundleSelections: [
        { bundleIndex: 1, colors: ['سفید', 'تراکوتا'] },
        { bundleIndex: 2, colors: ['تراکوتا', 'سفید'] },
      ],
    };
    const selections = parseBundleSelections(raw, 4, 2);
    assert.equal(selections.length, 2);
    assert.equal(selections[0].bundleIndex, 1);
    assert.equal(selections[0].colors[0].name, 'سفید');
    assert.equal(selections[0].colors[1].name, 'تراکوتا');
    assert.equal(selections[1].bundleIndex, 2);
    assert.equal(selections[1].colors[0].name, 'تراکوتا');
    assert.equal(selections[1].colors[1].name, 'سفید');
  });

  test('parses bundleSelections directly when colorData is an array', () => {
    const raw = [
      { bundleIndex: 1, colors: ['مشکی', 'مشکی'] },
      { bundleIndex: 2, colors: ['سفید', 'سفید'] },
    ];
    const selections = parseBundleSelections(raw, 4, 2);
    assert.equal(selections.length, 2);
    assert.equal(selections[0].colors[0].name, 'مشکی');
    assert.equal(selections[1].colors[0].name, 'سفید');
  });

  test('expands legacy bundleColors across quantity/bundleSize count', () => {
    const raw = {
      bundleColors: {
        '0': { hexCode: '#FFFFFF', name: 'سفید' },
        '1': { hexCode: '#C86A4B', name: 'تراکوتا' },
      },
    };
    // 2 bundles (quantity 4, bundleSize 2)
    const selections = parseBundleSelections(raw, 4, 2);
    assert.equal(selections.length, 2);
    assert.equal(selections[0].bundleIndex, 1);
    assert.equal(selections[0].colors[0].name, 'سفید');
    assert.equal(selections[0].colors[1].name, 'تراکوتا');
    assert.equal(selections[1].bundleIndex, 2);
    assert.equal(selections[1].colors[0].name, 'سفید');
    assert.equal(selections[1].colors[1].name, 'تراکوتا');
  });

  test('handles null or empty colorData safely', () => {
    const selections = parseBundleSelections(null, 2, 2);
    assert.ok(Array.isArray(selections));
  });
});

describe('Bundle Colors: getBundleColorSummary (Identical vs Different)', () => {
  test('returns single identical summary when all bundles have the exact same colors', () => {
    const selections: BundleSelection[] = [
      {
        bundleIndex: 1,
        colors: [
          { name: 'سفید', hex: '#FFFFFF' },
          { name: 'تراکوتا', hex: '#C86A4B' },
        ],
      },
      {
        bundleIndex: 2,
        colors: [
          { name: 'سفید', hex: '#FFFFFF' },
          { name: 'تراکوتا', hex: '#C86A4B' },
        ],
      },
    ];

    const summary = getBundleColorSummary(selections, 2);
    assert.ok(summary);
    assert.equal(summary.isIdentical, true);
    if (summary.isIdentical) {
      assert.equal(summary.bundleCount, 2);
      // Must use Persian half-space (ZWNJ) in رنگ‌ها
      assert.ok(summary.summaryText.includes('رنگ\u200Cها'));
      assert.equal(summary.summaryText, '۲ بسته (رنگ\u200Cها: سفید + تراکوتا)');
      assert.equal(summary.colors.length, 2);
    }
  });

  test('returns breakdown lines when bundles have different colors', () => {
    const selections: BundleSelection[] = [
      {
        bundleIndex: 1,
        colors: [
          { name: 'سفید', hex: '#FFFFFF' },
          { name: 'تراکوتا', hex: '#C86A4B' },
        ],
      },
      {
        bundleIndex: 2,
        colors: [
          { name: 'مشکی', hex: '#000000' },
          { name: 'مشکی', hex: '#000000' },
        ],
      },
    ];

    const summary = getBundleColorSummary(selections, 2);
    assert.ok(summary);
    assert.equal(summary.isIdentical, false);
    if (!summary.isIdentical) {
      assert.equal(summary.lines.length, 2);
      assert.equal(summary.lines[0].bundleIndex, 1);
      assert.equal(summary.lines[0].label, 'بسته ۱:');
      assert.equal(summary.lines[0].text, 'سفید + تراکوتا');
      assert.equal(summary.lines[1].bundleIndex, 2);
      assert.equal(summary.lines[1].label, 'بسته ۲:');
      assert.equal(summary.lines[1].text, 'مشکی + مشکی');
    }
  });

  test('returns single bundle format when only 1 bundle was purchased', () => {
    const selections: BundleSelection[] = [
      {
        bundleIndex: 1,
        colors: [
          { name: 'سفید', hex: '#FFFFFF' },
          { name: 'تراکوتا', hex: '#C86A4B' },
        ],
      },
    ];

    const summary = getBundleColorSummary(selections, 1);
    assert.ok(summary);
    assert.equal(summary.isIdentical, true);
    if (summary.isIdentical) {
      assert.equal(summary.summaryText, '۱ بسته (رنگ\u200Cها: سفید + تراکوتا)');
    }
  });
});

describe('Bundle Colors: mergeBundleSelections for Add to Cart', () => {
  test('merges existing bundle selections with newly added bundle without losing previous colors', () => {
    const existingSelections: BundleSelection[] = [
      {
        bundleIndex: 1,
        colors: [
          { name: 'سفید', hex: '#FFFFFF' },
          { name: 'تراکوتا', hex: '#C86A4B' },
        ],
      },
    ];

    const incomingColors = ['مشکی', 'مشکی'];
    const merged = mergeBundleSelections(existingSelections, incomingColors, 1);

    assert.equal(merged.length, 2);
    assert.equal(merged[0].bundleIndex, 1);
    assert.equal(merged[0].colors[0].name, 'سفید');
    assert.equal(merged[0].colors[1].name, 'تراکوتا');
    assert.equal(merged[1].bundleIndex, 2);
    assert.equal(merged[1].colors[0].name, 'مشکی');
    assert.equal(merged[1].colors[1].name, 'مشکی');
  });
});

