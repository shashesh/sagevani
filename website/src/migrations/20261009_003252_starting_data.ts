import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

// The four doors and the three proposed difficulty levels, from text the handbook and the website
// spec already fix (stage 2 design, 6). Topic intros are the owner's to write. Rows that exist are
// left alone, so an edit made in the admin survives a re-run. Once this has run anywhere, change
// the data with a new migration, not by editing this one.
const TOPICS = [
  {
    name: 'Dharma',
    slug: 'dharma',
    question: 'How shall I live?',
    order: 1,
    coverTint: { background: '#e3cfa8', text: '#3d2f1c' },
  },
  {
    name: 'Adhyātma',
    slug: 'adhyatma',
    question: 'Who am I?',
    order: 2,
    coverTint: { background: '#cfcbc5', text: '#2b2a2c' },
  },
  {
    name: 'Bhakti',
    slug: 'bhakti',
    question: 'What is the Divine, and what is my relationship to it?',
    order: 3,
    coverTint: { background: '#e5c3b4', text: '#4a241a' },
  },
  {
    name: 'Sādhanā',
    slug: 'sadhana',
    question: 'How shall I practice what I understand?',
    order: 4,
    coverTint: { background: '#cdd6c2', text: '#28331f' },
  },
]

// The proposed labels and criteria in docs/editorial/reader-guidance.md, awaiting Q-01.
const LEVELS = [
  { name: 'Beginner', description: 'No prior study assumed', order: 1, needsPriorReading: false },
  {
    name: 'Intermediate',
    description: 'Some familiarity with the relevant terms or text',
    order: 2,
    needsPriorReading: false,
  },
  {
    name: 'Advanced',
    description: 'Familiarity with the texts, schools, or interpretive debates involved',
    order: 3,
    needsPriorReading: true,
  },
]

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  for (const topic of TOPICS) {
    const { totalDocs } = await payload.count({
      collection: 'topics',
      where: { slug: { equals: topic.slug } },
      req,
    })
    if (totalDocs === 0) await payload.create({ collection: 'topics', data: topic, req })
  }
  for (const level of LEVELS) {
    const { totalDocs } = await payload.count({
      collection: 'difficultyLevels',
      where: { name: { equals: level.name } },
      req,
    })
    if (totalDocs === 0) await payload.create({ collection: 'difficultyLevels', data: level, req })
  }
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({
    collection: 'topics',
    where: { slug: { in: TOPICS.map((topic) => topic.slug) } },
    req,
  })
  await payload.delete({
    collection: 'difficultyLevels',
    where: { name: { in: LEVELS.map((level) => level.name) } },
    req,
  })
}
