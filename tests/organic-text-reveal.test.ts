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

test('OrganicTextReveal - calculateRevealTimeline (2.71s typing / 2.29s unblur cinematic synchronization)', async (t) => {
  await t.test('calculates exact 5.0-second total duration (2.71s typing + 2.29s focus) for default 5-word title', () => {
    const timeline = calculateRevealTimeline(5);

    assert.equal(timeline.wordCount, 5);
    assert.equal(timeline.typingDuration, 2.71);
    assert.equal(timeline.focusDuration, 2.29);
    assert.equal(timeline.totalDuration, 5.0);
    assert.equal(timeline.wordDuration, 0.3);
    assert.equal(timeline.wordStagger, 0.6025);
    assert.equal(timeline.staggerChildren, 0.6025);
    // (5 - 1) * 0.6025 + 0.3 = 2.41 + 0.3 = 2.71s typing + 2.29s focus = 5.0s
    assert.equal(timeline.calculatedTotalDuration, 5.0);
  });

  await t.test('calculates 4-word title (word stagger (2.71 - 0.3) / 3, total 5.0s)', () => {
    const timeline = calculateRevealTimeline(4);

    assert.equal(timeline.wordCount, 4);
    assert.equal(timeline.typingDuration, 2.71);
    assert.equal(timeline.focusDuration, 2.29);
    assert.equal(timeline.totalDuration, 5.0);
    assert.equal(timeline.wordDuration, 0.3);
    const expectedWordStagger = (2.71 - 0.3) / 3;
    assert.ok(Math.abs(timeline.wordStagger - expectedWordStagger) < 1e-9);
    assert.ok(Math.abs(timeline.staggerChildren - expectedWordStagger) < 1e-9);
    assert.equal(timeline.calculatedTotalDuration, 5.0);
  });

  await t.test('calculates character stagger so the final character completes typing by 2.71s', () => {
    const totalChars = 22;
    const timeline = calculateRevealTimeline(5, { totalChars });

    assert.equal(timeline.totalChars, 22);
    assert.equal(timeline.charDuration, 0.08);
    // (2.71 - 0.08) / (22 - 1) = 2.63 / 21
    const expectedStagger = 2.63 / 21;
    assert.ok(Math.abs(timeline.charStagger - expectedStagger) < 1e-9);

    // Last char start time + char duration must equal exactly 2.71s
    const lastCharStartTime = (totalChars - 1) * timeline.charStagger;
    const lastCharEndTime = lastCharStartTime + timeline.charDuration;
    assert.ok(Math.abs(lastCharEndTime - 2.71) < 1e-9);
  });

  await t.test('dynamically adapts to varied word counts to always equal 5.0 seconds', () => {
    const wordCounts = [2, 3, 6, 8, 10, 15];

    for (const count of wordCounts) {
      const timeline = calculateRevealTimeline(count);
      assert.equal(timeline.wordCount, count);
      assert.equal(timeline.calculatedTotalDuration, 5.0);
      assert.ok(timeline.wordStagger > 0);
    }
  });

  await t.test('handles 1 word edge case gracefully (completes within total duration)', () => {
    const timeline = calculateRevealTimeline(1);
    assert.equal(timeline.wordCount, 1);
    assert.equal(timeline.wordStagger, 0);
    assert.equal(timeline.staggerChildren, 0);
    assert.equal(timeline.calculatedTotalDuration, 5.0);
  });

  await t.test('handles 0 or negative word counts gracefully', () => {
    const zeroTimeline = calculateRevealTimeline(0);
    assert.equal(zeroTimeline.wordCount, 0);
    assert.equal(zeroTimeline.calculatedTotalDuration, 0);
    assert.equal(zeroTimeline.staggerChildren, 0);

    const negativeTimeline = calculateRevealTimeline(-3);
    assert.equal(negativeTimeline.wordCount, 0);
    assert.equal(negativeTimeline.calculatedTotalDuration, 0);
  });

  await t.test('supports custom typing duration and focus duration configurations', () => {
    const timeline = calculateRevealTimeline(4, { typingDuration: 3.0, focusDuration: 0.5 });
    assert.equal(timeline.typingDuration, 3.0);
    assert.equal(timeline.focusDuration, 0.5);
    assert.equal(timeline.totalDuration, 3.5);
    assert.equal(timeline.wordDuration, 0.3);
    // (3.0 - 0.3) / 3 = 2.7 / 3 = 0.9
    assert.ok(Math.abs(timeline.wordStagger - 0.9) < 1e-9);
    assert.ok(Math.abs(timeline.calculatedTotalDuration - 3.5) < 1e-9);
  });
});
