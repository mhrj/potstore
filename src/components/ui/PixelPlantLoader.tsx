import type { SVGProps } from 'react';

type PixelPlantLoaderProps = {
  size?: number;
  className?: string;
  label?: string;
} & SVGProps<SVGSVGElement>;

/**
 * Pixelated Plant Growth Loader
 * 8-bit/16-bit retro plant growing from a terracotta pot.
 * Pure CSS keyframes, zero runtime animation overhead.
 */
export default function PixelPlantLoader({
  size = 72,
  className = '',
  label,
  ...svgProps
}: PixelPlantLoaderProps) {
  return (
    <div className="inline-flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        shapeRendering="crispEdges"
        className={`pixel-plant-svg select-none ${className}`}
        aria-hidden="true"
        {...svgProps}
      >
        {/* Pot Base Shadow */}
        <rect x="9" y="23" width="6" height="1" fill="#3E2723" />

        {/* Pot Lower Body */}
        <rect x="8" y="21" width="8" height="2" fill="#C86D51" />
        <rect x="8" y="21" width="2" height="2" fill="#D9B79C" />
        <rect x="14" y="21" width="2" height="2" fill="#A8553C" />

        {/* Pot Upper Body */}
        <rect x="7" y="18" width="10" height="3" fill="#C86D51" />
        <rect x="7" y="18" width="2" height="3" fill="#D9B79C" />
        <rect x="15" y="18" width="2" height="3" fill="#A8553C" />

        {/* Pot Rim */}
        <rect x="6" y="16" width="12" height="2" fill="#C86D51" />
        <rect x="6" y="16" width="2" height="2" fill="#E8D5C4" />
        <rect x="16" y="16" width="2" height="2" fill="#A8553C" />

        {/* Soil inside pot */}
        <rect x="8" y="15" width="8" height="1" fill="#3E2723" />

        {/* Growing Stem */}
        <g className="pixel-stem" style={{ transformOrigin: '12px 16px' }}>
          <rect x="11" y="8" width="1" height="8" fill="#52B788" />
          <rect x="12" y="8" width="1" height="8" fill="#2D6A4F" />
        </g>

        {/* Left Leaf */}
        <g className="pixel-leaf-left" style={{ transformOrigin: '11px 11px' }}>
          <rect x="8" y="10" width="3" height="1" fill="#74C69D" />
          <rect x="7" y="11" width="4" height="1" fill="#40916C" />
          <rect x="8" y="12" width="2" height="1" fill="#2D6A4F" />
        </g>

        {/* Right Leaf */}
        <g className="pixel-leaf-right" style={{ transformOrigin: '13px 10px' }}>
          <rect x="13" y="9" width="3" height="1" fill="#74C69D" />
          <rect x="13" y="10" width="4" height="1" fill="#40916C" />
          <rect x="14" y="11" width="2" height="1" fill="#2D6A4F" />
        </g>

        {/* Top Sprout */}
        <g className="pixel-sprout" style={{ transformOrigin: '12px 8px' }}>
          <rect x="11" y="6" width="2" height="1" fill="#D8F3DC" />
          <rect x="10" y="7" width="4" height="1" fill="#52B788" />
        </g>
      </svg>
      {label && (
        <p className="mt-3 text-xs md:text-sm font-medium text-soil-700/75 animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}
