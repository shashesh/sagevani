import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { executeAuthStrategies, getPayload } from 'payload'

import { PageView } from '@/components/page/PageView'
import { LivePreviewRefresh } from '@/components/preview/LivePreviewRefresh'
import { findPagePreview } from '@/lib/site/preview'

interface PagePreviewPageProps {
  params: Promise<{ id: string }>
}

/**
 * Always noindex, whatever SITE_INDEXING says: a preview is never a page worth indexing (stage 3
 * design, 4.4). No robots field when the page is missing: the default export below calls
 * notFound() in that case, and setting robots here would collide with Next's own automatic
 * noindex for the resulting 404 response (see src/lib/site/metadata.ts's siteRobots).
 */
export async function generateMetadata({ params }: PagePreviewPageProps): Promise<Metadata> {
  const { id } = await params
  const payload = await getPayload({ config })
  const { user } = await executeAuthStrategies({ headers: await headers(), payload })
  const page = await findPagePreview(payload, id, user)
  return page ? { title: 'Preview', robots: { index: false, follow: false } } : {}
}

/** A page's latest draft, for staff only (stage 3 design, 4.4). Never cached. */
export default async function PagePreviewPage({ params }: PagePreviewPageProps) {
  const { id } = await params
  const payload = await getPayload({ config })
  const { user } = await executeAuthStrategies({ headers: await headers(), payload })
  const page = await findPagePreview(payload, id, user)
  if (!page) notFound()
  return (
    <>
      <LivePreviewRefresh />
      <PageView page={page} />
    </>
  )
}
