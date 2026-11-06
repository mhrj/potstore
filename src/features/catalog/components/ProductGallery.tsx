'use client';

import Image from 'next/image';
import { useState } from 'react';
import { isUnoptimizedImage } from '@/lib/image-validation';

export type GalleryImage = { id: string; url: string; alt: string | null };

/**
 * Product gallery. The first image is the largest-contentful paint, so it keeps
 * `priority`; the rest are click-to-swap thumbnails rather than a separate page.
 */
export default function ProductGallery({
  images,
  productName,
  soldOut = false,
}: {
  images: GalleryImage[];
  productName: string;
  soldOut?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  if (!active) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl md:rounded-3xl border border-dashed border-soil-900/15 dark:border-dust-50/15 bg-white text-sm text-soil-700/60 dark:text-dust-200/60">
        تصویری برای این محصول ثبت نشده است
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl md:rounded-3xl bg-white dark:bg-flora-950 border border-soil-900/5 dark:border-dust-50/10 shadow-sm">
        <Image
          key={active.id}
          src={active.url}
          alt={active.alt ?? productName}
          fill
          priority={activeIndex === 0}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          unoptimized={isUnoptimizedImage(active.url)}
        />
        {soldOut && (
          <span className="absolute top-4 start-4 rounded-full bg-soil-900/85 dark:bg-soil-950/90 px-3.5 py-1.5 text-[11px] font-bold text-white">
            موقتاً ناموجود
          </span>
        )}
      </div>

      {images.length > 1 && (
        <ul className="mt-4 grid grid-cols-4 gap-3">
          {images.slice(0, 8).map((img, index) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`نمایش تصویر ${index + 1}`}
                aria-current={index === activeIndex}
                className={
                  'relative block aspect-square w-full overflow-hidden rounded-xl bg-white dark:bg-flora-950 border border-soil-900/5 dark:border-dust-50/10 transition ' +
                  (index === activeIndex
                    ? 'ring-2 ring-flora-700 dark:ring-flora-300 ring-offset-2 ring-offset-dust-50 dark:ring-offset-flora-950'
                    : 'opacity-70 hover:opacity-100')
                }
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized={isUnoptimizedImage(img.url)}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
