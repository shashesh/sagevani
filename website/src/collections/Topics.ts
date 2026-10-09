import type { CollectionConfig, TextFieldSingleValidation } from 'payload'

import { anyone, ownerOnly } from '../access/roles'
import { checkSlug, deriveSlug, slugField } from './shared/slug'

const hexColour: TextFieldSingleValidation = (value) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? true
    : 'Use a six-digit hex colour, such as #e3cfa8.'

/** The four doors (website design 5.1). Starting data comes from a migration (see the starting-data migration in `src/migrations`). */
export const Topics: CollectionConfig = {
  slug: 'topics',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'question', 'order'] },
  defaultSort: 'order',
  access: { read: anyone, create: ownerOnly, update: ownerOnly, delete: ownerOnly },
  hooks: {
    beforeValidate: [deriveSlug('name')],
    beforeChange: [checkSlug],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('Plain ASCII, made from the name when left empty.'),
    { name: 'question', type: 'text', required: true },
    { name: 'intro', type: 'textarea' },
    { name: 'order', type: 'number', required: true },
    {
      name: 'coverTint',
      type: 'group',
      fields: [
        { name: 'background', type: 'text', required: true, validate: hexColour },
        { name: 'text', type: 'text', required: true, validate: hexColour },
      ],
    },
  ],
}
