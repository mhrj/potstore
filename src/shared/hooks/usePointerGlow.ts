'use client';

import { useEffect, useRef } from 'react';

type PointerGlowOptions = {
  /** Default to true: disables pointer tracking on touch devices (hover: none) */
  disableOnTouch?: boolean;
};

/**
 * Hook to create a hardware-accelerated pointer glow effect.
 * Attaches pointer listeners to the container and writes CSS custom properties
 * `--mx` and `--my` on the container element, throttled with requestAnimationFrame.
 *
 * Automatically disabled on touch screens to eliminate battery and render overhead.
 */
export function usePointerGlow<T extends HTMLElement = HTMLDivElement>(
  options: PointerGlowOptions = {},
) {
  const containerRef = useRef<T | null>(null);
  const { disableOnTouch = true } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    // Check if the device lacks precise pointer hover (e.g. mobile/touch screens)
    if (disableOnTouch && window.matchMedia?.('(hover: none)')?.matches) {
      return;
    }

    let rafId: number | null = null;
    let pendingX = 0;
    let pendingY = 0;

    const updateGlow = () => {
      if (container) {
        container.style.setProperty('--mx', `${pendingX}px`);
        container.style.setProperty('--my', `${pendingY}px`);
      }
      rafId = null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pendingX = e.clientX - rect.left;
      pendingY = e.clientY - rect.top;

      if (!rafId) {
        rafId = requestAnimationFrame(updateGlow);
      }
    };

    const handlePointerEnter = () => {
      container.style.setProperty('--glow-opacity', '1');
    };

    const handlePointerLeave = () => {
      container.style.setProperty('--glow-opacity', '0');
    };

    // Initialize default center position and hidden opacity
    const initialRect = container.getBoundingClientRect();
    container.style.setProperty('--mx', `${initialRect.width / 2}px`);
    container.style.setProperty('--my', `${initialRect.height / 2}px`);
    container.style.setProperty('--glow-opacity', '0');

    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerenter', handlePointerEnter, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerenter', handlePointerEnter);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [disableOnTouch]);

  return containerRef;
}

