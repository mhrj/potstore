'use client';

import React, { useMemo } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

export type WordToken = {
  raw: string;
  clean: string;
  chars: string[];
  isHighlighted: boolean;
};

export type TimelineConfig = {
  targetDuration?: number; // Target total sequence duration in seconds (default: 1.5s)
  charDuration?: number;   // Single character fade-in duration (default: 0.15s)
  charStagger?: number;    // Stagger delay between characters (default: 0.03s)
  staggerChildren?: number;// Stagger delay alias
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
 * - Characters stagger smoothly with a fast delay (0.025s - 0.03s).
 * - Completes rapidly in about 1.5 seconds.
 */
export function calculateRevealTimeline(
  wordInput: number | WordToken[] | number[],
  config: TimelineConfig = {}
): AnimationTimeline {
  const targetDuration = config.targetDuration ?? config.totalDuration ?? 1.5;
  const charDuration = config.charDuration ?? 0.15;

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
      charStagger: 0.03,
      staggerChildren: 0.03,
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

  let charStagger = config.charStagger ?? config.staggerChildren;
  if (charStagger === undefined) {
    if (config.targetDuration !== undefined || config.totalDuration !== undefined) {
      charStagger = Math.max(0.025, Math.min(0.1, (targetDuration - charDuration) / (totalChars - 1)));
    } else {
      // Fast, snappy typing default (0.03s per character)
      charStagger = 0.03;
    }
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
  targetDuration?: number; // Target total sequence duration (default: ~1.5s)
  charStagger?: number;    // Stagger delay per character (default: 0.03s)
  staggerChildren?: number;// Stagger delay alias
};

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: (staggerDelay: number = 0.03) => ({
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.02,
    },
  }),
};

const charVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: 'easeOut',
    },
  },
};

export default function OrganicTextReveal({
  text,
  className = 'mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight break-words max-w-full text-soil-900 dark:text-dust-50 text-center lg:text-start',
  as: Component = 'h1',
  highlightWord = 'جان',
  targetDuration = 1.5,
  charStagger,
  staggerChildren: propStaggerChildren,
}: OrganicTextRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  const words = useMemo(
    () => splitTextIntoWordsAndChars(text, highlightWord),
    [text, highlightWord]
  );

  const timeline = useMemo(
    () =>
      calculateRevealTimeline(words, {
        targetDuration,
        charStagger: charStagger ?? propStaggerChildren,
      }),
    [words, targetDuration, charStagger, propStaggerChildren]
  );

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

  const MotionComponent = motion[Component] as typeof motion.h1;

  return (
    <MotionComponent
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={timeline.charStagger}
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
                <motion.span
                  key={charIdx}
                  variants={charVariants}
                  data-char
                  className="inline"
                >
                  {char}
                </motion.span>
              ))}
            </span>
            {wordIdx < words.length - 1 && (
              <span className="inline-block whitespace-normal">&nbsp;</span>
            )}
          </React.Fragment>
        ))}
      </span>
    </MotionComponent>
  );
}
