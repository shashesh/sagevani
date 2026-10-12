'use client'

import { useSyncExternalStore } from 'react'

import {
  isTheme,
  otherTheme,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/lib/site/theme'

import styles from './ThemeToggle.module.css'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** The reader's choice when there is one, otherwise the device's setting. */
function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme
  if (isTheme(chosen)) return chosen
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  window.addEventListener(THEME_CHANGE_EVENT, onChange)
  return () => {
    media.removeEventListener('change', onChange)
    window.removeEventListener(THEME_CHANGE_EVENT, onChange)
  }
}

function choose(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage is blocked: the choice lasts until the reader leaves the page.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

/** Switches between light and dark (stage 3 design, 5.3). Its name says which theme it switches to. */
export function ThemeToggle() {
  // Null while rendering on the server: the reader's theme is known only in the browser.
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null)
  const next = theme ? otherTheme(theme) : null
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={next ? `Switch to ${next} theme` : 'Switch theme'}
      onClick={() => choose(otherTheme(currentTheme()))}
    >
      <span aria-hidden="true" className={styles.icon} />
    </button>
  )
}
