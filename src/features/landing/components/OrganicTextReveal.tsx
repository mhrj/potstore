'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

export type WordToken = {
  raw: string;
  clean: string;
  chars: string[];
  isHighlighted: boolean;
};

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
};

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
    },
  },
};

const getWordVariants = (charCount: number): Variants => ({
  hidden: {
    filter: 'blur(5px)',
  },
  visible: {
    filter: 'blur(0px)',
    transition: {
      staggerChildren: 0.045,
      filter: {
        delay: Math.max(0.1, charCount * 0.045 * 0.85),
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  },
});

const charVariants: Variants = {
  hidden: {
    opacity: 0,
    filter: 'blur(8px)',
    y: 2,
  },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: {
      opacity: { duration: 0.22, ease: 'easeOut' },
      filter: { duration: 0.38, ease: 'easeOut' },
      y: { duration: 0.28, ease: 'easeOut' },
    },
  },
};

export default function OrganicTextReveal({
  text,
  className = 'mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight break-words text-soil-900 dark:text-dust-50 text-center lg:text-right',
  as: Component = 'h1',
  highlightWord = 'جان',
}: OrganicTextRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isAnimating, setIsAnimating] = useState(!shouldReduceMotion);
  const words = splitTextIntoWordsAndChars(text, highlightWord);

  const MotionComponent = motion[Component] as typeof motion.h1;
  const willChangeStyle = isAnimating ? 'filter, opacity' : 'auto';

  // Fallback for reduced motion: render plain text instantly without animations or blur
  if (shouldReduceMotion) {
    return (
      <Component className={className} dir="rtl">
        {words.map((word, wordIdx) => (
          <React.Fragment key={wordIdx}>
            <span
              className={`inline-block ${
                word.isHighlighted
                  ? 'bg-gradient-to-r from-flora-700 via-dust-400 to-flora-700 dark:from-flora-300 dark:via-dust-300 dark:to-flora-300 bg-clip-text text-transparent font-black'
                  : ''
              }`}
            >
              {word.raw}
            </span>
            {wordIdx < words.length - 1 && (
              <span className="inline-block">&nbsp;</span>
            )}
          </React.Fragment>
        ))}
      </Component>
    );
  }

  return (
    <MotionComponent
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onAnimationComplete={() => setIsAnimating(false)}
      className={className}
      aria-label={text}
      dir="rtl"
      style={{ willChange: willChangeStyle }}
    >
      <span aria-hidden="true" className="inline">
        {words.map((word, wordIdx) => {
          const wordVariants = getWordVariants(word.chars.length);

          return (
            <React.Fragment key={wordIdx}>
              <motion.span
                variants={wordVariants}
                className={`inline-block whitespace-nowrap ${
                  word.isHighlighted
                    ? 'bg-gradient-to-r from-flora-700 via-dust-400 to-flora-700 dark:from-flora-300 dark:via-dust-300 dark:to-flora-300 bg-clip-text text-transparent font-black'
                    : ''
                }`}
                style={{ willChange: willChangeStyle }}
              >
                {word.chars.map((char, charIdx) => (
                  <motion.span
                    key={charIdx}
                    variants={charVariants}
                    className="inline"
                    style={{ willChange: willChangeStyle }}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.span>
              {wordIdx < words.length - 1 && (
                <span className="inline-block whitespace-normal">&nbsp;</span>
              )}
            </React.Fragment>
          );
        })}
      </span>
    </MotionComponent>
  );
}

