import type { CollectionConfig } from 'payload'

import { anyone, ownerOnly } from '../access/roles'

/**
 * Owner-edited, so the labels can follow Q-01 without a code change. The publish rule reads
 * `needsPriorReading`, never a level's name (stage 2 design 3.3).
 */
export const DifficultyLevels: CollectionConfig = {
  slug: 'difficultyLevels',
  labels: { singular: 'Difficulty level', plural: 'Difficulty levels' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'order', 'needsPriorReading'] },
  defaultSort: 'order',
  access: { read: anyone, create: ownerOnly, update: ownerOnly, delete: ownerOnly },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
    { name: 'order', type: 'number', required: true },
    {
      name: 'needsPriorReading',
      label: 'Needs prior reading',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Articles at this level need at least one suggested prior reading to publish.',
      },
    },
  ],
}
