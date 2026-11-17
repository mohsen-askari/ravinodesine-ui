'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Footer } from '@/components/Footer'
import { useUi } from '@/components/ui-state'
import type { ProjectView } from '@/content/localize'
import type { SiteView } from '@/content/site'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { prefersReducedMotion } from '@/hooks/useReducedMotion'
import { resetZoom, useScrollZoom } from '@/hooks/useScrollZoom'
import { useStripInput } from '@/hooks/useStripInput'
import { useI18n } from '@/i18n/context'
import { t } from '@/i18n/dictionary'
import { Choreographer } from '@/lib/choreography'
import type { Phase } from '@/lib/choreography'
import { currentPanelIndex, getLogical, getMax, panelStops, setLogical } from '@/lib/inline-scroll'
import { consumeViewState, registerViewStateProvider } from '@/lib/view-state'
import { ProjectRow } from './ProjectRow'
import { StripControls } from './StripControls'
import styles from './experience.module.css'

interface Props {
  projects: ProjectView[]
  /** Footer content (contact, social links). */
  site: SiteView
  /** Slug from the URL on first render (server and client agree: no hydration drift). */
  initialSlug: string | null
}

/** "/fa/projects/meridian-pavilion" -> "meridian-pavilion"; the overview and anything else -> null. */
function slugFromPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  return parts[1] === 'projects' && parts[2] ? decodeURIComponent(parts[2]) : null
}

const headerPx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 56

export function ProjectsExperience({ projects, site, initialSlug }: Props) {
  const { locale, dir, dict } = useI18n()
  const { filter, setFilter } = useUi()
  const pathname = usePathname()
  const reduced = useReducedMotion()

  // The URL is the single source of truth. Animation state is derived from it, never the reverse.
  const activeSlug = slugFromPath(pathname)
  const activeRef = useRef(activeSlug)
  useLayoutEffect(() => {
    activeRef.current = activeSlug
  }, [activeSlug])

  const byslug = useMemo(() => new Map(projects.map((p) => [p.slug, p])), [projects])
  const visible = useMemo(
    () => projects.filter((p) => filter === 'all' || p.category === filter || p.slug === activeSlug),
    [projects, filter, activeSlug],
  )

  const [phase, setPhase] = useState<Phase>(initialSlug ? 'active' : 'overview')
  const phaseRef = useRef(phase)
  const [announcement, setAnnouncement] = useState('')
  const engineRef = useRef<Choreographer | null>(null)
  const stackRef = useRef<HTMLOListElement>(null)
  const rootRef = useRef<HTMLElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const initialSlugRef = useRef(initialSlug)
  /** The row that was open before the latest close, so focus can return to it. */
  const closedSlugRef = useRef<string | null>(null)

  // Which rows have their strip content mounted. The open row, plus a closing row until its
  // exit finishes (so panels do not vanish mid-animation).
  const [panelSlugs, setPanelSlugs] = useState<string[]>(initialSlug ? [initialSlug] : [])
  const [seenActive, setSeenActive] = useState(activeSlug)
  if (seenActive !== activeSlug) {
    setSeenActive(activeSlug)
    if (activeSlug && !panelSlugs.includes(activeSlug)) setPanelSlugs([...panelSlugs, activeSlug])
  }

  // ------------------------------------------------------------------ engine lifecycle
  useLayoutEffect(() => {
    const engine = new Choreographer({
      dir,
      headerHeight: headerPx,
      reducedMotion: prefersReducedMotion,
      onPhase: (p) => {
        phaseRef.current = p
        setPhase(p)
      },
      onSettled: (slug) => {
        setPanelSlugs(slug ? [slug] : [])
        const root = rootRef.current
        const title = slug ? byslug.get(slug)?.title : undefined
        setAnnouncement(slug && title ? t(dict.project.announceOpened, { title }) : dict.project.announceClosed)
        // Keep focus with the content if it was lost (e.g. the clicked link lived in a strip that
        // just collapsed). The hero link is the row's anchor; the strip itself stays reachable by Tab.
        const active = document.activeElement
        if (!active || active === document.body) {
          const settledSlug = slug ?? closedSlugRef.current
          const row = settledSlug ? root?.querySelector<HTMLElement>(`[data-row="${CSS.escape(settledSlug)}"]`) : null
          row?.querySelector<HTMLElement>('[data-panel="hero"]')?.focus({ preventScroll: true })
        }
      },
      onBegin: () => resetZoom(stackRef.current),
    })
    engineRef.current = engine

    // Restore the reader's place after a language switch (see lib/view-state.ts).
    const saved = consumeViewState(initialSlugRef.current)
    engine.init(initialSlugRef.current, { place: !saved })
    if (saved) {
      const restore = () => {
        window.scrollTo({ top: saved.scrollY, behavior: 'instant' })
        const scroller = initialSlugRef.current
          ? rootRef.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(initialSlugRef.current)}"] [data-scroller]`)
          : null
        if (scroller) setLogical(scroller, dir, saved.strip * getMax(scroller))
      }
      restore()
      // Next.js may scroll to top right after the navigation commits; assert our position once more.
      const raf = requestAnimationFrame(() => requestAnimationFrame(restore))
      const timer = window.setTimeout(restore, 120)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(timer)
        engine.destroy()
      }
    }
    return () => engine.destroy()
  }, [dir, dict, byslug])

  // React to URL changes (click, Back, Forward, related links): one path for all of them.
  const firstRun = useRef(true)
  const prevActiveRef = useRef<string | null>(initialSlug)
  /** A navigation was pushed that the effect below has not handled yet (the router reports the new path a little later). */
  const pushedRef = useRef(false)
  useLayoutEffect(() => {
    pushedRef.current = false
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    closedSlugRef.current = prevActiveRef.current
    prevActiveRef.current = activeSlug ?? prevActiveRef.current
    engineRef.current?.go(activeSlug)
  }, [activeSlug])

  // ------------------------------------------------------------------ navigation
  const openProject = useCallback(
    (slug: string) => {
      const engine = engineRef.current
      if (!engine || engine.busy || slug === activeRef.current || pushedRef.current) return
      // The router learns about a native pushState after a delay that depends on the Next.js version; until it has, repeated
      // clicks must not push the same navigation again. The timer only guards against the flag ever sticking.
      pushedRef.current = true
      window.setTimeout(() => (pushedRef.current = false), 1000)
      window.history.pushState({ ravino: activeRef.current ? 'project' : 'overview' }, '', `/${locale}/projects/${slug}`)
    },
    [locale],
  )

  const closeProject = useCallback(() => {
    if (!activeRef.current) return
    // If this project was opened from the overview in-app, Back is the exact inverse.
    if (window.history.state?.ravino === 'overview') window.history.back()
    else window.history.pushState({ ravino: 'overview' }, '', `/${locale}/projects`)
  }, [locale])

  // A category filter that excludes the open project closes it.
  useEffect(() => {
    const open = activeRef.current ? byslug.get(activeRef.current) : null
    if (open && filter !== 'all' && open.category !== filter) closeProject()
  }, [filter, byslug, closeProject])

  // ------------------------------------------------------------------ strip: input + metrics
  const { step } = useStripInput({ root: rootRef, slug: activeSlug, dir, active: !!activeSlug && phase !== 'exiting', onClose: closeProject })

  const [panelIndex, setPanelIndex] = useState(0)
  const [panelCount, setPanelCount] = useState(0)
  useEffect(() => {
    const scroller = activeSlug
      ? rootRef.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(activeSlug)}"] [data-scroller]`)
      : null
    if (!scroller) return
    let raf = 0
    const update = () => {
      raf = 0
      const max = getMax(scroller)
      const logical = getLogical(scroller)
      controlsRef.current?.style.setProperty('--prog', (max ? logical / max : 0).toFixed(4))
      const stops = panelStops(scroller, dir, Math.min(window.innerWidth * 0.06, 96))
      setPanelCount(stops.length)
      setPanelIndex(currentPanelIndex(stops, logical))
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    schedule()
    scroller.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // Images finishing loading can change panel widths.
    const ro = new ResizeObserver(schedule)
    ro.observe(scroller.firstElementChild as Element)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      scroller.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      ro.disconnect()
    }
  }, [activeSlug, panelSlugs, dir])

  // Reader-initiated scrolling mid-transition takes over from the engine's steering.
  useEffect(() => {
    const takeOver = () => {
      if (engineRef.current?.busy) engineRef.current.cancelAnchor()
    }
    const keys = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' '].includes(e.key)) takeOver()
    }
    window.addEventListener('wheel', takeOver, { passive: true })
    window.addEventListener('touchmove', takeOver, { passive: true })
    window.addEventListener('keydown', keys)
    return () => {
      window.removeEventListener('wheel', takeOver)
      window.removeEventListener('touchmove', takeOver)
      window.removeEventListener('keydown', keys)
    }
  }, [])

  // ------------------------------------------------------------------ overview zoom
  useScrollZoom(stackRef, phase === 'overview' && !reduced, () => !!engineRef.current?.busy)

  // ------------------------------------------------------------------ language-switch carry-over
  useEffect(() => {
    registerViewStateProvider(() => {
      const slug = activeRef.current
      const el = slug ? rootRef.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(slug)}"] [data-scroller]`) : null
      const max = el ? getMax(el) : 0
      return { slug, scrollY: window.scrollY, strip: el && max ? getLogical(el) / max : 0 }
    })
    return () => registerViewStateProvider(null)
  }, [])

  const showControls = phase !== 'overview'
  const busy = phase === 'entering' || phase === 'exiting'

  return (
    <main id="content" ref={rootRef} className={styles.experience} data-phase={phase} data-active={activeSlug ?? ''} aria-busy={busy}>
      <h1 className="sr-only">{dict.overview.title}</h1>
      <p className="sr-only">{dict.overview.hint}</p>

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <p>{dict.filters.empty}</p>
          <button type="button" onClick={() => setFilter('all')}>
            {dict.filters.reset}
          </button>
        </div>
      ) : (
        <ol ref={stackRef} className={styles.stack} aria-label={dict.overview.listLabel}>
          {visible.map((project, i) => (
            <ProjectRow
              key={project.slug}
              project={project}
              position={i}
              initialP={project.slug === initialSlug ? 1 : 0}
              open={project.slug === activeSlug}
              panelsMounted={panelSlugs.includes(project.slug)}
              byslug={byslug}
              onOpen={openProject}
            />
          ))}
        </ol>
      )}

      <div className={styles.pageEnd}>
        <Footer site={site} />
      </div>

      <StripControls ref={controlsRef} visible={showControls} index={activeSlug ? panelIndex : 0} count={activeSlug ? panelCount : 0} onClose={closeProject} onStep={step} />

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </main>
  )
}
