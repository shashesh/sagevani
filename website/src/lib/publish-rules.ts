/** The value of the Text / Story Study shape, the only shape that must cite a source. */
export const TEXT_STORY_STUDY = 'text-story-study'

export const PUBLISH_MESSAGES = {
  difficulty: 'Choose a difficulty level before publishing.',
  readFirst: 'This difficulty level needs at least one suggested prior reading.',
  readFirstItem: 'Each prior reading needs a SageVani article, or a title for one elsewhere.',
  sources: 'A Text / Story Study needs at least one source.',
  imageAlt: (id: number | string): string => `Image ${id} in the body has no alt text.`,
} as const

export interface PriorReading {
  kind?: string | null
  article?: unknown
  title?: string | null
}

export interface PublishCheckInput {
  shape: string | null | undefined
  /** The chosen level, or null when none is chosen (or it no longer exists). */
  difficulty: { needsPriorReading: boolean } | null
  readFirst: readonly PriorReading[]
  sourceCount: number
  images: readonly { id: number | string; alt: string | null | undefined }[]
}

export interface PublishProblem {
  /** The field the problem belongs to, as Payload's ValidationError expects. */
  path: string
  message: string
}

const isBlank = (value: string | null | undefined): boolean => !value || value.trim() === ''

/**
 * The publish rules (website design 5.1, stage 2 design 4.3). Run only when an article is being
 * published; drafts may be incomplete. Returns every problem, so one error can list them all.
 */
export function publishProblems(input: PublishCheckInput): PublishProblem[] {
  const problems: PublishProblem[] = []

  if (!input.difficulty) {
    problems.push({ path: 'difficulty', message: PUBLISH_MESSAGES.difficulty })
  } else if (input.difficulty.needsPriorReading && input.readFirst.length === 0) {
    problems.push({ path: 'readFirst', message: PUBLISH_MESSAGES.readFirst })
  }

  input.readFirst.forEach((item, index) => {
    if (item.kind === 'internal') {
      if (item.article === null || item.article === undefined) {
        problems.push({
          path: `readFirst.${index}.article`,
          message: PUBLISH_MESSAGES.readFirstItem,
        })
      }
    } else if (isBlank(item.title)) {
      problems.push({ path: `readFirst.${index}.title`, message: PUBLISH_MESSAGES.readFirstItem })
    }
  })

  if (input.shape === TEXT_STORY_STUDY && input.sourceCount === 0) {
    problems.push({ path: 'sources', message: PUBLISH_MESSAGES.sources })
  }

  for (const image of input.images) {
    if (isBlank(image.alt))
      problems.push({ path: 'body', message: PUBLISH_MESSAGES.imageAlt(image.id) })
  }

  return problems
}
