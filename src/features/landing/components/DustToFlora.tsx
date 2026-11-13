'use client';

import { useRef } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion';
import BotanicalCanvas from './BotanicalCanvas';

/**
 * "Dust to Flora" — background palette morphs from earthy tones to forest
 * green as the user scrolls. Uses MotionValue + spring (no re-renders)
 * so it stays smooth on low-end mobile devices.
 */
export default function DustToFlora({
  hero,
  trustBar,
  whyChooseUs,
  catalog,
  journey,
  wholesaleInquiry,
  trust,
}: {
  hero: React.ReactNode;
  trustBar?: React.ReactNode;
  whyChooseUs?: React.ReactNode;
  catalog: React.ReactNode;
  journey?: React.ReactNode;
  wholesaleInquiry?: React.ReactNode;
  trust: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.35,
    restDelta: 0.001,
  });

  const backgroundColor = useTransform(
    progress,
    [0, 0.28, 0.55, 0.8, 1],
    ['#FBF6F1', '#E8D5C4', '#8FA98C', '#2D6A4F', '#0F2E22'],
  );

  const soilVeilOpacity = useTransform(progress, [0, 0.42], [1, 0]);
  const floraVeilOpacity = useTransform(progress, [0.4, 0.78], [0, 1]);
  const textureScale = useTransform(progress, [0, 1], [1, 1.35]);
  const headlineY = useTransform(progress, [0, 0.3], [0, -60]);
  const headlineOpacity = useTransform(progress, [0, 0.24], [1, 0]);

  if (reduce) {
    return (
      <div className="bg-dust-50 dark:bg-flora-950">
        {hero}
        {trustBar}
        {whyChooseUs}
        {catalog}
        {journey}
        {wholesaleInquiry}
        {trust}
      </div>
    );
  }

  return (
    <motion.div ref={ref} style={{ backgroundColor }} className="relative isolate overflow-hidden dark:!bg-flora-950">
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

      <motion.div style={{ y: headlineY, opacity: headlineOpacity }} className="relative z-10">
        {hero}
      </motion.div>

      {trustBar && <div className="relative z-10">{trustBar}</div>}
      {whyChooseUs && <div className="relative z-10">{whyChooseUs}</div>}
      <div className="relative z-10">{catalog}</div>
      {journey && <div className="relative z-10">{journey}</div>}
      {wholesaleInquiry && <div className="relative z-10">{wholesaleInquiry}</div>}
      <div className="relative z-10">{trust}</div>
    </motion.div>
  );
}
