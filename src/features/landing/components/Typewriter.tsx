'use client';

import React from 'react';
import OrganicTextReveal from './OrganicTextReveal';

type TypewriterProps = {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
};

/**
 * Replaced the terminal typewriter effect with OrganicTextReveal.
 * Kept as an alias for backwards compatibility.
 */
export default function Typewriter({
  text,
  className,
  as,
}: TypewriterProps) {
  return <OrganicTextReveal text={text} className={className} as={as} />;
}
