import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateFloraOpacity, getWillChange } from '../src/features/landing/lib/dust-to-flora-helpers';

describe('Dust to Flora progress mapping', () => {
  it('returns 0 opacity at progress 0 or negative', () => {
    assert.equal(calculateFloraOpacity(0), 0);
    assert.equal(calculateFloraOpacity(-0.1), 0);
  });

  it('correctly maps the defined keyframes [0, 0.12, 0.38, 0.62] -> [0, 0.18, 0.72, 1]', () => {
    assert.equal(calculateFloraOpacity(0), 0);
    assert.equal(Math.round(calculateFloraOpacity(0.12) * 100) / 100, 0.18);
    assert.equal(Math.round(calculateFloraOpacity(0.38) * 100) / 100, 0.72);
    assert.equal(calculateFloraOpacity(0.62), 1);
  });

  it('interpolates values smoothly between keyframe intervals', () => {
    // Halfway between 0 and 0.12 -> 0.09
    assert.equal(Math.round(calculateFloraOpacity(0.06) * 1000) / 1000, 0.09);
    // Halfway between 0.12 and 0.38 -> 0.45
    assert.equal(Math.round(calculateFloraOpacity(0.25) * 1000) / 1000, 0.45);
    // Halfway between 0.38 and 0.62 -> 0.86
    assert.equal(Math.round(calculateFloraOpacity(0.50) * 1000) / 1000, 0.86);
  });

  it('clamps opacity to 1 for progress >= 0.62', () => {
    assert.equal(calculateFloraOpacity(0.7), 1);
    assert.equal(calculateFloraOpacity(1.0), 1);
    assert.equal(calculateFloraOpacity(1.5), 1);
  });

  it('activates will-change: opacity only during active transition (0 < progress < 1)', () => {
    assert.equal(getWillChange(0), 'auto');
    assert.equal(getWillChange(-0.1), 'auto');
    assert.equal(getWillChange(0.01), 'opacity');
    assert.equal(getWillChange(0.5), 'opacity');
    assert.equal(getWillChange(0.99), 'opacity');
    assert.equal(getWillChange(1.0), 'auto');
    assert.equal(getWillChange(1.2), 'auto');
  });
});

