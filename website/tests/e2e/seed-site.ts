import type { Payload, RequiredDataFromCollectionSlug } from 'payload'

import type { Article, DifficultyLevel, Topic, User } from '../../src/payload-types'
import { paragraph, richText } from '../helpers/lexical'
import { DHARMA_TOPIC } from './seed-reading'

type TopicFields = RequiredDataFromCollectionSlug<'topics'>

/** The three topics beyond Dharma (website design 5.1, starting-data migration). */
const ADHYATMA: TopicFields = {
  name: 'Adhyātma',
  slug: 'adhyatma',
  question: 'Who am I?',
  order: 2,
  // The one topic with a non-empty intro, for the topic page's intro paragraph.
  intro: 'An introduction to Adhyātma, written for the browser tests.',
  coverTint: { background: '#cfcbc5', text: '#2b2a2c' },
}
const BHAKTI: TopicFields = {
  name: 'Bhakti',
  slug: 'bhakti',
  question: 'What is the Divine, and what is my relationship to it?',
  order: 3,
  coverTint: { background: '#e5c3b4', text: '#4a241a' },
}
const SADHANA: TopicFields = {
  name: 'Sādhanā',
  slug: 'sadhana',
  question: 'How shall I practice what I understand?',
  order: 4,
  coverTint: { background: '#cdd6c2', text: '#28331f' },
}

export interface OtherTopics {
  adhyatma: Topic
  bhakti: Topic
  sadhana: Topic
}

const createTopic = (payload: Payload, data: TopicFields): Promise<Topic> =>
  payload.create({ collection: 'topics', data, overrideAccess: true })

/** The three topics beyond Dharma, for the `standard` scenario (Dharma comes from seed-reading.ts). */
export async function createOtherTopics(payload: Payload): Promise<OtherTopics> {
  const [adhyatma, bhakti, sadhana] = await Promise.all(
    [ADHYATMA, BHAKTI, SADHANA].map((data) => createTopic(payload, data)),
  )
  return { adhyatma, bhakti, sadhana }
}

/** All four topics, for a scenario that seeds no reading content of its own (empty, six). */
export async function createAllTopics(
  payload: Payload,
): Promise<OtherTopics & { dharma: Topic }> {
  const dharma = await createTopic(payload, DHARMA_TOPIC)
  const others = await createOtherTopics(payload)
  return { dharma, ...others }
}

/**
 * The pages the stage 3b spec's other pages need (6.3): About, How SageVani writes and Start
 * here, all published, plus one draft page so the "half-written page stays off the site" rule
 * has something to prove with in the browser tests too.
 */
export async function createStandardPages(payload: Payload, owner: User): Promise<void> {
  const publish = (title: string, slug: string) =>
    payload.create({
      collection: 'pages',
      data: {
        title,
        slug,
        body: richText(paragraph(`A test body for the "${title}" page.`)),
        _status: 'published',
      },
      overrideAccess: false,
      user: owner,
    })

  await publish('About', 'about')
  await publish('How SageVani writes', 'how-sagevani-writes')
  await publish('Start here', 'start-here')

  await payload.create({
    collection: 'pages',
    data: { title: 'A draft page, for the test', slug: 'e2e-draft-page' },
    draft: true,
    overrideAccess: true,
  })
}

const ARCHIVE_SHAPES = [
  'vani-note',
  'inquiry-essay',
  'text-story-study',
  'practice-journal',
] as const

const ARCHIVE_ARTICLE_COUNT = 8

/**
 * Enough additional published articles, none in Dharma, so the archive paginates at 12/page
 * (6 from seed-reading.ts plus these 8 is 14, two pages). Shapes and both difficulty levels are
 * mixed across them, and every Advanced one carries the prior reading its level requires; one of
 * them is pointed to by a test for that field specifically.
 */
export async function createArchiveArticles(
  payload: Payload,
  owner: User,
  topics: OtherTopics,
  levels: { beginner: DifficultyLevel; advanced: DifficultyLevel },
): Promise<Article[]> {
  const topicIds = [topics.adhyatma.id, topics.bhakti.id, topics.sadhana.id]
  const articles: Article[] = []

  for (let index = 0; index < ARCHIVE_ARTICLE_COUNT; index += 1) {
    const shape = ARCHIVE_SHAPES[index % ARCHIVE_SHAPES.length]
    const isAdvanced = index % 2 === 1
    const difficulty = isAdvanced ? levels.advanced.id : levels.beginner.id
    const topic = topicIds[index % topicIds.length]

    const article = await payload.create({
      collection: 'articles',
      data: {
        title: `Archive test article ${index + 1}`,
        slug: `e2e-archive-${index + 1}`,
        shape,
        difficulty,
        topics: [topic],
        summary: `A test summary for archive article ${index + 1}.`,
        body: richText(paragraph(`A test body for archive article ${index + 1}.`)),
        ...(isAdvanced
          ? {
              readFirst: [
                {
                  kind: 'external' as const,
                  title: 'A prior reading, written for the test',
                  author: 'A test author',
                  url: 'https://example.org/prior-reading',
                  reason: 'Sets context for the test.',
                },
              ],
            }
          : {}),
        ...(shape === 'text-story-study'
          ? {
              sources: [
                {
                  type: 'primary-text' as const,
                  work: 'A test source',
                  location: '1.1',
                  edition: 'Test edition',
                },
              ],
            }
          : {}),
        _status: 'published' as const,
      },
      overrideAccess: false,
      user: owner,
    })
    articles.push(article)
  }

  return articles
}

/** The slug of the archive article with a prior reading set, for tests that check that field. */
export const ARCHIVE_SLUG_WITH_PRIOR_READING = 'e2e-archive-2'

const SIX_ARTICLE_COUNT = 6

/**
 * Exactly six published articles and one published About page, for the `six` scenario: the
 * landing page's normal-content rendering without archive pagination noise.
 */
export async function createSixScenario(
  payload: Payload,
  owner: User,
  beginner: DifficultyLevel,
): Promise<Article[]> {
  const articles: Article[] = []
  for (let index = 0; index < SIX_ARTICLE_COUNT; index += 1) {
    const article = await payload.create({
      collection: 'articles',
      data: {
        title: `Six-scenario test article ${index + 1}`,
        slug: `e2e-six-${index + 1}`,
        shape: 'vani-note',
        difficulty: beginner.id,
        summary: `A test summary for six-scenario article ${index + 1}.`,
        body: richText(paragraph(`A test body for six-scenario article ${index + 1}.`)),
        _status: 'published',
      },
      overrideAccess: false,
      user: owner,
    })
    articles.push(article)
  }

  await payload.create({
    collection: 'pages',
    data: {
      title: 'About',
      slug: 'about',
      body: richText(paragraph('A test body for the "About" page.')),
      _status: 'published',
    },
    overrideAccess: false,
    user: owner,
  })

  return articles
}
