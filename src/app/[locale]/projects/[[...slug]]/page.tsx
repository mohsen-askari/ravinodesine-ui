import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProjectsExperience } from '@/components/projects/ProjectsExperience'
import { getProjects, getSite, getStaticParams, localesWithProject } from '@/content/source'
import { isLocale, localizedPath, locales } from '@/i18n/config'

type Params = Promise<{ locale: string; slug?: string[] }>

// A project added after the build is rendered on first request (and cached). Addresses that are not a project never get
// this far: src/proxy.ts answers 404 for them first, so made-up URLs cannot fill the page cache. notFound() stays as the backstop.
export const dynamicParams = true

/** The overview (empty slug) and every project, for every locale — statically rendered, then kept fresh by revalidation. */
export async function generateStaticParams() {
  return getStaticParams()
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}
  const project = slug?.[0] ? (await getProjects(locale)).find((p) => p.slug === slug[0]) : undefined
  // Only the languages in which the page really exists are advertised as alternates.
  const available = project ? await localesWithProject(project.slug) : undefined
  const languages = Object.fromEntries(
    (available ?? locales).map((l) => [l, localizedPath(l, project ? `/projects/${project.slug}` : '/projects')]),
  )
  if (!project) {
    return { title: locale === 'fa' ? 'پروژه‌ها' : 'Projects', alternates: { canonical: localizedPath(locale, '/projects'), languages } }
  }
  const title = project.title
  return {
    title,
    description: project.shortDescription,
    alternates: { canonical: localizedPath(locale, `/projects/${project.slug}`), languages },
    openGraph: {
      title,
      description: project.shortDescription,
      type: 'article',
      locale: locale === 'fa' ? 'fa_IR' : 'en_US',
      images: [{ url: project.hero.src, width: project.hero.width, height: project.hero.height, alt: project.hero.alt }],
    },
  }
}

export default async function ProjectsPage({ params }: { params: Params }) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const segments = slug ?? []
  if (segments.length > 1) notFound()
  const active = segments[0] ?? null
  const projects = await getProjects(locale)
  if (active && !projects.some((p) => p.slug === active)) notFound()

  return <ProjectsExperience projects={projects} site={await getSite(locale)} initialSlug={active} />
}
