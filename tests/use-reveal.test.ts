import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  registerRevealElement,
  resetSharedObserverForTesting,
  setSharedObserverFactoryForTesting,
} from '../src/shared/hooks/useReveal';

// Simple mock for Element
class MockElement {
  classList = {
    classes: new Set<string>(['reveal']),
    add(cls: string) {
      this.classes.add(cls);
    },
    remove(cls: string) {
      this.classes.delete(cls);
    },
    contains(cls: string) {
      return this.classes.has(cls);
    },
  };
}

describe('useReveal shared observer logic', () => {
  let observedElements: any[] = [];
  let unobservedElements: any[] = [];
  let observerCallback: (entries: any[]) => void = () => {};

  beforeEach(() => {
    observedElements = [];
    unobservedElements = [];
    resetSharedObserverForTesting();

    // Mock IntersectionObserver factory
    setSharedObserverFactoryForTesting((callback: (entries: any[]) => void) => {
      observerCallback = callback;
      return {
        observe: (el: any) => observedElements.push(el),
        unobserve: (el: any) => unobservedElements.push(el),
        disconnect: () => {},
      } as any;
    });
  });

  it('registers element with the shared IntersectionObserver', () => {
    const el = new MockElement() as any;
    const cleanup = registerRevealElement(el);

    assert.equal(observedElements.length, 1);
    assert.equal(observedElements[0], el);
    assert.equal(el.classList.contains('is-in'), false);

    cleanup();
    assert.equal(unobservedElements.length, 1);
    assert.equal(unobservedElements[0], el);
  });

  it('adds is-in class and unobserves when element intersects (threshold 0.15)', () => {
    const el = new MockElement() as any;
    let callbackFired = false;
    registerRevealElement(el, () => {
      callbackFired = true;
    });

    assert.equal(el.classList.contains('is-in'), false);

    // Simulate non-intersecting entry
    observerCallback([{ target: el, isIntersecting: false }]);
    assert.equal(el.classList.contains('is-in'), false);
    assert.equal(callbackFired, false);

    // Simulate intersecting entry
    observerCallback([{ target: el, isIntersecting: true }]);
    assert.equal(el.classList.contains('is-in'), true);
    assert.equal(callbackFired, true);
    assert.equal(unobservedElements.includes(el), true);
  });

  it('reuses a single shared IntersectionObserver across multiple elements', () => {
    let factoryCalls = 0;
    setSharedObserverFactoryForTesting((cb: any) => {
      factoryCalls++;
      observerCallback = cb;
      return {
        observe: (el: any) => observedElements.push(el),
        unobserve: (el: any) => unobservedElements.push(el),
        disconnect: () => {},
      } as any;
    });

    const el1 = new MockElement() as any;
    const el2 = new MockElement() as any;

    registerRevealElement(el1);
    registerRevealElement(el2);

    assert.equal(factoryCalls, 1);
    assert.equal(observedElements.length, 2);
  });
});

