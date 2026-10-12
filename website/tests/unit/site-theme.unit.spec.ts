import { describe, expect, it } from 'vitest'

import { isTheme, otherTheme, THEME_SCRIPT, THEME_STORAGE_KEY } from '@/lib/site/theme'

/** Runs the inline script against a stand-in document and storage; returns data-theme. */
function runScript(stored: string | null, storageThrows = false): string | undefined {
  const root = { dataset: {} as Record<string, string> }
  const storage = {
    getItem: (key: string) => {
      if (storageThrows) throw new Error('storage blocked')
      return key === THEME_STORAGE_KEY ? stored : null
    },
  }
  new Function('localStorage', 'document', THEME_SCRIPT)(storage, { documentElement: root })
  return root.dataset.theme
}

describe('the theme script', () => {
  it('applies a stored choice', () => {
    expect(runScript('dark')).toBe('dark')
    expect(runScript('light')).toBe('light')
  })

  it('leaves the device setting in charge when nothing valid is stored', () => {
    expect(runScript(null)).toBeUndefined()
    expect(runScript('sepia')).toBeUndefined()
  })

  it('never throws when storage is blocked', () => {
    expect(runScript('dark', true)).toBeUndefined()
  })
})

describe('theme helpers', () => {
  it('recognises the two themes only', () => {
    expect(isTheme('light')).toBe(true)
    expect(isTheme('dark')).toBe(true)
    expect(isTheme('system')).toBe(false)
  })

  it('switches between them', () => {
    expect(otherTheme('light')).toBe('dark')
    expect(otherTheme('dark')).toBe('light')
  })
})
