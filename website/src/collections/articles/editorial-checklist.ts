import type { CheckboxField, GroupField } from 'payload'

import { ownerOnlyField, staffOnlyField } from '../../access/roles'

/**
 * The items of templates/editorial-review.md, in its order, without its backticks. A unit test
 * compares them with the template, so change both together.
 */
export const INTEGRITY_CHECKS = [
  ['quotesLocated', 'Quotes are located and attributed.'],
  ['claimsEvidenced', 'Factual and scriptural claims have sufficient evidence.'],
  ['contextChecked', 'Context and relevant translation differences are checked.'],
  ['schoolDistinguished', 'Named school or tradition is distinguished from universal claims.'],
  ['symbolismLabelled', 'Personal symbolism is labeled.'],
  ['sanskritChecked', 'Sanskrit is checked when the argument depends on it.'],
  ['layersDistinct', 'Text, tradition, reflection, and practice remain distinguishable.'],
  ['sufferingRespected', 'Spiritual language does not minimize suffering or avoid responsibility.'],
  ['noOpenProblem', 'No known unresolved factual problem materially affects the piece.'],
] as const

export const VOICE_CHECKS = [
  ['questionAlive', 'The question is alive and the inward turn comes from the author.'],
  ['readAloud', 'Read aloud for clarity, false certainty, preaching, and manufactured profundity.'],
  ['quietTest', 'Quiet test completed where possible.'],
  ['authorStands', 'The author would stand behind it without praise or engagement.'],
  ['difficultyIncluded', 'A difficulty level is included using owner-approved labels.'],
  [
    'priorReadingIncluded',
    'Advanced topics include relevant suggested prior readings and explain expected background.',
  ],
  ['bylineSagevani', 'The public byline is Sagevani.'],
  ['draftsExcluded', 'Drafts and review records are excluded from website output.'],
] as const

const checkbox = ([name, label]: readonly [string, string]): CheckboxField => ({
  name,
  label,
  type: 'checkbox',
})

/**
 * Admin-only and never public. It never blocks publishing, and ticking it is not approval:
 * publishing is (website design 8.3). Only the owner can tick it, so a tick never claims a check
 * the assistant may not have done.
 */
export const editorialChecklist: GroupField = {
  name: 'editorialChecklist',
  type: 'group',
  admin: {
    description:
      'Never public, and never blocks publishing. Ticking these is not approval: publishing is.',
  },
  access: { read: staffOnlyField, create: ownerOnlyField, update: ownerOnlyField },
  fields: [
    { name: 'integrity', type: 'group', fields: INTEGRITY_CHECKS.map(checkbox) },
    {
      name: 'voice',
      label: 'Voice and readiness',
      type: 'group',
      fields: VOICE_CHECKS.map(checkbox),
    },
    { name: 'unresolvedIssues', type: 'textarea' },
    { name: 'requiredChanges', type: 'textarea' },
    { name: 'sourceRecords', type: 'textarea' },
  ],
}
