import { describe, expect, it } from 'vitest'

import {
  PUBLISH_MESSAGES,
  publishProblems,
  TEXT_STORY_STUDY,
  type PublishCheckInput,
} from '@/lib/publish-rules'

const ready: PublishCheckInput = {
  shape: 'inquiry-essay',
  difficulty: { needsPriorReading: false },
  readFirst: [],
  sourceCount: 0,
  images: [{ id: 1, alt: 'A lamp' }],
}

describe('publishProblems', () => {
  it('finds nothing wrong with a ready article', () => {
    expect(publishProblems(ready)).toEqual([])
  })

  it('needs a difficulty level', () => {
    expect(publishProblems({ ...ready, difficulty: null })).toEqual([
      { path: 'difficulty', message: PUBLISH_MESSAGES.difficulty },
    ])
  })

  it('needs a prior reading when the level asks for one', () => {
    const advanced = { ...ready, difficulty: { needsPriorReading: true } }
    expect(publishProblems(advanced)).toEqual([
      { path: 'readFirst', message: PUBLISH_MESSAGES.readFirst },
    ])
    expect(
      publishProblems({ ...advanced, readFirst: [{ kind: 'external', title: 'Gītā, chapter 2' }] }),
    ).toEqual([])
  })

  it('needs each prior reading to name an article, or a title for one elsewhere', () => {
    const problems = publishProblems({
      ...ready,
      readFirst: [
        { kind: 'internal', article: null },
        { kind: 'external', title: '  ' },
        { kind: 'internal', article: 4 },
        { kind: 'external', title: 'Upaniṣads' },
      ],
    })
    expect(problems).toEqual([
      { path: 'readFirst.0.article', message: PUBLISH_MESSAGES.readFirstItem },
      { path: 'readFirst.1.title', message: PUBLISH_MESSAGES.readFirstItem },
    ])
  })

  it('needs a source for a Text / Story Study', () => {
    expect(publishProblems({ ...ready, shape: TEXT_STORY_STUDY })).toEqual([
      { path: 'sources', message: PUBLISH_MESSAGES.sources },
    ])
    expect(publishProblems({ ...ready, shape: TEXT_STORY_STUDY, sourceCount: 1 })).toEqual([])
  })

  it('needs alt text on every image in the body', () => {
    const problems = publishProblems({
      ...ready,
      images: [
        { id: 1, alt: 'A lamp' },
        { id: 2, alt: '   ' },
        { id: 3, alt: undefined },
      ],
    })
    expect(problems).toEqual([
      { path: 'body', message: PUBLISH_MESSAGES.imageAlt(2) },
      { path: 'body', message: PUBLISH_MESSAGES.imageAlt(3) },
    ])
  })

  it('lists every problem at once', () => {
    const problems = publishProblems({
      shape: TEXT_STORY_STUDY,
      difficulty: { needsPriorReading: true },
      readFirst: [],
      sourceCount: 0,
      images: [{ id: 5, alt: '' }],
    })
    expect(problems.map((problem) => problem.path)).toEqual(['readFirst', 'sources', 'body'])
  })
})
