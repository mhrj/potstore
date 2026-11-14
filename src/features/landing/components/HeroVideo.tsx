'use client';

import React, { useState, useEffect, useRef } from 'react';

type HeroVideoProps = {
  className?: string;
};

export default function HeroVideo({ className = '' }: HeroVideoProps) {
  const [isReady, setIsReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const notifyPlay = () => {
    setIsReady(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pot-hero-video-play'));
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Trigger video playback on mount
    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => notifyPlay())
        .catch(() => {
          // Fallback if browser policy delays autoplay until user gesture
        });
    }

    if (video.readyState >= 3) {
      notifyPlay();
    }
  }, []);

  return (
    <div
      className={`relative w-full max-w-[350px] sm:max-w-[500px] lg:max-w-[800px] mx-auto flex items-center justify-center bg-transparent pointer-events-none select-none ${className}`}
    >
      {/* Soft ambient pulse while video prepares to play — zero opaque background */}
      {!isReady && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="w-2/3 h-2/3 rounded-full bg-flora-600/5 dark:bg-flora-400/5 animate-pulse blur-2xl" />
        </div>
      )}

      {/* Video element: natural rendering with object-contain and zero CSS scaling or masking hacks */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop={false}
        playsInline
        preload="auto"
        onCanPlay={notifyPlay}
        onPlaying={notifyPlay}
        aria-label="طراحی گلدان و گیاه"
        className={`w-full h-auto object-contain mix-blend-screen pointer-events-none transition-opacity duration-700 ease-out ${
          isReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <source src="/hero-video.webm" type="video/webm" />
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
