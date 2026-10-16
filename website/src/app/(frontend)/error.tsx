'use client'

import { ErrorView } from '@/components/site/ErrorView'

/**
 * Renders when a matched route's render throws (stage 3 design, 6.4 and 8): no stack trace or
 * raw message ever reaches the reader, and this component logs nothing to the browser console.
 * The error itself is already logged server-side: Next logs a server render's thrown error to the
 * server console on its own, and src/instrumentation.ts's onRequestError adds the request's path,
 * route and digest alongside it, so the two can be matched up without anything leaving the
 * server.
 */
export default function Error(_props: { error: Error & { digest?: string } }) {
  return <ErrorView />
}
