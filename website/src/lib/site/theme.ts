export type Theme = 'light' | 'dark'

/** Where the reader's choice is kept in the browser. */
export const THEME_STORAGE_KEY = 'sagevani-theme'

/** Fired on window when the reader switches, so every toggle on the page updates. */
export const THEME_CHANGE_EVENT = 'sagevani-theme-change'

export const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

export const otherTheme = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark')

/**
 * Runs in <head>, before the first paint, and applies a stored choice so the wrong theme never
 * flashes (stage 3 design, 5.3). With nothing stored, the CSS follows the device. Stage 6's
 * Content Security Policy allows this exact script by its hash, so change it only with that.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}})()`
