import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONTENT } from '../src/lib/content';

test('DEFAULT_CONTENT has required business fields with Persian defaults', () => {
  const expectedKeys = [
    'home_hero_title',
    'home_hero_subtitle',
    'promo_title',
    'promo_subtitle',
    'about_title',
    'about_body',
    'footer_text',
    'address',
    'phone',
    'email',
    'hours',
  ] as const;

  for (const key of expectedKeys) {
    assert.ok(key in DEFAULT_CONTENT, `Missing expected key in DEFAULT_CONTENT: ${key}`);
    assert.ok(
      typeof DEFAULT_CONTENT[key] === 'string' && DEFAULT_CONTENT[key].length > 0,
      `Key ${key} must have non-empty default content`,
    );
  }
});

test('tag slug generation preserves Persian letters and numbers', () => {
  const slugify = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'tag';

  assert.equal(slugify('گلدان سفالی'), 'گلدان-سفالی');
  assert.equal(slugify('سایز بزرگ ۲۰'), 'سایز-بزرگ-۲۰');
  assert.equal(slugify('  مقاوم در برابر سرما! '), 'مقاوم-در-برابر-سرما');
  assert.equal(slugify(''), 'tag');
});

test('toEn converts Persian and Arabic digits to ASCII digits', async () => {
  const { toEn } = await import('../src/lib/format');
  assert.equal(toEn('PS-۱۴۰۵-۲۰۱۲۵۰'), 'PS-1405-201250');
  assert.equal(toEn('۰۹۱۲۳۴۵۶۷۸۹'), '09123456789');
  assert.equal(toEn('٠١٢٣٤٥٦٧٨٩'), '0123456789'); // Arabic-Indic digits
  assert.equal(toEn('123abc'), '123abc');
});

test('mobile navigation deduplicates account link if already present in base links', () => {
  const links = [
    { href: '/products', label: 'محصولات' },
    { href: '/articles', label: 'مقالات' },
    { href: '/cart', label: 'سبد خرید' },
    { href: '/admin', label: 'داشبورد مدیریت' },
  ];
  const accountHref = '/admin';
  const accountLabel = 'داشبورد مدیریت';

  const filteredLinks = links.filter((link) => link.href !== accountHref);
  const items = accountHref
    ? [...filteredLinks, { href: accountHref, label: accountLabel }]
    : filteredLinks;

  assert.equal(items.filter((i) => i.href === '/admin').length, 1);
  assert.deepEqual(items.map((i) => i.href), ['/products', '/articles', '/cart', '/admin']);
});


