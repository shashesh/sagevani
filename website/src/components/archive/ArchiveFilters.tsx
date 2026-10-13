'use client'

import Link from 'next/link'
import type { ChangeEvent } from 'react'

import { ARCHIVE_PATH } from '@/lib/site/paths'

import styles from './ArchiveFilters.module.css'

interface FilterOption {
  value: string
  label: string
}

interface ArchiveFiltersProps {
  topics: FilterOption[]
  shapes: FilterOption[]
  levels: FilterOption[]
  selected: {
    topicSlug: string | null
    shape: string | null
    levelSlug: string | null
  }
}

/** Re-submits the form as soon as a select changes, for a reader with JavaScript (progressive enhancement, stage 3 design, 6.3). */
function submitOnChange(event: ChangeEvent<HTMLSelectElement>): void {
  event.currentTarget.form?.requestSubmit()
}

/**
 * The archive's filters: a plain GET form, so a submit with JavaScript disabled still filters the
 * list. "Clear filters" is a separate link back to the bare archive, not a form control, because
 * clearing isn't a filter value (stage 3 design, 6.3).
 */
export function ArchiveFilters({ topics, shapes, levels, selected }: ArchiveFiltersProps) {
  return (
    <div className={styles.filters}>
      <form action={ARCHIVE_PATH} method="get" className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="archive-topic">Topic</label>
          <select
            id="archive-topic"
            name="topic"
            defaultValue={selected.topicSlug ?? ''}
            onChange={submitOnChange}
          >
            <option value="">All topics</option>
            {topics.map((topic) => (
              <option key={topic.value} value={topic.value}>
                {topic.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="archive-shape">Shape</label>
          <select
            id="archive-shape"
            name="shape"
            defaultValue={selected.shape ?? ''}
            onChange={submitOnChange}
          >
            <option value="">All shapes</option>
            {shapes.map((shape) => (
              <option key={shape.value} value={shape.value}>
                {shape.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="archive-difficulty">Difficulty</label>
          <select
            id="archive-difficulty"
            name="difficulty"
            defaultValue={selected.levelSlug ?? ''}
            onChange={submitOnChange}
          >
            <option value="">Any difficulty</option>
            {levels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={styles.submit}>
          Apply filters
        </button>
      </form>
      <Link href={ARCHIVE_PATH} className={styles.clear}>
        Clear filters
      </Link>
    </div>
  )
}
