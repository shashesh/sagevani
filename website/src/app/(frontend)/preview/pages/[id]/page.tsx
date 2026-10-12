import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { PageView } from '@/components/page/PageView'
import { LivePreviewRefresh } from '@/components/preview/LivePreviewRefresh'
import { findPagePreview } from '@/lib/site/preview'

export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } }

/** A page's latest draft, for staff only (stage 3 design, 4.4). Never cached. */
export default async function PagePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const page = await findPagePreview(payload, id, user)
  if (!page) notFound()
  return (
    <>
      <LivePreviewRefresh />
      <PageView page={page} />
    </>
  )
}
