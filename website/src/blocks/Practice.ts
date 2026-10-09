import type { Block } from 'payload'

/** An invitation to practice: the practice layer. */
export const Practice: Block = {
  slug: 'practice',
  interfaceName: 'PracticeBlock',
  labels: { singular: 'Practice', plural: 'Practices' },
  fields: [{ name: 'invitation', type: 'textarea', required: true }],
}
