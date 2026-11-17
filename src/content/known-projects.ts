import { apiBase, contentSource } from './source'
import { projects as staticProjects } from './projects'
import type { Locale } from '@/i18n/config'

/**
 * Whether `/{locale}/projects/{slug}` is a real project. src/proxy.ts uses it to answer 404 for everything else before
 * the request reaches the page cache: every distinct made-up address would otherwise leave a cached copy of the 404
 * page on disk (about 90 KB each, without limit).
 *
 *  - `static`: the built-in dataset.
 *  - `api`: the slugs of the API's project list, kept in memory for `TTL_MS`. A slug that is not in the list triggers one
 *    re-read, but at most one every `MISS_REFRESH_MS` per locale, so a project that was just published is found within
 *    seconds while a flood of random addresses costs the API at most that many requests.
 *
 * If the list cannot be read, the last list that was read keeps answering (stale-if-error) and the API is not asked again
 * for `MISS_REFRESH_MS`, so an outage costs one attempt per window, not one per request. Only when no list has ever been
 * read does the gate fail open ("exists") and leave the decision to the page.
 */
export const TTL_MS = 60_000
export const MISS_REFRESH_MS = 5_000
const TIMEOUT_MS = 3_000

interface Entry {
  slugs: Set<string>
  at: number
}
const lists = new Map<Locale, Entry>()
const loading = new Map<Locale, Promise<Entry | null>>()
/** When the API was last asked for a locale, whether or not it answered. */
const attempts = new Map<Locale, number>()

/** For tests. */
export function forgetKnownProjects(): void {
  lists.clear()
  loading.clear()
  attempts.clear()
}

function load(locale: Locale, now: number): Promise<Entry | null> {
  const running = loading.get(locale)
  if (running) return running
  attempts.set(locale, now)
  const request = (async () => {
    try {
      const response = await fetch(`${apiBase()}/api/v1/${locale}/projects`, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!response.ok) return null
      const body: unknown = await response.json()
      const data = (body as { data?: unknown }).data
      if (!Array.isArray(data)) return null
      const entry = { slugs: new Set(data.map((p) => (p as { slug?: unknown }).slug).filter((s): s is string => typeof s === 'string')), at: now }
      lists.set(locale, entry)
      return entry
    } catch {
      return null
    } finally {
      loading.delete(locale)
    }
  })()
  loading.set(locale, request)
  return request
}

export async function projectExists(locale: Locale, slug: string, now: number = Date.now()): Promise<boolean> {
  if (contentSource() === 'static') return staticProjects.some((p) => p.slug === slug)

  const known = lists.get(locale)
  if (known?.slugs.has(slug) && now - known.at < TTL_MS) return true
  // Asked recently (successfully or not): answer from memory instead of asking again.
  if (known && now - (attempts.get(locale) ?? known.at) < MISS_REFRESH_MS) return known.slugs.has(slug)

  const fresh = await load(locale, now)
  if (fresh) return fresh.slugs.has(slug)
  return known ? known.slugs.has(slug) : true // stale-if-error; fail open only if no list was ever read
}
