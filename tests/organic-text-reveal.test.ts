import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTextIntoWordsAndChars } from '../src/features/landing/components/OrganicTextReveal';

test('OrganicTextReveal - splitTextIntoWordsAndChars', async (t) => {
  await t.test('splits standard Persian sentence into words and characters', () => {
    const text = 'به فضاهای خالی، جان بدهیم.';
    const result = splitTextIntoWordsAndChars(text);

    assert.equal(result.length, 5);

    // Word 0: "به"
    assert.equal(result[0].raw, 'به');
    assert.deepEqual(result[0].chars, ['ب', 'ه']);
    assert.equal(result[0].isHighlighted, false);

    // Word 1: "فضاهای"
    assert.equal(result[1].raw, 'فضاهای');
    assert.deepEqual(result[1].chars, ['ف', 'ض', 'ا', 'ه', 'ا', 'ی']);
    assert.equal(result[1].isHighlighted, false);

    // Word 2: "خالی،" (with Persian comma)
    assert.equal(result[2].raw, 'خالی،');
    assert.equal(result[2].clean, 'خالی');
    assert.deepEqual(result[2].chars, ['خ', 'ا', 'ل', 'ی', '،']);
    assert.equal(result[2].isHighlighted, false);

    // Word 3: "جان" (default highlighted keyword)
    assert.equal(result[3].raw, 'جان');
    assert.equal(result[3].clean, 'جان');
    assert.deepEqual(result[3].chars, ['ج', 'ا', 'ن']);
    assert.equal(result[3].isHighlighted, true);

    // Word 4: "بدهیم." (with period)
    assert.equal(result[4].raw, 'بدهیم.');
    assert.equal(result[4].clean, 'بدهیم');
    assert.deepEqual(result[4].chars, ['ب', 'د', 'ه', 'ی', 'م', '.']);
    assert.equal(result[4].isHighlighted, false);
  });

  await t.test('preserves Persian Zero-Width Non-Joiner (ZWNJ / نیم‌فاصله) within words', () => {
    const text = 'گلدان‌ها زیبا هستند';
    const result = splitTextIntoWordsAndChars(text);

    assert.equal(result.length, 3);
    assert.equal(result[0].raw, 'گلدان‌ها');
    assert.deepEqual(result[0].chars, ['گ', 'ل', 'د', 'ا', 'ن', '\u200C', 'ه', 'ا']);
    assert.equal(result[0].chars.includes('\u200C'), true);
  });

  await t.test('handles irregular whitespace, tabs, and trims surrounding spaces', () => {
    const text = '   پات    استور   خاک  ';
    const result = splitTextIntoWordsAndChars(text);

    assert.equal(result.length, 3);
    assert.equal(result[0].raw, 'پات');
    assert.equal(result[1].raw, 'استور');
    assert.equal(result[2].raw, 'خاک');
  });

  await t.test('handles empty or whitespace-only inputs gracefully', () => {
    assert.deepEqual(splitTextIntoWordsAndChars(''), []);
    assert.deepEqual(splitTextIntoWordsAndChars('   '), []);
    // @ts-expect-error test invalid input safety
    assert.deepEqual(splitTextIntoWordsAndChars(null), []);
    // @ts-expect-error test invalid input safety
    assert.deepEqual(splitTextIntoWordsAndChars(undefined), []);
  });

  await t.test('supports custom highlight word and allows disabling highlights with null', () => {
    const customText = 'گلدان بتنی مینیمال';
    const customHighlight = splitTextIntoWordsAndChars(customText, 'مینیمال');
    assert.equal(customHighlight[0].isHighlighted, false);
    assert.equal(customHighlight[1].isHighlighted, false);
    assert.equal(customHighlight[2].isHighlighted, true);

    const noHighlight = splitTextIntoWordsAndChars('به فضاهای خالی، جان بدهیم.', null);
    assert.equal(noHighlight.some((w) => w.isHighlighted), false);
  });
});

