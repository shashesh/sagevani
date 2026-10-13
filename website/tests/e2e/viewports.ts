/**
 * Shared test widths and themes for visual/accessibility checks across page types (stage 3 design,
 * section 10). Originally local to reading.e2e.spec.ts; extracted here so other specs (for example
 * site-pages.e2e.spec.ts) can reuse the same six widths and both color schemes.
 */
export const WIDTHS = [320, 375, 768, 1024, 1440, 1920]
export const THEMES = ['light', 'dark'] as const
