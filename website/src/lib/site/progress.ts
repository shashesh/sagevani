/**
 * How far through the body the reader is, from 0 to 1, from the body's top edge and height
 * against the window's height (all in pixels, as getBoundingClientRect gives them).
 */
export function readingProgress(top: number, height: number, viewport: number): number {
  const scrollable = height - viewport
  if (scrollable <= 0) return 1
  return Math.min(1, Math.max(0, -top / scrollable))
}
