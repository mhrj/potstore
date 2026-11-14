'use client';

import React, { useState, useEffect, useRef } from 'react';

type HeroVideoProps = {
  className?: string;
};

export default function HeroVideo({ className = '' }: HeroVideoProps) {
  const [isReady, setIsReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const syncAnimation = () => {
    const video = videoRef.current;
    if (!video) return;

    // Respect prefers-reduced-motion: if user prefers reduced motion, do not apply dynamic animation
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const duration = video.duration && !isNaN(video.duration) && video.duration > 0
      ? video.duration
      : 10.026;

    // Align CSS animation duration with the active video source duration
    if (video.style.animationDuration !== `${duration}s`) {
      video.style.animationDuration = `${duration}s`;
    }

    // Synchronize animation timeline with video playback if Web Animations API is supported
    if (typeof video.getAnimations === 'function') {
      const anims = video.getAnimations();
      for (const anim of anims) {
        if (typeof anim.currentTime === 'number') {
          const targetMs = (video.currentTime % duration) * 1000;
          if (Math.abs(anim.currentTime - targetMs) > 120) {
            anim.currentTime = targetMs;
          }
        }
      }
    }
  };

  const handleReady = () => {
    setIsReady(true);
    syncAnimation();
  };

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.style.animationPlayState = 'running';
    }
    syncAnimation();
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.style.animationPlayState = 'paused';
    }
  };

  const handleSeeked = () => {
    syncAnimation();
  };

  const handleTimeUpdate = () => {
    syncAnimation();
  };

  useEffect(() => {
    // If the video is already loaded / ready from browser cache
    if (videoRef.current && videoRef.current.readyState >= 3) {
      setIsReady(true);
      syncAnimation();
    }
  }, []);

  return (
    <div
      className={`relative w-full aspect-video flex items-center justify-center bg-transparent pointer-events-none select-none overflow-hidden rounded-2xl ${className}`}
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

      {/* Responsive viewport scale container */}
      <div className="w-full h-full flex items-center justify-center scale-100 sm:scale-105 lg:scale-110 xl:scale-115">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={handleReady}
          onPlaying={handleReady}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeeked}
          onTimeUpdate={handleTimeUpdate}
          aria-label="انیمیشن طراحی گلدان و گیاه"
          className={`botanical-counter-zoom w-full h-full object-contain mix-blend-screen transition-opacity duration-700 ease-out pointer-events-none ${
            isReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <source src="/hero-video.webm" type="video/webm" />
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
