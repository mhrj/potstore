import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeArticleHtml } from '../src/lib/sanitize';

describe('Article HTML sanitization (XSS defense)', () => {
  test('strips dangerous <script> tags and inline JavaScript handlers', () => {
    const dirty = '<p>Hello</p><script>alert("xss")</script><img src="x" onerror="alert(1)" />';
    const clean = sanitizeArticleHtml(dirty);
    assert.ok(!clean.includes('<script>'));
    assert.ok(!clean.includes('onerror'));
    assert.ok(!clean.includes('alert'));
    assert.ok(clean.includes('<p>Hello</p>'));
  });

  test('strips javascript: pseudo-protocol in links and images', () => {
    const dirty = '<a href="javascript:alert(1)">Click me</a><img src="javascript:alert(2)" />';
    const clean = sanitizeArticleHtml(dirty);
    assert.ok(!clean.includes('javascript:'));
    assert.ok(clean.includes('Click me'));
  });

  test('preserves safe formatting, headings, lists, tables and images', () => {
    const safeHtml =
      '<h2>عنوان مقاله</h2><p>این یک <strong>پاراگراف</strong> با <em>فرمت</em> است.</p>' +
      '<ul><li>مورد ۱</li><li>مورد ۲</li></ul>' +
      '<table><thead><tr><th>ستون ۱</th></tr></thead><tbody><tr><td>داده ۱</td></tr></tbody></table>' +
      '<img src="https://example.com/photo.jpg" alt="عکس گلدان" class="rounded-3xl" />';
    const clean = sanitizeArticleHtml(safeHtml);
    assert.ok(clean.includes('<h2>عنوان مقاله</h2>'));
    assert.ok(clean.includes('<strong>پاراگراف</strong>'));
    assert.ok(clean.includes('<ul><li>مورد ۱</li><li>مورد ۲</li></ul>'));
    assert.ok(clean.includes('<table>'));
    assert.ok(clean.includes('src="https://example.com/photo.jpg"'));
  });

  test('adds rel="noopener noreferrer" automatically to target="_blank" links', () => {
    const dirty = '<a href="https://example.com" target="_blank">لینک خارجی</a>';
    const clean = sanitizeArticleHtml(dirty);
    assert.ok(clean.includes('rel="noopener noreferrer"'));
  });
});

