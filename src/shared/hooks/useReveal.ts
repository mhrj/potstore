'use client';

import { useEffect, useRef, useState } from 'react';

type ObserverCallback = (entry?: IntersectionObserverEntry) => void;
type ObserverFactory = (
  callback: (entries: IntersectionObserverEntry[]) => void,
) => IntersectionObserver;

let sharedObserver: IntersectionObserver | null = null;
let observerFactory: ObserverFactory = (callback) =>
  new IntersectionObserver(callback, { threshold: 0.15 });

const elementsToCallbacks = new Map<Element, ObserverCallback>();

function getSharedObserver(): IntersectionObserver | null {
  if (!sharedObserver) {
    if (typeof window === 'undefined' && typeof observerFactory === 'undefined') {
      return null;
    }
    try {
      sharedObserver = observerFactory((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target;
            el.classList.add('is-in');
            const cb = elementsToCallbacks.get(el);
            if (cb) cb(entry);
            elementsToCallbacks.delete(el);
            sharedObserver?.unobserve(el);
          }
        }
      });
    } catch {
      return null;
    }
  }
  return sharedObserver;
}

/**
 * Registers an element with the shared module-level IntersectionObserver (threshold 0.15).
 * When the element scrolls into view, automatically adds `.is-in` and unobserves.
 * Immediately reveals without animating if `prefers-reduced-motion` is active.
 */
export function registerRevealElement(
  element: Element,
  onReveal?: (entry?: IntersectionObserverEntry) => void,
): () => void {
  // If reduced motion is requested, reveal immediately
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  ) {
    element.classList.add('is-in');
    onReveal?.();
    return () => {};
  }

  const observer = getSharedObserver();
  if (!observer) {
    element.classList.add('is-in');
    onReveal?.();
    return () => {};
  }

  if (onReveal) {
    elementsToCallbacks.set(element, onReveal);
  }
  observer.observe(element);

  return () => {
    elementsToCallbacks.delete(element);
    observer.unobserve(element);
  };
}

export function resetSharedObserverForTesting() {
  sharedObserver = null;
  elementsToCallbacks.clear();
}

export function setSharedObserverFactoryForTesting(factory: ObserverFactory) {
  observerFactory = factory;
  sharedObserver = null;
}

/**
 * Hook to attach scroll reveal behavior to a component ref.
 * Pairs with `.reveal` and `.reveal.is-in` classes in `globals.css`.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return registerRevealElement(el, () => {
      setIsRevealed(true);
    });
  }, []);

  return { ref, isRevealed };
}

