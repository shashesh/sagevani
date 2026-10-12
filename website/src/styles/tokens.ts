/**
 * The site's colours (website design 7.1). tokens.css declares the same values, and
 * tests/unit/tokens.unit.spec.ts checks that the two agree and that every text pair reaches 4.5:1.
 */
export const THEMES = {
  light: {
    paper: '#f4efe4',
    'paper-2': '#ece5d6',
    surface: '#f8f4ea',
    ink: '#2b2621',
    'ink-soft': '#4a433b',
    muted: '#675e53',
    rule: '#d9cfbd',
    accent: '#9a3b26',
    'on-accent': '#fbf7ef',
    footer: '#2b2621',
    'footer-text': '#d6cdbc',
  },
  dark: {
    paper: '#1a1714',
    'paper-2': '#221e1a',
    surface: '#201c18',
    ink: '#ebe3d3',
    'ink-soft': '#c6bdad',
    muted: '#a39a8b',
    rule: '#352f28',
    accent: '#e0896c',
    'on-accent': '#1a1714',
    footer: '#2b2621',
    'footer-text': '#d6cdbc',
  },
} as const

export type ColourToken = keyof (typeof THEMES)['light']

/**
 * Every text colour with each background it is used on. The footer uses only footer-text: the
 * accent on the footer's ink is 2.16:1 in the light theme.
 */
export const TEXT_PAIRS: readonly (readonly [ColourToken, ColourToken])[] = [
  ['ink', 'paper'],
  ['ink', 'paper-2'],
  ['ink', 'surface'],
  ['ink-soft', 'paper'],
  ['ink-soft', 'paper-2'],
  ['ink-soft', 'surface'],
  ['muted', 'paper'],
  ['muted', 'paper-2'],
  ['muted', 'surface'],
  ['accent', 'paper'],
  ['accent', 'paper-2'],
  ['accent', 'surface'],
  ['on-accent', 'accent'],
  ['footer-text', 'footer'],
]
