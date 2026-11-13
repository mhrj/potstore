'use client';

import { useRef } from 'react';
import {
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  FLORA_PROGRESS_INPUT,
  FLORA_OPACITY_OUTPUT,
  getWillChange,
} from '../lib/dust-to-flora-helpers';

/**
 * Scroll and transition hook for "Dust to Flora".
 *
 * Replaces full-page background color interpolation with an opacity crossfade
 * between two static composite layers. Uses optimized spring damping to settle
 * immediately (~100ms) without lingering repaint loops, and promotes the layer
 * with `will-change: opacity` only during active transition.
 */
export function useDustToFlora() {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 40,
    mass: 0.35,
    restDelta: 0.005,
  });

  // Crossfade opacity: kicks in early at 12% scroll and reaches full flora by 62%
  const floraOpacity = useTransform(
    progress,
    FLORA_PROGRESS_INPUT,
    FLORA_OPACITY_OUTPUT,
  );

  // Promote to compositor layer only while actively scrolling (0 < progress < 1)
  const willChange = useTransform(progress, getWillChange);

  // Subtle ambient textures
  const soilVeilOpacity = useTransform(progress, [0, 0.42], [1, 0]);
  const floraVeilOpacity = useTransform(progress, [0.4, 0.78], [0, 1]);
  const textureScale = useTransform(progress, [0, 1], [1, 1.35]);

  return {
    ref,
    progress,
    floraOpacity,
    willChange,
    soilVeilOpacity,
    floraVeilOpacity,
    textureScale,
  };
}

