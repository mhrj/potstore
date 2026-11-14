import Container from '@/components/ui/Container';
import PixelPlantLoader from '@/components/ui/PixelPlantLoader';

/**
 * Route-level loading state for the catalog page (/products).
 * Displays the retro pixelated growing plant while catalog server queries resolve.
 */
export default function Loading() {
  return (
    <Container className="py-24">
      <div
        aria-busy="true"
        aria-live="polite"
        className="flex min-h-[50dvh] flex-col items-center justify-center"
      >
        <PixelPlantLoader size={80} />
        <p className="mt-4 text-xs md:text-sm font-medium text-soil-700/70 animate-pulse">
          در حال بارگذاری...
        </p>
      </div>
    </Container>
  );
}
