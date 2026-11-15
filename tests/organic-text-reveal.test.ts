import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitTextIntoWordsAndChars,
  calculateRevealTimeline,
} from '../src/features/landing/components/OrganicTextReveal';

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

test('OrganicTextReveal - calculateRevealTimeline (fast clean fade-in typing effect)', async (t) => {
  await t.test('calculates fast ~1.5-second total duration (1.5s target) and fast stagger delay for default 5-word title', () => {
    const text = 'به فضاهای خالی، جان بدهیم.';
    const words = splitTextIntoWordsAndChars(text);
    const timeline = calculateRevealTimeline(words);

    assert.equal(timeline.wordCount, 5);
    assert.equal(timeline.totalChars, 22);
    // Target duration defaults to ~1.5s
    assert.equal(timeline.targetDuration, 1.5);
    // Default fast stagger delay is 0.03s per character
    assert.equal(timeline.charStagger, 0.03);
    assert.equal(timeline.staggerChildren, 0.03);
    assert.equal(timeline.charDuration, 0.15);
    // Fast sequence completes rapidly (around 0.78s to 1.5s)
    assert.ok(timeline.calculatedTotalDuration >= 0.7 && timeline.calculatedTotalDuration <= 1.5);
  });

  await t.test('completes longer titles in about 1.5 seconds with fast 0.025-0.03s stagger', () => {
    const longText = splitTextIntoWordsAndChars('طراحی و ساخت انواع گلدان‌های بتنی، سرامیکی و مینیمال برای فضاهای سبز');
    const longTimeline = calculateRevealTimeline(longText);

    assert.equal(longTimeline.wordCount, 12);
    assert.ok(longTimeline.totalChars > 40);
    assert.equal(longTimeline.charStagger, 0.03);
    // ~57 chars * 0.03s ≈ 1.8s
    assert.ok(longTimeline.calculatedTotalDuration >= 1.2 && longTimeline.calculatedTotalDuration <= 2.0);
  });

  await t.test('handles 1-character and 1-word edge cases gracefully', () => {
    const singleWord = splitTextIntoWordsAndChars('پ');
    const timeline = calculateRevealTimeline(singleWord);

    assert.equal(timeline.wordCount, 1);
    assert.equal(timeline.totalChars, 1);
    assert.equal(timeline.charStagger, 0);
    assert.equal(timeline.calculatedTotalDuration, 0.15);
  });

  await t.test('handles 0 or negative inputs gracefully', () => {
    const zeroTimeline = calculateRevealTimeline(0);
    assert.equal(zeroTimeline.wordCount, 0);
    assert.equal(zeroTimeline.totalChars, 0);
    assert.equal(zeroTimeline.calculatedTotalDuration, 0);

    const negativeTimeline = calculateRevealTimeline(-5);
    assert.equal(negativeTimeline.wordCount, 0);
    assert.equal(negativeTimeline.totalChars, 0);
    assert.equal(negativeTimeline.calculatedTotalDuration, 0);
  });

  await t.test('supports custom targetDuration and charStagger configurations', () => {
    const words = splitTextIntoWordsAndChars('یک دو سه چهار');
    const timeline = calculateRevealTimeline(words, {
      targetDuration: 1.5,
      charDuration: 0.15,
      charStagger: 0.025,
    });

    assert.equal(timeline.charDuration, 0.15);
    assert.equal(timeline.charStagger, 0.025);
    assert.equal(timeline.staggerChildren, 0.025);
    assert.equal(timeline.totalDuration, 1.5);
    // For 10 chars: (10 - 1) * 0.025 + 0.15 = 0.225 + 0.15 = 0.375
    assert.ok(Math.abs(timeline.calculatedTotalDuration - 0.375) < 1e-9);
  });
});
