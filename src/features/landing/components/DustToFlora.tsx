'use client';

import { motion, useReducedMotion } from 'framer-motion';
import BotanicalCanvas from './BotanicalCanvas';
import { useDustToFlora } from '../hooks/useDustToFlora';

/**
 * "Dust to Flora" — Optimized scroll-driven background transition.
 *
 * Uses two static GPU composite layers (Dust: #FBF6F1, Flora: #0F2E22)
 * crossfading purely via opacity (no layout recalculations or paint invalidations).
 * Promotes the flora layer with `will-change: opacity` only during active scroll transition.
 */
export default function DustToFlora({
  hero,
  trustBar,
  whyChooseUs,
  catalog,
  wholesaleInquiry,
  trust,
}: {
  hero: React.ReactNode;
  trustBar?: React.ReactNode;
  whyChooseUs?: React.ReactNode;
  catalog: React.ReactNode;
  wholesaleInquiry?: React.ReactNode;
  trust: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const {
    ref,
    progress,
    floraOpacity,
    willChange,
    soilVeilOpacity,
    floraVeilOpacity,
    textureScale,
  } = useDustToFlora();

  if (reduce) {
    return (
      <div className="bg-[#FBF6F1] dark:bg-flora-950">
        {hero}
        {trustBar}
        {whyChooseUs}
        {catalog}
        {wholesaleInquiry}
        {trust}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative isolate overflow-hidden bg-[#FBF6F1] dark:bg-flora-950">
      {/* Background Layer 1: Static Dust Layer (#FBF6F1) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 bg-[#FBF6F1] dark:bg-flora-950"
      />

      {/* Background Layer 2: Animated Flora Crossfade Layer (#0F2E22) */}
      <motion.div
        aria-hidden
        style={{ opacity: floraOpacity, willChange }}
        className="pointer-events-none absolute inset-0 -z-20 bg-[#0F2E22] dark:hidden"
      />

      {/* Sunlight Breathing Overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 animate-[breathe_10s_ease-in-out_infinite] motion-reduce:animate-none bg-[radial-gradient(circle_at_top_left,rgba(255,235,200,0.4),transparent_60%)] mix-blend-soft-light dark:hidden"
      />

      <motion.div
        aria-hidden
        style={{ opacity: soilVeilOpacity, scale: textureScale }}
        className="pointer-events-none fixed inset-0 -z-10 origin-center dark:hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(200,109,81,0.18),transparent_55%),radial-gradient(circle_at_75%_65%,rgba(62,39,35,0.14),transparent_60%)]" />
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.09] mix-blend-multiply"
          aria-hidden
        >
          <filter id="soil-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" />
          </filter>
          <rect width="100%" height="100%" filter="url(#soil-noise)" />
        </svg>
      </motion.div>

      <motion.div
        aria-hidden
        style={{ opacity: floraVeilOpacity }}
        className="pointer-events-none fixed inset-0 -z-10 dark:opacity-30"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_90%,rgba(64,145,108,0.45),transparent_62%),radial-gradient(circle_at_15%_30%,rgba(116,198,157,0.22),transparent_55%)]" />
      </motion.div>

      <BotanicalCanvas active={true} variant="auto" progress={progress} />

      <div className="relative z-10">
        {hero}
      </div>

      {trustBar && <div className="relative z-10">{trustBar}</div>}
      {whyChooseUs && <div className="relative z-10">{whyChooseUs}</div>}
      <div className="relative z-10">{catalog}</div>
      {wholesaleInquiry && <div className="relative z-10">{wholesaleInquiry}</div>}
      <div className="relative z-10">{trust}</div>
    </div>
  );
}
