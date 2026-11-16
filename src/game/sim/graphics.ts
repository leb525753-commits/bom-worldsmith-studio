/** Graphics quality = how many pixel rows the 3D view renders (1080p, 720p, 480p). */
export const QUALITIES = [1080, 720, 480] as const;
export type Quality = (typeof QUALITIES)[number];
export const DEFAULT_QUALITY: Quality = 720;

/** Device pixel ratio that makes a view of `viewHeight` CSS px render about `q` pixel rows. */
export function dprFor(q: Quality, viewHeight: number): number {
  if (!(viewHeight > 0)) return 1;
  return Math.min(3, Math.max(0.25, q / viewHeight));
}

export function parseQuality(v: unknown): Quality {
  const n = Number(v);
  return (QUALITIES as readonly number[]).includes(n) ? (n as Quality) : DEFAULT_QUALITY;
}
