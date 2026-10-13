import { describe, expect, it } from 'vitest'

import { groupSources } from '@/lib/site/sources'

describe('groupSources', () => {
  it('groups in the handbook’s tier order and leaves out empty groups', () => {
    const groups = groupSources([
      { type: 'academic', work: 'A study' },
      { type: 'primary-text', work: 'Bhagavad Gītā' },
      { type: 'academic', work: 'Another study' },
    ])
    expect(groups.map(({ label, entries }) => [label, entries.map(({ work }) => work)])).toEqual([
      ['Primary text', ['Bhagavad Gītā']],
      ['Academic', ['A study', 'Another study']],
    ])
  })

  it('trims fields, drops blank ones, formats the access date and keeps only safe links', () => {
    const [group] = groupSources([
      {
        type: 'commentary',
        work: ' Gītā Bhāṣya ',
        author: ' Śaṅkara ',
        edition: '  ',
        location: '2.47',
        url: 'javascript:alert(1)',
        accessedOn: '2026-10-03T00:00:00.000Z',
        claim: 'How this school reads the verse.',
      },
    ])
    expect(group.entries[0]).toEqual({
      work: 'Gītā Bhāṣya',
      author: 'Śaṅkara',
      edition: null,
      location: '2.47',
      href: null,
      accessedOn: '3 October 2026',
      claim: 'How this school reads the verse.',
    })
  })

  it('skips a source that has no work yet, as in a draft saved mid-edit', () => {
    expect(groupSources([{ type: 'primary-text', work: null }])).toEqual([])
    expect(groupSources([{ type: 'primary-text', work: '   ' }])).toEqual([])
    expect(groupSources([{ work: 'No type yet' }])).toEqual([])
  })

  it('gives nothing for no sources, and drops a source of an unknown type', () => {
    expect(groupSources(null)).toEqual([])
    expect(groupSources([{ type: 'rumour', work: 'Hearsay' }])).toEqual([])
  })
})
