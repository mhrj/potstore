'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAnimate, useReducedMotion, stagger, type AnimationPlaybackControls } from 'framer-motion';

export type WordToken = {
  raw: string;
  clean: string;
  chars: string[];
  isHighlighted: boolean;
};

export type TimelineConfig = {
  targetDuration?: number; // Target total sequence duration in seconds (default: 3.5s)
  charDuration?: number;   // Single character fade-in duration (default: 0.3s)
  charStagger?: number;    // Stagger delay between characters
  totalDuration?: number;  // Backwards-compatible alias for targetDuration
  totalChars?: number;     // Optional character count
};

export type AnimationTimeline = {
  totalDuration: number;
  targetDuration: number;
  totalChars: number;
  wordCount: number;
  charDuration: number;
  charStagger: number;
  staggerChildren: number; // Backwards-compatible alias for charStagger
  calculatedTotalDuration: number;
};

/**
 * Calculates dynamic character-by-character fade-in timeline:
 * - Each character starts at opacity: 0 and simply fades in to opacity: 1 (no blur).
 * - Characters stagger smoothly from right to left (RTL).
 * - Total duration reveals smoothly over about 3 to 4 seconds (default: 3.5s).
 */
export function calculateRevealTimeline(
  wordInput: number | WordToken[] | number[],
  config: TimelineConfig = {}
): AnimationTimeline {
  const targetDuration = config.targetDuration ?? config.totalDuration ?? 3.5;
  const charDuration = config.charDuration ?? 0.3;

  let wordCount = 0;
  let totalChars = 0;

  if (typeof wordInput === 'number') {
    wordCount = Math.max(0, wordInput);
    totalChars = config.totalChars ?? (wordCount > 0 ? wordCount * 4.4 : 0);
  } else if (Array.isArray(wordInput)) {
    wordCount = wordInput.length;
    totalChars = (wordInput as Array<number | WordToken>).reduce<number>((sum: number, item) => {
      if (typeof item === 'number') return sum + Math.max(1, item);
      if (item && typeof item === 'object' && Array.isArray(item.chars)) {
        return sum + item.chars.length;
      }
      return sum + 4;
    }, 0);
  }

  totalChars = Math.round(totalChars);

  if (wordCount <= 0 || totalChars <= 0) {
    return {
      totalDuration: targetDuration,
      targetDuration,
      totalChars: 0,
      wordCount: 0,
      charDuration,
      charStagger: 0.1,
      staggerChildren: 0.1,
      calculatedTotalDuration: 0,
    };
  }

  if (totalChars === 1) {
    return {
      totalDuration: targetDuration,
      targetDuration,
      totalChars: 1,
      wordCount,
      charDuration,
      charStagger: 0,
      staggerChildren: 0,
      calculatedTotalDuration: charDuration,
    };
  }

  let charStagger = config.charStagger;
  if (charStagger === undefined) {
    const idealStagger = (targetDuration - charDuration) / (totalChars - 1);
    charStagger = Math.max(0.04, Math.min(0.25, idealStagger));
  }

  const calculatedTotalDuration = (totalChars - 1) * charStagger + charDuration;

  return {
    totalDuration: targetDuration,
    targetDuration,
    totalChars,
    wordCount,
    charDuration,
    charStagger,
    staggerChildren: charStagger,
    calculatedTotalDuration,
  };
}

/**
 * Splits text into words and individual characters, preserving Persian
 * typography, punctuation, and Zero-Width Non-Joiners (ZWNJ / نیم‌فاصله).
 */
export function splitTextIntoWordsAndChars(
  text: string,
  highlightWord: string | null = 'جان'
): WordToken[] {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  const rawWords = trimmed.split(/\s+/);
  return rawWords.map((raw) => {
    const clean = raw.replace(/[.,،؛!؟:—\-]/g, '');
    const isHighlighted =
      highlightWord !== null &&
      highlightWord !== undefined &&
      (clean === highlightWord || raw === highlightWord);

    return {
      raw,
      clean,
      chars: Array.from(raw),
      isHighlighted,
    };
  });
}

type OrganicTextRevealProps = {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  highlightWord?: string | null;
  targetDuration?: number; // Target total sequence duration (default: ~3.5s)
  charStagger?: number;
};

export default function OrganicTextReveal({
  text,
  className = 'mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight break-words max-w-full text-soil-900 dark:text-dust-50 text-center lg:text-start',
  as: Component = 'h1',
  highlightWord = 'جان',
  targetDuration = 3.5,
  charStagger,
}: OrganicTextRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const [isDone, setIsDone] = useState(false);

  const words = useMemo(
    () => splitTextIntoWordsAndChars(text, highlightWord),
    [text, highlightWord]
  );

  const timeline = useMemo(
    () =>
      calculateRevealTimeline(words, {
        targetDuration,
        charStagger,
      }),
    [words, targetDuration, charStagger]
  );

  useEffect(() => {
    if (shouldReduceMotion) return;

    let isMounted = true;
    let controls: AnimationPlaybackControls | null = null;

    // Set initial opacity to 0
    animate('span[data-char]', { opacity: 0 }, { duration: 0 });

    const startTypingFadeIn = () => {
      if (!scope.current || !isMounted) return;

      controls = animate(
        'span[data-char]',
        { opacity: 1 },
        {
          duration: timeline.charDuration,
          delay: stagger(timeline.charStagger),
          ease: 'easeOut',
        }
      );

      controls
        .then(() => {
          if (isMounted) setIsDone(true);
        })
        .catch(() => {});
    };

    const timer = setTimeout(startTypingFadeIn, 40);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (controls) {
        try {
          controls.stop();
        } catch {}
      }
    };
  }, [shouldReduceMotion, scope, timeline]);

  // Fallback for reduced motion: display crisp final text immediately
  if (shouldReduceMotion) {
    return (
      <Component className={className} dir="rtl" style={{ opacity: 1 }}>
        {words.map((word, wordIdx) => (
          <React.Fragment key={wordIdx}>
            <span
              className={`inline-block whitespace-nowrap ${
                word.isHighlighted
                  ? 'bg-gradient-to-r from-flora-700 via-dust-400 to-flora-700 dark:from-flora-300 dark:via-dust-300 dark:to-flora-300 bg-clip-text text-transparent font-black'
                  : ''
              }`}
            >
              {word.raw}
            </span>
            {wordIdx < words.length - 1 && (
              <span className="inline-block whitespace-normal">&nbsp;</span>
            )}
          </React.Fragment>
        ))}
      </Component>
    );
  }

  return (
    <Component
      ref={scope}
      className={className}
      aria-label={text}
      dir="rtl"
      style={{ opacity: 1 }}
    >
      <span aria-hidden="true" className="inline break-words">
        {words.map((word, wordIdx) => (
          <React.Fragment key={wordIdx}>
            <span
              className={`inline-block whitespace-nowrap ${
                word.isHighlighted
                  ? 'bg-gradient-to-r from-flora-700 via-dust-400 to-flora-700 dark:from-flora-300 dark:via-dust-300 dark:to-flora-300 bg-clip-text text-transparent font-black'
                  : ''
              }`}
            >
              {word.chars.map((char, charIdx) => (
                <span
                  key={charIdx}
                  data-char
                  className="inline"
                  style={{ opacity: isDone ? 1 : 0 }}
                >
                  {char}
                </span>
              ))}
            </span>
            {wordIdx < words.length - 1 && (
              <span className="inline-block whitespace-normal">&nbsp;</span>
            )}
          </React.Fragment>
        ))}
      </span>
    </Component>
  );
}
