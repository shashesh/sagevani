import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/site/contrast'
import { TEXT_PAIRS, THEMES } from '@/styles/tokens'

const AA = 4.5
const css = readFileSync(path.resolve('src/styles/tokens.css'), 'utf8')

/** The colour declarations in the first rule whose selector is exactly `selector`. */
function declarations(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`tokens.css has no rule for ${selector}`)
  const open = css.indexOf('{', start)
  const body = css.slice(open + 1, css.indexOf('}', open))
  return Object.fromEntries(
    [...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, value]) => [
      name,
      value.toLowerCase(),
    ]),
  )
}

describe('colour tokens', () => {
  for (const [theme, colours] of Object.entries(THEMES)) {
    for (const [text, background] of TEXT_PAIRS) {
      it(`${theme}: ${text} on ${background} reaches ${AA}:1`, () => {
        expect(contrastRatio(colours[text], colours[background])).toBeGreaterThanOrEqual(AA)
      })
    }
  }

  it('tokens.css declares the light theme on :root', () => {
    expect(declarations(':root')).toEqual(THEMES.light)
  })

  it('tokens.css declares the dark theme for the device setting and for the reader’s choice', () => {
    expect(declarations(":root:not([data-theme='light'])")).toEqual(THEMES.dark)
    expect(declarations(":root[data-theme='dark']")).toEqual(THEMES.dark)
  })
})
