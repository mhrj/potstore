export const FLORA_PROGRESS_INPUT: number[] = [0, 0.12, 0.38, 0.62];
export const FLORA_OPACITY_OUTPUT: number[] = [0, 0.18, 0.72, 1];

/**
 * Linearly interpolates scroll progress against the keyframe stops:
 * [0, 0.12, 0.38, 0.62] -> [0, 0.18, 0.72, 1]
 */
export function calculateFloraOpacity(progress: number): number {
  if (progress <= 0) return 0;
  if (progress >= 0.62) return 1;

  if (progress <= 0.12) {
    const t = progress / 0.12;
    return 0 + t * 0.18;
  }

  if (progress <= 0.38) {
    const t = (progress - 0.12) / (0.38 - 0.12);
    return 0.18 + t * (0.72 - 0.18);
  }

  const t = (progress - 0.38) / (0.62 - 0.38);
  return 0.72 + t * (1 - 0.72);
}

/**
 * Dynamically toggles will-change: opacity only while 0 < progress < 1
 * to promote the element to a compositor layer during transition and
 * free GPU memory when at the endpoints.
 */
export function getWillChange(progress: number): 'opacity' | 'auto' {
  return progress > 0 && progress < 1 ? 'opacity' : 'auto';
}
