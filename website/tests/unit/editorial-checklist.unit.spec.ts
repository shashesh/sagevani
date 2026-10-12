import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  editorialChecklist,
  INTEGRITY_CHECKS,
  VOICE_CHECKS,
} from '@/collections/articles/editorial-checklist'

// The repository's template, from website/: ../templates/editorial-review.md
const TEMPLATE = readFileSync(
  path.resolve(process.cwd(), '../templates/editorial-review.md'),
  'utf8',
)

/** The "- [ ] " items under a "## heading", backticks removed, in order. */
const itemsUnder = (heading: string): string[] => {
  const section = TEMPLATE.split(/^## /m).find((part) => part.startsWith(`${heading}\n`)) ?? ''
  return [...section.matchAll(/^- \[ \] (.+)$/gm)].map((match) => match[1].replaceAll('`', ''))
}

describe('editorial checklist', () => {
  it('mirrors the Integrity items of templates/editorial-review.md, in order', () => {
    expect(INTEGRITY_CHECKS.map(([, label]) => label)).toEqual(itemsUnder('Integrity'))
  })

  it('mirrors the Voice and readiness items, in order', () => {
    expect(VOICE_CHECKS.map(([, label]) => label)).toEqual(itemsUnder('Voice and readiness'))
  })

  it('has 17 checkboxes and three notes fields', () => {
    expect(INTEGRITY_CHECKS).toHaveLength(9)
    expect(VOICE_CHECKS).toHaveLength(8)
    expect(editorialChecklist.type).toBe('group')
  })

  it('lets only the owner tick it, and only staff read it', () => {
    expect(editorialChecklist.access?.read).toBeDefined()
    expect(editorialChecklist.access?.create).toBeDefined()
    expect(editorialChecklist.access?.update).toBeDefined()
  })
})
