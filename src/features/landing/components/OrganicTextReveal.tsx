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
  typingDuration?: number; // Target typing duration in seconds (default: 2.71s)
  focusDuration?: number;  // Target focus un-blur duration in seconds (default: 2.29s)
  totalDuration?: number;  // Total sequence duration in seconds (default: 5.0s)
  wordDuration?: number;   // Single word duration fallback (default: 0.3s)
  charDuration?: number;   // Single character duration (default: 0.08s)
  totalChars?: number;     // Total character count across all words
};

export type AnimationTimeline = {
  totalDuration: number;
  typingDuration: number;
  focusDuration: number;
  wordCount: number;
  totalChars: number;
  wordDuration: number;
  charDuration: number;
  staggerChildren: number; // Stagger per word (backwards compatible)
  wordStagger: number;     // Stagger per word
  charStagger: number;     // Stagger per character
  calculatedTotalDuration: number;
};

/**
 * Calculates dynamic stagger timing for the cinematic two-stage reveal:
 * - 0.0s to 2.71s: Characters type out while staying blurred (filter: blur(4px), opacity: 0.6).
 * - 2.71s to 5.0s: Camera focus pull where the text un-blurs into sharp focus (filter: blur(0px), opacity: 1)
 *   synchronized with the video's camera pull-back starting at 2.71s.
 */
export function calculateRevealTimeline(
  wordCount: number,
  config: TimelineConfig = {}
): AnimationTimeline {
  const focusDuration = config.focusDuration ?? 2.29;
  const typingDuration =
    config.typingDuration ??
    (config.totalDuration !== undefined
      ? Math.max(0, config.totalDuration - focusDuration)
      : 2.71);
  const totalDuration = typingDuration + focusDuration;
  const wordDuration = config.wordDuration ?? 0.3;
  const charDuration = config.charDuration ?? 0.08;
  const totalChars = config.totalChars ?? (wordCount > 0 ? wordCount * 5 : 0);

  if (wordCount <= 0) {
    return {
      totalDuration,
      typingDuration,
      focusDuration,
      wordCount: 0,
      totalChars: 0,
      wordDuration,
      charDuration,
      staggerChildren: 0,
      wordStagger: 0,
      charStagger: 0,
      calculatedTotalDuration: 0,
    };
  }

  // Word stagger: distributes words evenly over typing duration
  const remainingWordTime = Math.max(0, typingDuration - wordDuration);
  const wordStagger = wordCount > 1 ? remainingWordTime / (wordCount - 1) : 0;

  // Character stagger: distributes characters evenly so the last character finishes typing by typingDuration
  const remainingCharTime = Math.max(0, typingDuration - charDuration);
  const charStagger = totalChars > 1 ? remainingCharTime / (totalChars - 1) : 0;

  const calculatedTotalDuration = typingDuration + focusDuration;

  return {
    totalDuration,
    typingDuration,
    focusDuration,
    wordCount,
    totalChars,
    wordDuration,
    charDuration,
    staggerChildren: wordStagger,
    wordStagger,
    charStagger,
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
  typingDuration?: number; // default: 2.71s
  focusDuration?: number;  // default: 2.29s
  targetDuration?: number; // backwards compatibility alias for totalDuration
};

export default function OrganicTextReveal({
  text,
  className = 'mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight break-words max-w-full text-soil-900 dark:text-dust-50 text-center lg:text-right',
  as: Component = 'h1',
  highlightWord = 'جان',
  typingDuration: propTypingDuration,
  focusDuration: propFocusDuration = 2.29,
  targetDuration,
}: OrganicTextRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const [isFocused, setIsFocused] = useState(false);

  const words = useMemo(
    () => splitTextIntoWordsAndChars(text, highlightWord),
    [text, highlightWord]
  );

  const totalChars = useMemo(
    () => words.reduce((acc, word) => acc + word.chars.length, 0),
    [words]
  );

  const typingDuration =
    propTypingDuration ??
    (targetDuration !== undefined
      ? Math.max(0, targetDuration - propFocusDuration)
      : 2.71);

  const timeline = useMemo(
    () =>
      calculateRevealTimeline(words.length, {
        typingDuration,
        focusDuration: propFocusDuration,
        totalChars,
      }),
    [words.length, typingDuration, propFocusDuration, totalChars]
  );

  useEffect(() => {
    if (shouldReduceMotion) return;

    let isMounted = true;
    let typingControls: AnimationPlaybackControls | null = null;
    let focusControls: AnimationPlaybackControls | null = null;

    const startCinematicAnimation = () => {
      if (!scope.current || !isMounted) return;

      // 1. Initial blurred state on container (blur 4px, opacity 0.6)
      animate(
        scope.current,
        { filter: 'blur(4px)', opacity: 0.6 },
        { duration: 0 }
      );

      // Characters start hidden
      animate(
        'span[data-char]',
        { opacity: 0, y: 3 },
        { duration: 0 }
      );

      // 2. Typing Phase (0.0s to 2.71s):
      // Stagger characters across the typing duration (2.71s) while remaining blurred and 0.6 opacity
      typingControls = animate(
        'span[data-char]',
        { opacity: 1, y: 0 },
        {
          delay: stagger(timeline.charStagger, { startDelay: 0 }),
          duration: timeline.charDuration,
          ease: 'easeOut',
        }
      );

      // 3. Unblur / Focus Phase (2.71s to 5.0s):
      // At exactly 2.71s, animate the entire text container from blur(4px) to blur(0px)
      // and opacity 0.6 to 1 over the remaining 2.29s of the video
      focusControls = animate(
        scope.current,
        { filter: ['blur(4px)', 'blur(0px)'], opacity: [0.6, 1] },
        {
          delay: timeline.typingDuration, // 2.71s
          duration: timeline.focusDuration, // 2.29s
          ease: [0.16, 1, 0.3, 1],
        }
      );

      focusControls
        .then(() => {
          if (isMounted) {
            setIsFocused(true);
          }
        })
        .catch(() => {});
    };

    let started = false;
    const trigger = () => {
      if (started || !isMounted) return;
      started = true;
      startCinematicAnimation();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pot-hero-video-play', trigger, { once: true });
    }

    // Safety fallback timer so text reveal always starts promptly
    const fallbackTimer = setTimeout(trigger, 40);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('pot-hero-video-play', trigger);
      }
      if (typingControls) typingControls.stop();
      if (focusControls) focusControls.stop();
    };
  }, [shouldReduceMotion, scope, timeline]);

  // Fallback for reduced motion: render plain text instantly without animations or blur
  if (shouldReduceMotion) {
    return (
      <Component className={className} dir="rtl" style={{ filter: 'none', opacity: 1 }}>
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
      style={{
        filter: isFocused ? 'none' : 'blur(4px)',
        opacity: isFocused ? 1 : 0.6,
        willChange: isFocused ? 'auto' : 'filter, opacity',
      }}
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
                  style={{ opacity: 0 }}
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
