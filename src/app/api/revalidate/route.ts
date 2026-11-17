import { revalidateTag } from 'next/cache'
import { CONTENT_TAG, ReplayGuard, handleRevalidation, readConfig } from '@/lib/revalidate'

// Kept per server process. A repeat that reaches another instance is simply revalidated again, which is harmless.
const guard = new ReplayGuard()

/** Signed "content changed" webhook from the backend; see src/lib/revalidate.ts. */
export async function POST(request: Request): Promise<Response> {
  const outcome = await handleRevalidation(request, {
    config: readConfig(),
    // Stale-while-revalidate ("max"): the first request after a change may still get the previous copy while the new one
    // is built, the next gets the new one. Expiring at once ({ expire: 0 }) would make every page answer 500 for as long
    // as the API is unreachable at that moment; this way a failed refresh just keeps the last good page.
    revalidate: () => revalidateTag(CONTENT_TAG, 'max'),
    guard,
    log: (message) => console.info(`[revalidate] ${message}`),
  })
  return Response.json(outcome.body, { status: outcome.status, headers: { 'Cache-Control': 'no-store' } })
}
