import PixelPlantLoader from "@/components/ui/PixelPlantLoader";

/**
 * Global root-level loading boundary for Next.js App Router.
 * Replaces generic spinners with the retro pixelated growing plant.
 */
export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-[65dvh] flex-col items-center justify-center py-20 px-4"
    >
      <PixelPlantLoader size={80} />
      <p className="mt-4 text-xs md:text-sm font-medium text-soil-700/70 dark:text-dust-200/70 animate-pulse">
        در حال بارگذاری...
      </p>
    </div>
  );
}
