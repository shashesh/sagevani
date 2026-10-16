import { labelText } from '@/lib/site/format'
import type { TopicRef } from '@/lib/site/types'

interface LabelRowProps {
  topics: Pick<TopicRef, 'name'>[]
  shapeLabel: string | null
}

/** The article's topics, then its shape, in spaced accent capitals (stage 3 design, 6.1). */
export function LabelRow({ topics, shapeLabel }: LabelRowProps) {
  const label = labelText({ topics, shapeLabel })
  return label ? <p className="label">{label}</p> : null
}
