import { SOURCE_TYPES } from '../../collections/articles/options'
import { formatDate } from './format'
import { safeHref } from './links'

export interface SourceInput {
  type: string
  work: string
  author?: string | null
  edition?: string | null
  location?: string | null
  url?: string | null
  accessedOn?: string | null
  claim?: string | null
}

export interface SourceEntry {
  work: string
  author: string | null
  edition: string | null
  location: string | null
  href: string | null
  accessedOn: string | null
  claim: string | null
}

export interface SourceGroup {
  type: string
  label: string
  entries: SourceEntry[]
}

const text = (value: string | null | undefined): string | null => value?.trim() || null

const toEntry = (source: SourceInput): SourceEntry => ({
  work: source.work.trim(),
  author: text(source.author),
  edition: text(source.edition),
  location: text(source.location),
  href: safeHref(source.url),
  accessedOn: formatDate(source.accessedOn),
  claim: text(source.claim),
})

/**
 * Sources grouped in the handbook's tier order (03 Editorial integrity), empty groups left out.
 * The way readers see them is a proposal until Q-07 is decided (stage 3 design, 6.1).
 */
export function groupSources(sources: readonly SourceInput[] | null | undefined): SourceGroup[] {
  const list = sources ?? []
  return SOURCE_TYPES.map(({ label, value }) => ({
    type: value,
    label,
    entries: list.filter((source) => source.type === value).map(toEntry),
  })).filter((group) => group.entries.length > 0)
}
