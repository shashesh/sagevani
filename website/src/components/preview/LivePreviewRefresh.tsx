'use client'

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'

const subscribeToNothing = () => () => {}

/**
 * Reloads a preview after each save in the admin beside it (stage 3 design, 4.4). Payload posts a
 * message from the admin's origin; the preview runs on the same site, so its own origin is it.
 */
export function LivePreviewRefresh() {
  const router = useRouter()
  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => null,
  )
  if (!origin) return null
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={origin} />
}
