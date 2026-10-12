import type { Payload, RequiredDataFromCollectionSlug } from 'payload'
import sharp from 'sharp'

import type { User } from '../../src/payload-types'
import { image, linkTo, paragraph, practice, richText, tradition, verse } from '../helpers/lexical'

type ArticleFields = Partial<RequiredDataFromCollectionSlug<'articles'>> & {
  title: string
  slug: string
}

/** Navigation for the header and footer, set through the running server in global setup. */
export const E2E_NAVIGATION = [
  { label: 'Articles', path: '/articles' },
  { label: 'About', path: '/about' },
]

/**
 * Published articles for the reading, theme, preview and refresh tests, created through the
 * Local API (outside Next, so nothing is refreshed here). Every value is test content.
 */
export async function seedReading(payload: Payload, owner: User): Promise<void> {
  const beginner = await payload.create({
    collection: 'difficultyLevels',
    data: { name: 'Beginner', order: 1, needsPriorReading: false },
    overrideAccess: true,
  })
  const dharma = await payload.create({
    collection: 'topics',
    data: {
      name: 'Dharma',
      slug: 'dharma',
      question: 'How shall I live?',
      order: 1,
      coverTint: { background: '#e3cfa8', text: '#3d2f1c' },
    },
    overrideAccess: true,
  })
  const data = await sharp({
    create: { width: 1200, height: 630, channels: 3, background: '#9a3b26' },
  })
    .png()
    .toBuffer()
  const photo = await payload.create({
    collection: 'media',
    data: {
      alt: 'A vermilion field',
      creator: 'Sagevani',
      source: 'Made for the browser tests',
      licence: 'Own work',
    },
    file: { data, mimetype: 'image/png', name: 'field.png', size: data.length },
    overrideAccess: true,
  })

  const publish = (fields: ArticleFields) =>
    payload.create({
      collection: 'articles',
      data: {
        shape: 'inquiry-essay',
        difficulty: beginner.id,
        topics: [dharma.id],
        body: richText(paragraph('A short test body.')),
        ...fields,
        _status: 'published',
      },
      overrideAccess: false,
      user: owner,
    })

  const related = await publish({ title: 'A related piece', slug: 'e2e-related-one' })
  await publish({ title: 'Another related piece', slug: 'e2e-related-two' })
  await payload.create({
    collection: 'articles',
    data: { title: 'Only a draft', slug: 'e2e-draft-only' },
    draft: true,
    overrideAccess: true,
  })

  await publish({
    title: 'A test article to read',
    slug: 'e2e-reading',
    summary: 'A test summary for the reading page.',
    coverTerm: 'karma',
    background: 'Some helpful background, written for the test.',
    readFirst: [
      { kind: 'internal', article: related.id, reason: 'It sets the scene.' },
      {
        kind: 'external',
        title: 'A book elsewhere',
        author: 'An author',
        url: 'https://example.org/book',
        reason: 'Wider context.',
      },
    ],
    body: richText(
      paragraph('An opening paragraph of reflection, written for the test.'),
      verse({
        devanagari: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन',
        transliteration: 'karmaṇy evādhikāras te mā phaleṣu kadācana',
        translation: 'A test translation of the verse.',
        textName: 'Bhagavad Gītā',
        location: '2.47',
        translator: 'Test edition',
      }),
      tradition('A named school', 'How that school reads the verse, written for the test.'),
      linkTo('A link to the related piece.', 'articles', related.id),
      image(photo.id),
      practice('A small practice invitation, written for the test.'),
    ),
    sources: [
      { type: 'primary-text', work: 'Bhagavad Gītā', location: '2.47', edition: 'Test edition' },
      {
        type: 'academic',
        work: 'A test study',
        author: 'A scholar',
        url: 'https://example.org/study',
        accessedOn: '2026-10-03',
      },
    ],
    corrections: [
      { date: '2026-10-09', change: 'A public correction for the test.', showPublicNote: true },
      { date: '2026-10-10', change: 'A private note for the test.', showPublicNote: false },
    ],
  })

  // The pages below have no topic, so they stay out of the article's "More from Dharma" row,
  // which lists only the three newest.
  // One unbroken word in the title, to check that nothing scrolls sideways on a phone.
  await publish({
    title: 'A test title with an unbrokenlongcompoundwordforwrapping',
    slug: 'e2e-long-title',
    coverTerm: 'unbrokenlongcompoundwordforwrapping',
    topics: [],
  })

  const preview = await publish({ title: 'The live title', slug: 'e2e-preview', topics: [] })
  await payload.update({
    collection: 'articles',
    id: preview.id,
    data: { title: 'The draft title', slug: 'e2e-preview' },
    draft: true,
    overrideAccess: false,
    user: owner,
  })

  await publish({ title: 'Before the edit', slug: 'e2e-publish', topics: [] })
}
