import type { Metadata } from 'next'

import { CorrectionsView } from '@/components/site/CorrectionsView'
import { getCorrections } from '@/lib/site/cached'
import { pageMetadata, siteRobots } from '@/lib/site/metadata'
import { CORRECTIONS_PATH } from '@/lib/site/paths'

/** This page always renders (never calls notFound()), so it may always set its own robots. */
export function generateMetadata(): Metadata {
  return {
    ...pageMetadata({ title: 'Corrections', path: CORRECTIONS_PATH }),
    robots: siteRobots(),
  }
}

/** Every public correction across published articles (stage 3 design, 6.3). */
export default async function CorrectionsPage() {
  const corrections = await getCorrections()
  return <CorrectionsView corrections={corrections} />
}
