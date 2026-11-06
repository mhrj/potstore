'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion, animate } from 'framer-motion';

type TypewriterProps = {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
};

/**
 * Highlights the keyword "جان" with a gradient text effect,
 * preserving brand styling while typing smoothly.
 */
function formatHighlightedText(content: string) {
  if (!content.includes('جان')) {
    return content;
  }

  const parts = content.split('جان');
  return (
    <>
      {parts[0]}
      <span className="inline-block bg-gradient-to-r from-flora-700 via-dust-400 to-flora-700 dark:from-flora-300 dark:via-dust-300 dark:to-flora-300 bg-clip-text text-transparent animate-text-gradient font-black">
        جان
      </span>
      {parts.slice(1).join('جان')}
    </>
  );
}

export default function Typewriter({
  text,
  className = 'mt-6 mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight font-black text-soil-900 dark:text-dust-50 text-center',
  as: Component = 'h1',
}: TypewriterProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayedIndex, setDisplayedIndex] = useState(0);

  useEffect(() => {
    // If user prefers reduced motion, reveal the full string immediately
    if (shouldReduceMotion) {
      setDisplayedIndex(text.length);
      return;
    }

    setDisplayedIndex(0);

    // Natural typing speed: around 3-4 seconds total for the sentence (~0.11s per character)
    const duration = Math.max(1.8, Math.min(4.0, text.length * 0.11));

    const controls = animate(0, text.length, {
      duration,
      delay: 0.25,
      ease: 'linear',
      onUpdate: (latest) => {
        setDisplayedIndex(Math.floor(latest));
      },
    });

    return () => controls.stop();
  }, [text, shouldReduceMotion]);

  const displayedText = shouldReduceMotion ? text : text.slice(0, displayedIndex);

  return (
    <Component
      className={`grid place-items-center text-center ${className}`}
      aria-label={text}
    >
      {/* 
        Layout-shift prevention:
        The ghost layer is invisible and unselectable, but occupies the exact same CSS Grid cell (col 1, row 1).
        This guarantees the container has the full final dimensions instantly across all responsive viewports,
        preventing buttons and subsequent content from jumping while typing.
      */}
      <span
        className="col-start-1 row-start-1 invisible select-none pointer-events-none"
        aria-hidden="true"
      >
        {formatHighlightedText(text)}
        <span className="inline-block w-[3px] ms-1.5" aria-hidden="true">
          &nbsp;
        </span>
      </span>

      {/* Visible typing layer */}
      <span className="col-start-1 row-start-1 text-center" aria-live="polite">
        {formatHighlightedText(displayedText)}
        {!shouldReduceMotion && (
          <motion.span
            aria-hidden="true"
            className="inline-block w-[3px] h-[0.85em] bg-flora-600 dark:bg-flora-400 ms-1.5 align-middle rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"
            animate={{ opacity: [1, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          />
        )}
      </span>
    </Component>
  );
}

