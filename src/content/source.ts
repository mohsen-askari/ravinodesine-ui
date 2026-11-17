import { locales, type Locale } from '@/i18n/config'
import { CONTENT_TAG } from '@/lib/revalidate'
import { ContentApiError, mapProjects } from './api'
import { localizeProjects, type ProjectView } from './localize'
import { projects as staticProjects } from './projects'
import { mapSite, staticSite, type SiteView } from './site'

/**
 * Where the pages get their content from.
 *
 *  - `static` (default): the hard-coded dataset in `content/projects.ts` and the dictionaries, exactly as before.
 *  - `api`: the backend's public API (`RAVINO_API_URL`), cached under the `content` tag. The signed webhook
 *    (`/api/revalidate`) marks that tag stale the moment an editor saves (the next request still gets the old page while the new one is built); `REFRESH_SECONDS` is only the safety net for a
 *    missed webhook. If the API cannot be reached the page is never replaced by demo content: a build fails, and a
 *    running site keeps serving the last good page until a refresh succeeds. There is deliberately no automatic fallback
 *    to the `static` dataset; going back to it is an explicit decision (CONTENT_SOURCE=static).
 *
 * Server-side only: nothing here is exposed to the browser (the API address is not a NEXT_PUBLIC_ variable).
 */
export type ContentSource = 'static' | 'api'

const REFRESH_SECONDS = 3600
const TIMEOUT_MS = 10_000

export function contentSource(env: Record<string, string | undefined> = process.env): ContentSource {
  const value = (env.CONTENT_SOURCE ?? '').trim()
  if (value === '' || value === 'static') return 'static'
  if (value === 'api') return 'api'
  throw new Error(`CONTENT_SOURCE must be "static" or "api", not "${value}".`)
}

export function apiBase(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.RAVINO_API_URL ?? '').trim()
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('RAVINO_API_URL must be set to the backend address (for example https://admin.example.com) when CONTENT_SOURCE=api.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('RAVINO_API_URL must be an http(s) address.')
  return url.origin + url.pathname.replace(/\/+$/, '')
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${apiBase()}/api/v1/${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: REFRESH_SECONDS, tags: [CONTENT_TAG] },
  })
  if (!response.ok) throw new ContentApiError(`The content API answered ${response.status} for /${path}.`)
  return response.json()
}

/** Every project visible in the locale, with its story, in the editors' order. */
export async function getProjects(locale: Locale): Promise<ProjectView[]> {
  if (contentSource() === 'static') return localizeProjects(staticProjects, locale)
  return mapProjects(await getJson(`${locale}/projects?include=story`), locale)
}

export async function getSite(locale: Locale): Promise<SiteView> {
  if (contentSource() === 'static') return staticSite(locale)
  return mapSite(await getJson(`${locale}/site`), locale)
}

/** The locales in which a project is public (all of them in `static` mode). */
export async function localesWithProject(slug: string): Promise<Locale[]> {
  const found = await Promise.all(locales.map(async (locale) => ((await getProjects(locale)).some((p) => p.slug === slug) ? locale : null)))
  return found.filter((locale): locale is Locale => locale !== null)
}

/** Overview (empty slug) and every project, per locale: the pages to prebuild. */
export async function getStaticParams(): Promise<{ locale: Locale; slug: string[] }[]> {
  const perLocale = await Promise.all(locales.map(async (locale) => ({ locale, projects: await getProjects(locale) })))
  return perLocale.flatMap(({ locale, projects }) => [{ locale, slug: [] as string[] }, ...projects.map((p) => ({ locale, slug: [p.slug] }))])
}
