import type { Block } from 'payload'

/** A named school's interpretation: the tradition layer. The school or teacher is always named. */
export const Tradition: Block = {
  slug: 'tradition',
  interfaceName: 'TraditionBlock',
  labels: { singular: 'Tradition', plural: 'Traditions' },
  fields: [
    { name: 'school', label: 'School or teacher', type: 'text', required: true },
    { name: 'interpretation', type: 'textarea', required: true },
  ],
}
