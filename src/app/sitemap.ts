import type { MetadataRoute } from 'next'
import { getProjects } from '@/content/source'
import { localizedPath, locales, type Locale } from '@/i18n/config'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/** Every page in every locale it exists in, each carrying its translations as hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = new Map<Locale, string[]>(await Promise.all(locales.map(async (locale) => [locale, (await getProjects(locale)).map((p) => p.slug)] as const)))
  const pages: { path: string; in: Locale[] }[] = [
    ...['/projects', '/studio', '/contact'].map((path) => ({ path, in: [...locales] })),
    ...[...new Set([...slugs.values()].flat())].map((slug) => ({ path: `/projects/${slug}`, in: locales.filter((l) => slugs.get(l)?.includes(slug)) })),
  ]
  return pages.flatMap(({ path, in: available }) =>
    available.map((locale) => ({
      url: `${base}${localizedPath(locale, path)}`,
      alternates: { languages: Object.fromEntries(available.map((l) => [l, `${base}${localizedPath(l, path)}`])) },
    })),
  )
}
