import { describeError } from './lib/describe-error'

/**
 * Next's server-side error hook (the instrumentation API), fired whenever a server render,
 * route handler or server action throws (stage 3 design, 8: "the error is logged with context on
 * the server"). It runs alongside whatever already logs the error (Next's own server console
 * output, error.tsx's digest), and adds the request's path, route and the error's digest so the
 * two can be matched up. Sentry or another real APM is explicitly out of scope until stage 6; a
 * console log is enough here.
 */
export async function onRequestError(
  error: unknown,
  request: { path: string },
  context: { routePath?: string; routeType?: string },
): Promise<void> {
  const digest = (error as { digest?: unknown } | null)?.digest
  // This is the one place that logs every unhandled server-render/route-handler error in
  // production, including a pg/Payload driver error that might otherwise echo the database's own
  // connection string, so DATABASE_URL is redacted here too, the same as scripts/*.ts's own
  // describeError calls.
  console.error('Unhandled server error', {
    path: request.path,
    route: context.routePath,
    routeType: context.routeType,
    digest: typeof digest === 'string' ? digest : undefined,
    message: describeError(error, [process.env.DATABASE_URL]),
  })
}
